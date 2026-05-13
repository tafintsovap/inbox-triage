import { describe, expect, it } from 'vitest'
import { buildRawMessage } from '@/app/api/send-email/route'

// Decode a base64url-encoded MIME message back to a UTF-8 string for inspection
function decodeRaw(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

const base = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Meeting notes',
  body: 'Sounds good, talk soon.',
  threadId: 'thread-abc-123',
}

describe('buildRawMessage', () => {
  it('produces a base64url string (no +, /, or = padding)', () => {
    const result = buildRawMessage(base)
    expect(result).not.toMatch(/[+/=]/)
  })

  it('decoded output contains all required MIME headers', () => {
    const decoded = decodeRaw(buildRawMessage(base))
    expect(decoded).toContain('From: sender@example.com')
    expect(decoded).toContain('To: recipient@example.com')
    expect(decoded).toContain('Subject: Re: Meeting notes')
    expect(decoded).toContain('In-Reply-To: thread-abc-123')
    expect(decoded).toContain('References: thread-abc-123')
    expect(decoded).toContain('Content-Type: text/plain; charset=utf-8')
    expect(decoded).toContain('Sounds good, talk soon.')
  })

  it('does not double-prefix Re: when subject already starts with "Re:"', () => {
    const decoded = decodeRaw(buildRawMessage({ ...base, subject: 'Re: Meeting notes' }))
    expect(decoded).toContain('Subject: Re: Meeting notes')
    expect(decoded).not.toContain('Subject: Re: Re:')
  })

  it('prepends Re: when subject does not already start with it', () => {
    const decoded = decodeRaw(buildRawMessage({ ...base, subject: 'Meeting notes' }))
    expect(decoded).toContain('Subject: Re: Meeting notes')
  })

  it('headers are joined with CRLF line endings', () => {
    const decoded = decodeRaw(buildRawMessage(base))
    expect(decoded).toContain('From: sender@example.com\r\nTo: recipient@example.com')
  })

  it('body content is preserved after the MIME header block', () => {
    const body = 'First line.\nSecond line.'
    const decoded = decodeRaw(buildRawMessage({ ...base, body }))
    expect(decoded).toContain(body)
  })

  it('UTF-8 characters in subject pass through correctly (RFC 2047 not applied)', () => {
    // NOTE: buildRawMessage does not RFC-2047-encode non-ASCII subject chars.
    // Gmail's send API accepts raw UTF-8 in the base64url-encoded message body,
    // so this works in practice but is technically non-spec for SMTP relay.
    const decoded = decodeRaw(buildRawMessage({ ...base, subject: 'Réunion demain' }))
    expect(decoded).toContain('Subject: Re: Réunion demain')
  })
})
