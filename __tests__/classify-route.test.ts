import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/classify/route'
import { classifyEmails } from '@/lib/classifier'
import { configureServerClient } from './mocks/supabase'
import { makeJsonRequest } from './helpers/request'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/classifier', () => ({ classifyEmails: vi.fn() }))

const mockUser = { id: 'user-123' }

describe('POST /api/classify', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when there is no authenticated user', async () => {
    configureServerClient(null)
    const res = await POST(makeJsonRequest('http://localhost/api/classify', { emails: [] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for malformed JSON body', async () => {
    configureServerClient(mockUser)
    const req = new Request('http://localhost/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when body.emails is not an array', async () => {
    configureServerClient(mockUser)
    const res = await POST(makeJsonRequest('http://localhost/api/classify', { emails: 'not-an-array' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 and calls classifyEmails with the input array', async () => {
    configureServerClient(mockUser)
    const emails = [{ id: '1', subject: 'Test', sender: 'a@b.com', snippet: 'hi' }]
    vi.mocked(classifyEmails).mockResolvedValueOnce([
      { id: '1', category: 'FYI', reasoning: 'auto-generated' },
    ])

    const res = await POST(makeJsonRequest('http://localhost/api/classify', { emails }))

    expect(res.status).toBe(200)
    expect(vi.mocked(classifyEmails)).toHaveBeenCalledOnce()
    expect(vi.mocked(classifyEmails)).toHaveBeenCalledWith(emails)
    const body = await res.json()
    expect(body.classifications).toEqual([{ id: '1', category: 'FYI', reasoning: 'auto-generated' }])
  })
})
