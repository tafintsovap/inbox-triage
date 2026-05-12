import { describe, expect, it } from 'vitest'
import { classifyEmails, type EmailInput } from '@/lib/classifier'

const fixtures: Array<{ description: string; email: EmailInput; expected: string }> = [
  {
    description: 'LinkedIn human DM → REPLY',
    email: {
      id: 'test-1',
      sender: 'Gabby Bergonzi <messaging-noreply@linkedin.com>',
      subject: 'Gabby Bergonzi sent you a new message',
      snippet: "Gabby Bergonzi sent you a message: Hi Polina, I'd love to chat about an opportunity in AI infrastructure — your background at...",
    },
    expected: 'REPLY',
  },
  {
    description: 'LinkedIn invitation accepted (automated) → FYI',
    email: {
      id: 'test-2',
      sender: 'LinkedIn <invitations-noreply@linkedin.com>',
      subject: 'Sophie Smith-Walker accepted your invitation',
      snippet: 'Sophie accepted your invitation. You can now explore their full profile and network on LinkedIn.',
    },
    expected: 'FYI',
  },
  {
    description: 'LinkedIn job alert (automated) → FYI',
    email: {
      id: 'test-3',
      sender: 'LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>',
      subject: 'AI/ML Engineer at Sundayy and more jobs for you',
      snippet: 'Full-Stack Engineer job at CodeGeniusRecruit: up to $95/hour. 12 new jobs match your search for ML Engineer.',
    },
    expected: 'FYI',
  },
  {
    description: 'GitHub human comment → REPLY',
    email: {
      id: 'test-4',
      sender: 'GitHub <notifications@github.com>',
      subject: '[inbox-triage] octocat commented on issue #42',
      snippet: "octocat wrote: I think the bug is actually in the auth middleware — have you checked the token refresh path?",
    },
    expected: 'REPLY',
  },
  {
    description: 'Human email with explicit time pressure → URGENT',
    email: {
      id: 'test-5',
      sender: 'Sarah Chen <sarah@acmecorp.com>',
      subject: 'Need your sign-off by EOD today',
      snippet: "Hi Polina, the legal team is waiting on your approval of the contract amendment we discussed Tuesday. Can you confirm by 6pm so we don't miss the filing deadline?",
    },
    expected: 'URGENT',
  },
  {
    description: 'Mass marketing email → SPAM',
    email: {
      id: 'test-6',
      sender: 'Growth Team <promotions@somemarketingdomain.com>',
      subject: 'Increase your conversion rate by 47% with our AI tool',
      snippet: "Hi there, we help businesses like yours scale faster with our cutting-edge AI platform. Book a demo to see how we can transform your workflow...",
    },
    expected: 'SPAM',
  },
]

describe('classifier', () => {
  for (const { description, email, expected } of fixtures) {
    it(description, async () => {
      const [result] = await classifyEmails([email], { temperature: 0 })
      expect(result.category).toBe(expected)
    })
  }
})
