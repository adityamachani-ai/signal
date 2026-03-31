import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

// Force mock mode in tests — never consume Lusha credits during test runs.
// The dev server started by test.sh also runs without LUSHA_API_KEY,
// so both the vitest process and the server return mock data.
delete process.env.LUSHA_API_KEY

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
  },
})
