'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes:
          'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#090909] text-white"
      style={{
        background:
          'radial-gradient(ellipse 90% 45% at 50% -5%, rgba(139,92,246,0.13), transparent), #090909',
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* ── Nav ── */}
      <nav className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-lg font-semibold tracking-tight text-white">
          Inbox Triage
        </span>
        <button
          onClick={signInWithGoogle}
          className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
        >
          Sign in
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:px-10 sm:pt-28">
        {/* Beta badge */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          Private beta
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[72px]">
          Your inbox,{' '}
          <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            triaged by AI.
          </span>
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Claude classifies your last 50 unreads into Urgent, Reply, FYI, and
          Spam — drafts replies in your voice — and routes you to the right app
          when email isn&apos;t where the conversation lives.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 shadow-lg transition-all hover:shadow-purple-500/20 hover:shadow-2xl hover:scale-[1.02] active:scale-100"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
          <p className="text-xs text-zinc-600">
            Currently in private beta &mdash;{' '}
            <a
              href="https://www.linkedin.com/in/polina-tafintsova"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline decoration-zinc-700 underline-offset-2 transition-colors hover:text-white"
            >
              DM for access
            </a>
          </p>
        </div>
      </section>

      {/* ── Hero visual: dashboard mock ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 sm:px-8">
        {/* Glow behind card */}
        <div className="absolute inset-x-0 top-0 mx-auto h-48 w-2/3 rounded-full bg-violet-600/15 blur-3xl" />

        <div
          className="relative overflow-hidden rounded-xl border border-white/8 bg-[#111111] shadow-2xl shadow-black/60"
          style={{
            transform: 'perspective(1400px) rotateX(5deg)',
            transformOrigin: 'center top',
          }}
        >
          {/* Mock topbar */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[#0e0e0e] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-white">Inbox Triage</span>
              <span className="hidden text-xs text-zinc-600 sm:inline">
                you@example.com
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-14 rounded bg-white/5" />
              <div className="h-5 w-10 rounded bg-white/5" />
            </div>
          </div>

          {/* Mock kanban */}
          <div className="grid grid-cols-2 divide-x divide-white/5 sm:grid-cols-4">
            {[
              {
                label: 'URGENT',
                color: 'text-red-400',
                dot: 'bg-red-500',
                bg: 'bg-red-500/8',
                cards: [
                  { sender: 'Alex Morgan', subject: 'Investor call — need EOD confirm' },
                  { sender: 'Jordan Park', subject: 'Blocking: need your input now' },
                ],
              },
              {
                label: 'REPLY',
                color: 'text-blue-400',
                dot: 'bg-blue-500',
                bg: 'bg-blue-500/8',
                cards: [
                  { sender: 'Lena Chen', subject: 'Founding AI Eng — £140K + equity' },
                  { sender: 'Sarah Wu', subject: 'Re: intro to Tom at a16z' },
                  { sender: 'TechCrunch', subject: 'Press inquiry — comment by Fri' },
                ],
              },
              {
                label: 'FYI',
                color: 'text-zinc-400',
                dot: 'bg-zinc-500',
                bg: 'bg-white/[0.03]',
                cards: [
                  { sender: 'GitHub', subject: 'PR #142 merged into main' },
                  { sender: 'LinkedIn', subject: '3 new followers this week' },
                  { sender: 'Vercel', subject: 'Deployment successful' },
                ],
              },
              {
                label: 'SPAM',
                color: 'text-zinc-600',
                dot: 'bg-zinc-700',
                bg: 'bg-white/[0.015]',
                cards: [
                  { sender: 'GrowthHQ', subject: 'Increase ARR by 312% with AI' },
                  { sender: 'SalesBot', subject: 'Is now a good time to connect?' },
                ],
              },
            ].map((col) => (
              <div key={col.label} className="flex min-h-[180px] flex-col">
                <div
                  className={`${col.bg} flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-2`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                  <span className={`text-[10px] font-semibold tracking-widest ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="ml-auto rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] text-zinc-600">
                    {col.cards.length}
                  </span>
                </div>
                <div className="space-y-1.5 p-2">
                  {col.cards.map((card) => (
                    <div
                      key={card.subject}
                      className="rounded-md border border-white/5 bg-white/[0.035] px-2.5 py-2"
                    >
                      <p className="truncate text-[10px] font-medium text-zinc-300">
                        {card.sender}
                      </p>
                      <p className="truncate text-[10px] text-zinc-600">{card.subject}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 sm:px-10">
        <div className="overflow-hidden rounded-xl border border-white/5">
          <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
                title: 'Classify',
                desc: 'One pass. Claude reads every unread and sorts it into four buckets — Urgent, Reply, FYI, Spam — in seconds.',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 3h10v8H3zM6 11v2M10 11v2M5 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Draft',
                desc: 'Open an email, get a reply drafted in your voice. Short and casual when that fits. You edit or send as-is.',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                title: 'Route',
                desc: 'LinkedIn DMs stay on LinkedIn. GitHub pings stay on GitHub. We tell you where the conversation actually lives.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-[#0d0d0d] px-6 py-7">
                <div className="mb-3 text-zinc-500">{f.icon}</div>
                <h3 className="mb-2 text-sm font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-12 text-center sm:px-10">
        <p className="text-xs tracking-wide text-zinc-700">
          Next.js &middot; Claude &middot; Supabase &middot; Gmail API
        </p>
      </div>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-7">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 sm:px-10">
          <p className="text-xs text-zinc-700">&copy; Polina Tafintsova 2026</p>
          <div className="flex items-center gap-5">
            <a
              href="https://twitter.com/tafintsovap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 transition-colors hover:text-zinc-300"
            >
              Twitter
            </a>
            <a
              href="https://www.linkedin.com/in/polina-tafintsova"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 transition-colors hover:text-zinc-300"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  )
}
