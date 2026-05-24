"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/signal/sidebar"
import {
  Loader2, Check, ChevronRight, Clock,
  Briefcase, MessageSquareQuote, ExternalLink, Copy,
  GraduationCap, ChevronDown,
} from "lucide-react"
import type {
  WhoTheyAre,
  PainMap,
  Angle,
  WhyNow,
  OutreachDrafts,
  BriefSseEvent,
  CareerStep as CareerStepType,
  EducationEntry,
  CompanyBadge,
} from "@/lib/brief-types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g)
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (match) {
      return (
        <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer"
          className="underline decoration-signal-text-4 hover:text-signal-accent transition-colors">
          {match[1]}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "linkedin-note" | "linkedin-dm" | "email" | "follow-up" | "call-opener"
type Phase = "idle" | "researching" | "generating" | "done"

const TAB_LABELS: Record<Tab, string> = {
  "linkedin-note": "LinkedIn note",
  "linkedin-dm": "LinkedIn DM",
  email: "Email",
  "follow-up": "Follow-up",
  "call-opener": "Call opener",
}

interface LeadForm {
  linkedin_url: string
  full_name: string
  job_title: string
  company_name: string
  company_linkedin_url: string
  company_domain: string
}

interface PlaybookForm {
  problem: string
  for_who: string
  different: string
  value_props: string
  competitors: string
  tone: string
  never_use: string
}

const DEFAULT_LEAD: LeadForm = {
  linkedin_url: "",
  full_name: "",
  job_title: "",
  company_name: "",
  company_linkedin_url: "",
  company_domain: "",
}

const DEFAULT_PLAYBOOK: PlaybookForm = {
  problem: "",
  for_who: "",
  different: "",
  value_props: "",
  competitors: "",
  tone: "",
  never_use: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-signal-raised ${className ?? ""}`} />
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-[0.8px]">{title}</span>
      <span className="h-px flex-1 bg-signal-raised" />
    </div>
  )
}

function CareerStep({ role, company, duration, note, highlight, companyLogo }: CareerStepType) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full mt-1.5 border-2"
          style={{ background: highlight ? "var(--signal-accent)" : "var(--signal-bg)", borderColor: highlight ? "var(--signal-accent)" : "var(--signal-border)" }}
        />
        <div className="w-[1.5px] flex-1 bg-signal-raised mt-1" />
      </div>
      <div className="pb-4 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-medium text-signal-text-1">{role}</span>
          <span className="text-[11px] text-signal-text-4 shrink-0">{duration}</span>
        </div>
        <p className="text-[12px] text-signal-text-3 mt-0.5 flex items-center gap-1.5">
          {companyLogo && (
            <img src={companyLogo} alt="" className="w-3.5 h-3.5 rounded-sm object-cover inline-block" />
          )}
          {company}
        </p>
        {note && <p className="text-[12px] text-signal-text-2 mt-1.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  )
}

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-signal-text-1">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

const ARC_PREVIEW_COUNT = 3

function WhoTheyAreSection({ whoTheyAre }: { whoTheyAre: WhoTheyAre }) {
  const [arcExpanded, setArcExpanded] = useState(false)
  const visibleArc = arcExpanded ? whoTheyAre.arc : whoTheyAre.arc.slice(0, ARC_PREVIEW_COUNT)
  const hasMoreArc = whoTheyAre.arc.length > ARC_PREVIEW_COUNT

  return (
    <div className="mt-4 space-y-5">
      {whoTheyAre.careerSummary && (
        <p className="text-[13px] text-signal-text-2 leading-relaxed">
          <BoldText text={whoTheyAre.careerSummary} />
        </p>
      )}

      <div className="grid grid-cols-2 gap-7">
        <div>
          <div className="text-[10px] font-semibold text-signal-text-4 uppercase tracking-[0.8px] flex items-center gap-1.5 mb-3">
            <Briefcase className="w-3 h-3" /> Career
          </div>
          {visibleArc.map((step, i) => <CareerStep key={i} {...step} />)}
          {hasMoreArc && (
            <button
              onClick={() => setArcExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[12px] text-signal-text-3 hover:text-signal-text-2 transition-colors mt-1"
            >
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform"
                style={{ transform: arcExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              />
              {arcExpanded ? "Show less" : `Show ${whoTheyAre.arc.length - ARC_PREVIEW_COUNT} more roles`}
            </button>
          )}
        </div>
        <div>
          <div className="text-[10px] font-semibold text-signal-text-4 uppercase tracking-[0.8px] flex items-center gap-1.5 mb-3">
            <MessageSquareQuote className="w-3 h-3" /> Voice
          </div>
          {whoTheyAre.personalContext ? (
            <div className="border-l-2 border-signal-border pl-3 py-0.5">
              <p className="text-[12px] text-signal-text-2 leading-snug">{whoTheyAre.personalContext}</p>
            </div>
          ) : (
            <p className="text-[12px] text-signal-text-4">No recent post data found.</p>
          )}
        </div>
      </div>

      {whoTheyAre.education && whoTheyAre.education.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-signal-text-4 uppercase tracking-[0.8px] flex items-center gap-1.5 mb-3">
            <GraduationCap className="w-3 h-3" /> Education
          </div>
          <div className="space-y-2">
            {whoTheyAre.education.map((edu, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {edu.schoolLogo ? (
                  <img src={edu.schoolLogo} alt="" className="w-4 h-4 rounded-sm object-cover mt-0.5 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-sm bg-signal-raised flex items-center justify-center mt-0.5 shrink-0">
                    <GraduationCap className="w-2.5 h-2.5 text-signal-text-4" />
                  </div>
                )}
                <div>
                  <p className="text-[12px] font-medium text-signal-text-1">{edu.school}</p>
                  {edu.degree && <p className="text-[11px] text-signal-text-3">{edu.degree}</p>}
                  {edu.years && <p className="text-[11px] text-signal-text-4">{edu.years}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function parsePlaybookForm(form: PlaybookForm) {
  const tryParse = (v: string): unknown => {
    if (!v.trim()) return undefined
    try { return JSON.parse(v) } catch { return v }
  }
  return {
    problem: form.problem || undefined,
    for_who: form.for_who || undefined,
    different: form.different || undefined,
    value_props: tryParse(form.value_props),
    competitors: tryParse(form.competitors),
    tone: form.tone ? form.tone.split(",").map(s => s.trim()).filter(Boolean) : undefined,
    never_use: form.never_use ? form.never_use.split(",").map(s => s.trim()).filter(Boolean) : undefined,
  }
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  lead, setLead, playbook, setPlaybook, onGenerate, phase,
}: {
  lead: LeadForm
  setLead: React.Dispatch<React.SetStateAction<LeadForm>>
  playbook: PlaybookForm
  setPlaybook: React.Dispatch<React.SetStateAction<PlaybookForm>>
  onGenerate: () => void
  phase: Phase
}) {
  const isSpinning = phase === "researching" || phase === "generating"

  const LEAD_FIELDS: { label: string; key: keyof LeadForm; placeholder: string }[] = [
    { label: "LinkedIn URL *", key: "linkedin_url", placeholder: "https://linkedin.com/in/…" },
    { label: "Full Name", key: "full_name", placeholder: "Jane Smith" },
    { label: "Job Title", key: "job_title", placeholder: "VP of Sales" },
    { label: "Company Name", key: "company_name", placeholder: "Acme Corp" },
    { label: "Company LinkedIn", key: "company_linkedin_url", placeholder: "https://linkedin.com/company/…" },
    { label: "Company Domain", key: "company_domain", placeholder: "acme.com" },
  ]

  const PLAYBOOK_TEXT_FIELDS: { label: string; key: keyof PlaybookForm; placeholder: string }[] = [
    { label: "Problem", key: "problem", placeholder: "What problem do you solve?" },
    { label: "For who", key: "for_who", placeholder: "VP Sales at 50-500 person SaaS" },
    { label: "Differentiation", key: "different", placeholder: "What makes you different?" },
  ]

  const PLAYBOOK_INLINE_FIELDS: { label: string; key: keyof PlaybookForm; placeholder: string }[] = [
    { label: "Tone", key: "tone", placeholder: "direct, concise, no fluff" },
    { label: "Never use", key: "never_use", placeholder: "synergy, leverage, circle back" },
  ]

  return (
    <div
      className="w-[300px] border-r border-signal-border shrink-0 flex flex-col overflow-y-auto"
      style={{ height: "calc(100vh - 52px)" }}
    >
      <div className="px-5 py-5 space-y-6 flex-1">

        {/* Lead */}
        <section>
          <p className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-[0.8px] mb-3">Lead</p>
          <div className="space-y-2.5">
            {LEAD_FIELDS.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] text-signal-text-4 mb-1">{label}</label>
                <input
                  type="text"
                  value={lead[key]}
                  placeholder={placeholder}
                  onChange={e => setLead(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full h-[30px] border border-signal-border rounded-md px-2.5 text-[13px] text-signal-text-1 outline-none placeholder:text-signal-text-4 focus:border-signal-accent transition-colors"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Playbook */}
        <section>
          <p className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-[0.8px] mb-3">Playbook</p>
          <div className="space-y-2.5">
            {PLAYBOOK_TEXT_FIELDS.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] text-signal-text-4 mb-1">{label}</label>
                <textarea
                  value={playbook[key]}
                  placeholder={placeholder}
                  rows={2}
                  onChange={e => setPlaybook(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-signal-border rounded-md px-2.5 py-1.5 text-[13px] text-signal-text-1 outline-none placeholder:text-signal-text-4 focus:border-signal-accent transition-colors resize-none"
                />
              </div>
            ))}

            <div>
              <label className="block text-[11px] text-signal-text-4 mb-1">
                Value Props{" "}
                <span className="font-normal text-signal-text-4">JSON or plain text</span>
              </label>
              <textarea
                value={playbook.value_props}
                rows={3}
                placeholder={`[{"outcome":"Save 10h/week","persona":"VP Sales"}]`}
                onChange={e => setPlaybook(prev => ({ ...prev, value_props: e.target.value }))}
                className="w-full border border-signal-border rounded-md px-2.5 py-1.5 text-[12px] font-mono text-signal-text-1 outline-none placeholder:text-signal-text-4 focus:border-signal-accent transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-signal-text-4 mb-1">
                Competitors{" "}
                <span className="font-normal text-signal-text-4">JSON or plain text</span>
              </label>
              <textarea
                value={playbook.competitors}
                rows={3}
                placeholder={`[{"name":"Acme","weakness":"No automation"}]`}
                onChange={e => setPlaybook(prev => ({ ...prev, competitors: e.target.value }))}
                className="w-full border border-signal-border rounded-md px-2.5 py-1.5 text-[12px] font-mono text-signal-text-1 outline-none placeholder:text-signal-text-4 focus:border-signal-accent transition-colors resize-none"
              />
            </div>

            {PLAYBOOK_INLINE_FIELDS.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] text-signal-text-4 mb-1">
                  {label}{" "}
                  <span className="font-normal text-signal-text-4">comma-separated</span>
                </label>
                <input
                  type="text"
                  value={playbook[key]}
                  placeholder={placeholder}
                  onChange={e => setPlaybook(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full h-[30px] border border-signal-border rounded-md px-2.5 text-[13px] text-signal-text-1 outline-none placeholder:text-signal-text-4 focus:border-signal-accent transition-colors"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="px-5 pb-5 shrink-0">
        <button
          onClick={onGenerate}
          disabled={isSpinning || !lead.linkedin_url.trim()}
          className="w-full h-10 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-xl text-[13px] font-medium hover:bg-[#333] dark:hover:bg-[#E4E4E7] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isSpinning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {phase === "researching" ? "Researching…" : "Writing…"}
            </>
          ) : "Generate Brief"}
        </button>
      </div>
    </div>
  )
}

// ─── Brief Panel ──────────────────────────────────────────────────────────────

function BriefPanel({
  lead, phase, whoTheyAre, painMap, angle, whyNow, toolCallLog,
}: {
  lead: LeadForm
  phase: Phase
  whoTheyAre: WhoTheyAre | null
  painMap: PainMap | null
  angle: Angle | null
  whyNow: WhyNow | null
  toolCallLog: string[]
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)

  const isSpinning = phase === "researching" || phase === "generating"
  const initials = (lead.full_name || "?")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex-1 h-full overflow-y-auto px-10 py-8">

      {/* Header */}
      <div className="flex items-start gap-3.5 pb-5 border-b border-signal-border-faint">
        <div className="w-11 h-11 rounded-full bg-signal-accent-tint flex items-center justify-center shrink-0">
          <span className="text-[14px] font-semibold text-signal-accent-2">{initials}</span>
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-signal-text-1 leading-tight">{lead.full_name || "—"}</h1>
          <p className="text-[13px] text-signal-text-3 mt-0.5">
            {[lead.job_title, lead.company_name].filter(Boolean).join(" · ") || lead.linkedin_url}
          </p>
        </div>
      </div>

      {/* Research progress */}
      {isSpinning && (
        <div className="pt-8 pb-6">
          <div className="flex items-center gap-3 text-[13px] text-signal-text-3">
            <Loader2 className="w-4 h-4 animate-spin text-signal-accent" />
            <span>{phase === "researching" ? "Gathering intelligence…" : "Writing sections…"}</span>
          </div>
          {toolCallLog.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {toolCallLog.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-signal-text-4">
                  <Check className="w-3 h-3 text-[#10B981] shrink-0" />
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* The Angle */}
      <div className="pt-9 pb-8 border-b border-signal-border-faint">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold text-signal-accent uppercase tracking-[1.2px]">The Angle</span>
          <span className="h-px flex-1 bg-signal-accent-border" />
        </div>
        {angle ? (
          <>
            <p className="text-[20px] text-signal-text-1 leading-[1.45] font-medium tracking-[-0.01em]">{angle.headline}</p>
            <p className="text-[13px] text-signal-text-3 mt-3 leading-relaxed">{angle.reasoning}</p>
            <div className="flex items-center gap-2 mt-5 text-[12px] text-signal-text-3">
              <span>Confidence</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full" style={{
                    background:
                      (angle.confidence === "high" && i <= 4) ||
                      (angle.confidence === "medium" && i <= 3) ||
                      (angle.confidence === "low" && i <= 2)
                        ? "#4F46E5" : "var(--signal-border)",
                  }} />
                ))}
              </div>
              <span className="text-signal-text-4 capitalize">{angle.confidence}</span>
            </div>
          </>
        ) : isSpinning ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-4" />
          </div>
        ) : (
          <p className="text-[13px] text-signal-text-4">Fill in a LinkedIn URL and hit Generate Brief.</p>
        )}
      </div>

      {/* Why Now */}
      <section className="mt-8">
        <SectionHeader title="Why now" />
        {whyNow ? (
          <>
            <div className="space-y-1.5">
              {whyNow.signals.map((signal, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: signal.strong ? "#10B981" : "#F59E0B" }} />
                  <span className="text-signal-text-1">{signal.text}</span>
                  <span className="text-signal-text-4">{signal.date}</span>
                </div>
              ))}
            </div>
            {whyNow.summary && (
              <div className="flex items-center gap-1.5 mt-2.5 text-[12px] text-signal-text-4">
                <Clock className="w-3 h-3" />
                <span>{whyNow.summary}</span>
              </div>
            )}
          </>
        ) : isSpinning ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : null}
      </section>

      {/* What Hurts */}
      <section className="mt-8">
        <SectionHeader title="What hurts" />
        {painMap ? (
          <>
            <div className="space-y-3">
              {painMap.items.map((item, i) => {
                const isTop = item.pain === painMap.topPain
                return (
                  <div key={i}>
                    <div className="flex items-start gap-2 text-[13px] leading-[1.55]">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isTop ? 'bg-signal-accent' : 'bg-signal-text-4'}`} />
                      <span className={`${isTop ? 'text-signal-text-1 font-semibold' : 'text-signal-text-1 font-medium'}`}>{item.pain}</span>
                    </div>
                    {item.keyProof && (
                      <p className="text-[11px] text-signal-text-4 ml-[18px] mt-1 leading-snug">↳ {renderWithLinks(item.keyProof)}</p>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-3">
              <button
                onClick={() => setEvidenceOpen(v => !v)}
                className="flex items-center gap-1.5 text-[12px] text-signal-text-4 hover:text-signal-text-3 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 transition-transform"
                  style={{ transform: evidenceOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
                Show reasoning
              </button>
              {evidenceOpen && (
                <div className="mt-2.5 ml-5 space-y-3">
                  {painMap.items.map((item, gi) => (
                    <div key={gi}>
                      <span className="text-[12px] font-medium text-signal-text-2">{item.pain}</span>
                      <div className="mt-1 space-y-1">
                        {item.evidence.map((e, ei) => (
                          <div key={ei} className="flex gap-2 text-[12px] text-signal-text-3 leading-[1.55]">
                            <span className="text-signal-accent-border shrink-0">→</span>
                            <span>{renderWithLinks(e)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : isSpinning ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : null}
      </section>

      {/* Who They Are */}
      <section className="mt-8">
        <button
          onClick={() => setContextOpen(v => !v)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-[0.8px]">Who they are</span>
            <span className="text-[12px] text-signal-text-4">Career arc + communication style</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-signal-text-4 transition-transform group-hover:text-signal-text-3"
            style={{ transform: contextOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
        </button>
        {/* Company bar — always visible when data exists */}
        {whoTheyAre?.companies && whoTheyAre.companies.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            {whoTheyAre.companies.map((c, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-signal-surface rounded-lg border border-signal-border-faint">
                {c.logo ? (
                  <img src={c.logo} alt="" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded bg-signal-raised flex items-center justify-center">
                    <span className="text-[9px] font-semibold text-signal-text-4">{c.name.charAt(0)}</span>
                  </div>
                )}
                <span className="text-[12px] text-signal-text-2 font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        )}
        {contextOpen && whoTheyAre && (
          <WhoTheyAreSection whoTheyAre={whoTheyAre} />
        )}
        {contextOpen && !whoTheyAre && isSpinning && (
          <div className="mt-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
        )}
      </section>

      {/* Sources */}
      {toolCallLog.length > 0 && (
        <div className="mt-8 pt-4 border-t border-signal-border-faint">
          <button onClick={() => setSourcesOpen(v => !v)} className="flex items-center gap-2 w-full text-left">
            <ChevronRight className="w-3.5 h-3.5 text-signal-text-4 transition-transform"
              style={{ transform: sourcesOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
            <span className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-[0.8px]">Sources</span>
            <span className="text-[12px] text-signal-text-3">{toolCallLog.length} calls</span>
          </button>
          {sourcesOpen && (
            <div className="mt-3 space-y-1.5">
              {toolCallLog.map((src, i) => (
                <div key={i} className="flex items-center justify-between text-[12px] py-1.5 px-2 -mx-2 rounded hover:bg-signal-surface">
                  <span className="text-signal-text-2 font-mono text-[11px]">{src}</span>
                  <ExternalLink className="w-3 h-3 text-signal-text-4" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Outreach Panel ───────────────────────────────────────────────────────────

function OutreachPanel({
  outreachDrafts, isLoading,
}: {
  outreachDrafts: OutreachDrafts | null
  isLoading: boolean
}) {
  const EMPTY: Record<Tab, string> = {
    "linkedin-note": "", "linkedin-dm": "", email: "", "follow-up": "", "call-opener": "",
  }
  const [activeTab, setActiveTab] = useState<Tab>("linkedin-note")
  const [drafts, setDrafts] = useState<Record<Tab, string>>(EMPTY)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (outreachDrafts) {
      const normalized = { ...outreachDrafts } as unknown as Record<Tab, string>
      // Defensive: LLM sometimes returns email as { subject, body } object instead of a string
      const email = normalized['email']
      if (email && typeof email === 'object') {
        const e = email as unknown as { subject?: string; body?: string }
        normalized['email'] = [e.subject ? `Subject: ${e.subject}` : '', e.body ?? ''].filter(Boolean).join('\n\n')
      }
      setDrafts(normalized)
    }
  }, [outreachDrafts])

  const currentDraft = drafts[activeTab]

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tabs: Tab[] = ["linkedin-note", "linkedin-dm", "email", "follow-up", "call-opener"]

  return (
    <div
      className="w-[380px] border-l border-signal-border flex flex-col shrink-0 overflow-y-auto"
      style={{ height: "calc(100vh - 52px)" }}
    >
      <div className="px-6 py-6 flex flex-col h-full">
        <h2 className="text-[16px] font-semibold text-signal-text-1 mb-4">Outreach</h2>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 text-[12px] rounded-lg border transition-colors"
              style={{
                background: activeTab === tab ? "var(--signal-text-1)" : "var(--signal-bg)",
                color: activeTab === tab ? "var(--signal-bg)" : "var(--signal-text-3)",
                borderColor: activeTab === tab ? "var(--signal-text-1)" : "var(--signal-border)",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {activeTab === "linkedin-note" && outreachDrafts && (
          <div className="mb-3">
            <span className="text-[11px] text-signal-text-4">{currentDraft.length} / 300</span>
            <div className="h-[3px] bg-signal-raised rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-signal-accent rounded-full transition-all"
                style={{ width: `${Math.min((currentDraft.length / 300) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 space-y-2 pt-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <textarea
            value={currentDraft}
            onChange={e => setDrafts(prev => ({ ...prev, [activeTab]: e.target.value }))}
            className="w-full flex-1 min-h-[160px] text-[14px] text-signal-text-1 leading-[1.8] outline-none resize-none bg-transparent font-[inherit]"
            placeholder={outreachDrafts ? "" : "Generate a brief to see outreach drafts."}
            style={{ border: "none" }}
          />
        )}

        <div className="border-t border-signal-border-faint pt-4 mt-4">
          <button
            onClick={handleCopy}
            disabled={!outreachDrafts}
            className="flex items-center justify-center gap-2 w-full h-[36px] border border-signal-border rounded-lg text-[13px] text-signal-text-2 hover:bg-signal-surface transition-colors disabled:opacity-40"
          >
            {copied
              ? <><Check className="w-4 h-4 text-[#10B981]" /> Copied!</>
              : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [lead, setLead] = useState<LeadForm>(DEFAULT_LEAD)
  const [playbook, setPlaybook] = useState<PlaybookForm>(DEFAULT_PLAYBOOK)
  const [phase, setPhase] = useState<Phase>("idle")
  const [whoTheyAre, setWhoTheyAre] = useState<WhoTheyAre | null>(null)
  const [painMap, setPainMap] = useState<PainMap | null>(null)
  const [angle, setAngle] = useState<Angle | null>(null)
  const [whyNow, setWhyNow] = useState<WhyNow | null>(null)
  const [outreachDrafts, setOutreachDrafts] = useState<OutreachDrafts | null>(null)
  const [toolCallLog, setToolCallLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    if (phase === "researching" || phase === "generating") return
    setPhase("researching")
    setWhoTheyAre(null); setPainMap(null); setAngle(null)
    setWhyNow(null); setOutreachDrafts(null); setToolCallLog([]); setError(null)

    try {
      const res = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead, playbook: parsePlaybookForm(playbook) }),
      })
      if (!res.ok || !res.body) { setError("Failed to start generation"); setPhase("idle"); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6)) as BriefSseEvent
            if (event.type === "research_start") setPhase("researching")
            else if (event.type === "research_done") { setToolCallLog(event.toolCallLog); setPhase("generating") }
            else if (event.type === "section") {
              if (event.section === "who_they_are") setWhoTheyAre(event.data)
              else if (event.section === "pain_map") setPainMap(event.data)
              else if (event.section === "angle") setAngle(event.data)
              else if (event.section === "why_now") setWhyNow(event.data)
              else if (event.section === "outreach_drafts") setOutreachDrafts(event.data)
            }
            else if (event.type === "done") setPhase("done")
            else if (event.type === "error") { setError(event.message); setPhase("idle") }
          } catch { /* malformed chunk */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setPhase("idle")
    }
  }, [lead, playbook, phase])

  const isSpinning = phase === "researching" || phase === "generating"

  return (
    <div className="min-h-screen bg-signal-bg">
      <Sidebar activePage="lists" />
      <div className="ml-[200px] flex flex-col" style={{ minHeight: "100vh" }}>
        <header className="h-[52px] bg-signal-bg border-b border-signal-border flex items-center px-6 gap-3 shrink-0">
          <span className="text-[15px] font-semibold text-signal-text-1">Playground</span>
          <span className="text-[12px] text-signal-text-4 bg-signal-raised px-2 py-0.5 rounded-full">dev only</span>
          {error && <span className="ml-4 text-[12px] text-red-500">{error}</span>}
        </header>

        <div className="flex" style={{ height: "calc(100vh - 52px)" }}>
          <ConfigPanel
            lead={lead}
            setLead={setLead}
            playbook={playbook}
            setPlaybook={setPlaybook}
            onGenerate={handleGenerate}
            phase={phase}
          />
          <BriefPanel
            lead={lead}
            phase={phase}
            whoTheyAre={whoTheyAre}
            painMap={painMap}
            angle={angle}
            whyNow={whyNow}
            toolCallLog={toolCallLog}
          />
          <OutreachPanel
            outreachDrafts={outreachDrafts}
            isLoading={isSpinning && !outreachDrafts}
          />
        </div>
      </div>
    </div>
  )
}
