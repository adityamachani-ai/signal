import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAuthUser } from '@/lib/auth'
import { runResearchAgent } from '@/lib/research-agent'
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

  // user is required for auth check but not used beyond that in playground
  void user

  const body = await request.json() as {
    lead: {
      full_name?: string
      job_title?: string
      company_name?: string
      linkedin_url?: string
      company_linkedin_url?: string
      company_domain?: string
    }
    playbook: {
      problem?: string
      for_who?: string
      different?: string
      value_props?: unknown
      competitors?: unknown
      tone?: unknown
      never_use?: unknown
    }
  }

  const { lead, playbook } = body

  if (!lead?.linkedin_url?.trim()) {
    return new Response(JSON.stringify({ error: 'linkedin_url is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BriefSseEvent) =>
        controller.enqueue(encoder.encode(sseChunk(event)))

      try {
        send({ type: 'research_start' })

        const enrichment = await runResearchAgent(
          {
            full_name: lead.full_name || 'Unknown',
            job_title: lead.job_title ?? null,
            company_name: lead.company_name ?? null,
            linkedin_url: lead.linkedin_url ?? null,
            company_linkedin_url: lead.company_linkedin_url ?? null,
            company_domain: lead.company_domain ?? null,
            city: null,
            country: null,
          },
          playbook ?? {}
        )

        send({ type: 'research_done', toolCallLog: enrichment.toolCallLog })

        // DEBUG — persists full enrichment to /tmp for post-run diagnosis
        try {
          const debugPath = path.join('/tmp', `playground-enrichment-${Date.now()}.json`)
          fs.writeFileSync(debugPath, JSON.stringify(enrichment, null, 2))
          console.log('[DEBUG] enrichment written to', debugPath)
        } catch { /* non-fatal */ }

        const leadCtx = {
          full_name: lead.full_name || 'Unknown',
          job_title: lead.job_title ?? null,
          company_name: lead.company_name ?? null,
          company_domain: lead.company_domain ?? null,
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
        send({ type: 'done' })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'close',
    },
  })
}
