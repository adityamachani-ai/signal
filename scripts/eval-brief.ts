/**
 * Brief Model Eval — Jensen Huang (Nvidia) × Copper CRM
 *
 * Runs research ONCE (shared Apify + Tavily data), then runs the 5 brief
 * agents against gpt-4.1, gpt-5, and gpt-5.4 to compare quality,
 * latency, and cost. Generates an HTML report at scripts/eval-report.html.
 *
 * Usage (from project root):
 *   npx --yes tsx scripts/eval-brief.ts
 */

import dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { runResearchAgent } from '../lib/research-agent'
import {
  generateWhoTheyAre,
  generatePainMap,
  generateAngle,
  generateWhyNow,
  generateOutreachDrafts,
  _evalUsage,
  _resetEvalUsage,
} from '../lib/brief-agents'

// Load .env.local — must happen before getLlm() is first called (it's lazy).
// LLM_MODEL defaults to 'gpt-5-mini', BRIEF_MODEL defaults to LLM_MODEL.
// We always pass modelOverride in this script so defaults don't matter.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SCRIPTS_DIR = path.resolve(process.cwd(), 'scripts')
const CACHE_PATH = path.join(SCRIPTS_DIR, 'eval-enrichment-cache.json')
const REPORT_PATH = path.join(SCRIPTS_DIR, 'eval-report.html')

// ─── Lead + Playbook ──────────────────────────────────────────────────────────

const LEAD = {
  full_name: 'Jensen Huang',
  job_title: 'CEO & Co-Founder',
  company_name: 'NVIDIA Corporation',
  linkedin_url: 'https://www.linkedin.com/in/jenhsunhuang',
  company_linkedin_url: 'https://www.linkedin.com/company/nvidia',
  company_domain: 'nvidia.com',
  city: 'Santa Clara',
  country: 'United States',
  signal_score: 'strong',
}

const PLAYBOOK = {
  problem: 'Sales teams lose deals because reps work in Gmail all day but never log activities — their CRM is a separate tab they forget to update, so pipeline data is stale and managers are flying blind',
  for_who: 'Heads of sales and RevOps at 10–500 person companies running their business on Google Workspace',
  different: 'Copper lives directly inside Gmail — contacts, deals, and activities auto-populate from emails and Calendar, zero manual data entry required',
  value_props: [
    { outcome: 'Zero data entry — Copper reads Gmail and logs everything automatically', persona: 'Sales reps' },
    { outcome: 'Real-time pipeline visibility without nagging reps to update', persona: 'Sales managers' },
    { outcome: 'Onboards in a day, no migration needed — already works in tools they use', persona: 'RevOps' },
  ],
  competitors: [
    { name: 'Salesforce', weakness: 'Too heavy for SMB, requires dedicated admin, 6-month rollouts' },
    { name: 'HubSpot', weakness: 'Free tier limited, paid tiers expensive, still requires manual logging' },
    { name: 'Pipedrive', weakness: 'Separate app, no native Gmail integration, manual entry' },
  ],
  tone: ['direct', 'confident', 'no buzzwords', 'peer-to-peer'],
  never_use: ['synergy', 'leverage', 'unlock', 'transform', 'empower', 'journey'],
}

// ─── Models under eval ────────────────────────────────────────────────────────

const MODELS = ['gpt-4.1', 'gpt-5', 'gpt-5.4'] as const
type ModelId = typeof MODELS[number]

// Cost per 1M tokens (standard pricing as of May 2026)
const MODEL_PRICING: Record<ModelId, { input: number; cachedInput: number; output: number }> = {
  'gpt-4.1':  { input: 2.00,  cachedInput: 0.50,  output: 8.00  },
  'gpt-5':    { input: 1.25,  cachedInput: 0.125, output: 10.00 },
  'gpt-5.4':  { input: 2.50,  cachedInput: 0.25,  output: 15.00 },
}

function estimateCost(model: ModelId, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model]
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichmentResult = Awaited<ReturnType<typeof runResearchAgent>>

