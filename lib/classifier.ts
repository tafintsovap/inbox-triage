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

const SYSTEM_PROMPT = `You are an email triage assistant. Your job is to classify each incoming email into one of four buckets so the user can decide what to act on first. The user is a working professional whose inbox contains a mix of: real human messages, app notifications, recruiter outreach, customer/colleague threads, marketing, and automated systems.

CATEGORIES:

URGENT — A real human is waiting on the user, AND the email signals time pressure (today, EOD, this week, deadline, 'urgent', confirming a meeting in <48h, blocking question, 'need to know by').

REPLY — A real human expects a response from the user, but no time pressure stated. This includes: cold outreach that specifically references the recipient's actual work/company/background; recruiter messages with concrete role + compensation; founder/journalist intros that name something the recipient has done; replies from earlier conversations. Real human messages forwarded by any platform (LinkedIn DMs, GitHub comments, Discord messages, Slack forwards) are also REPLY — the delivery channel does not change the category.

FYI — Automated platform notifications and system-generated emails where no real human is waiting for a response. Examples: calendar invites, application confirmations, receipt emails, security alerts, newsletter digests, social media activity summaries, automated platform events (LinkedIn invitations accepted/viewed, LinkedIn job alerts, GitHub CI results, Slack weekly digests, billing receipts).

SPAM — Mass-sent marketing, generic sales pitches with no specific reference to the recipient, newsletters, promotional offers, 'increase your X by Y%' templates, anything that would also be sent to thousands of other inboxes unchanged.

DECISION HEURISTICS (in order of priority):
1. Did the sender include something that proves they know the recipient specifically (their company, their role, a project they did, something they wrote)? → REPLY or URGENT, never SPAM.
2. Could this exact email body have been sent to 10,000 other people unchanged? → SPAM.
3. Was this email composed by a real human, even if delivered via a third-party platform (LinkedIn, GitHub, Slack, Discord, Twitter/X, Instagram, etc.)? Human-authored messages are REPLY or URGENT regardless of sending domain. Signals of human authorship in the subject or snippet: "sent you a message:", "wrote:", "replied:", "commented:", "messaged you". Signals of automation: "accepted your invitation", "viewed your profile", "new jobs matching your search", "weekly digest", "billing receipt", "you have N new notifications".
4. When uncertain between REPLY and SPAM, default to REPLY. SPAM should be reserved for content that is unambiguously promotional (newsletters, sales pitches selling a product, automated marketing). When in doubt about a recruiter or business outreach email, even if it uses generic templated language, classify as REPLY — the user can dismiss it in one click but cannot recover from missing it in spam.
5. When uncertain between URGENT and REPLY, default to REPLY (only escalate when time pressure is explicit).

Return ONLY a valid JSON array. No prose, no markdown fences. Each object: { id, category, reasoning } where reasoning is under 15 words and explains WHY that category.`

const BATCH_SIZE = 15

export function stripMarkdownFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
}

async function classifyBatch(emails: EmailInput[], temperature: number = 0.3): Promise<Classification[]> {
  const userMessage = JSON.stringify(
    emails.map(({ id, subject, sender, snippet }) => ({ id, subject, sender, snippet }))
  )

  const attempt = async (temp: number = temperature): Promise<Classification[]> => {
    console.log(JSON.stringify({
      tag: '[classifier]', event: 'batch_start',
      batch_size: emails.length,
      inputs: emails.map(({ id, sender, subject, snippet }) => ({
        id, sender, subject, snippet_length: snippet.length,
      })),
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: temp,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text : ''
    const parsed = JSON.parse(stripMarkdownFences(raw)) as Classification[]
    console.log(JSON.stringify({
      tag: '[classifier]', event: 'batch_result',
      results: parsed.map(({ id, category, reasoning }) => ({ id, category, reasoning })),
    }))
    return parsed
  }

  try {
    return await attempt()
  } catch (retryErr) {
    console.log(JSON.stringify({ tag: '[classifier]', event: 'batch_retry', error: String(retryErr) }))
    try {
      return await attempt(Math.min(temperature + 0.1, 1.0))
    } catch (err) {
      console.log(JSON.stringify({ tag: '[classifier]', event: 'batch_failed', error: String(err) }))
      console.error('[classifier] Batch failed after retry:', err)
      return emails.map((e) => ({
        id: e.id,
        category: 'FYI' as EmailCategory,
        reasoning: 'classification failed',
      }))
    }
  }
}

export async function classifyEmails(
  emails: EmailInput[],
  options: { temperature?: number } = {}
): Promise<Classification[]> {
  if (emails.length === 0) return []

  const { temperature = 0.3 } = options
  const chunks: EmailInput[][] = []
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    chunks.push(emails.slice(i, i + BATCH_SIZE))
  }

  const results = await Promise.all(chunks.map((chunk) => classifyBatch(chunk, temperature)))
  return results.flat()
}
