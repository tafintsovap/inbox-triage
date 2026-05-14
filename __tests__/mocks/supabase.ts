import { vi } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Call after vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
export function configureServerClient(user: object | null) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null })
  const exchangeCodeForSession = vi.fn()
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser, exchangeCodeForSession },
  } as any)
  return { getUser, exchangeCodeForSession }
}

// Call after vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
// Returns named terminal mocks so tests can assert and configure without digging the chain.
export function configureAdminClient() {
  const singleMock = vi.fn().mockResolvedValue({ data: null, error: null })
  const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null })
  const updateMock = vi.fn()

  const chain: any = {
    select: vi.fn(),
    eq: vi.fn(),
    single: singleMock,
    update: updateMock,
    upsert: upsertMock,
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  updateMock.mockReturnValue(chain)

  const fromMock = vi.fn().mockReturnValue(chain)
  vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as any)

  return { fromMock, singleMock, upsertMock, updateMock }
}
