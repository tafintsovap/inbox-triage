import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGmailClient } from '@/lib/gmail'
import { configureAdminClient } from './mocks/supabase'

// vi.hoisted() ensures these vi.fn()s exist before vi.mock factories run.
const { mockSetCredentials, mockRefreshAccessToken, mockGmail } = vi.hoisted(() => ({
  mockSetCredentials: vi.fn(),
  mockRefreshAccessToken: vi.fn(),
  mockGmail: vi.fn(),
}))

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class MockOAuth2 {
        setCredentials = mockSetCredentials
        refreshAccessToken = mockRefreshAccessToken
      },
    },
    gmail: mockGmail,
  },
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

const USER_ID = 'user-123'

const FRESH = {
  access_token: 'old-token',
  refresh_token: 'refresh-token',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
}
const EXPIRED = {
  access_token: 'old-token',
  refresh_token: 'refresh-token',
  expires_at: new Date(Date.now() - 60_000).toISOString(),
}

describe('getGmailClient — token expiry', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGmail.mockReturnValue({})
  })

  it('returns client without refreshing when token is fresh', async () => {
    const { singleMock } = configureAdminClient()
    singleMock.mockResolvedValueOnce({ data: FRESH, error: null })

    const client = await getGmailClient(USER_ID)

    expect(mockRefreshAccessToken).not.toHaveBeenCalled()
    expect(mockGmail).toHaveBeenCalledOnce()
    expect(client).toBeDefined()
  })

  it('calls refreshAndPersistToken and updates DB when token is expired', async () => {
    const { singleMock, updateMock } = configureAdminClient()
    singleMock.mockResolvedValueOnce({ data: EXPIRED, error: null })
    mockRefreshAccessToken.mockResolvedValueOnce({
      credentials: { access_token: 'new-token', expiry_date: Date.now() + 3_600_000 },
    })

    await getGmailClient(USER_ID)

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce()
    expect(mockSetCredentials).toHaveBeenLastCalledWith(
      expect.objectContaining({ access_token: 'new-token' })
    )
    expect(updateMock).toHaveBeenCalledOnce()
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: 'new-token' })
    )
  })

  it('treats token at boundary (expires_at === now) as expired', async () => {
    const { singleMock } = configureAdminClient()
    singleMock.mockResolvedValueOnce({
      data: { ...EXPIRED, expires_at: new Date().toISOString() },
      error: null,
    })
    mockRefreshAccessToken.mockResolvedValueOnce({
      credentials: { access_token: 'new-token', expiry_date: Date.now() + 3_600_000 },
    })

    await getGmailClient(USER_ID)

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce()
  })
})
