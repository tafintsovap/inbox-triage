import { NextRequest } from 'next/server'

// For GET route handlers that read request.nextUrl.searchParams (e.g. auth/callback).
export function makeNextRequest(url: string): NextRequest {
  return new NextRequest(url)
}

// For POST route handlers that call request.json() (e.g. /api/classify).
export function makeJsonRequest(url: string, body?: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
