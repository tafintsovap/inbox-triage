export type ReplyChannel =
  | { type: 'email' }
  | {
      type: 'app'
      app: 'LinkedIn' | 'GitHub' | 'Slack' | 'X' | 'Instagram' | 'WhatsApp'
      url: string
    }

function senderDomain(sender: string): string {
  // "Name <user@domain.com>" or just "user@domain.com"
  const match = sender.match(/<[^@]+@([^>]+)>/) ?? sender.match(/@([^\s>]+)/)
  return match ? match[1].toLowerCase() : ''
}

export function detectReplyChannel(email: {
  sender: string
  subject: string
}): ReplyChannel {
  const domain = senderDomain(email.sender)

  if (domain.includes('linkedin.com')) {
    return { type: 'app', app: 'LinkedIn', url: 'https://www.linkedin.com/messaging/' }
  }

  if (domain.includes('github.com')) {
    return { type: 'app', app: 'GitHub', url: 'https://github.com/notifications' }
  }

  if (domain.includes('slack.com')) {
    return { type: 'app', app: 'Slack', url: 'https://slack.com' }
  }

  if (domain.includes('x.com') || domain.includes('twitter.com')) {
    return { type: 'app', app: 'X', url: 'https://x.com/messages' }
  }

  if (domain.includes('instagram.com')) {
    return { type: 'app', app: 'Instagram', url: 'https://www.instagram.com/direct/' }
  }

  return { type: 'email' }
}
