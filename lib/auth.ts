import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates the request's auth (cookie session or Bearer token).
 * Returns the user if authenticated, or a 401 NextResponse if not.
 * Use createServiceClient() for subsequent DB operations in API routes.
 */
export async function getAuthUser(request: NextRequest) {
  const supabase = await createClient()

  // Bearer token path — used by tests and external callers
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    return { user, error: null }
  }

  // Cookie path — used by browser sessions
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, error: null }
}
