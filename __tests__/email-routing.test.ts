import { describe, expect, it } from 'vitest'
import { detectReplyChannel } from '@/lib/email-routing'

// ── All 14 platform mappings ──────────────────────────────────────────────────

const platformFixtures: Array<{
  description: string
  sender: string
  app: string
  url: string
}> = [
  { description: 'LinkedIn',   sender: 'LinkedIn <messaging-noreply@linkedin.com>',         app: 'LinkedIn',  url: 'https://www.linkedin.com/messaging/' },
  { description: 'GitHub',     sender: 'GitHub <notifications@github.com>',                  app: 'GitHub',    url: 'https://github.com/notifications' },
  { description: 'Slack',      sender: 'Slack <noreply@slack.com>',                          app: 'Slack',     url: 'https://slack.com' },
  { description: 'X (x.com)',  sender: 'X <notify@x.com>',                                  app: 'X',         url: 'https://x.com/messages' },
  { description: 'Instagram',  sender: 'Instagram <noreply@instagram.com>',                  app: 'Instagram', url: 'https://www.instagram.com/direct/' },
  { description: 'WhatsApp',   sender: 'WhatsApp <noreply@whatsapp.com>',                    app: 'WhatsApp',  url: 'https://web.whatsapp.com/' },
  { description: 'Telegram',   sender: 'Telegram <noreply@telegram.org>',                    app: 'Telegram',  url: 'https://web.telegram.org/' },
  { description: 'Discord',    sender: 'Discord <noreply@discord.com>',                      app: 'Discord',   url: 'https://discord.com/app' },
  { description: 'OLX',        sender: 'OLX <noreply@olx.pt>',                              app: 'OLX',       url: 'https://www.olx.pt/' },
  { description: 'Stripe',     sender: 'Stripe <notifications@stripe.com>',                  app: 'Stripe',    url: 'https://dashboard.stripe.com/' },
  { description: 'Booking',    sender: 'Booking.com <noreply@booking.com>',                  app: 'Booking',   url: 'https://account.booking.com/' },
  { description: 'Airbnb',     sender: 'Airbnb <automated@airbnb.com>',                      app: 'Airbnb',    url: 'https://www.airbnb.com/' },
  { description: 'Uber',       sender: 'Uber <noreply@uber.com>',                            app: 'Uber',      url: 'https://riders.uber.com/' },
  { description: 'Revolut',    sender: 'Revolut <noreply@revolut.com>',                      app: 'Revolut',   url: 'https://app.revolut.com/' },
]

describe('detectReplyChannel — all 14 platforms', () => {
  for (const { description, sender, app, url } of platformFixtures) {
    it(description, () => {
      const result = detectReplyChannel({ sender, subject: '' })
      expect(result).toEqual({ type: 'app', app, url })
    })
  }
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('detectReplyChannel — edge cases', () => {
  it('resolves subdomain sender (messaging-noreply@mail.linkedin.com → LinkedIn)', () => {
    const result = detectReplyChannel({ sender: 'LinkedIn <msg@mail.linkedin.com>', subject: '' })
    expect(result).toEqual({ type: 'app', app: 'LinkedIn', url: 'https://www.linkedin.com/messaging/' })
  })

  it('resolves bare email address without display name', () => {
    const result = detectReplyChannel({ sender: 'noreply@github.com', subject: '' })
    expect(result).toEqual({ type: 'app', app: 'GitHub', url: 'https://github.com/notifications' })
  })

  it('twitter.com alias maps to X (same as x.com)', () => {
    const xResult      = detectReplyChannel({ sender: 'X <notify@x.com>',       subject: '' })
    const twitterResult = detectReplyChannel({ sender: 'Twitter <n@twitter.com>', subject: '' })
    expect(xResult).toEqual(twitterResult)
    expect(twitterResult).toMatchObject({ type: 'app', app: 'X' })
  })

  it('unknown domain falls back to email channel', () => {
    const result = detectReplyChannel({ sender: 'Someone <hello@example.com>', subject: '' })
    expect(result).toEqual({ type: 'email' })
  })

  it('malformed sender with no @ symbol falls back to email channel without throwing', () => {
    expect(() => detectReplyChannel({ sender: 'not-an-email', subject: '' })).not.toThrow()
    expect(detectReplyChannel({ sender: 'not-an-email', subject: '' })).toEqual({ type: 'email' })
  })
})
