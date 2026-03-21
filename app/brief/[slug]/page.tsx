"use client"

import { useState } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/signal/sidebar"
import {
  ArrowLeft, RefreshCw, Share2, Mail, Phone, Linkedin, MapPin,
  Clock, Zap, ChevronDown, ChevronRight, Copy, ExternalLink, Check
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "linkedin-note" | "linkedin-dm" | "email" | "follow-up" | "call-opener"
type Tone = "Conversational" | "Direct" | "Formal"

// ─── Draft content per tab ────────────────────────────────────────────────────

const DRAFTS: Record<Tab, string> = {
  "linkedin-note": "Hi Jordan — saw your post about outbound quality last week and it resonated. We work with a few Series B sales teams going through the exact same scaling crunch you're in right now (4+ AEs hired in under 60 days). Would love to share what's been working. Open to connecting?",
  "linkedin-dm": "Hi Jordan — your post about SDR burnout really resonated. We work with VP Sales at Series B companies in exactly your situation — scaling fast, trying to maintain quality, feeling board pressure. I've seen a few things work well for teams in the 4-8 AE range. Would it be useful to compare notes?",
  "email": "Hi Jordan,\n\nSaw the Series B announcement and your recent posts about outbound quality — sounds like you're building something fast.\n\nWe work with a handful of VP Sales at post-Series B SaaS companies going through the exact same thing: new AEs ramping, board pressure on pipeline, current stack starting to creak.\n\nWorth 20 minutes to compare notes?\n\n[Your name]",
  "follow-up": "Hi Jordan — following up on my note from last week. Still think the timing is right given what you're building. The outbound quality problem doesn't get easier as you add more AEs — if anything it gets harder. Let me know if this lands at a better moment.",
  "call-opener": "Jordan — thanks for picking up, I'll be quick. I saw your post about outbound quality and we work with teams in exactly your situation — Series B, scaling fast, trying to maintain quality. Wanted to see if it's worth a proper conversation. Do you have 2 minutes?",
}

const TAB_LABELS: Record<Tab, string> = {
  "linkedin-note": "LinkedIn note",
  "linkedin-dm": "LinkedIn DM",
  "email": "Email",
  "follow-up": "Follow-up",
  "call-opener": "Call opener",
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SectionLabel({ children, dot }: { children: React.ReactNode; dot?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
      <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.8px]">{children}</span>
    </div>
  )
}

function StrengthBadge({ strength }: { strength: "Strong" | "Medium" }) {
  return strength === "Strong" ? (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#D1FAE5] text-[#065F46]">Strong</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3C7] text-[#92400E]">Medium</span>
  )
}

function SignalCard({ title, desc, date, strength }: { title: string; desc: string; date: string; strength: "Strong" | "Medium" }) {
  return (
    <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[#111]">{title}</span>
        <StrengthBadge strength={strength} />
      </div>
      <p className="text-[12px] text-[#6B7280] leading-relaxed mt-1.5">{desc}</p>
      <p className="text-[11px] text-[#9CA3AF] mt-1.5">{date}</p>
    </div>
  )
}

function IntelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span className="block text-[11px] text-[#9CA3AF] mb-0.5">{label}</span>
      <div className="text-[13px] text-[#374151] leading-relaxed">{children}</div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[#F3F4F6] text-[#374151] rounded px-2 py-0.5 text-[11px] mr-1 mb-1">{children}</span>
  )
}

function ApproachRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span className="block text-[11px] text-[#9CA3AF] mb-0.5">{label}</span>
      <div className="text-[13px] text-[#374151] leading-relaxed">{children}</div>
    </div>
  )
}

// ─── Brief Panel ──────────────────────────────────────────────────────────────

