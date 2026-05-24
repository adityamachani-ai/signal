import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { runResearchAgent } from '@/lib/research-agent'
import { checkCredit, consumeCredit } from '@/lib/credits'
import {
  generateWhoTheyAre,
  generatePainMap,
  generateAngle,
  generateWhyNow,
  generateOutreachDrafts,
} from '@/lib/brief-agents'
import type { BriefSseEvent } from '@/lib/brief-types'

function sseChunk(event: BriefSseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError) return authError

  const body = await request.json() as { lead_id: string; outreach_context?: string }
  const { lead_id, outreach_context } = body

  if (!lead_id) {
    return new Response(JSON.stringify({ error: 'lead_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const db = createServiceClient()

  // Load lead — must belong to this user
  const { data: lead, error: leadErr } = await db
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .eq('user_id', user!.id)
    .single()

  if (leadErr || !lead) {
    return new Response(JSON.stringify({ error: 'Lead not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Load playbook
  const { data: playbook } = await db
    .from('playbooks')
    .select('problem, for_who, different, value_props, competitors, tone, never_use')
    .eq('user_id', user!.id)
    .single()

  // ─── Credit check — before starting expensive generation ─────────────────

  const creditCheck = await checkCredit(user!.id, 'briefs')
  if (!creditCheck.ok) {
    return new Response(
      JSON.stringify({ error: creditCheck.code, message: creditCheck.message, used: creditCheck.used, limit: creditCheck.limit }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (process.env.LLM_API_KEY || process.env.LLM_BASE_URL) await consumeCredit(user!.id, 'briefs')

  // ─── SSE stream ───────────────────────────────────────────────────────────

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Safe send — swallows errors when client disconnects mid-stream
      const send = (event: BriefSseEvent) => {
        try {
          controller.enqueue(encoder.encode(sseChunk(event)))
        } catch {
          // Stream cancelled (client navigated away) — continue generating
        }
      }

      // Mark generation as in-flight
      await db
        .from('leads')
        .update({
          brief_status: 'generating',
          brief_generation_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead_id)

      try {
        // 1. Research phase
        send({ type: 'research_start' })

        const enrichment = await runResearchAgent(
          {
            full_name: lead.full_name,
            job_title: lead.job_title,
            company_name: lead.company_name,
            linkedin_url: lead.linkedin_url,
            company_linkedin_url: lead.company_linkedin_url,
            company_domain: lead.company_domain,
            city: lead.city,
            country: lead.country,
          },
          playbook ?? {}
        )

        // Save enrichment to lead
        await db
          .from('leads')
          .update({ enrichment_extended: enrichment as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq('id', lead_id)

        send({ type: 'research_done', toolCallLog: enrichment.toolCallLog })

        // 2. Five completion calls, streaming each section as it completes
        const leadCtx = {
          full_name: lead.full_name,
          job_title: lead.job_title,
          company_name: lead.company_name,
          company_domain: lead.company_domain,
        }

        const [whoTheyAre, painMap] = await Promise.all([
          generateWhoTheyAre(enrichment, leadCtx),
          generatePainMap(enrichment, leadCtx, playbook ?? {}),
        ])

        send({ type: 'section', section: 'who_they_are', data: whoTheyAre })
        send({ type: 'section', section: 'pain_map', data: painMap })

        const [angle, whyNow] = await Promise.all([
          generateAngle(enrichment, leadCtx, playbook ?? {}),
          generateWhyNow(enrichment, leadCtx, playbook ?? {}),
        ])

        send({ type: 'section', section: 'angle', data: angle })
        send({ type: 'section', section: 'why_now', data: whyNow })

        const outreachDrafts = await generateOutreachDrafts(
          enrichment,
          leadCtx,
          playbook ?? {},
          angle,
          painMap,
          whyNow
        )

        send({ type: 'section', section: 'outreach_drafts', data: outreachDrafts })

        // 3. Save full brief to DB
        const { data: brief, error: saveErr } = await db
          .from('briefs')
          .upsert(
            {
              user_id: user!.id,
              lead_id,
              who_they_are: whoTheyAre,
              pain_map: painMap,
              angle,
              why_now: whyNow,
              intelligence: {
                person: enrichment.person,
                company: enrichment.company,
                toolCallLog: enrichment.toolCallLog,
              },
              outreach_drafts: outreachDrafts,
              outreach_context: outreach_context ?? null,
              generation_sources: enrichment.toolCallLog,
              generated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,lead_id',
              ignoreDuplicates: false,
            }
          )
          .select('id')
          .single()

        if (saveErr || !brief) {
          console.error('[brief/generate] save error:', saveErr)
          // Reset status so user can retry — don't mark as generated if save failed
          await db
            .from('leads')
            .update({ brief_status: null, updated_at: new Date().toISOString() })
            .eq('id', lead_id)
          send({ type: 'error', message: 'Failed to save brief — please try again.' })
          return
        }

        // Mark brief as generated on lead (only when save succeeded)
        const briefGeneratedAt = new Date().toISOString()
        await db
          .from('leads')
          .update({
            brief_generated: true,
            brief_status: 'generated',
            brief_generated_at: briefGeneratedAt,
            updated_at: briefGeneratedAt,
          })
          .eq('id', lead_id)

        send({ type: 'done', briefId: brief.id })
      } catch (err) {
        // Client navigated away — server continues generating, don't reset status
        if (request.signal.aborted) return
        console.error('[brief/generate] stream error:', err)
        await db
          .from('leads')
          .update({ brief_status: null, updated_at: new Date().toISOString() })
          .eq('id', lead_id)
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        try { controller.close() } catch { /* stream already cancelled */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
