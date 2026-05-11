import { createAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis'

export interface EmailMessage {
  id: string
  threadId: string
  subject: string
  sender: string
  snippet: string
  body: string
}

async function getTokensForUser(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_gmail_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('Gmail tokens not found for user')
  }

  return data
}

async function refreshAndPersistToken(
  userId: string,
  auth: InstanceType<typeof google.auth.OAuth2>
): Promise<void> {
  const { credentials } = await auth.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('Token refresh did not return an access_token')
  }

  auth.setCredentials(credentials)

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  await admin
    .from('user_gmail_tokens')
    .update({
      access_token: credentials.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

export async function getGmailClient(
  userId: string
): Promise<ReturnType<typeof google.gmail>> {
  const tokens = await getTokensForUser(userId)

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  auth.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })

  const isExpired = new Date(tokens.expires_at) <= new Date()
  if (isExpired) {
    await refreshAndPersistToken(userId, auth)
  }

  return google.gmail({ version: 'v1', auth })
}

function decodeBase64(encoded: string): string {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf-8')
}

function extractPlainTextBody(payload: {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: Array<{
    mimeType?: string | null
    body?: { data?: string | null } | null
    parts?: unknown[]
  }> | null
}): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data)
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
    // Fall back to first part that has data if no plain text found
    for (const part of payload.parts) {
      if (part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
  }

  return ''
}

function getHeader(
  headers: Array<{ name?: string | null; value?: string | null }>,
  name: string
): string {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ''
  )
}

export async function fetchUnreadEmails(
  userId: string,
  maxResults: number = 50
): Promise<EmailMessage[]> {
  const gmail = await getGmailClient(userId)

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults,
  })

  const messages = listRes.data.messages ?? []
  if (messages.length === 0) return []

  const emails = await Promise.all(
    messages.map(async (msg) => {
      if (!msg.id) return null

      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From'],
      })

      const headers = detail.data.payload?.headers ?? []
      const subject = getHeader(headers, 'subject') || '(no subject)'
      const sender = getHeader(headers, 'from') || '(unknown sender)'
      const snippet = detail.data.snippet ?? ''

      return {
        id: msg.id,
        threadId: msg.threadId ?? detail.data.threadId ?? '',
        subject,
        sender,
        snippet,
        body: '',
      } satisfies EmailMessage
    })
  )

  return emails.filter((e): e is EmailMessage => e !== null)
}

export async function fetchEmailBody(userId: string, emailId: string): Promise<string> {
  const gmail = await getGmailClient(userId)

  const detail = await gmail.users.messages.get({
    userId: 'me',
    id: emailId,
    format: 'full',
  })

  const payload = detail.data.payload
  if (!payload) return ''

  return extractPlainTextBody(
    payload as Parameters<typeof extractPlainTextBody>[0]
  ).slice(0, 2000)
}
