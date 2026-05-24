import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

// DELETE /api/leads — permanently delete leads by IDs (must belong to current user)
export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const supabase = createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const leadIds = Array.isArray(body.leadIds)
    ? body.leadIds.filter((id): id is string => typeof id === 'string')
    : []

  if (leadIds.length === 0) {
    return NextResponse.json({ error: 'leadIds is required' }, { status: 400 })
  }
  if (leadIds.length > 500) {
    return NextResponse.json({ error: 'Cannot delete more than 500 leads at once' }, { status: 400 })
  }

  const { error } = await supabase
    .from('leads')
    .delete()
    .in('id', leadIds)
    .eq('user_id', user.id) // ownership — users can only delete their own leads

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: leadIds.length })
}
