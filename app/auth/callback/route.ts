import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')

  if (!code) {
    redirect('/login?error=missing_code')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  const { session } = data
  const userId = session.user.id
  const accessToken = session.provider_token
  const refreshToken = session.provider_refresh_token

  if (accessToken && refreshToken) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const admin = createAdminClient()

    await admin.from('user_gmail_tokens').upsert(
      {
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope: session.user.app_metadata?.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  }

  redirect('/dashboard')
}
