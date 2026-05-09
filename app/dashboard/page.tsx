'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Email {
  id: string
  threadId: string
  subject: string
  sender: string
  snippet: string
  body: string
}

interface Classification {
  id: string
  category: 'URGENT' | 'REPLY' | 'FYI' | 'SPAM'
  reasoning: string
}

interface TriagedEmail extends Email {
  category: Classification['category']
  reasoning: string
}

type Status = 'idle' | 'fetching' | 'classifying' | 'done' | 'error'

const CATEGORIES = ['URGENT', 'REPLY', 'FYI', 'SPAM'] as const

const CATEGORY_STYLES: Record<
  Classification['category'],
  { headerBg: string; countBg: string; countText: string; label: string }
> = {
  URGENT: {
    headerBg: 'bg-red-50',
    countBg: 'bg-red-100',
    countText: 'text-red-600',
    label: 'URGENT',
  },
  REPLY: {
    headerBg: 'bg-blue-50',
    countBg: 'bg-blue-100',
    countText: 'text-blue-600',
    label: 'REPLY',
  },
  FYI: {
    headerBg: 'bg-gray-50',
    countBg: 'bg-gray-100',
    countText: 'text-gray-500',
    label: 'FYI',
  },
  SPAM: {
    headerBg: 'bg-neutral-100',
    countBg: 'bg-neutral-200',
    countText: 'text-neutral-500',
    label: 'SPAM',
  },
}

// Extract just the display name from "Name <email>" or return the raw string
function senderName(raw: string): string {
  const match = raw.match(/^([^<]+)</)
  return match ? match[1].trim() : raw
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [emails, setEmails] = useState<TriagedEmail[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<TriagedEmail | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  useEffect(() => {
    loadInbox()
  }, [])

  async function loadInbox() {
    setStatus('fetching')
    setError(null)
    setEmails([])

    let fetchedEmails: Email[]
    try {
      const res = await fetch('/api/fetch-emails')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `fetch-emails failed (${res.status})`)
      }
      const data = await res.json()
      fetchedEmails = data.emails as Email[]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
      setStatus('error')
      return
    }

    if (fetchedEmails.length === 0) {
      setEmails([])
      setStatus('done')
      return
    }

    setStatus('classifying')

    let classifications: Classification[]
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: fetchedEmails.map(({ id, subject, sender, snippet }) => ({
            id,
            subject,
            sender,
            snippet,
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `classify failed (${res.status})`)
      }
      const data = await res.json()
      classifications = data.classifications as Classification[]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to classify emails')
      setStatus('error')
      return
    }

    const classMap = new Map(classifications.map((c) => [c.id, c]))
    const triaged: TriagedEmail[] = fetchedEmails.map((email) => {
      const cls = classMap.get(email.id)
      return {
        ...email,
        category: cls?.category ?? 'FYI',
        reasoning: cls?.reasoning ?? '',
      }
    })

    setEmails(triaged)
    setStatus('done')
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const byCategory = (cat: Classification['category']) =>
    emails.filter((e) => e.category === cat)

  const loading = status === 'fetching' || status === 'classifying'

  return (
    // Outer wrapper: full viewport height, flex column so header + board fill screen
    <div className="flex h-screen flex-col overflow-hidden bg-white">

      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 sm:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold text-zinc-900">Inbox Triage</h1>
          {userEmail && (
            <span className="hidden text-xs text-zinc-400 sm:inline">{userEmail}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Spinner />
              {status === 'fetching' ? 'Loading inbox…' : 'Classifying…'}
            </span>
          )}
          <button
            onClick={loadInbox}
            disabled={loading}
            className="rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Refresh
          </button>
          <button
            onClick={signOut}
            className="rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {status === 'error' && error && (
        <div className="flex shrink-0 items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2">
          <p className="text-xs font-medium text-red-700">{error}</p>
          <button
            onClick={loadInbox}
            className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Kanban board ── */}
      {/*
        Mobile  (<640px):  1 col, vertical stack
        Tablet  (640-1023): 2 cols
        Desktop (≥1024px): 4 cols
        Each column is a flex-col that fills remaining height; cards scroll inside.
      */}
      <div className="grid flex-1 grid-cols-1 divide-x divide-zinc-100 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const group = byCategory(cat)
          const style = CATEGORY_STYLES[cat]
          return (
            <div key={cat} className="flex flex-col overflow-hidden">
              {/* Sticky column header */}
              <div
                className={`${style.headerBg} sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-200 px-3 py-2`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  {cat}
                </span>
                <span
                  className={`${style.countBg} ${style.countText} rounded-full px-1.5 py-0.5 text-xs font-medium`}
                >
                  {group.length}
                </span>
              </div>

              {/* Scrollable card list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {group.length === 0 ? (
                  <p className="px-1 pt-3 text-xs text-zinc-300">No emails</p>
                ) : (
                  group.map((email) => (
                    <EmailCard
                      key={email.id}
                      email={email}
                      onClick={() => setSelected(email)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Detail drawer/modal ── */}
      {selected && (
        <DetailModal email={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ── Compact email card ──────────────────────────────────────────────────────

function EmailCard({
  email,
  onClick,
}: {
  email: TriagedEmail
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-left transition-all hover:border-zinc-300 hover:shadow-sm active:scale-[0.99]"
    >
      <p className="truncate text-xs font-medium text-zinc-800">
        {senderName(email.sender)}
      </p>
      <p className="truncate text-xs text-zinc-500">{email.subject}</p>
    </button>
  )
}

// ── Detail modal ────────────────────────────────────────────────────────────

function DetailModal({
  email,
  onClose,
}: {
  email: TriagedEmail
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from the right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Email detail"
        className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl"
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-semibold leading-snug text-zinc-900">
              {email.subject}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">{email.sender}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Preview
            </p>
            <p className="text-sm leading-relaxed text-zinc-700">{email.snippet}</p>
          </div>

          {email.reasoning && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Why this category
              </p>
              <p className="text-xs italic text-zinc-500">{email.reasoning}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Utilities ───────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
