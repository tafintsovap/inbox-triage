import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT =
  'You draft email replies. Output ONLY the body of the reply — no salutation (no "Hi X,"), no sign-off (no "Best,"). Match the tone of the incoming email. Keep replies 2-4 sentences max. Be friendly but professional. Output plain text, no markdown.'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { emailId?: string; subject?: string; sender?: string; snippet?: string; body?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subject = '', sender = '', body: emailBody = '' } = body

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      temperature: 0.5,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `From: ${sender}\nSubject: ${subject}\nBody: ${emailBody}\n\nDraft a reply.`,
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const draft = textBlock?.type === 'text' ? textBlock.text.trim() : ''

    return Response.json({ draft })
  } catch (err) {
    console.error('[draft-reply] Error:', err)
    return Response.json(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    )
  }
}