interface ModelResult {
  model: ModelId
  briefMs: number
  inputTokens: number
  outputTokens: number
  cost: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whoTheyAre: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  painMap: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  angle: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whyNow: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outreach: any
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Brief Model Eval — Jensen Huang × Copper CRM')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ── Phase 1: Research (run once, cache to disk) ──────────────────────────

  let enrichment: EnrichmentResult

  if (fs.existsSync(CACHE_PATH)) {
    console.log('📦  Loading cached enrichment data (skipping Apify calls)...')
    enrichment = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as EnrichmentResult
    console.log(`    Tools called: ${enrichment.toolCallLog.join(', ')}\n`)
  } else {
    console.log('🔍  Phase 1: Research agent (Apify + Tavily) — may take 2–3 min...')
    const t0 = Date.now()
    enrichment = await runResearchAgent(LEAD, PLAYBOOK)
    const researchMs = Date.now() - t0
    fs.writeFileSync(CACHE_PATH, JSON.stringify(enrichment, null, 2))
    console.log(`    ✓ Done in ${(researchMs / 1000).toFixed(1)}s — cached`)
    console.log(`    Tools called: ${enrichment.toolCallLog.join(', ')}\n`)
  }

  const leadCtx = {
    full_name: LEAD.full_name,
    job_title: LEAD.job_title,
    company_name: LEAD.company_name,
    company_domain: LEAD.company_domain,
  }

  // ── Phase 2: Brief agents — 3 models ────────────────────────────────────

  const results: ModelResult[] = []

  for (const model of MODELS) {
    console.log(`\n🤖  Phase 2 [${model}]: Running 5 brief agents...`)
    _resetEvalUsage()
    const t0 = Date.now()

    const [whoTheyAre, painMap] = await Promise.all([
      generateWhoTheyAre(enrichment, leadCtx, model),
      generatePainMap(enrichment, leadCtx, PLAYBOOK, model),
    ])
    console.log('    ✓ whoTheyAre + painMap')

    const [angle, whyNow] = await Promise.all([
      generateAngle(enrichment, leadCtx, PLAYBOOK, model),
      generateWhyNow(enrichment, leadCtx, PLAYBOOK, model),
    ])
    console.log('    ✓ angle + whyNow')

    const outreach = await generateOutreachDrafts(enrichment, leadCtx, PLAYBOOK, angle, painMap, whyNow, model)
    console.log('    ✓ outreach drafts')

    const briefMs = Date.now() - t0
    const { inputTokens, outputTokens } = _evalUsage
    const cost = estimateCost(model, inputTokens, outputTokens)

    console.log(`    ⏱  ${(briefMs / 1000).toFixed(1)}s | ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out | $${cost.toFixed(4)}`)

    results.push({ model, briefMs, inputTokens, outputTokens, cost, whoTheyAre, painMap, angle, whyNow, outreach })
  }

  // ── Phase 3: HTML report ─────────────────────────────────────────────────

  console.log('\n📄  Building HTML report...')
  const html = buildReport(results, enrichment.toolCallLog)
  fs.writeFileSync(REPORT_PATH, html)
  console.log(`\n✅  Report saved: ${REPORT_PATH}`)
  console.log('    Open in Chrome → Cmd+P → Save as PDF\n')
}

