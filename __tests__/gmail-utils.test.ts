import { describe, expect, it } from 'vitest'
import { decodeBase64, extractPlainTextBody } from '@/lib/gmail'
import {
  singlePartTextPlain,
  multipartWithPlainFirst,
  multipartHtmlOnly,
  emptyPayload,
  nestedMultipart,
  textWithHtmlEntities,
} from './fixtures/gmail'

// ── decodeBase64 ─────────────────────────────────────────────────────────────

describe('decodeBase64', () => {
  it('decodes standard base64 to UTF-8', () => {
    // 'Hello, world!' → standard base64 'SGVsbG8sIHdvcmxkIQ=='
    expect(decodeBase64('SGVsbG8sIHdvcmxkIQ==')).toBe('Hello, world!')
  })

  it('normalises URL-safe base64 (- replaces +)', () => {
    // 'Ma>' → standard base64 'TWE+' → url-safe 'TWE-'
    expect(decodeBase64('TWE-')).toBe('Ma>')
  })

  it('normalises URL-safe base64 (_ replaces /)', () => {
    // '?~?' → standard base64 'P34/' → url-safe 'P34_'
    expect(decodeBase64('P34_')).toBe('?~?')
  })

  it('handles empty string', () => {
    expect(decodeBase64('')).toBe('')
  })

  it('decodes multi-byte UTF-8 (accented chars)', () => {
    // 'café' → base64url 'Y2Fmw6k' (stripped padding)
    expect(decodeBase64('Y2Fmw6k')).toBe('café')
  })
})

// ── extractPlainTextBody ──────────────────────────────────────────────────────

describe('extractPlainTextBody', () => {
  it('returns decoded text for single-part text/plain', () => {
    expect(extractPlainTextBody(singlePartTextPlain)).toBe('Hello, world!')
  })

  it('returns text/plain part when multipart contains both plain and html', () => {
    expect(extractPlainTextBody(multipartWithPlainFirst)).toBe('Plain text content')
  })

  it('returns decoded html when no text/plain part exists (fallback to first part with data)', () => {
    expect(extractPlainTextBody(multipartHtmlOnly)).toBe('<p>Only HTML here</p>')
  })

  it('returns empty string for payload with no parts and no body data', () => {
    expect(extractPlainTextBody(emptyPayload)).toBe('')
  })

  it('returns empty string for nested multipart — KNOWN LIMITATION: function does not recurse', () => {
    // The text/plain is one level deeper than the function searches.
    // This documents current behaviour; see extractPlainTextBody in lib/gmail.ts.
    expect(extractPlainTextBody(nestedMultipart)).toBe('')
  })

  it('decodes html entities present in the plain-text body', () => {
    expect(extractPlainTextBody(textWithHtmlEntities)).toBe("don't miss & enjoy café")
  })
})
