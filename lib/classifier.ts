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

REPLY — A real human expects a response from the user, but no time pressure stated. This includes: cold outreach that specifically references the recipient's actual work/company/background; recruiter messages with concrete role + compensation; founder/journalist intros that name something the recipient has done; replies from earlier conversations.

FYI — Notifications, automated emails, or messages where the action (if any) happens outside email. Examples: LinkedIn invites/messages/job alerts, GitHub notifications, calendar invites, Slack digests, application confirmations, receipt emails, social platform activity, security alerts. Even if the email reads as 'from a person', if the action is in another app, classify FYI.

SPAM — Mass-sent marketing, generic sales pitches with no specific reference to the recipient, newsletters, promotional offers, 'increase your X by Y%' templates, anything that would also be sent to thousands of other inboxes unchanged.

DECISION HEURISTICS (in order of priority):
1. Did the sender include something that proves they know the recipient specifically (their company, their role, a project they did, something they wrote)? → REPLY or URGENT, never SPAM.
2. Could this exact email body have been sent to 10,000 other people unchanged? → SPAM.
3. Is the action somewhere other than email (LinkedIn, GitHub, etc.)? → FYI even if a real human sent it.
4. When uncertain between REPLY and SPAM, default to REPLY. SPAM should be reserved for content that is unambiguously promotional (newsletters, sales pitches selling a product, automated marketing). When in doubt about a recruiter or business outreach email, even if it uses generic templated language, classify as REPLY — the user can dismiss it in one click but cannot recover from missing it in spam.
5. When uncertain between URGENT and REPLY, default to REPLY (only escalate when time pressure is explicit).

Return ONLY a valid JSON array. No prose, no markdown fences. Each object: { id, category, reasoning } where reasoning is under 15 words and explains WHY that category.`

const BATCH_SIZE = 15

async function classifyBatch(emails: EmailInput[]): Promise<Classification[]> {
  const userMessage = JSON.stringify(
    emails.map(({ id, subject, sender, snippet }) => ({ id, subject, sender, snippet }))
  )

  const attempt = async (): Promise<Classification[]> => {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = textBlock?.type === 'text' ? textBlock.text : ''
    return JSON.parse(raw) as Classification[]
  }

  try {
    return await attempt()
  } catch {
    try {
      return await attempt()
    } catch (err) {
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
  emails: EmailInput[]
): Promise<Classification[]> {
  if (emails.length === 0) return []

  const chunks: EmailInput[][] = []
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    chunks.push(emails.slice(i, i + BATCH_SIZE))
  }

  const results = await Promise.all(chunks.map(classifyBatch))
  return results.flat()
}
