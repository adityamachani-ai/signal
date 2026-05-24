import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getCredits, LIMITS } from '@/lib/credits'

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const credits = await getCredits(user!.id)
  if (!credits) {
    return NextResponse.json({ error: 'Could not load credits' }, { status: 500 })
  }

  return NextResponse.json({
    is_admin: credits.is_admin,
    icp_searches: { used: credits.icp_searches_used, limit: LIMITS.icp_searches },
    enrichments:  { used: credits.enrichments_used,  limit: LIMITS.enrichments  },
    briefs:       { used: credits.briefs_used,        limit: LIMITS.briefs       },
  })
}
