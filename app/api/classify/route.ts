import { classifyEmails, type EmailInput } from '@/lib/classifier'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let emails: EmailInput[]
  try {
    const body = await request.json()
    emails = body.emails
    if (!Array.isArray(emails)) {
      return Response.json({ error: 'emails must be an array' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const classifications = await classifyEmails(emails)
    return Response.json({ classifications })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
