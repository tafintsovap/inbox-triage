import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyEmails } from '@/lib/classifier'
import { anthropic } from '@/lib/anthropic'
import { makeClassifierResponse } from './fixtures/anthropic'

vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: vi.fn() } },
}))

const singleEmail = [{ id: '1', subject: 'Hello', sender: 'a@b.com', snippet: 'hi' }]

describe('classifyBatch — fallback paths', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns FYI fallback for every email when both attempts throw', async () => {
    vi.mocked(anthropic.messages.create).mockRejectedValue(new Error('API down'))

    const emails = [
      { id: '1', subject: 'A', sender: 'a@b.com', snippet: 'x' },
      { id: '2', subject: 'B', sender: 'c@d.com', snippet: 'y' },
    ]
    const results = await classifyEmails(emails)

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ id: '1', category: 'FYI', reasoning: 'classification failed' })
    expect(results[1]).toEqual({ id: '2', category: 'FYI', reasoning: 'classification failed' })
    // Called twice: initial attempt + one retry
    expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledTimes(2)
  })

  it('returns first-attempt classifications when the first call succeeds', async () => {
    const mockResults = [{ id: '1', category: 'REPLY', reasoning: 'human message' }]
    vi.mocked(anthropic.messages.create).mockResolvedValueOnce(makeClassifierResponse(mockResults) as never)

    const results = await classifyEmails(singleEmail)

    expect(results).toEqual(mockResults)
    // No retry — first attempt succeeded
    expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledTimes(1)
  })

  it('returns retry classifications when first attempt throws but retry succeeds', async () => {
    const retryResults = [{ id: '1', category: 'URGENT', reasoning: 'deadline today' }]
    vi.mocked(anthropic.messages.create)
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce(makeClassifierResponse(retryResults) as never)

    const results = await classifyEmails(singleEmail)

    expect(results).toEqual(retryResults)
    expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledTimes(2)
  })
})
