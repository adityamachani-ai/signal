import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('playbooks')
    .select('product_name, problem, for_who, different, value_props, competitors, tone, never_use')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? {})
}

export async function PUT(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let body: {
    product_name?: string
    problem?: string
    for_who?: string
    different?: string
    value_props?: unknown
    competitors?: unknown
    tone?: string[]
    never_use?: unknown[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Check if playbook already exists (auto-created on signup, but guard just in case)
  const { data: existing } = await supabase
    .from('playbooks')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const payload = {
    product_name: body.product_name ?? null,
    problem: body.problem ?? null,
    for_who: body.for_who ?? null,
    different: body.different ?? null,
    value_props: body.value_props ?? null,
    competitors: body.competitors ?? null,
    tone: body.tone ?? null,
    never_use: body.never_use ?? null,
  }

  let result
  if (existing) {
    const { data, error } = await supabase
      .from('playbooks')
      .update(payload)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await supabase
      .from('playbooks')
      .insert({ user_id: user.id, ...payload })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  return NextResponse.json(result)
}
