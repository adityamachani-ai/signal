import { NextResponse } from 'next/server'

/**
 * Lightweight endpoint used by the vitest globalSetup to verify
 * the dev server is running in mock mode (no real API keys loaded).
 * If vitest detects real keys, the entire test run is aborted
 * before any test can consume paid API credits.
 */
export function GET() {
  return NextResponse.json({
    lushaKeyPresent: !!process.env.LUSHA_API_KEY,
    llmKeyPresent: !!process.env.LLM_API_KEY,
  })
}
