'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectReplyChannel, type ReplyChannel } from '@/lib/email-routing'

// ── Types ────────────────────────────────────────────────────────────────────

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

type LoadStatus = 'idle' | 'fetching' | 'classifying' | 'done' | 'error'
type DraftStatus = 'idle' | 'drafting' | 'ready' | 'sending' | 'sent' | 'error'

const CATEGORIES = ['URGENT', 'REPLY', 'FYI', 'SPAM'] as const

const CATEGORY_STYLES: Record<
  Classification['category'],
  { headerBg: string; countBg: string; countText: string }
> = {
  URGENT: { headerBg: 'bg-red-50',     countBg: 'bg-red-100',     countText: 'text-red-600'     },
  REPLY:  { headerBg: 'bg-blue-50',    countBg: 'bg-blue-100',    countText: 'text-blue-600'    },
  FYI:    { headerBg: 'bg-gray-50',    countBg: 'bg-gray-100',    countText: 'text-gray-500'    },
  SPAM:   { headerBg: 'bg-neutral-100',countBg: 'bg-neutral-200', countText: 'text-neutral-500' },
}

function senderName(raw: string): string {
  const match = raw.match(/^([^<]+)</)
  return match ? match[1].trim() : raw
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [emails, setEmails] = useState<TriagedEmail[]>([])
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<TriagedEmail | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
  }, [])

  useEffect(() => { loadInbox() }, [])

  async function loadInbox() {
    setLoadStatus('fetching')
    setLoadError(null)
    setEmails([])
    setSelected(null)

    let fetchedEmails: Email[]
    try {
      const res = await fetch('/api/fetch-emails')
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error ?? `fetch-emails failed (${res.status})`)
      }
      fetchedEmails = (await res.json()).emails as Email[]
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to fetch emails')
      setLoadStatus('error')
      return
    }

    if (fetchedEmails.length === 0) { setLoadStatus('done'); return }
    setLoadStatus('classifying')

    let classifications: Classification[]
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: fetchedEmails.map(({ id, subject, sender, snippet }) => ({ id, subject, sender, snippet })),
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error ?? `classify failed (${res.status})`)
      }
      classifications = (await res.json()).classifications as Classification[]
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to classify emails')
      setLoadStatus('error')
      return
    }

    const classMap = new Map(classifications.map((c) => [c.id, c]))
    setEmails(fetchedEmails.map((email) => {
      const cls = classMap.get(email.id)
      return { ...email, category: cls?.category ?? 'FYI', reasoning: cls?.reasoning ?? '' }
    }))
    setLoadStatus('done')
  }

  function removeEmail(id: string) {
    setEmails((prev) => prev.filter((e) => e.id !== id))
    setSelected(null)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const byCategory = (cat: Classification['category']) => emails.filter((e) => e.category === cat)
  const loading = loadStatus === 'fetching' || loadStatus === 'classifying'

  return (
    /*
     * Layout contract:
     *   h-screen          → lock to viewport height
     *   flex flex-col     → stack header + board vertically
     *   overflow-hidden   → prevent page-level scroll
     *
     * The board grid uses flex-1 + min-h-0.
     * min-h-0 overrides the flex item's default min-height:auto so the grid
     * can shrink below its content height and be bounded by the viewport.
     * Without min-h-0 the grid expands to content, making columns not scroll.
     */
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
              {loadStatus === 'fetching' ? 'Loading inbox…' : 'Classifying…'}
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
      {loadStatus === 'error' && loadError && (
        <div className="flex shrink-0 items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2">
          <p className="text-xs font-medium text-red-700">{loadError}</p>
          <button
            onClick={loadInbox}
            className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Kanban board ──
          grid-cols responsive: 1 col mobile → 2 col tablet → 4 col desktop
          flex-1 min-h-0: fill remaining height and allow shrinking (critical!)
          divide-x: 1px column separators
          overflow-hidden: clip within bounded area
      ── */}
      <div className="grid flex-1 min-h-0 grid-cols-1 divide-x divide-zinc-100 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const group = byCategory(cat)
          const style = CATEGORY_STYLES[cat]
          return (
            /*
             * Each column is a flex column that fills its grid cell.
             * min-h-0 here ensures the column can shrink inside the grid row.
             * overflow-hidden clips the column to the cell boundary.
             */
            <div key={cat} className="flex min-h-0 flex-col overflow-hidden">

              {/* Sticky column header */}
              <div className={`${style.headerBg} flex shrink-0 items-center gap-2 border-b border-zinc-200 px-3 py-2`}>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  {cat}
                </span>
                <span className={`${style.countBg} ${style.countText} rounded-full px-1.5 py-0.5 text-xs font-medium`}>
                  {group.length}
                </span>
              </div>

              {/* Scrollable card list — flex-1 fills, overflow-y-auto scrolls */}
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

      {/* ── Detail drawer ── */}
      {selected && (
        <DetailModal
          email={selected}
          onClose={() => setSelected(null)}
          onRemove={removeEmail}
        />
      )}
    </div>
  )
}

// ── Compact email card (~50px tall) ──────────────────────────────────────────

function EmailCard({ email, onClick }: { email: TriagedEmail; onClick: () => void }) {
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

// ── Detail drawer ─────────────────────────────────────────────────────────────

function DetailModal({
  email,
  onClose,
  onRemove,
}: {
  email: TriagedEmail
  onClose: () => void
  onRemove: (id: string) => void
}) {
  const channel: ReplyChannel = detectReplyChannel({ sender: email.sender, subject: email.subject })
  const actionable = email.category === 'URGENT' || email.category === 'REPLY'

  const [emailBody, setEmailBody] = useState(email.body)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle')
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!email.body) {
      fetch(`/api/email-body?id=${email.id}`)
        .then((r) => r.json())
        .then((data) => { if (data.body) setEmailBody(data.body) })
        .catch(() => {})
    }
  }, [email.id, email.body])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (draftStatus === 'ready') textareaRef.current?.focus()
  }, [draftStatus])

  async function handleDraft() {
    setDraftStatus('drafting')
    setDraftError(null)
    try {
      const res = await fetch('/api/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email.id, subject: email.subject, sender: email.sender, snippet: email.snippet, body: emailBody }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Draft failed')
      setDraft(data.draft)
      setDraftStatus('ready')
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to draft reply')
      setDraftStatus('error')
    }
  }

  async function handleSend() {
    setDraftStatus('sending')
    setSendError(null)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: email.threadId, to: email.sender, subject: email.subject, body: draft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setDraftStatus('sent')
      setTimeout(() => onRemove(email.id), 1500)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send')
      setDraftStatus('ready')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — max-w-lg, slides from right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Email detail"
        className="fixed inset-y-0 right-0 z-30 flex w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-xl"
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-semibold leading-snug text-zinc-900">{email.subject}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{email.sender}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <XIcon />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

          {/* Snippet */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Preview</p>
            <blockquote className="border-l-2 border-zinc-200 pl-3 text-sm leading-relaxed text-zinc-700">
              {email.snippet}
            </blockquote>
          </div>

          {/* Reasoning */}
          {email.reasoning && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Why this category</p>
              <p className="text-xs italic text-zinc-500">{email.reasoning}</p>
            </div>
          )}

          {/* ── Case A: URGENT/REPLY + email channel ── */}
          {actionable && channel.type === 'email' && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Reply</p>

              {draftStatus === 'idle' && (
                <button
                  onClick={handleDraft}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
                >
                  Draft reply
                </button>
              )}

              {draftStatus === 'drafting' && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Spinner /> Drafting…
                </span>
              )}

              {draftStatus === 'error' && draftError && (
                <div className="space-y-2">
                  <p className="text-xs text-red-600">{draftError}</p>
                  <button
                    onClick={handleDraft}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Retry draft
                  </button>
                </div>
              )}

              {(draftStatus === 'ready' || draftStatus === 'sending' || draftStatus === 'sent') && (
                <div className="space-y-2">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={draftStatus === 'sending' || draftStatus === 'sent'}
                    rows={6}
                    className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none disabled:opacity-60"
                  />
                  {sendError && <p className="text-xs text-red-600">{sendError}</p>}
                  <div className="flex justify-end">
                    {draftStatus === 'sent' ? (
                      <span className="text-xs font-medium text-green-600">✓ Sent</span>
                    ) : (
                      <button
                        onClick={handleSend}
                        disabled={draftStatus === 'sending' || !draft.trim()}
                        className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {draftStatus === 'sending' && <Spinner />}
                        {draftStatus === 'sending' ? 'Sending…' : 'Send'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Case B: URGENT/REPLY + app notification ── */}
          {actionable && channel.type === 'app' && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-3">
              <p className="text-sm text-blue-800">
                💬 Reply to this in <strong>{channel.app}</strong> — this is a notification, not a real email.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Open in {channel.app}
                </a>
                <button
                  onClick={() => onRemove(email.id)}
                  className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  Mark as handled
                </button>
              </div>
            </div>
          )}

          {/* Case C: FYI/SPAM — no actions, just details above */}
        </div>

        {/* Drawer footer */}
        <div className="flex shrink-0 justify-end border-t border-zinc-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}
