import { describe, it, expect, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Uses service role key to bypass RLS for test verification
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_EMAIL = `test_${Date.now()}@signal-test.com`
const TEST_PASSWORD = 'Test1234!'
let testUserId: string
let user2Id: string

describe('Supabase connection', () => {
  it('can reach Supabase and query tables', async () => {
    const { error } = await admin.from('lists').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('all 5 tables exist', async () => {
    const tables = ['leads', 'lists', 'list_leads', 'briefs', 'playbooks']
    for (const table of tables) {
      const { error } = await admin.from(table).select('id').limit(1)
      expect(error, `Table "${table}" should exist`).toBeNull()
    }
  })
})

describe('Auth — signup', () => {
  it('creates a new user', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
    testUserId = data.user!.id
  })

  it('trigger auto-created a default "My List" for the new user', async () => {
    const { data, error } = await admin
      .from('lists')
      .select('name')
      .eq('user_id', testUserId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('My List')
  })

  it('trigger auto-created a default playbook for the new user', async () => {
    const { data, error } = await admin
      .from('playbooks')
      .select('id')
      .eq('user_id', testUserId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe('Auth — login', () => {
  it('signs in with correct credentials and returns a session', async () => {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    expect(error).toBeNull()
    expect(data.session).toBeTruthy()
    expect(data.session!.user.email).toBe(TEST_EMAIL)
  })

  it('rejects wrong password', async () => {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: 'wrongpassword',
    })
    expect(error).not.toBeNull()
  })
})

describe('RLS — data isolation', () => {
  it("user B cannot read user A's lists", async () => {
    // Create user 2
    const { data: user2Data } = await admin.auth.admin.createUser({
      email: `test2_${Date.now()}@signal-test.com`,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    user2Id = user2Data.user!.id

    // Sign in as user 2
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await anon.auth.signInWithPassword({
      email: user2Data.user!.email!,
      password: TEST_PASSWORD,
    })

    // Try to read user 1's rows — RLS should return 0 rows
    const { data, error } = await anon
      .from('lists')
      .select('id')
      .eq('user_id', testUserId)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it("user B cannot read user A's leads", async () => {
    // Insert a lead for user 1 via admin
    await admin.from('leads').insert({
      user_id: testUserId,
      full_name: 'Test Lead',
    })

    // Sign in as user 2
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await anon.auth.signInWithPassword({
      email: `test2_${Date.now()}@signal-test.com`,
      password: TEST_PASSWORD,
    })

    const { data } = await anon
      .from('leads')
      .select('id')
      .eq('user_id', testUserId)

    expect(data).toHaveLength(0)
  })
})

afterAll(async () => {
  if (testUserId) await admin.auth.admin.deleteUser(testUserId)
  if (user2Id) await admin.auth.admin.deleteUser(user2Id)
})
