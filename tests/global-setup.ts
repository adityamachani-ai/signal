/**
 * Vitest globalSetup — runs ONCE before any test file.
 * Checks that the dev server on localhost:3000 is running in mock mode.
 * If real API keys are detected, the entire test suite is aborted
 * BEFORE a single test can fire and burn paid Lusha/Azure credits.
 *
 * This is the safety net for when someone runs `npx vitest run` directly
 * instead of using the safe `bash test.sh` / `pnpm test` wrapper.
 */

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

export async function setup() {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/mock-check`)
  } catch {
    // Server not running — vitest tests will fail on their own, no credit risk
    console.warn(
      '\n⚠️  Could not reach the dev server at ' + BASE +
      '\n   Start it with: pnpm dev\n'
    )
    return
  }

  if (!res.ok) {
    // Endpoint might not exist yet (old server version) — warn but don't block
    console.warn(
      '\n⚠️  /api/mock-check returned ' + res.status +
      ' — cannot verify mock mode. Proceeding with caution.\n'
    )
    return
  }

  const { lushaKeyPresent } = await res.json() as { lushaKeyPresent: boolean }

  if (lushaKeyPresent) {
    console.error(
      '\n' +
      '╔══════════════════════════════════════════════════════════════╗\n' +
      '║  🚨  ABORTING: Server has REAL Lusha API key loaded!       ║\n' +
      '║                                                            ║\n' +
      '║  Running tests against a live-key server BURNS CREDITS.    ║\n' +
      '║                                                            ║\n' +
      '║  Use the safe test runner instead:                         ║\n' +
      '║                                                            ║\n' +
      '║    bash test.sh          (starts mock server for you)      ║\n' +
      '║    pnpm test             (same thing)                      ║\n' +
      '║                                                            ║\n' +
      '║  Or comment out LUSHA_API_KEY in .env.local and restart    ║\n' +
      '║  the dev server before running tests manually.             ║\n' +
      '╚══════════════════════════════════════════════════════════════╝\n'
    )
    process.exit(1)
  }
}