// ─── HTML Report Builder ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildReport(
  results: Array<{
    model: ModelId
    briefMs: number
    inputTokens: number
    outputTokens: number
    cost: number
    whoTheyAre: any
    painMap: any
    angle: any
    whyNow: any
    outreach: any
  }>,
  toolCallLog: string[]
): string {
  const now = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
  const MODEL_COLORS: Record<string, string> = {
    'gpt-4.1': '#6366F1',
    'gpt-5':   '#10B981',
    'gpt-5.4': '#F59E0B',
  }

  const statsRows = results.map(r => `
    <tr>
      <td><span class="model-badge" style="background:${MODEL_COLORS[r.model]}20;color:${MODEL_COLORS[r.model]}">${r.model}</span></td>
      <td>${(r.briefMs / 1000).toFixed(1)}s</td>
      <td>${r.inputTokens.toLocaleString()}</td>
      <td>${r.outputTokens.toLocaleString()}</td>
      <td>${(r.inputTokens + r.outputTokens).toLocaleString()}</td>
      <td class="cost">$${r.cost.toFixed(4)}</td>
    </tr>`).join('')

  const colHeaders = results.map(r =>
    `<th style="border-top:3px solid ${MODEL_COLORS[r.model]}">${r.model}</th>`
  ).join('')

  // Angle comparison
  const angleRows = results.map(r => `
    <td>
      <p class="angle-headline">${esc(r.angle.headline)}</p>
      <p class="angle-reasoning">${esc(r.angle.reasoning)}</p>
      <span class="confidence conf-${r.angle.confidence}">${r.angle.confidence} confidence</span>
    </td>`).join('')

  // Why Now comparison
  const whyNowRows = results.map(r => `
    <td>
      ${r.whyNow.signals.map((s: any) => `
        <div class="signal ${s.strong ? 'signal-strong' : 'signal-medium'}">
          <span class="signal-dot"></span>
          <span>${esc(s.text)}</span>
          <span class="signal-date">${esc(s.date)}</span>
        </div>`).join('')}
      ${r.whyNow.summary ? `<p class="signal-summary">${esc(r.whyNow.summary)}</p>` : ''}
    </td>`).join('')

  // Pain map comparison
  const painRows = results.map(r => `
    <td>
      ${r.painMap.items.map((item: any) => `
        <div class="pain-item">
          <span class="pain-label">${esc(item.pain)}</span>
          <span class="pain-arrow">→</span>
          <span class="pain-match">${esc(item.valuePropMatch)}</span>
        </div>`).join('')}
    </td>`).join('')

  // LinkedIn note comparison
  const linkedinRows = results.map(r => {
    const note = r.outreach['linkedin-note'] ?? ''
    const overLimit = note.length > 300
    return `
    <td>
      <div class="outreach-text">${esc(note)}</div>
      <div class="char-count ${overLimit ? 'over-limit' : ''}">${note.length} / 300 chars${overLimit ? ' ⚠️ OVER LIMIT' : ''}</div>
    </td>`
  }).join('')

  // Email comparison
  const emailRows = results.map(r => `
    <td><div class="outreach-text">${esc(r.outreach['email'] ?? '')}</div></td>`).join('')

  // LinkedIn DM comparison
  const dmRows = results.map(r => `
    <td><div class="outreach-text">${esc(r.outreach['linkedin-dm'] ?? '')}</div></td>`).join('')

  // Full output per model (expandable)
  const fullOutputs = results.map(r => `
    <details class="full-output">
      <summary><span class="model-badge" style="background:${MODEL_COLORS[r.model]}20;color:${MODEL_COLORS[r.model]}">${r.model}</span> Full output</summary>
      <div class="full-output-body">
        <h4>Who They Are</h4>
        <p><strong>Headline:</strong> ${esc(r.whoTheyAre.headline)}</p>
        <p><strong>Career Summary:</strong> ${esc(r.whoTheyAre.careerSummary)}</p>
        <p><strong>Voice:</strong> ${esc(r.whoTheyAre.personalContext || 'No post data')}</p>
        <table class="arc-table">
          <thead><tr><th>Role</th><th>Company</th><th>Duration</th><th>Note</th></tr></thead>
          <tbody>${r.whoTheyAre.arc.map((s: any) => `
            <tr ${s.highlight ? 'class="highlight-row"' : ''}>
              <td>${esc(s.role)}</td><td>${esc(s.company)}</td>
              <td>${esc(s.duration)}</td><td>${esc(s.note || '')}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <h4>Pain Map</h4>
        ${r.painMap.items.map((item: any) => `
          <div class="pain-detail">
            <strong>${esc(item.pain)}</strong> → <em>${esc(item.valuePropMatch)}</em>
            <ul>${item.evidence.map((e: string) => `<li>${esc(e)}</li>`).join('')}</ul>
          </div>`).join('')}

        <h4>All Outreach Drafts</h4>
        ${['linkedin-note', 'linkedin-dm', 'email', 'follow-up', 'call-opener'].map(tab => `
          <div class="draft-block">
            <span class="draft-tab">${tab}</span>
            <pre class="draft-text">${esc(r.outreach[tab] ?? '')}</pre>
          </div>`).join('')}
      </div>
    </details>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brief Eval — Jensen Huang × Copper CRM</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; background: #FAFAFA; line-height: 1.5; }
  .page { max-width: 1200px; margin: 0 auto; padding: 40px 32px; }
  
  /* Header */
  .header { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #E5E7EB; }
  .header h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .header .meta { font-size: 12px; color: #9CA3AF; display: flex; gap: 16px; margin-top: 8px; }
  .header .meta span { display: flex; align-items: center; gap: 4px; }

  /* Section titles */
  h2 { font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.7px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #F3F4F6; }
  h3 { font-size: 14px; font-weight: 600; color: #374151; margin: 20px 0 10px; }
  h4 { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px; }

  /* Model badge */
  .model-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }

  /* Stats table */
  .stats-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .stats-table th { text-align: left; font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 2px solid #E5E7EB; }
  .stats-table td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; }
  .stats-table tr:last-child td { border-bottom: none; }
  .cost { font-weight: 600; color: #374151; }

  /* Research sources */
  .sources { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .source-tag { background: #F3F4F6; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-family: monospace; color: #374151; }

  /* Comparison table */
  .cmp-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .cmp-table th { padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; background: #F9FAFB; }
  .cmp-table td { padding: 14px 16px; vertical-align: top; border-bottom: 1px solid #F3F4F6; width: 33.33%; }
  .cmp-table th:not(:last-child), .cmp-table td:not(:last-child) { border-right: 1px solid #F3F4F6; }
  .cmp-table .row-label { background: #F9FAFB; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 16px; }

  /* Angle */
  .angle-headline { font-size: 15px; font-weight: 600; color: #111; line-height: 1.4; margin-bottom: 8px; }
  .angle-reasoning { font-size: 12px; color: #6B7280; line-height: 1.6; margin-bottom: 8px; }
  .confidence { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .conf-high { background: #D1FAE5; color: #065F46; }
  .conf-medium { background: #FEF3C7; color: #92400E; }
  .conf-low { background: #FEE2E2; color: #991B1B; }

  /* Signals */
  .signal { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .signal-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
  .signal-strong .signal-dot { background: #10B981; }
  .signal-medium .signal-dot { background: #F59E0B; }
  .signal-date { color: #9CA3AF; font-size: 11px; white-space: nowrap; }
  .signal-summary { font-size: 11px; color: #9CA3AF; margin-top: 8px; padding-top: 6px; border-top: 1px solid #F3F4F6; }

  /* Pain map */
  .pain-item { margin-bottom: 7px; font-size: 12px; line-height: 1.5; }
  .pain-label { font-weight: 600; color: #111; }
  .pain-arrow { color: #D1D5DB; margin: 0 4px; }
  .pain-match { color: #4F46E5; font-weight: 500; }

  /* Outreach */
  .outreach-text { font-size: 12px; color: #374151; line-height: 1.7; white-space: pre-wrap; }
  .char-count { font-size: 11px; color: #9CA3AF; margin-top: 8px; }
  .over-limit { color: #EF4444; font-weight: 600; }

  /* Full output */
  .full-output { margin-bottom: 16px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
  .full-output summary { padding: 12px 16px; cursor: pointer; background: #F9FAFB; display: flex; align-items: center; gap: 10px; font-weight: 600; }
  .full-output summary:hover { background: #F3F4F6; }
  .full-output-body { padding: 16px; }
  .arc-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  .arc-table th { background: #F9FAFB; padding: 6px 10px; text-align: left; font-size: 11px; color: #9CA3AF; text-transform: uppercase; }
  .arc-table td { padding: 6px 10px; border-bottom: 1px solid #F3F4F6; }
  .highlight-row { background: #EEF2FF; }
  .pain-detail { margin-bottom: 12px; }
  .pain-detail ul { margin-top: 4px; padding-left: 16px; font-size: 12px; color: #6B7280; }
  .draft-block { margin-bottom: 14px; }
  .draft-tab { display: inline-block; background: #F3F4F6; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #6B7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .draft-text { font-size: 12px; color: #374151; line-height: 1.7; white-space: pre-wrap; background: #F9FAFB; padding: 10px 12px; border-radius: 6px; border: 1px solid #E5E7EB; }

  /* Print */
  @media print {
    body { background: white; }
    .page { padding: 20px; max-width: 100%; }
    .full-output details { display: none; }
  }

  /* Playbook box */
  .playbook-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; font-size: 12px; color: #374151; }
  .playbook-box dl { display: grid; grid-template-columns: 120px 1fr; gap: 6px 12px; }
  .playbook-box dt { font-weight: 600; color: #6B7280; }
  .playbook-box dd { color: #374151; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>Brief Model Eval — Jensen Huang (Nvidia) × Copper CRM</h1>
    <div class="meta">
      <span>Generated: ${now}</span>
      <span>Lead: Jensen Huang, CEO at NVIDIA Corporation</span>
      <span>Models: gpt-4.1, gpt-5, gpt-5.4</span>
    </div>
  </div>

  <h2>Playbook (Copper CRM)</h2>
  <div class="playbook-box">
    <dl>
      <dt>Problem</dt><dd>${esc(PLAYBOOK.problem)}</dd>
      <dt>For who</dt><dd>${esc(PLAYBOOK.for_who)}</dd>
      <dt>Different</dt><dd>${esc(PLAYBOOK.different)}</dd>
      <dt>Tone</dt><dd>${esc(PLAYBOOK.tone.join(', '))}</dd>
      <dt>Never use</dt><dd>${esc(PLAYBOOK.never_use.join(', '))}</dd>
    </dl>
  </div>

  <h2>Research Sources (shared across all models)</h2>
  <div class="sources">
    ${toolCallLog.map(t => `<span class="source-tag">${esc(t)}</span>`).join('')}
  </div>

  <h2>Performance Stats</h2>
  <table class="stats-table">
    <thead>
      <tr>
        <th>Model</th>
        <th>Brief time</th>
        <th>Input tokens</th>
        <th>Output tokens</th>
        <th>Total tokens</th>
        <th>Est. cost</th>
      </tr>
    </thead>
    <tbody>${statsRows}</tbody>
  </table>

  <h2>Angle Comparison</h2>
  <table class="cmp-table">
    <thead><tr>${colHeaders}</tr></thead>
    <tbody><tr>${angleRows}</tr></tbody>
  </table>

  <h2>Why Now Signals</h2>
  <table class="cmp-table">
    <thead><tr>${colHeaders}</tr></thead>
    <tbody><tr>${whyNowRows}</tr></tbody>
  </table>

  <h2>Pain Map</h2>
  <table class="cmp-table">
    <thead><tr>${colHeaders}</tr></thead>
    <tbody><tr>${painRows}</tr></tbody>
  </table>

  <h2>LinkedIn Note (≤300 chars)</h2>
  <table class="cmp-table">
    <thead><tr>${colHeaders}</tr></thead>
    <tbody><tr>${linkedinRows}</tr></tbody>
  </table>

  <h2>Email</h2>
  <table class="cmp-table">
    <thead><tr>${colHeaders}</tr></thead>
    <tbody><tr>${emailRows}</tr></tbody>
  </table>

  <h2>LinkedIn DM</h2>
  <table class="cmp-table">
    <thead><tr>${colHeaders}</tr></thead>
    <tbody><tr>${dmRows}</tr></tbody>
  </table>

  <h2>Full Output per Model</h2>
  ${fullOutputs}

</div>
</body>
</html>`
}

main().catch(err => {
  console.error('\n❌  Eval failed:', err)
  process.exit(1)
})
