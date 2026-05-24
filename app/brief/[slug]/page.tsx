"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/signal/sidebar"
import {
  ArrowLeft, RefreshCw, Share2, Mail, Linkedin, MapPin,
  Clock, ChevronRight, Copy, ExternalLink, Check,
  Briefcase, MessageSquareQuote, ArrowRight, Loader2,
  GraduationCap, ChevronDown, Phone
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

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "linkedin-note" | "linkedin-dm" | "email" | "follow-up" | "call-opener"

const TAB_LABELS: Record<Tab, string> = {
  "linkedin-note": "LinkedIn note",
  "linkedin-dm": "LinkedIn DM",
  "email": "Email",
  "follow-up": "Follow-up",
  "call-opener": "Call opener",
}

interface LeadData {
  id: string
  full_name: string
  job_title?: string | null
  company_name?: string | null
  company_domain?: string | null
  linkedin_url?: string | null
  company_linkedin_url?: string | null
  email?: string | null
  phone_direct?: string | null
  phone_mobile?: string | null
  city?: string | null
  country?: string | null
  brief_generated?: boolean | null
  brief_status?: 'generating' | 'generated' | null
  brief_generation_started_at?: string | null
  brief_generated_at?: string | null
}

// ─── Time helper ─────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-signal-raised ${className ?? ""}`} />
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-[0.8px]">{title}</span>
      <span className="h-px flex-1 bg-signal-raised" />
    </div>
  )
}

// ─── Career step ──────────────────────────────────────────────────────────────

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

// ─── Bold markdown renderer ──────────────────────────────────────────────────

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

// ─── Who They Are section ────────────────────────────────────────────────────

const ARC_PREVIEW_COUNT = 3

