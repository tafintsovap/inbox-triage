import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/auth/callback/route'
import { redirect } from 'next/navigation'
import { configureServerClient, configureAdminClient } from './mocks/supabase'
import { makeNextRequest } from './helpers/request'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(url), { digest: 'NEXT_REDIRECT' })
  }),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

const BASE = 'http://localhost/auth/callback'

async function callGET(url: string): Promise<void> {
  try {
    await GET(makeNextRequest(url))
  } catch (err: any) {
    if (err.digest === 'NEXT_REDIRECT') return
    throw err
  }
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(redirect).mockImplementation((url: string) => {
      throw Object.assign(new Error(url), { digest: 'NEXT_REDIRECT' })
    })
  })

  it('redirects to /login?error=missing_code when code param is absent', async () => {
    await callGET(BASE)
    expect(vi.mocked(redirect)).toHaveBeenCalledOnce()
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/login?error=missing_code')
  })

  it('redirects to /login with encoded error message on Supabase exchange error', async () => {
    const { exchangeCodeForSession } = configureServerClient(null)
    exchangeCodeForSession.mockResolvedValueOnce({
      data: null,
      error: { message: 'OAuth exchange failed' },
    })

    await callGET(`${BASE}?code=bad-code`)

    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      `/login?error=${encodeURIComponent('OAuth exchange failed')}`
    )
  })

  it('upserts tokens and redirects to /dashboard when provider tokens are present', async () => {
    const { upsertMock } = configureAdminClient()
    const { exchangeCodeForSession } = configureServerClient(null)
    exchangeCodeForSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'user-123', app_metadata: { scope: 'email openid' } },
          provider_token: 'access-token-abc',
          provider_refresh_token: 'refresh-token-xyz',
        },
      },
      error: null,
    })

    await callGET(`${BASE}?code=valid-code`)

    expect(upsertMock).toHaveBeenCalledOnce()
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        access_token: 'access-token-abc',
        refresh_token: 'refresh-token-xyz',
        expires_at: expect.any(String),
      }),
      { onConflict: 'user_id' }
    )
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard')
  })

  it('skips upsert and redirects to /dashboard when provider tokens are absent', async () => {
    const { upsertMock } = configureAdminClient()
    const { exchangeCodeForSession } = configureServerClient(null)
    exchangeCodeForSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'user-123', app_metadata: {} },
          provider_token: null,
          provider_refresh_token: null,
        },
      },
      error: null,
    })

    await callGET(`${BASE}?code=valid-code`)

    expect(upsertMock).not.toHaveBeenCalled()
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard')
  })
})
