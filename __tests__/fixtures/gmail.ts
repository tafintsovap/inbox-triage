// Encode a UTF-8 string to base64url — the format Gmail uses for body.data
export function toBase64url(text: string): string {
  return Buffer.from(text, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

type Part = {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: unknown[]
}

type GmailPayload = {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: Part[] | null
}

// 1. Single-part text/plain
export const singlePartTextPlain: GmailPayload = {
  mimeType: 'text/plain',
  body: { data: toBase64url('Hello, world!') },
}

// 2. Multipart with text/plain first, then text/html
export const multipartWithPlainFirst: GmailPayload = {
  mimeType: 'multipart/alternative',
  body: null,
  parts: [
    { mimeType: 'text/plain', body: { data: toBase64url('Plain text content') } },
    { mimeType: 'text/html', body: { data: toBase64url('<p>HTML content</p>') } },
  ],
}

// 3. Multipart HTML-only — no text/plain, fallback returns first part with data
export const multipartHtmlOnly: GmailPayload = {
  mimeType: 'multipart/alternative',
  body: null,
  parts: [
    { mimeType: 'text/html', body: { data: toBase64url('<p>Only HTML here</p>') } },
  ],
}

// 4. Empty payload — no parts, no body data
export const emptyPayload: GmailPayload = {
  mimeType: 'multipart/mixed',
  body: null,
  parts: null,
}

// 5. Nested multipart — text/plain lives inside a child multipart/alternative.
//    extractPlainTextBody does NOT recurse into nested parts, so it returns ''.
//    KNOWN LIMITATION: the function would need recursion to handle this Gmail
//    structure. Documented here; fix is a separate code-change prompt.
export const nestedMultipart: GmailPayload = {
  mimeType: 'multipart/mixed',
  body: null,
  parts: [
    {
      mimeType: 'multipart/alternative',
      body: null,
      parts: [
        { mimeType: 'text/plain', body: { data: toBase64url('Nested plain text') } },
        { mimeType: 'text/html', body: { data: toBase64url('<p>Nested HTML</p>') } },
      ],
    },
  ],
}

// 6. Plain text body containing HTML entities (confirms decode() is applied)
export const textWithHtmlEntities: GmailPayload = {
  mimeType: 'text/plain',
  body: { data: toBase64url("don&#39;t miss &amp; enjoy caf&eacute;") },
}