function WhoTheyAreSection({ whoTheyAre }: { whoTheyAre: WhoTheyAre }) {
  const [arcExpanded, setArcExpanded] = useState(false)
  const visibleArc = arcExpanded ? whoTheyAre.arc : whoTheyAre.arc.slice(0, ARC_PREVIEW_COUNT)
  const hasMoreArc = whoTheyAre.arc.length > ARC_PREVIEW_COUNT

  return (
    <div className="mt-4 space-y-5">
      {/* Career Summary — on top with bold key phrases */}
      {whoTheyAre.careerSummary && (
        <p className="text-[13px] text-signal-text-2 leading-relaxed">
          <BoldText text={whoTheyAre.careerSummary} />
        </p>
      )}

      {/* Two-column grid: Career + Voice */}
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

      {/* Education — separate section */}
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

// ─── Research Progress Animation ─────────────────────────────────────────────

const RESEARCH_ANIMATION_STYLES = `
  @keyframes sigSweep {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(600%); }
  }
  @keyframes sigOrb {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.45); }
    50%      { box-shadow: 0 0 0 7px rgba(99,102,241,0); }
  }
  @keyframes sigFadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sigCheckIn {
    0%   { transform: scale(0);   opacity: 0; }
    60%  { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes sigBlink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }
`

function ResearchProgress({
  phase, toolCallLog, whoTheyAre, painMap, angle, whyNow, leadName,
}: {
  phase: GenerationPhase
  toolCallLog: string[]
  whoTheyAre: WhoTheyAre | null
  painMap: PainMap | null
  angle: Angle | null
  whyNow: WhyNow | null
  leadName: string
}) {
  const [activeChip, setActiveChip] = useState(0)
  useEffect(() => {
    if (phase !== "researching") return
    const t = setInterval(() => setActiveChip(n => (n + 1) % 4), 2000)
    return () => clearInterval(t)
  }, [phase])

  const chips = ["Scanning professional history", "Analysing company signals", "Reading public activity", "Cross-referencing sources"]

  const sources = [
    toolCallLog.some(l => l.startsWith("linkedin_person"))  && "Professional context",
    toolCallLog.some(l => l.startsWith("linkedin_company")) && "Company signals",
    toolCallLog.some(l => l.startsWith("linkedin_posts"))   && "Public activity",
    toolCallLog.filter(l => l.startsWith("web_search")).length > 0 && "External sources",
  ].filter(Boolean) as string[]

  const steps = [
    { label: "Who they are",    done: !!whoTheyAre },
    { label: "Pain map",        done: !!painMap },
    { label: "The angle",       done: !!angle },
    { label: "Why now",         done: !!whyNow },
    { label: "Outreach drafts", done: false },
  ]
  const activeIdx = steps.findIndex(s => !s.done)

  if (phase === "researching" || phase === "polling") {
    return (
      <>
        <style>{RESEARCH_ANIMATION_STYLES}</style>
        <div className="pt-8 pb-6">
          <div className="flex items-center gap-2.5 mb-5">
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#6366F1", animation: "sigOrb 1.8s ease-in-out infinite",
            }} />
            <span className="text-[14px] font-semibold text-signal-text-1">
              Researching {leadName}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {chips.map((chip, i) => (
              <div key={chip}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] transition-all duration-500"
                style={{
                  background: activeChip === i ? "var(--signal-accent-tint)" : "var(--signal-surface)",
                  color:      activeChip === i ? "var(--signal-accent-2)" : "var(--signal-text-4)",
                  fontWeight: activeChip === i ? 600 : 400,
                  border:     `1px solid ${activeChip === i ? "var(--signal-accent-border)" : "transparent"}`,
                }}>
                <span style={{
                  display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                  background: activeChip === i ? "var(--signal-accent)" : "var(--signal-border)",
                  transition: "background 0.4s",
                  ...(activeChip === i ? { animation: "sigBlink 1s ease-in-out infinite" } : {}),
                }} />
                {chip}
              </div>
            ))}
          </div>
          <div className="mt-5 relative h-[2px] bg-signal-raised rounded-full overflow-hidden">
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%", width: "18%",
              background: "linear-gradient(90deg, transparent, #818CF8, #6366F1, transparent)",
              animation: "sigSweep 2.4s ease-in-out infinite",
            }} />
          </div>
        </div>
      </>
    )
  }

  if (phase === "generating") {
    return (
      <>
        <style>{RESEARCH_ANIMATION_STYLES}</style>
        <div className="pt-8 pb-6">
          {sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {sources.map((s, i) => (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: "#F0FDF4", color: "#15803D",
                    border: "1px solid #BBF7D0",
                    animation: `sigFadeUp 0.4s ease ${i * 0.07}s both`,
                  }}>
                  <Check className="w-2.5 h-2.5" style={{ color: "#22C55E" }} />
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-4">
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#6366F1", animation: "sigOrb 1.8s ease-in-out infinite",
            }} />
            <span className="text-[14px] font-semibold text-signal-text-1">Writing brief</span>
          </div>
          <div className="space-y-2.5">
            {steps.map((step, i) => {
              const isActive = !step.done && i === activeIdx
              return (
                <div key={step.label} className="flex items-center gap-2.5 text-[12px]"
                  style={{ animation: `sigFadeUp 0.35s ease ${i * 0.06}s both` }}>
                  <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: step.done ? "#DCFCE7" : isActive ? "var(--signal-accent-tint)" : "var(--signal-surface)",
                      border: `1.5px solid ${step.done ? "#86EFAC" : isActive ? "var(--signal-accent-border)" : "var(--signal-border)"}`,
                    }}>
                    {step.done ? (
                      <Check className="w-2.5 h-2.5"
                        style={{ color: "#22C55E", animation: "sigCheckIn 0.3s ease" }} />
                    ) : isActive ? (
                      <span style={{
                        display: "inline-block", width: 4, height: 4, borderRadius: "50%",
                        background: "#818CF8", animation: "sigBlink 0.9s ease-in-out infinite",
                      }} />
                    ) : (
                      <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "var(--signal-border)" }} />
                    )}
                  </div>
                  <span className="transition-colors duration-300" style={{
                    color:      step.done ? "#15803D" : isActive ? "var(--signal-accent-2)" : "var(--signal-text-4)",
                    fontWeight: step.done ? 500 : isActive ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  return null
}



// ─── Generate screen ──────────────────────────────────────────────────────────

function GenerateScreen({ lead, onGenerate }: { lead: LeadData; onGenerate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-signal-accent-tint flex items-center justify-center mx-auto mb-4">
          <span className="text-[18px] font-bold text-signal-accent-2">
            {lead.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>
        <h2 className="text-[18px] font-semibold text-signal-text-1 mb-1">{lead.full_name}</h2>
        <p className="text-[13px] text-signal-text-3 mb-6">
          {[lead.job_title, lead.company_name].filter(Boolean).join(" · ")}
        </p>
        <button
          onClick={onGenerate}
          className="w-full h-11 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-xl text-[14px] font-medium hover:bg-[#333] dark:hover:bg-[#E4E4E7] transition-colors mb-2"
        >
          Generate Brief
        </button>
        <p className="text-[11px] text-signal-text-4">Uses 1 credit · ~90 seconds</p>
      </div>
    </div>
  )
}

// ─── Brief Panel ──────────────────────────────────────────────────────────────

type GenerationPhase = "idle" | "researching" | "generating" | "done" | "polling"

function BriefPanel({
  lead, phase, whoTheyAre, painMap, angle, whyNow, toolCallLog,
}: {
  lead: LeadData
  phase: GenerationPhase
  whoTheyAre: WhoTheyAre | null
  painMap: PainMap | null
  angle: Angle | null
  whyNow: WhyNow | null
  toolCallLog: string[]
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)

  const initials = lead.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
  const subtitle = [lead.job_title, lead.company_name].filter(Boolean).join(" · ")
  const location = [lead.city, lead.country].filter(Boolean).join(", ")

  const isSpinning = phase === "researching" || phase === "generating" || phase === "polling"

  return (
    <div className="flex-1 h-full overflow-y-auto px-12 py-8 min-w-0">
      {/* Header */}
      <div className="flex items-start justify-between pb-5 border-b border-signal-border-faint">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-full bg-signal-accent-tint flex items-center justify-center shrink-0">
            <span className="text-[14px] font-semibold text-signal-accent-2">{initials}</span>
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-signal-text-1 leading-tight">{lead.full_name}</h1>
            <p className="text-[13px] text-signal-text-3 mt-0.5">{subtitle}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-signal-text-3">
              {lead.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-signal-text-4" /> {lead.email}</span>
              )}
              {lead.email && lead.linkedin_url && <span className="text-signal-text-4">·</span>}
              {lead.linkedin_url && (
                <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-signal-accent">
                  <Linkedin className="w-3 h-3" /> Profile
                </a>
              )}
              {(lead.phone_direct || lead.phone_mobile) && (
                <>
                  <span className="text-signal-text-4">·</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-signal-text-4" />
                    {lead.phone_direct ?? lead.phone_mobile}
                  </span>
                </>
              )}
              {location && (
                <>
                  <span className="text-signal-text-4">·</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-signal-text-4" /> {location}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Research progress */}
      {isSpinning && (
        <ResearchProgress
          phase={phase}
          toolCallLog={toolCallLog}
          whoTheyAre={whoTheyAre}
          painMap={painMap}
          angle={angle}
          whyNow={whyNow}
          leadName={lead.full_name}
        />
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
            <div className="flex items-center gap-5 mt-5">
              <div className="flex items-center gap-2 text-[12px] text-signal-text-3">
                <span>Confidence</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full" style={{
                      background: (angle.confidence === "high" && i <= 4) ||
                        (angle.confidence === "medium" && i <= 3) ||
                        (angle.confidence === "low" && i <= 2) ? "#4F46E5" : "#E5E7EB",
                    }} />
                  ))}
                </div>
                <span className="text-signal-text-4 capitalize">{angle.confidence}</span>
              </div>
              <span className="text-signal-border">·</span>
              <a href="#outreach" className="text-[12px] font-medium text-signal-accent hover:text-signal-accent-2 flex items-center gap-1">
                Jump to outreach <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </>
        ) : isSpinning ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-4" />
          </div>
        ) : null}
      </div>

      {/* Why Now */}
      <section className="mt-8">
        <SectionHeader title="Why now" />
        {whyNow ? (
          <>
            <div className="space-y-1.5">
              {whyNow.signals.map((signal, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: signal.strong ? "#10B981" : "#F59E0B" }} />
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
              <button onClick={() => setEvidenceOpen(v => !v)}
                className="flex items-center gap-1.5 text-[12px] text-signal-text-4 hover:text-signal-text-3 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: evidenceOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
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
        <button onClick={() => setContextOpen(v => !v)} className="w-full flex items-center justify-between group">
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

function OutreachPanel({ outreachDrafts, isLoading }: { outreachDrafts: OutreachDrafts | null; isLoading: boolean }) {
  const EMPTY: Record<Tab, string> = { "linkedin-note": "", "linkedin-dm": "", email: "", "follow-up": "", "call-opener": "" }
  const [activeTab, setActiveTab] = useState<Tab>("linkedin-note")
  const [drafts, setDrafts] = useState<Record<Tab, string>>(EMPTY)
  const [subject, setSubject] = useState("")
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
      // Extract Subject: line from email draft into the subject input
      const emailStr = normalized['email']
      if (typeof emailStr === 'string' && emailStr.startsWith('Subject:')) {
        const firstBreak = emailStr.indexOf('\n\n')
        if (firstBreak !== -1) {
          setSubject(emailStr.slice('Subject:'.length, firstBreak).trim())
          normalized['email'] = emailStr.slice(firstBreak + 2)
        } else {
          setSubject(emailStr.slice('Subject:'.length).trim())
          normalized['email'] = ''
        }
      }
      setDrafts(normalized)
    }
  }, [outreachDrafts])

  const currentDraft = drafts[activeTab]
  const charCount = currentDraft.length

  const handleCopy = () => {
    const text = activeTab === 'email' && subject
      ? `Subject: ${subject}\n\n${currentDraft}`
      : currentDraft
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tabs: Tab[] = ["linkedin-note", "linkedin-dm", "email", "follow-up", "call-opener"]

  return (
    <div id="outreach" className="w-[360px] border-l border-signal-border flex flex-col overflow-y-auto overflow-x-hidden shrink-0"
      style={{ height: "calc(100vh - 52px)" }}>
      <div className="px-7 py-6 flex flex-col h-full min-w-0">
        <h2 className="text-[16px] font-semibold text-signal-text-1 mb-5">Outreach</h2>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-3.5 py-1.5 text-[12px] rounded-lg border transition-colors"
              style={{
                background: activeTab === tab ? "var(--signal-text-1)" : "var(--signal-bg)",
                color: activeTab === tab ? "var(--signal-bg)" : "var(--signal-text-3)",
                borderColor: activeTab === tab ? "var(--signal-text-1)" : "var(--signal-border)",
              }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {activeTab === "linkedin-note" && outreachDrafts && (
          <div className="mb-3">
            <span className="text-[11px] text-signal-text-4">{charCount} / 300</span>
            <div className="h-[3px] bg-signal-raised rounded-full overflow-hidden mt-1">
              <div className="h-full bg-signal-accent rounded-full transition-all" style={{ width: `${Math.min((charCount / 300) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {activeTab === "email" && outreachDrafts && (
          <div className="mb-4">
            <label className="block text-[12px] text-signal-text-4 mb-1">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Subject line..."
              className="w-full border-b border-signal-border pb-1.5 text-[14px] font-medium text-signal-text-1 outline-none bg-transparent" />
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 space-y-2 pt-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <textarea value={currentDraft}
            onChange={e => setDrafts(prev => ({ ...prev, [activeTab]: e.target.value }))}
            className="w-full flex-1 min-h-[160px] text-[14px] text-signal-text-1 leading-[1.8] outline-none resize-none bg-transparent font-[inherit]"
            placeholder={outreachDrafts ? "" : "Brief not generated yet — click Generate Brief to start."}
            style={{ border: "none" }} />
        )}

        <div className="border-t border-signal-border-faint pt-4 mt-4">
          <button onClick={handleCopy} disabled={!outreachDrafts}
            className="flex items-center justify-center gap-2 w-full h-[38px] border border-signal-border rounded-lg text-[13px] text-signal-text-2 hover:bg-signal-surface transition-colors disabled:opacity-40">
            {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BriefPage({ params }: { params: Promise<{ slug: string }> }) {
  const [leadId, setLeadId] = useState<string | null>(null)
  const [lead, setLead] = useState<LeadData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<GenerationPhase>("idle")
  const [whoTheyAre, setWhoTheyAre] = useState<WhoTheyAre | null>(null)
  const [painMap, setPainMap] = useState<PainMap | null>(null)
  const [angle, setAngle] = useState<Angle | null>(null)
  const [whyNow, setWhyNow] = useState<WhyNow | null>(null)
  const [outreachDrafts, setOutreachDrafts] = useState<OutreachDrafts | null>(null)
  const [toolCallLog, setToolCallLog] = useState<string[]>([])
  // Ref to abort the in-flight SSE reader when component unmounts or user navigates away
  const abortRef = useRef<AbortController | null>(null)

  const hasBrief = !!(angle && whoTheyAre && painMap && whyNow && outreachDrafts)

  // \u2500\u2500\u2500 Load brief on mount \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  useEffect(() => {
    params.then(p => setLeadId(p.slug))
  }, [params])

  const loadBrief = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/brief/${id}`)
      if (!res.ok) { setError("Lead not found"); return null }
      return await res.json() as { lead: LeadData; brief: Record<string, unknown> | null }
    } catch { return null }
  }, [])

  useEffect(() => {
    if (!leadId) return
    const load = async () => {
      const data = await loadBrief(leadId)
      if (!data) { setError("Failed to load brief"); setIsLoading(false); return }
      // Backfill brief_generated_at from briefs.generated_at for old records
      const leadData = {
        ...data.lead,
        brief_generated_at: data.lead.brief_generated_at ?? (data.brief?.generated_at as string | null | undefined) ?? null,
      }
      setLead(leadData)
      if (data.brief) {
        setWhoTheyAre(data.brief.who_they_are as WhoTheyAre)
        setPainMap(data.brief.pain_map as PainMap)
        setAngle(data.brief.angle as Angle)
        setWhyNow(data.brief.why_now as WhyNow)
        setOutreachDrafts(data.brief.outreach_drafts as OutreachDrafts)
        setToolCallLog((data.brief.generation_sources as string[]) ?? [])
        setPhase("done")
      } else if (data.lead.brief_status === 'generating') {
        // Generation was started in a previous session — poll until it finishes or times out
        const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
        const startedAt = data.lead.brief_generation_started_at
          ? new Date(data.lead.brief_generation_started_at).getTime()
          : Date.now()
        if (Date.now() - startedAt > TIMEOUT_MS) {
          // Stuck — treat as never generated so user can retry
          setPhase("idle")
        } else {
          setPhase("polling")
        }
      }
      setIsLoading(false)
    }
    load()
  }, [leadId, loadBrief])

  // \u2500\u2500\u2500 Poll when another session is generating \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  useEffect(() => {
    if (phase !== 'polling' || !leadId) return
    const interval = setInterval(async () => {
      const data = await loadBrief(leadId)
      if (!data) return
      if (data.brief) {
        setLead(data.lead)
        setWhoTheyAre(data.brief.who_they_are as WhoTheyAre)
        setPainMap(data.brief.pain_map as PainMap)
        setAngle(data.brief.angle as Angle)
        setWhyNow(data.brief.why_now as WhyNow)
        setOutreachDrafts(data.brief.outreach_drafts as OutreachDrafts)
        setToolCallLog((data.brief.generation_sources as string[]) ?? [])
        setPhase("done")
        clearInterval(interval)
      } else if (data.lead.brief_status !== 'generating') {
        // Generation ended without saving (error) — let user retry
        setLead(data.lead)
        setPhase("idle")
        clearInterval(interval)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [phase, leadId, loadBrief])

  // \u2500\u2500\u2500 Abort SSE on unmount \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!leadId || phase === "researching" || phase === "generating") return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPhase("researching")
    setWhoTheyAre(null); setPainMap(null); setAngle(null)
    setWhyNow(null); setOutreachDrafts(null); setToolCallLog([])

    try {
      const res = await fetch("/api/brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
        signal: controller.signal,
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
            else if (event.type === "done") {
              setPhase("done")
              // Refresh lead to get updated brief_generated_at
              const data = await loadBrief(leadId)
              if (data) setLead(data.lead)
            }
            else if (event.type === "error") { setError(event.message); setPhase("idle") }
          } catch { /* malformed chunk */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return // navigated away — expected
      setError(err instanceof Error ? err.message : "Unknown error")
      setPhase("idle")
    }
  }, [leadId, phase, loadBrief])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-signal-bg">
        <Sidebar activePage="lists" />
        <div className="ml-[200px] flex items-center justify-center" style={{ minHeight: "100vh" }}>
          <Loader2 className="w-6 h-6 animate-spin text-signal-accent" />
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-signal-bg">
        <Sidebar activePage="lists" />
        <div className="ml-[200px] flex items-center justify-center" style={{ minHeight: "100vh" }}>
          <div className="text-center">
            <p className="text-[14px] text-signal-text-3 mb-4">{error ?? "Lead not found"}</p>
            <Link href="/lists" className="text-[13px] text-signal-accent hover:underline">← Back to lists</Link>
          </div>
        </div>
      </div>
    )
  }

  const isSpinning = phase === "researching" || phase === "generating"

  return (
    <div className="min-h-screen bg-signal-bg">
      <Sidebar activePage="lists" />
      <div className="ml-[200px] flex flex-col" style={{ minHeight: "100vh" }}>
        <header className="h-[52px] bg-signal-bg border-b border-signal-border flex items-center justify-between px-6 shrink-0">
          <Link href="/lists" className="flex items-center gap-1.5 text-[13px] text-signal-text-3 hover:text-signal-text-2">
            <ArrowLeft className="w-4 h-4" /> Lists
          </Link>
          <div className="flex items-center gap-1.5 text-[15px] font-semibold text-signal-text-1">
            {lead.full_name}
            <span className="text-signal-text-4 font-normal">·</span>
            <span className="text-signal-text-3 font-normal">{lead.company_name}</span>
          </div>
          <div className="flex items-center gap-3">
            {lead.brief_generated_at && phase === "done" && (
              <span className="text-[12px] text-signal-text-4 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Generated {timeAgo(lead.brief_generated_at)}
              </span>
            )}
            {hasBrief && (
              <button onClick={handleGenerate} disabled={isSpinning}
                className="flex items-center gap-1.5 h-8 px-3 border border-signal-border rounded-lg text-[13px] text-signal-text-2 hover:bg-signal-surface transition-colors disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                {isSpinning ? "Generating…" : "Refresh"}
              </button>
            )}
          </div>
        </header>

        <div className="flex" style={{ height: "calc(100vh - 52px)" }}>
          {!hasBrief && phase === "idle" ? (
            <div className="flex-1 flex">
              <div className="flex-1 h-full flex min-w-0">
                <GenerateScreen lead={lead} onGenerate={handleGenerate} />
              </div>
              <OutreachPanel outreachDrafts={null} isLoading={false} />
            </div>
          ) : (
            <>
              <BriefPanel lead={lead} phase={phase} whoTheyAre={whoTheyAre} painMap={painMap}
                angle={angle} whyNow={whyNow} toolCallLog={toolCallLog} />
              <OutreachPanel outreachDrafts={outreachDrafts}
                isLoading={isSpinning && !outreachDrafts} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
