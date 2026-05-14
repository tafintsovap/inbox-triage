import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyEmails, type EmailInput } from '@/lib/classifier'
import { anthropic } from '@/lib/anthropic'

vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: vi.fn() } },
}))

function makeEmails(count: number): EmailInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `email-${i + 1}`,
    subject: `Subject ${i + 1}`,
    sender: `sender${i + 1}@example.com`,
    snippet: `Snippet ${i + 1}`,
  }))
}

function batchSizeAtCall(callIndex: number): number {
  const content = vi.mocked(anthropic.messages.create).mock.calls[callIndex][0].messages[0].content
  return (JSON.parse(content as string) as unknown[]).length
}

describe('classifyEmails — chunking', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(anthropic.messages.create).mockImplementation(async (params: any) => {
      const emails: Array<{ id: string }> = JSON.parse(params.messages[0].content)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(emails.map(e => ({ id: e.id, category: 'FYI', reasoning: 'test' }))),
        }],
      } as never
    })
  })

  it('16 emails → 2 calls (15 + 1), results flattened correctly', async () => {
    const emails = makeEmails(16)
    const results = await classifyEmails(emails)

    expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledTimes(2)
    expect(batchSizeAtCall(0)).toBe(15)
    expect(batchSizeAtCall(1)).toBe(1)
    expect(results).toHaveLength(16)
    expect(results.map(r => r.id)).toEqual(emails.map(e => e.id))
  })

  it('30 emails → 2 calls of 15 each', async () => {
    const results = await classifyEmails(makeEmails(30))

    expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledTimes(2)
    expect(batchSizeAtCall(0)).toBe(15)
    expect(batchSizeAtCall(1)).toBe(15)
    expect(results).toHaveLength(30)
  })

  it('31 emails → 3 calls (15 + 15 + 1)', async () => {
    const results = await classifyEmails(makeEmails(31))

    expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledTimes(3)
    expect(batchSizeAtCall(0)).toBe(15)
    expect(batchSizeAtCall(1)).toBe(15)
    expect(batchSizeAtCall(2)).toBe(1)
    expect(results).toHaveLength(31)
  })

  it('exactly 15 emails → 1 call, no chunking', async () => {
    const results = await classifyEmails(makeEmails(15))

    expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledTimes(1)
    expect(batchSizeAtCall(0)).toBe(15)
    expect(results).toHaveLength(15)
  })

  it('empty input → 0 calls, returns []', async () => {
    const results = await classifyEmails([])

    expect(vi.mocked(anthropic.messages.create)).not.toHaveBeenCalled()
    expect(results).toEqual([])
  })
})
