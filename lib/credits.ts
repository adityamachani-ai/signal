import { createServiceClient } from './supabase/service'

export const LIMITS = {
  icp_searches: 3,
  enrichments: 3,
  briefs: 10,
} as const

export type CreditType = keyof typeof LIMITS

const CREDIT_LABELS: Record<CreditType, string> = {
  icp_searches: 'ICP searches',
  enrichments: 'lead enrichments',
  briefs: 'brief generations',
}

export interface CreditsRow {
  user_id: string
  is_admin: boolean
  icp_searches_used: number
  enrichments_used: number
  briefs_used: number
}

async function getOrCreate(userId: string): Promise<CreditsRow> {
  const db = createServiceClient()
  const { data } = await db
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (data) return data as CreditsRow

  // Pre-migration user — auto-create row
  const { data: created } = await db
    .from('user_credits')
    .insert({ user_id: userId })
    .select('*')
    .single()
  return created as CreditsRow
}

export type CreditCheckResult =
  | { ok: true; remaining: number }
  | { ok: false; code: 'CREDIT_LIMIT_REACHED'; message: string; used: number; limit: number; remaining: 0 }

export async function checkCredit(
  userId: string,
  type: CreditType,
  needed = 1
): Promise<CreditCheckResult> {
  const credits = await getOrCreate(userId)
  if (credits.is_admin) return { ok: true, remaining: 9999 }

  const used = credits[`${type}_used`]
  const limit = LIMITS[type]
  const remaining = limit - used

  if (remaining < needed) {
    return {
      ok: false,
      code: 'CREDIT_LIMIT_REACHED',
      message: `You've used all ${limit} ${CREDIT_LABELS[type]}. This is a lifetime limit.`,
      used,
      limit,
      remaining: 0,
    }
  }
  return { ok: true, remaining }
}

export async function consumeCredit(userId: string, type: CreditType, count = 1): Promise<void> {
  if (count <= 0) return
  const db = createServiceClient()
  await db.rpc('increment_credit', { p_user_id: userId, p_type: type, p_count: count })
}

export async function getCredits(userId: string): Promise<CreditsRow | null> {
  try {
    return await getOrCreate(userId)
  } catch {
    return null
  }
}
