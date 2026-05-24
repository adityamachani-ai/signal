/**
 * Vitest setupFile — runs INSIDE each test file's context (before tests).
 * Second layer of defense: even if globalSetup is bypassed (custom config),
 * this check catches real-key servers before any test makes API calls.
 *
 * Unlike globalSetup (which runs once in a separate context), setupFiles
 * run in the same process as tests but before any describe/it blocks.
 */
import { beforeAll } from 'vitest'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

beforeAll(async () => {
  let res: Response
  try {
    res = await fetch(`${BASE}/api/mock-check`)
  } catch {
    return // Server not running — tests will fail on their own
  }

  if (!res.ok) return // Endpoint missing — proceed with caution

  const { lushaKeyPresent } = await res.json() as { lushaKeyPresent: boolean }

  if (lushaKeyPresent) {
    throw new Error(
      '\n🚨 Server has REAL Lusha API key! Tests would burn credits.\n' +
      'Use: bash test.sh  OR  pnpm test\n'
    )
  }
})
