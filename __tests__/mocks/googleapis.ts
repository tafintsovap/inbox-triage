import { vi } from 'vitest'

// vi.mock factories run before imports resolve, so vi.fn()s used in a factory
// must be created with vi.hoisted() in the test file, then passed here.
//
// Typical setup in a test file:
//   const { mockSetCredentials, mockRefreshAccessToken, mockGmail } = vi.hoisted(() => ({
//     mockSetCredentials: vi.fn(),
//     mockRefreshAccessToken: vi.fn(),
//     mockGmail: vi.fn(),
//   }))
//   vi.mock('googleapis', () => buildGoogleapisMock({ mockSetCredentials, mockRefreshAccessToken, mockGmail }))

export function buildGoogleapisMock(fns: {
  mockSetCredentials: ReturnType<typeof vi.fn>
  mockRefreshAccessToken: ReturnType<typeof vi.fn>
  mockGmail: ReturnType<typeof vi.fn>
}) {
  return {
    google: {
      auth: {
        OAuth2: class MockOAuth2 {
          setCredentials = fns.mockSetCredentials
          refreshAccessToken = fns.mockRefreshAccessToken
        },
      },
      gmail: fns.mockGmail,
    },
  }
}
