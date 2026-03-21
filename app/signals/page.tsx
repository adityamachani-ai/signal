"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/signal/sidebar"
import { cn } from "@/lib/utils"
import {
  Flame, RefreshCw, CheckCheck, Zap, Clock, X,
  Radar, ChevronDown
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type SignalType = "funding" | "job-change" | "content" | "hiring" | "competitor" | "leadership"
type Strength = "strong" | "medium" | "low"

interface Signal {
  id: number
  initials: string
  avatarColor: string
  name: string
  company: string
  type: SignalType
  title: string
  description: string
  timeAgo: string
  hoursAgo: number // for date filtering
  window: string
  strength: Strength
  unread: boolean
  dismissed: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALL_SIGNALS: Signal[] = [
  {
    id: 1, initials: "JH", avatarColor: "#EEF2FF", name: "Jordan Hassan", company: "Meridian",
    type: "content", title: "Published outbound frustration post",
    description: "She wrote about SDR burnout and poor reply rates — the exact pain you solve. First-mover advantage if you reach out today.",
    timeAgo: "47 min ago", hoursAgo: 1, window: "3 weeks", strength: "strong", unread: true, dismissed: false,
  },
  {
    id: 2, initials: "PN", avatarColor: "#D1FAE5", name: "Priya Nair", company: "Rippling",
    type: "job-change", title: "Changed jobs — now VP of Sales",
    description: "New role at a high-growth company. First 90 days is when VPs make tool decisions. This window closes fast.",
    timeAgo: "2 hours ago", hoursAgo: 2, window: "6 weeks", strength: "strong", unread: true, dismissed: false,
  },
  {
    id: 3, initials: "LT", avatarColor: "#FEF3C7", name: "Lisa Thompson", company: "Retool",
    type: "funding", title: "Retool raised $45M Series C",
    description: "New funding round. Expect aggressive GTM hiring and tooling investment over the next quarter.",
    timeAgo: "3 hours ago", hoursAgo: 3, window: "8 weeks", strength: "strong", unread: true, dismissed: false,
  },
  {
    id: 4, initials: "SC", avatarColor: "#E0F2FE", name: "Sarah Chen", company: "Stripe",
    type: "content", title: "Published article: 'How we scaled outbound at Stripe'",
    description: "Publicly shared her playbook — shows she thinks deeply about outbound. Reference this in your outreach.",
    timeAgo: "1 day ago", hoursAgo: 24, window: "2 weeks", strength: "strong", unread: false, dismissed: false,
  },
  {
    id: 5, initials: "MJ", avatarColor: "#FCE7F3", name: "Marcus Johnson", company: "Notion",
    type: "hiring", title: "Notion posted 4 new sales roles in 48 hours",
    description: "Aggressive hiring surge signals expansion. Current stack will be stress-tested by new headcount.",
    timeAgo: "2 days ago", hoursAgo: 48, window: "4 weeks", strength: "medium", unread: false, dismissed: false,
  },
  {
    id: 6, initials: "ER", avatarColor: "#F3E8FF", name: "Emily Rodriguez", company: "Figma",
    type: "competitor", title: "Competitor (Salesloft) had major outage — 4 hour downtime",
    description: "Salesloft customers are frustrated right now. Emily is on Salesloft. Strike while trust is low.",
    timeAgo: "3 days ago", hoursAgo: 72, window: "1 week", strength: "strong", unread: false, dismissed: false,
  },
  {
    id: 7, initials: "JW", avatarColor: "#EEF2FF", name: "James Wilson", company: "Amplitude",
    type: "leadership", title: "New CRO hired at Amplitude",
    description: "Leadership change often triggers stack review across the revenue org. James may be re-evaluating his tools.",
    timeAgo: "4 days ago", hoursAgo: 96, window: "8 weeks", strength: "medium", unread: false, dismissed: false,
  },
  {
    id: 8, initials: "DP", avatarColor: "#D1FAE5", name: "David Park", company: "Linear",
    type: "content", title: "Linear mentioned in TechCrunch funding roundup",
    description: "Company gaining visibility — good time to reference their momentum in outreach.",
    timeAgo: "5 days ago", hoursAgo: 120, window: "2 weeks", strength: "low", unread: false, dismissed: false,
  },
]

const TYPE_LABELS: Record<SignalType, string> = {
  funding: "Funding",
  "job-change": "Job change",
  content: "Content",
  hiring: "Hiring",
  competitor: "Competitor",
  leadership: "Leadership",
}

const TYPE_COLORS: Record<SignalType, { bg: string; text: string }> = {
  funding:     { bg: "#EEF2FF", text: "#4338CA" },
  "job-change":{ bg: "#D1FAE5", text: "#065F46" },
  content:     { bg: "#FEF3C7", text: "#92400E" },
  hiring:      { bg: "#E0F2FE", text: "#0369A1" },
  competitor:  { bg: "#FCE7F3", text: "#9D174D" },
  leadership:  { bg: "#F3E8FF", text: "#6B21A8" },
}

const AVATAR_TEXT: Record<string, string> = {
  "#EEF2FF": "#4338CA",
  "#D1FAE5": "#065F46",
  "#FEF3C7": "#92400E",
  "#E0F2FE": "#0369A1",
  "#FCE7F3": "#9D174D",
  "#F3E8FF": "#6B21A8",
}

const STRENGTH_DOT: Record<Strength, string> = {
  strong: "#10B981",
  medium: "#F59E0B",
  low:    "#D1D5DB",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>(ALL_SIGNALS)
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "dismissed">("all")
  const [scanning, setScanning] = useState(false)
  const [scanLabel, setScanLabel] = useState("Last scanned 14 minutes ago")

  // Strength filters
  const [strengthFilters, setStrengthFilters] = useState<Record<Strength, boolean>>({
    strong: true, medium: true, low: false,
  })

  // Type filters
  const [typeFilters, setTypeFilters] = useState<Record<SignalType, boolean>>({
    funding: true, "job-change": true, content: true, hiring: true, competitor: true, leadership: false,
  })

  // Date range
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d" | "all">("24h")

  // Lead search
  const [leadSearch, setLeadSearch] = useState("")
  const [leadPills, setLeadPills] = useState(["Jordan Hassan", "Sarah Chen", "Lisa Thompson"])

  // Derived counts
  const unreadCount = signals.filter(s => s.unread && !s.dismissed).length

  // Filter logic
  const maxHours: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, all: Infinity }

  const visibleSignals = signals.filter(s => {
    if (s.dismissed && activeTab !== "dismissed") return false
    if (!s.dismissed && activeTab === "dismissed") return false
    if (activeTab === "unread" && !s.unread) return false
    if (!strengthFilters[s.strength]) return false
    if (!typeFilters[s.type]) return false
    if (s.hoursAgo > maxHours[dateRange]) return false
    if (leadPills.length > 0 && !leadPills.includes(s.name)) {
      // only filter if user has searched or removed someone
    }
    return true
  })

  const hotSignals = ALL_SIGNALS.filter(s => s.hoursAgo <= 3).slice(0, 3)

  function dismissSignal(id: number) {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, dismissed: true, unread: false } : s))
  }

  function markAllRead() {
    setSignals(prev => prev.map(s => ({ ...s, unread: false })))
  }

  function handleScanNow() {
    setScanning(true)
    setScanLabel("Scanning...")
    setTimeout(() => {
      setScanning(false)
      setScanLabel("Last scanned just now")
    }, 2000)
  }

  function removePill(name: string) {
    setLeadPills(prev => prev.filter(p => p !== name))
  }

  function clearAllFilters() {
    setStrengthFilters({ strong: true, medium: true, low: true })
    setTypeFilters({ funding: true, "job-change": true, content: true, hiring: true, competitor: true, leadership: true })
    setDateRange("all")
    setLeadPills([])
    setLeadSearch("")
  }

  const typeCounts: Record<SignalType, number> = {
    funding: 5, "job-change": 4, content: 6, hiring: 3, competitor: 2, leadership: 3,
  }
  const strengthCounts: Record<Strength, number> = { strong: 12, medium: 8, low: 3 }

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <Sidebar activePage="signals" />

      <div className="ml-[200px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-[52px] bg-white border-b border-[#E5E4E0] flex items-center px-6 shrink-0">
          <div className="flex flex-col justify-center mr-auto">
            <span className="text-[18px] font-semibold text-[#1C1C1C] leading-tight">Signals</span>
            <span className="text-[12px] text-[#9CA3AF] leading-tight">
              Monitoring 47 leads · {scanLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScanNow}
              className="flex items-center gap-1.5 h-[32px] px-3.5 border border-[#E5E4E0] rounded-[8px] text-[13px] text-[#374151] hover:bg-[#F7F6F3] transition-colors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", scanning && "animate-spin")} />
              Scan now
            </button>
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 h-[32px] px-3.5 border border-[#E5E4E0] rounded-[8px] text-[13px] text-[#374151] hover:bg-[#F7F6F3] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 grid grid-cols-[260px_1fr] gap-5 items-start">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          <aside className="bg-white border border-[#E5E4E0] rounded-xl p-4 sticky top-6">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[12px] font-semibold text-[#374151]">Filters</span>
              <button onClick={clearAllFilters} className="text-[12px] text-[#4F46E5] hover:underline">Clear all</button>
            </div>

            {/* Strength */}
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Strength</p>
            <div className="flex flex-col gap-2 mb-3.5">
              {(["strong","medium","low"] as Strength[]).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strengthFilters[s]}
                    onChange={e => setStrengthFilters(prev => ({ ...prev, [s]: e.target.checked }))}
                    className="rounded"
                  />
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: STRENGTH_DOT[s] }}
                  />
                  <span className="text-[13px] text-[#374151] capitalize flex-1">{s}</span>
                  <span className="text-[12px] text-[#9CA3AF]">({strengthCounts[s]})</span>
                </label>
              ))}
            </div>

            <hr className="border-[#F3F4F6] my-3.5" />

            {/* Type */}
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Type</p>
            <div className="flex flex-col gap-2 mb-3.5">
              {(Object.keys(TYPE_LABELS) as SignalType[]).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeFilters[t]}
                    onChange={e => setTypeFilters(prev => ({ ...prev, [t]: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-[13px] text-[#374151] flex-1">{TYPE_LABELS[t]}</span>
                  <span className="text-[12px] text-[#9CA3AF]">({typeCounts[t]})</span>
                </label>
              ))}
            </div>

            <hr className="border-[#F3F4F6] my-3.5" />

            {/* Date range */}
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Date range</p>
            <div className="flex flex-col gap-2 mb-3.5">
              {([
                { value: "24h", label: "Last 24 hours" },
                { value: "7d",  label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
                { value: "all", label: "All time" },
              ] as const).map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateRange"
                    value={opt.value}
                    checked={dateRange === opt.value}
                    onChange={() => setDateRange(opt.value)}
                  />
                  <span className="text-[13px] text-[#374151]">{opt.label}</span>
                </label>
              ))}
            </div>

            <hr className="border-[#F3F4F6] my-3.5" />

            {/* Lead filter */}
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Lead</p>
            <input
              type="text"
              value={leadSearch}
              onChange={e => setLeadSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full h-[30px] px-2.5 border border-[#E5E4E0] rounded-[6px] text-[13px] text-[#374151] placeholder:text-[#9CA3AF] outline-none focus:border-[#A5B4FC] mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {leadPills.map(name => (
                <span
                  key={name}
                  className="flex items-center gap-1 bg-[#F3F4F6] text-[#374151] rounded-full px-2.5 py-0.5 text-[12px]"
                >
                  {name.split(" ")[0]}
                  <button onClick={() => removePill(name)} className="hover:text-[#1C1C1C]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {leadPills.length < 47 && (
                <span className="bg-[#F3F4F6] text-[#9CA3AF] rounded-full px-2.5 py-0.5 text-[12px]">
                  + {47 - leadPills.length} more
                </span>
              )}
            </div>
          </aside>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Hot signals strip */}
            <div className="bg-white border border-[#E5E4E0] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E4E0]">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-[13px] font-semibold text-[#1C1C1C]">Hot signals today</span>
                </div>
                <span className="text-[12px] text-[#9CA3AF]">3 signals detected in the last 2 hours</span>
              </div>
              {hotSignals.map((s, i) => (
                <Link
                  href={`/brief/${s.name.toLowerCase().replace(" ", "-")}`}
                  key={s.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 hover:bg-[#FAFAFA] transition-colors cursor-pointer",
                    i < hotSignals.length - 1 && "border-b border-[#F3F4F6]"
                  )}
                >
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold"
                      style={{ background: s.avatarColor, color: AVATAR_TEXT[s.avatarColor] }}
                    >
                      {s.initials}
                    </div>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: TYPE_COLORS[s.type].bg, color: TYPE_COLORS[s.type].text }}
                    >
                      {TYPE_LABELS[s.type]}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#1C1C1C]">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-[#6B7280]"> · {s.company}</span>
                    </p>
                    <p className="text-[14px] font-medium text-[#1C1C1C] mt-0.5">{s.title}</p>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed mt-0.5">{s.description}</p>
                  </div>
                  {/* Right */}
                  <div className="flex flex-col items-end flex-shrink-0 gap-1.5">
                    <span className="text-[11px] text-[#9CA3AF]">{s.timeAgo}</span>
                    <span className="flex items-center justify-center h-7 px-3 bg-[#1C1C1C] text-white rounded-[6px] text-[12px] font-medium whitespace-nowrap">
                      View brief
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Full signal feed */}
            <div className="bg-white border border-[#E5E4E0] rounded-xl overflow-hidden">
              {/* Feed toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E4E0]">
                <div className="flex items-center gap-4">
                  {(["all","unread","dismissed"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "text-[13px] pb-0.5 transition-colors",
                        activeTab === tab
                          ? "text-[#4F46E5] font-medium border-b-2 border-[#4F46E5]"
                          : "text-[#6B7280] hover:text-[#374151]"
                      )}
                    >
                      {tab === "all" && "All signals"}
                      {tab === "unread" && `Unread (${unreadCount})`}
                      {tab === "dismissed" && "Dismissed"}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-1 text-[12px] text-[#374151] border border-[#E5E4E0] rounded-[6px] px-2.5 py-1 hover:bg-[#F7F6F3]">
                  Sort by: Most recent
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Cards */}
              {visibleSignals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  {activeTab === "dismissed" ? (
                    <>
                      <Radar className="w-10 h-10 text-[#D1D5DB]" />
                      <p className="text-[15px] font-medium text-[#374151]">No dismissed signals</p>
                      <p className="text-[13px] text-[#6B7280]">Signals you dismiss will appear here</p>
                    </>
                  ) : (
                    <>
                      <Radar className="w-10 h-10 text-[#D1D5DB]" />
                      <p className="text-[15px] font-medium text-[#374151]">No signals match your filters</p>
                      <p className="text-[13px] text-[#6B7280]">Try adjusting your filters or expanding the date range</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {visibleSignals.map((s, i) => (
                    <SignalCard
                      key={s.id}
                      signal={s}
                      isLast={i === visibleSignals.length - 1}
                      onDismiss={() => dismissSignal(s.id)}
                    />
                  ))}
                  <button className="w-full h-11 text-[13px] text-[#374151] border-t border-[#E5E4E0] hover:bg-[#F9FAFB] transition-colors rounded-b-xl">
                    Load more signals
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({
  signal: s,
  isLast,
  onDismiss,
}: {
  signal: Signal
  isLast: boolean
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(true)

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setVisible(false)
    setTimeout(() => onDismiss(), 300)
  }

  return (
    <Link
      href={`/brief/${s.name.toLowerCase().replace(" ", "-")}`}
      className={cn(
        "flex items-start gap-3 px-4 py-4 hover:bg-[#FAFAFA] transition-all duration-300 cursor-pointer",
        !isLast && "border-b border-[#F3F4F6]",
        !visible && "opacity-0 max-h-0 overflow-hidden py-0"
      )}
    >
      {/* Unread dot */}
      <div className="w-3 flex-shrink-0 flex items-center justify-center pt-1.5">
        {s.unread && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] block" />
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
        style={{ background: s.avatarColor, color: AVATAR_TEXT[s.avatarColor] }}
      >
        {s.initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#1C1C1C]">{s.name}</span>
          <span className="text-[13px] text-[#6B7280]">at {s.company}</span>
          <span
            className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: TYPE_COLORS[s.type].bg, color: TYPE_COLORS[s.type].text }}
          >
            {TYPE_LABELS[s.type]}
          </span>
        </div>
        <p className="text-[14px] font-medium text-[#1C1C1C] mt-1">{s.title}</p>
        <p className="text-[13px] text-[#6B7280] leading-relaxed mt-0.5">{s.description}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-[#9CA3AF]">{s.timeAgo}</span>
          <span className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
            <Clock className="w-3 h-3" />
            Window: {s.window}
          </span>
          <span className="ml-auto text-[12px] font-medium text-[#4F46E5] hover:underline">
            View brief
          </span>
          <button
            onClick={handleDismiss}
            className="text-[12px] text-[#9CA3AF] hover:text-[#374151] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Strength dot */}
      <div className="flex-shrink-0 pt-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full block"
          style={{ background: STRENGTH_DOT[s.strength] }}
          title={s.strength}
        />
      </div>
    </Link>
  )
}
