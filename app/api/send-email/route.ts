import { getGmailClient } from '@/lib/gmail'
import { createClient } from '@/lib/supabase/server'

export function buildRawMessage({
  from,
  to,
  subject,
  body,
  threadId,
}: {
  from: string
  to: string
  subject: string
  body: string
  threadId: string
}): string {
  const reSubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`

  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${reSubject}`,
    `In-Reply-To: ${threadId}`,
    `References: ${threadId}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n')

  // Base64url encode (URL-safe, no padding)
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { threadId?: string; to?: string; subject?: string; body?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { threadId, to, subject, body: replyBody } = body

  if (!threadId || !to || !subject || !replyBody) {
    return Response.json({ error: 'Missing required fields: threadId, to, subject, body' }, { status: 400 })
  }

  try {
    const gmail = await getGmailClient(user.id)

    const profileRes = await gmail.users.getProfile({ userId: 'me' })
    const from = profileRes.data.emailAddress ?? user.email ?? ''

    const raw = buildRawMessage({ from, to, subject, body: replyBody, threadId })

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw, threadId },
    })

    return Response.json({ success: true, messageId: sendRes.data.id })
  } catch (err) {
    console.error('[send-email] Error:', err)
    return Response.json(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    )
  }
}
