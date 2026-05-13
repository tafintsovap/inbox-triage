import { describe, expect, it } from 'vitest'
import { decode } from 'html-entities'

describe('html-entities decode (Gmail snippet/subject sanitization)', () => {
  it("decodes &#39; to apostrophe", () => {
    expect(decode('&#39;')).toBe("'")
  })

  it('decodes &amp; to ampersand', () => {
    expect(decode('&amp;')).toBe('&')
  })

  it('decodes a realistic snippet with multiple entities', () => {
    expect(decode("don&#39;t miss &mdash; it&#39;s here")).toBe("don't miss — it's here")
  })

  it('decodes named entity &eacute; to é', () => {
    expect(decode('caf&eacute;')).toBe('café')
  })
})
