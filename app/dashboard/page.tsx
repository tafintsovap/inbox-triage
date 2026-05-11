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
  { headerBg: string; countBg: string; countText: string; labelColor: string; dotColor: string }
> = {
  URGENT: { headerBg: 'bg-red-500/[0.08]',    countBg: 'bg-red-500/[0.15]',   countText: 'text-red-400',   labelColor: 'text-red-400',   dotColor: 'bg-red-500'   },
  REPLY:  { headerBg: 'bg-blue-500/[0.08]',   countBg: 'bg-blue-500/[0.15]',  countText: 'text-blue-400',  labelColor: 'text-blue-400',  dotColor: 'bg-blue-500'  },
  FYI:    { headerBg: 'bg-white/[0.03]',       countBg: 'bg-white/[0.1]',      countText: 'text-zinc-500',  labelColor: 'text-zinc-400',  dotColor: 'bg-zinc-500'  },
  SPAM:   { headerBg: 'bg-white/[0.015]',      countBg: 'bg-white/[0.08]',     countText: 'text-zinc-600',  labelColor: 'text-zinc-600',  dotColor: 'bg-zinc-700'  },
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
    <div className="flex h-screen flex-col overflow-hidden bg-[#090909] text-white">

      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0e0e0e] px-4 py-2 sm:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-semibold tracking-tight text-white">Inbox Triage</h1>
          {userEmail && (
            <span className="hidden text-xs text-zinc-600 sm:inline">{userEmail}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Spinner />
              {loadStatus === 'fetching' ? 'Loading inbox…' : 'Classifying…'}
            </span>
          )}
          <button
            onClick={loadInbox}
            disabled={loading}
            className="rounded border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Refresh
          </button>
          <button
            onClick={signOut}
            className="rounded border border-white/10 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {loadStatus === 'error' && loadError && (
        <div className="flex shrink-0 items-center justify-between border-b border-red-500/20 bg-red-500/10 px-4 py-2">
          <p className="text-xs font-medium text-red-400">{loadError}</p>
          <button
            onClick={loadInbox}
            className="rounded border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15"
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
      <div className="grid flex-1 min-h-0 grid-cols-1 divide-x divide-white/5 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
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
              <div className={`${style.headerBg} flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-2`}>
                <span className={`h-1.5 w-1.5 rounded-full ${style.dotColor}`} />
                <span className={`text-[10px] font-semibold tracking-widest ${style.labelColor}`}>
                  {cat}
                </span>
                <span className={`ml-auto ${style.countBg} ${style.countText} rounded-full px-1.5 py-0.5 text-[10px]`}>
                  {group.length}
                </span>
              </div>

              {/* Scrollable card list — flex-1 fills, overflow-y-auto scrolls */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {group.length === 0 ? (
                  <p className="px-1 pt-3 text-xs text-zinc-700">No emails</p>
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
      className="w-full rounded-md border border-white/5 bg-white/[0.035] px-2.5 py-2 text-left transition-all hover:border-white/10 hover:bg-white/[0.055] active:scale-[0.99]"
    >
      <p className="truncate text-[11px] font-medium text-zinc-300">
        {senderName(email.sender)}
      </p>
      <p className="truncate text-[11px] text-zinc-600">{email.subject}</p>
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
        className="fixed inset-0 z-20 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — max-w-lg, slides from right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Email detail"
        className="fixed inset-y-0 right-0 z-30 flex w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#111111] shadow-2xl"
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/5 px-5 py-4">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-semibold leading-snug text-white">{email.subject}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{email.sender}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-300"
          >
            <XIcon />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

          {/* Snippet */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-600">Preview</p>
            <blockquote className="border-l-2 border-white/10 pl-3 text-sm leading-relaxed text-zinc-400">
              {email.snippet}
            </blockquote>
          </div>

          {/* Reasoning */}
          {email.reasoning && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-600">Why this category</p>
              <p className="text-xs italic text-zinc-500">{email.reasoning}</p>
            </div>
          )}

          {/* ── Case A: URGENT/REPLY + email channel ── */}
          {actionable && channel.type === 'email' && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">Reply</p>

              {draftStatus === 'idle' && (
                <button
                  onClick={handleDraft}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
                >
                  Draft reply
                </button>
              )}

              {draftStatus === 'drafting' && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Spinner /> Drafting…
                </span>
              )}

              {draftStatus === 'error' && draftError && (
                <div className="space-y-2">
                  <p className="text-xs text-red-400">{draftError}</p>
                  <button
                    onClick={handleDraft}
                    className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
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
                    className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-white/20 focus:outline-none disabled:opacity-60"
                  />
                  {sendError && <p className="text-xs text-red-400">{sendError}</p>}
                  <div className="flex justify-end">
                    {draftStatus === 'sent' ? (
                      <span className="text-xs font-medium text-green-400">✓ Sent</span>
                    ) : (
                      <button
                        onClick={handleSend}
                        disabled={draftStatus === 'sending' || !draft.trim()}
                        className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 space-y-3">
              <p className="text-sm text-blue-300">
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
                  className="rounded-md border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/15"
                >
                  Mark as handled
                </button>
              </div>
            </div>
          )}

          {/* Case C: FYI/SPAM — no actions, just details above */}
        </div>

        {/* Drawer footer */}
        <div className="flex shrink-0 justify-end border-t border-white/5 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-300"
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
