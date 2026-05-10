# Inbox Triage

AI-powered Gmail triage agent. Classifies your unread emails into Urgent / Reply / FYI / Spam using Claude, drafts responses when needed, and routes to the right app for notifications like LinkedIn where the reply doesn't happen via email.

🎥 [90-second demo](https://www.loom.com/share/4a6a777ae6eb4faf843ad9b6d0eae363)
🔗 [Live site](https://inbox-triage.polinatafintsova.com)

## What it does

- Sign in with Google (OAuth, gmail.readonly + gmail.send scopes)
- Fetches last 50 unread emails via Gmail API
- Classifies each into URGENT / REPLY / FYI / SPAM with Claude, including reasoning
- For real-email replies: drafts a response with Claude, user edits, sends via Gmail API
- For app notifications (LinkedIn, GitHub, etc.): routes to the actual app

## Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind, Turbopack)
- **Auth + DB:** Supabase (Postgres + Row Level Security)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Email:** Gmail API via `googleapis` SDK
- **Hosting:** Vercel
- **OAuth:** Google Cloud Console + Supabase Google Provider

## Architecture

User signs in via Google OAuth → Supabase manages session.
Tokens (access + refresh) stored in Postgres with Row Level Security.
Dashboard fetches /api/fetch-emails → Gmail API → returns 50 unread emails.
Dashboard fetches /api/classify → Claude batched classification → returns categories with reasoning.
On reply: /api/draft-reply (Claude) → user edits → /api/send-email (Gmail API, threaded reply).

## Why I built it

Built in 2 days as a portfolio piece. Tools like Superhuman charge $30/month for something similar — this is an experiment in how fast you can ship a real workflow agent with the right scaffolding.

## v2 roadmap

- [ ] Voice training (read sent folder, mimic user's writing style)
- [ ] Multi-account support
- [ ] Snooze + scheduling
- [ ] Custom rules ("always treat from X as urgent")

## Access

The app is in Google's pre-verification testing mode — Gmail scopes require Google verification (4-6 weeks process) before anyone can sign in. For now, DM me your Gmail and I'll add you as a test user if you want to try it.

## Local development

Requires `.env.local` with: Anthropic API key, Supabase URL + keys, Google OAuth client ID + secret. Not committed.

Install dependencies with `npm install` and run with `npm run dev`.

## Notes

This is a portfolio project, not a product. Built by [Polina Tafintsova](https://www.linkedin.com/in/polinatafintsova/) over a weekend in May 2026.