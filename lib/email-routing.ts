export type ReplyChannel =
  | { type: 'email' }
  | {
      type: 'app'
      app: 'LinkedIn' | 'GitHub' | 'Slack' | 'X' | 'Instagram' | 'WhatsApp' | 'Telegram' | 'Discord' | 'OLX' | 'Stripe' | 'Booking' | 'Airbnb' | 'Uber' | 'Revolut'
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

  if (domain.includes('whatsapp.com')) {
    return { type: 'app', app: 'WhatsApp', url: 'https://web.whatsapp.com/' }
  }

  if (domain.includes('telegram.org')) {
    return { type: 'app', app: 'Telegram', url: 'https://web.telegram.org/' }
  }

  if (domain.includes('discord.com')) {
    return { type: 'app', app: 'Discord', url: 'https://discord.com/app' }
  }

  if (domain.includes('olx.pt')) {
    return { type: 'app', app: 'OLX', url: 'https://www.olx.pt/' }
  }

  if (domain.includes('stripe.com')) {
    return { type: 'app', app: 'Stripe', url: 'https://dashboard.stripe.com/' }
  }

  if (domain.includes('booking.com')) {
    return { type: 'app', app: 'Booking', url: 'https://account.booking.com/' }
  }

  if (domain.includes('airbnb.com')) {
    return { type: 'app', app: 'Airbnb', url: 'https://www.airbnb.com/' }
  }

  if (domain.includes('uber.com')) {
    return { type: 'app', app: 'Uber', url: 'https://riders.uber.com/' }
  }

  if (domain.includes('revolut.com')) {
    return { type: 'app', app: 'Revolut', url: 'https://app.revolut.com/' }
  }

  return { type: 'email' }
}
