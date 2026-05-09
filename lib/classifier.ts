import { anthropic } from '@/lib/anthropic'

export type EmailCategory = 'URGENT' | 'REPLY' | 'FYI' | 'SPAM'

export interface EmailInput {
  id: string
  subject: string
  sender: string
  snippet: string
}

export interface Classification {
  id: string
  category: EmailCategory
  reasoning: string
}

const SYSTEM_PROMPT = `You are an email triage assistant. For each email, classify into exactly ONE category:

- URGENT: requires response within 24 hours, time-sensitive, from a real human waiting on you
- REPLY: a real human expects a response from you, but not urgent
- FYI: informational, no response needed (newsletters, notifications, receipts)
- SPAM: marketing, promotional, or low-quality automated content

Return ONLY a valid JSON array. No prose before or after. No markdown code fences. Each object must have: id (string), category (one of the 4 values), reasoning (string under 15 words).

Example: [{"id":"abc","category":"URGENT","reasoning":"Boss asking for Q3 report by EOD"}]`

export async function classifyEmails(
  emails: EmailInput[]
): Promise<Classification[]> {
  if (emails.length === 0) return []

  const userMessage = JSON.stringify(
    emails.map(({ id, subject, sender, snippet }) => ({
      id,
      subject,
      sender,
      snippet,
    }))
  )

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    console.error('[classifier] Anthropic API error:', err)
    throw err
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  const raw = textBlock?.type === 'text' ? textBlock.text : ''

  try {
    const parsed = JSON.parse(raw) as Classification[]
    return parsed
  } catch (err) {
    console.error('[classifier] Failed to parse response:', err, '\nRaw output:', raw)
    return []
  }
}