function BriefPanel() {
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <div className="w-[55%] h-full overflow-y-auto px-10 py-8 shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b border-[#F3F4F6]">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
            <span className="text-[15px] font-semibold text-[#4338CA]">JH</span>
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#111] leading-tight">Jordan Hassan</h1>
            <p className="text-[14px] text-[#6B7280] mt-0.5">VP of Sales · Meridian</p>
            <p className="text-[13px] text-[#9CA3AF] mt-0.5">7 months in role</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D1FAE5] text-[#065F46] text-[13px] font-medium rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Strong timing
          </span>
          <p className="text-[11px] text-[#6B7280] mt-1">3 active signals</p>
        </div>
      </div>

      {/* Contact row */}
      <div className="flex items-center flex-wrap gap-2 mt-3.5 pb-5 border-b border-[#F3F4F6]">
        <Mail className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[13px] text-[#374151]">jordan@meridian.io</span>
        <span className="text-[#D1D5DB]">·</span>
        <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[13px] text-[#374151]">+1 415 555 0172</span>
        <span className="text-[#D1D5DB]">·</span>
        <Linkedin className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <a href="#" className="text-[13px] text-[#4F46E5]">View profile</a>
        <span className="text-[#D1D5DB]">·</span>
        <MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[13px] text-[#374151]">San Francisco, CA</span>
      </div>

      {/* Summary */}
      <div className="py-6 border-b border-[#F3F4F6]">
        <SectionLabel>Summary</SectionLabel>
        <p className="text-[14px] text-[#1C1C1C] leading-[1.8]">
          Jordan joined Meridian as VP of Sales 7 months ago — her first VP role, recruited from Salesforce where she ran the mid-market APAC team. The company raised an $18M Series B in February and the board expects 3x pipeline growth by Q3. She has hired 4 AEs in the last 8 weeks and published two LinkedIn posts about outbound quality problems and SDR burnout. The combination of new leadership mandate, aggressive headcount scaling, and stated frustration with current outbound tools is a textbook trigger: she is evaluating her stack right now, not in 6 months.
        </p>
      </div>

      {/* Why Now */}
      <div className="py-6 border-b border-[#F3F4F6]">
        <SectionLabel dot="#10B981">Why Now</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <SignalCard title="Series B raised ($18M)" desc="New budget, new mandate, stack review incoming." date="6 weeks ago" strength="Strong" />
          <SignalCard title="Published outbound frustration post" desc="Explicitly stated pain — perfect hook." date="2 weeks ago" strength="Strong" />
          <SignalCard title="3 new AE roles posted" desc="Scaling team fast means scaling tool needs." date="Ongoing" strength="Strong" />
          <SignalCard title="Previous employer layoffs" desc="Sensitive context — handle carefully." date="3 weeks ago" strength="Medium" />
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="text-[12px] text-[#9CA3AF]">Signal window: 2–3 weeks before urgency fades</span>
        </div>
      </div>

      {/* Intelligence */}
      <div className="py-6 border-b border-[#F3F4F6]">
        <SectionLabel>Intelligence</SectionLabel>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[12px] font-semibold text-[#374151] mb-2.5">Person</p>
            <IntelRow label="Career arc">Specialist deepening expertise. IC → Manager → Director → VP over 9 years. High performer pattern.</IntelRow>
            <IntelRow label="Communication style">
              <span className="inline-block bg-[#EEF2FF] text-[#4338CA] rounded-full px-2 py-0.5 text-[11px] mr-1.5">D / C</span>
              Direct and metrics-heavy. Lead with ROI — skip pleasantries.
            </IntelRow>
            <IntelRow label="Warm connections">2 shared connections: Alex Rivera (Salesforce 2019–21) and Priya Nair (SaaStr 2023). Alex is a strong intro path.</IntelRow>
            <IntelRow label="Likely objection">"We already have a tool." Pivot: what happens when that tool meets 8 new AEs in 60 days.</IntelRow>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#374151] mb-2.5">Company</p>
            <IntelRow label="Funding">Series B · $18M · Feb 2024 · Led by a16z · Total: $24M</IntelRow>
            <IntelRow label="Headcount">127 employees · 40% YoY growth · 8 open roles</IntelRow>
            <IntelRow label="Tech stack">
              <div className="flex flex-wrap mt-0.5">
                <Tag>Salesforce</Tag><Tag>Outreach</Tag><Tag>Gong</Tag><Tag>Slack</Tag>
              </div>
            </IntelRow>
            <IntelRow label="Recent news">Series B (Feb 2024), TechCrunch GTM roundup (Jan 2024)</IntelRow>
            <IntelRow label="Competitor signals">Evaluated Salesloft recently. Currently on Outreach.</IntelRow>
          </div>
        </div>
      </div>

      {/* Recommended Approach */}
      <div className="py-6 border-b border-[#F3F4F6]">
        <div className="border-l-[3px] border-[#4F46E5] pl-5 -ml-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.8px]">Recommended Approach</span>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <ApproachRow label="Best channel">LinkedIn DM — she posts 3x/week and engages with comments. Email will get lost.</ApproachRow>
              <ApproachRow label="Lead with">The Series B hiring ramp. 4 AEs in 8 weeks as context, not a pitch.</ApproachRow>
            </div>
            <div>
              <ApproachRow label="Angle">Outbound quality at scale. She wrote about it. Don't use a generic hook.</ApproachRow>
              <ApproachRow label="Avoid">Feature lists, demo requests, "just 15 minutes." Former enterprise rep — seen every pitch.</ApproachRow>
            </div>
          </div>
          <div className="bg-[#F0F4FF] border border-[#E0E7FF] rounded-lg p-3 mt-3">
            <p className="text-[13px] text-[#374151] leading-relaxed">Reach out within 2 weeks. The competitor evaluation window and post-hire chaos overlap right now — highest-signal moment.</p>
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="py-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-[#374151]">Sources</span>
          <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] rounded-full">Verified 12</span>
          <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[11px] rounded-full">Inferred 4</span>
          <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[11px] rounded-full">Check 1</span>
          <button onClick={() => setSourcesOpen(v => !v)} className="ml-auto text-[12px] text-[#4F46E5]">
            {sourcesOpen ? "Hide sources" : "Show sources"}
          </button>
        </div>
        {sourcesOpen && (
          <div className="mt-3 space-y-2">
            {["LinkedIn profile (verified)", "Crunchbase funding data", "LinkedIn posts (2)", "Job postings — LinkedIn", "News: TechCrunch (Jan 2024)"].map(src => (
              <div key={src} className="flex items-center justify-between text-[12px] py-1.5 border-b border-[#F9FAFB]">
                <span className="text-[#374151]">{src}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Outreach Panel ───────────────────────────────────────────────────────────

function OutreachPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("linkedin-note")
  const [drafts, setDrafts] = useState<Record<Tab, string>>(DRAFTS)
  const [subject, setSubject] = useState("Scaling outbound at Meridian")
  const [tone, setTone] = useState<Tone>("Conversational")
  const [whyOpen, setWhyOpen] = useState(false)
  const [regenerateInput, setRegenerateInput] = useState("")
  const [copied, setCopied] = useState(false)

  const currentDraft = drafts[activeTab]
  const charCount = currentDraft.length
  const charLimit = 300

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tabs: Tab[] = ["linkedin-note", "linkedin-dm", "email", "follow-up", "call-opener"]

  return (
    <div
      className="w-[45%] border-l border-[#E5E4E0] flex flex-col overflow-y-auto shrink-0"
      style={{ height: "calc(100vh - 52px)" }}
    >
      <div className="px-7 py-6 flex flex-col h-full">
        {/* Header */}
        <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-5">Outreach</h2>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3.5 py-1.5 text-[12px] rounded-lg border transition-colors"
              style={{
                background: activeTab === tab ? "#1C1C1C" : "white",
                color: activeTab === tab ? "white" : "#6B7280",
                borderColor: activeTab === tab ? "#1C1C1C" : "#E5E4E0",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Character count (LinkedIn note only) */}
        {activeTab === "linkedin-note" && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#9CA3AF]">{charCount} / {charLimit}</span>
            </div>
            <div className="h-[3px] bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4F46E5] rounded-full transition-all"
                style={{ width: `${Math.min((charCount / charLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Subject line (email only) */}
        {activeTab === "email" && (
          <div className="mb-4">
            <label className="block text-[12px] text-[#9CA3AF] mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject line..."
              className="w-full border-b border-[#E5E4E0] pb-1.5 text-[14px] font-medium text-[#1C1C1C] outline-none bg-transparent"
            />
          </div>
        )}

        {/* Draft textarea */}
        <textarea
          value={currentDraft}
          onChange={e => setDrafts(prev => ({ ...prev, [activeTab]: e.target.value }))}
          className="w-full flex-1 min-h-[160px] text-[14px] text-[#1C1C1C] leading-[1.8] outline-none resize-none bg-transparent font-[inherit]"
          style={{ border: "none" }}
        />

        {/* Why this works */}
        <div className="border-t border-[#F3F4F6] pt-3 mt-3">
          <button
            onClick={() => setWhyOpen(v => !v)}
            className="flex items-center justify-between w-full"
          >
            <span className="text-[12px] font-medium text-[#6B7280]">Why this works</span>
            <ChevronRight
              className="w-4 h-4 text-[#9CA3AF] transition-transform"
              style={{ transform: whyOpen ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
          {whyOpen && (
            <div className="mt-2.5 space-y-2">
              {[
                { color: "#4F46E5", label: "Hook", text: "References her LinkedIn post directly — shows you've done research, not mass-blasting." },
                { color: "#10B981", label: "Timing", text: "Three-signal overlap: Series B + new AEs + published frustration. Outreach this week is significantly more likely to land." },
                { color: "#F59E0B", label: "Tone", text: "D/C DISC profile — direct and metrics-focused. Gets to the point in sentence one, no pleasantries." },
              ].map(row => (
                <div key={row.label} className="flex gap-2.5">
                  <div className="w-[3px] rounded-full shrink-0 mt-0.5" style={{ background: row.color }} />
                  <div>
                    <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wide block">{row.label}</span>
                    <span className="text-[12px] text-[#374151] leading-relaxed">{row.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="border-t border-[#F3F4F6] pt-3.5 mt-3.5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[#9CA3AF]">Tone:</span>
          {(["Conversational", "Direct", "Formal"] as Tone[]).map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className="px-3 py-1 rounded-full text-[12px] border transition-colors"
              style={{
                background: tone === t ? "#EEF2FF" : "white",
                color: tone === t ? "#4F46E5" : "#6B7280",
                borderColor: tone === t ? "#C7D2FE" : "#E5E4E0",
              }}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <input
              type="text"
              value={regenerateInput}
              onChange={e => setRegenerateInput(e.target.value)}
              placeholder="e.g. make it shorter..."
              className="border border-[#E5E4E0] rounded-md h-[30px] px-2.5 text-[12px] w-[160px] outline-none text-[#374151] placeholder:text-[#D1D5DB]"
            />
            <button className="border border-[#E5E4E0] rounded-md h-[30px] px-3 text-[12px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              Regenerate
            </button>
          </div>
        </div>

        {/* Send section */}
        <div className="border-t border-[#F3F4F6] pt-4 mt-4">
          <span className="block text-[11px] text-[#9CA3AF] mb-2.5">Send via</span>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full h-[38px] border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <button className="flex items-center justify-center gap-2 w-full h-[38px] border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <Mail className="w-4 h-4" />
              Open in Gmail
            </button>
            <button className="flex items-center justify-center gap-2 w-full h-[38px] border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <Linkedin className="w-4 h-4" />
              Open in LinkedIn
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="text-[11px] text-[#9CA3AF]">Logging to HubSpot automatically</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BriefPage() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar activePage="lists" />

      <div className="ml-[200px] flex flex-col" style={{ minHeight: "100vh" }}>
        {/* Top bar */}
        <header className="h-[52px] bg-white border-b border-[#E5E4E0] flex items-center justify-between px-6 shrink-0">
          <Link href="/lists" className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#374151]">
            <ArrowLeft className="w-4 h-4" />
            Lists
          </Link>
          <div className="flex items-center gap-1.5 text-[15px] font-semibold text-[#1C1C1C]">
            Jordan Hassan
            <span className="text-[#9CA3AF] font-normal">·</span>
            <span className="text-[#6B7280] font-normal">Meridian</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 h-8 px-3 border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button className="flex items-center gap-1.5 h-8 px-3 border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </header>

        {/* Split screen */}
        <div className="flex" style={{ height: "calc(100vh - 52px)" }}>
          <BriefPanel />
          <OutreachPanel />
        </div>
      </div>
    </div>
  )
}
