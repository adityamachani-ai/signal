import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

let testUserId: string
let sessionCookie: string

const TEST_EMAIL = `lists_test_${Date.now()}@signal-test.com`
const TEST_PASSWORD = 'ListsTestPassword123'

function authed(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${sessionCookie}`)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  return fetch(`${BASE}${path}`, { ...init, headers })
}

beforeAll(async () => {
  // Create test user via admin
  const { data: { user }, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (createErr || !user) throw new Error(`Failed to create test user: ${createErr?.message}`)
  testUserId = user.id

  // Sign in to get token
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInErr || !signIn.session) throw new Error(`Failed to sign in: ${signInErr?.message}`)
  sessionCookie = signIn.session.access_token
})

afterAll(async () => {
  // Clean up everything
  await admin.from('list_leads').delete().in('list_id',
    (await admin.from('lists').select('id').eq('user_id', testUserId)).data?.map(l => l.id) ?? []
  )
  await admin.from('leads').delete().eq('user_id', testUserId)
  await admin.from('lists').delete().eq('user_id', testUserId)
  await admin.auth.admin.deleteUser(testUserId)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auth', () => {
  it('GET /api/lists returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/lists`)
    expect(res.status).toBe(401)
  })

  it('POST /api/lists returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    })
    expect(res.status).toBe(401)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// List CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe('List CRUD', () => {
  let createdListId: string
  let secondListId: string

  it('GET /api/lists returns the default My List', async () => {
    const res = await authed('/api/lists')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lists).toBeDefined()
    expect(body.lists.length).toBeGreaterThanOrEqual(1)
    const myList = body.lists.find((l: { name: string }) => l.name === 'My List')
    expect(myList).toBeDefined()
    expect(myList.lead_count).toBe(0)
  })

  it('POST /api/lists creates a new list', async () => {
    const res = await authed('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hot Leads' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.list).toBeDefined()
    expect(body.list.name).toBe('Hot Leads')
    expect(body.list.id).toBeDefined()
    createdListId = body.list.id
  })

  it('POST /api/lists creates a second list', async () => {
    const res = await authed('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cold Leads' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    secondListId = body.list.id
  })

  it('GET /api/lists returns all 3 lists', async () => {
    const res = await authed('/api/lists')
    const body = await res.json()
    expect(body.lists.length).toBe(3) // My List + Hot Leads + Cold Leads
    const names = body.lists.map((l: { name: string }) => l.name)
    expect(names).toContain('My List')
    expect(names).toContain('Hot Leads')
    expect(names).toContain('Cold Leads')
  })

  it('POST /api/lists rejects empty name', async () => {
    const res = await authed('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/lists rejects name over 100 chars', async () => {
    const res = await authed('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'x'.repeat(101) }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /api/lists/:id renames a list', async () => {
    const res = await authed(`/api/lists/${createdListId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Very Hot Leads' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.list.name).toBe('Very Hot Leads')
  })

  it('PATCH /api/lists/:id rejects empty name', async () => {
    const res = await authed(`/api/lists/${createdListId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /api/lists/:id returns 404 for non-existent list', async () => {
    const res = await authed('/api/lists/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Ghost' }),
    })
    expect(res.status).toBe(404)
  })

  it('PATCH /api/lists/:id rejects no fields', async () => {
    const res = await authed(`/api/lists/${createdListId}`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('DELETE /api/lists/:id deletes a list', async () => {
    const res = await authed(`/api/lists/${secondListId}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('DELETE /api/lists/:id returns 404 for already-deleted list', async () => {
    const res = await authed(`/api/lists/${secondListId}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })

  it('GET /api/lists reflects deletion', async () => {
    const res = await authed('/api/lists')
    const body = await res.json()
    const names = body.lists.map((l: { name: string }) => l.name)
    expect(names).not.toContain('Cold Leads')
    expect(names).toContain('Very Hot Leads')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Add/Remove leads from lists
// ═══════════════════════════════════════════════════════════════════════════════

describe('List leads operations', () => {
  let listAId: string
  let listBId: string
  let leadId1: string
  let leadId2: string
  let leadId3: string

  beforeAll(async () => {
    // Create two lists
    let res = await authed('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'List A' }),
    })
    listAId = (await res.json()).list.id

    res = await authed('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'List B' }),
    })
    listBId = (await res.json()).list.id

    // Create 3 test leads
    const { data: l1 } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'Alice Smith', company_name: 'AliceCo',
    }).select('id').single()
    leadId1 = l1!.id

    const { data: l2 } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'Bob Jones', company_name: 'BobCo',
    }).select('id').single()
    leadId2 = l2!.id

    const { data: l3 } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'Charlie Brown', company_name: 'CharlieCo',
    }).select('id').single()
    leadId3 = l3!.id
  })

  it('POST /api/lists/:id/leads adds leads to a list', async () => {
    const res = await authed(`/api/lists/${listAId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leadIds: [leadId1, leadId2] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(2)
  })

  it('GET /api/research/leads?listId= returns leads for that list', async () => {
    const res = await authed(`/api/research/leads?listId=${listAId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leads.length).toBe(2)
    const names = body.leads.map((l: { full_name: string }) => l.full_name)
    expect(names).toContain('Alice Smith')
    expect(names).toContain('Bob Jones')
  })

  it('lead can be in multiple lists simultaneously', async () => {
    // Add lead1 to List B as well
    const res = await authed(`/api/lists/${listBId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leadIds: [leadId1, leadId3] }),
    })
    expect(res.status).toBe(200)

    // Verify lead1 is in both lists
    const resA = await authed(`/api/research/leads?listId=${listAId}`)
    const bodyA = await resA.json()
    expect(bodyA.leads.map((l: { full_name: string }) => l.full_name)).toContain('Alice Smith')

    const resB = await authed(`/api/research/leads?listId=${listBId}`)
    const bodyB = await resB.json()
    expect(bodyB.leads.map((l: { full_name: string }) => l.full_name)).toContain('Alice Smith')
    expect(bodyB.leads.map((l: { full_name: string }) => l.full_name)).toContain('Charlie Brown')
  })

  it('duplicate add is silently ignored (no error)', async () => {
    const res = await authed(`/api/lists/${listAId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leadIds: [leadId1] }),
    })
    expect(res.status).toBe(200)

    // Still only 2 leads in List A
    const check = await authed(`/api/research/leads?listId=${listAId}`)
    const body = await check.json()
    expect(body.leads.length).toBe(2)
  })

  it('DELETE /api/lists/:id/leads removes leads from a list', async () => {
    const res = await authed(`/api/lists/${listAId}/leads`, {
      method: 'DELETE',
      body: JSON.stringify({ leadIds: [leadId2] }),
    })
    expect(res.status).toBe(200)

    const check = await authed(`/api/research/leads?listId=${listAId}`)
    const body = await check.json()
    expect(body.leads.length).toBe(1)
    expect(body.leads[0].full_name).toBe('Alice Smith')
  })

  it('removing from one list does not affect another list', async () => {
    // Lead1 removed from list A but should still be in list B
    const resB = await authed(`/api/research/leads?listId=${listBId}`)
    const bodyB = await resB.json()
    expect(bodyB.leads.map((l: { full_name: string }) => l.full_name)).toContain('Alice Smith')
  })

  it('GET /api/lists returns correct lead counts', async () => {
    const res = await authed('/api/lists')
    const body = await res.json()
    const getCount = (id: string) => body.lists.find((l: { id: string }) => l.id === id)?.lead_count
    expect(getCount(listAId)).toBe(1)  // only Alice
    expect(getCount(listBId)).toBe(2)  // Alice + Charlie
  })

  it('POST /api/lists/:id/leads rejects empty leadIds', async () => {
    const res = await authed(`/api/lists/${listAId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leadIds: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/lists/:id/leads rejects over 500 leads', async () => {
    const res = await authed(`/api/lists/${listAId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leadIds: Array(501).fill('fake-uuid') }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/lists/:id/leads returns 404 for wrong list', async () => {
    const res = await authed('/api/lists/00000000-0000-0000-0000-000000000000/leads', {
      method: 'POST',
      body: JSON.stringify({ leadIds: [leadId1] }),
    })
    expect(res.status).toBe(404)
  })

  it('deleting a list cascade-deletes list_leads but keeps leads', async () => {
    // Delete List A
    const delRes = await authed(`/api/lists/${listAId}`, { method: 'DELETE' })
    expect(delRes.status).toBe(200)

    // Lead1 still exists in DB
    const { data: lead } = await admin.from('leads').select('id').eq('id', leadId1).single()
    expect(lead).toBeDefined()

    // Lead1 still in List B
    const res = await authed(`/api/research/leads?listId=${listBId}`)
    const body = await res.json()
    expect(body.leads.map((l: { full_name: string }) => l.full_name)).toContain('Alice Smith')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy add-to-list route (backward compat)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legacy add-to-list route', () => {
  let defaultListId: string
  let customListId: string
  let leadId: string

  beforeAll(async () => {
    // Find the default My List
    const res = await authed('/api/lists')
    const body = await res.json()
    defaultListId = body.lists.find((l: { name: string }) => l.name === 'My List').id

    // Create a custom list
    const createRes = await authed('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name: 'Legacy Test List' }),
    })
    customListId = (await createRes.json()).list.id

    // Create a lead
    const { data: l } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'Legacy Lead', company_name: 'LegacyCo',
    }).select('id').single()
    leadId = l!.id
  })

  it('POST /api/research/add-to-list without listId uses default list', async () => {
    const res = await authed('/api/research/add-to-list', {
      method: 'POST',
      body: JSON.stringify({ leadIds: [leadId] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.listId).toBe(defaultListId)

    // Verify lead is in default list
    const check = await authed(`/api/research/leads?listId=${defaultListId}`)
    const leads = await check.json()
    expect(leads.leads.map((l: { full_name: string }) => l.full_name)).toContain('Legacy Lead')
  })

  it('POST /api/research/add-to-list with listId uses that list', async () => {
    const res = await authed('/api/research/add-to-list', {
      method: 'POST',
      body: JSON.stringify({ leadIds: [leadId], listId: customListId }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.listId).toBe(customListId)

    // Verify lead is now in custom list too
    const check = await authed(`/api/research/leads?listId=${customListId}`)
    const leads = await check.json()
    expect(leads.leads.map((l: { full_name: string }) => l.full_name)).toContain('Legacy Lead')
  })

  it('DELETE /api/research/add-to-list removes from default list', async () => {
    const res = await authed('/api/research/add-to-list', {
      method: 'DELETE',
      body: JSON.stringify({ leadIds: [leadId] }),
    })
    expect(res.status).toBe(200)

    // Lead should be gone from default list
    const check = await authed(`/api/research/leads?listId=${defaultListId}`)
    const leads = await check.json()
    expect(leads.leads.map((l: { full_name: string }) => l.full_name)).not.toContain('Legacy Lead')

    // But still in custom list
    const check2 = await authed(`/api/research/leads?listId=${customListId}`)
    const leads2 = await check2.json()
    expect(leads2.leads.map((l: { full_name: string }) => l.full_name)).toContain('Legacy Lead')
  })

  it('DELETE /api/research/add-to-list with listId removes from that list', async () => {
    const res = await authed('/api/research/add-to-list', {
      method: 'DELETE',
      body: JSON.stringify({ leadIds: [leadId], listId: customListId }),
    })
    expect(res.status).toBe(200)

    const check = await authed(`/api/research/leads?listId=${customListId}`)
    const leads = await check.json()
    expect(leads.leads.map((l: { full_name: string }) => l.full_name)).not.toContain('Legacy Lead')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// inList legacy query param
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legacy inList param', () => {
  let someListId: string
  let leadInList: string
  let leadNotInList: string

  beforeAll(async () => {
    const res = await authed('/api/lists')
    const body = await res.json()
    someListId = body.lists[0].id

    const { data: l1 } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'InList Lead', company_name: 'InCo',
    }).select('id').single()
    leadInList = l1!.id

    const { data: l2 } = await admin.from('leads').insert({
      user_id: testUserId, full_name: 'Not InList Lead', company_name: 'OutCo', enriched_at: new Date().toISOString(),
    }).select('id').single()
    leadNotInList = l2!.id

    // Add one lead to a list
    await authed(`/api/lists/${someListId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leadIds: [leadInList] }),
    })
  })

  it('GET /api/research/leads?inList=true returns leads in any list', async () => {
    const res = await authed('/api/research/leads?inList=true')
    expect(res.status).toBe(200)
    const body = await res.json()
    const names = body.leads.map((l: { full_name: string }) => l.full_name)
    expect(names).toContain('InList Lead')
  })

  it('GET /api/research/leads (no params) returns enriched leads only', async () => {
    const res = await authed('/api/research/leads')
    expect(res.status).toBe(200)
    const body = await res.json()
    const names = body.leads.map((l: { full_name: string }) => l.full_name)
    // The not-in-list lead has enriched_at set, so it should show
    expect(names).toContain('Not InList Lead')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Cross-user isolation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cross-user isolation', () => {
  let otherUserId: string
  let otherToken: string
  let myListId: string

  beforeAll(async () => {
    const otherEmail = `lists_other_${Date.now()}@signal-test.com`
    const { data: { user } } = await admin.auth.admin.createUser({
      email: otherEmail, password: TEST_PASSWORD, email_confirm: true,
    })
    otherUserId = user!.id

    const { data: signIn } = await anon.auth.signInWithPassword({
      email: otherEmail, password: TEST_PASSWORD,
    })
    otherToken = signIn.session!.access_token

    // Get my list
    const res = await authed('/api/lists')
    const body = await res.json()
    myListId = body.lists[0].id
  })

  afterAll(async () => {
    await admin.from('lists').delete().eq('user_id', otherUserId)
    await admin.auth.admin.deleteUser(otherUserId)
  })

  it('other user cannot see my lists', async () => {
    const res = await fetch(`${BASE}/api/lists`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    const body = await res.json()
    const ids = body.lists.map((l: { id: string }) => l.id)
    expect(ids).not.toContain(myListId)
  })

  it('other user cannot rename my list', async () => {
    const res = await fetch(`${BASE}/api/lists/${myListId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ name: 'Hacked' }),
    })
    expect(res.status).toBe(404)
  })

  it('other user cannot delete my list', async () => {
    const res = await fetch(`${BASE}/api/lists/${myListId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherToken}` },
    })
    expect(res.status).toBe(404)
  })

  it('other user cannot add leads to my list', async () => {
    const res = await fetch(`${BASE}/api/lists/${myListId}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
      body: JSON.stringify({ leadIds: ['fake-uuid'] }),
    })
    expect(res.status).toBe(404)
  })
})
