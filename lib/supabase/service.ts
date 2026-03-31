import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Only use server-side in API routes
// where the calling user has already been authenticated via getAuthUser().
// Always filter queries by user_id explicitly.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
