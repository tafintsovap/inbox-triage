import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: tokenRow } = await supabase
    .from('user_gmail_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  const gmailConnected = tokenRow !== null

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-2xl bg-white px-8 py-10 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Welcome, {user.email}</p>

        <div className="mt-6 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Gmail access:{' '}
          {gmailConnected ? (
            <span className="font-medium text-green-600">&#10003; Connected</span>
          ) : (
            <span className="font-medium text-zinc-400">Not connected</span>
          )}
        </div>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:bg-zinc-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
