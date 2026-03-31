"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  X, Check, Loader2, Mail, Phone, ExternalLink,
  Copy, Search, ChevronDown, ArrowUpDown, Lock,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// ─── Company Logo (with fallback initial) ─────────────────────────────────────

const GOOGLE_FAVICON_URL = 'https://www.google.com/s2/favicons?sz=128&domain='

function CompanyLogo({ url, domain, company, size = 16 }: { url?: string; domain?: string; company: string; size?: number }) {
  const [stage, setStage] = useState<'primary' | 'favicon' | 'initial'>(
    url ? 'primary' : domain ? 'favicon' : 'initial'
  )
  const initial = company.charAt(0).toUpperCase()
  const px = `${size}px`

  if (stage === 'initial') {
    return (
      <span
        className="inline-flex items-center justify-center rounded bg-[#E5E7EB] text-[9px] font-bold text-[#6B7280] shrink-0 select-none"
        style={{ width: px, height: px }}
      >
        {initial}
      </span>
    )
  }

  const src = stage === 'primary' ? url! : `${GOOGLE_FAVICON_URL}${domain}`

  return (
    <img
      src={src}
      alt=""
      className="rounded object-contain shrink-0 bg-[#F3F4F6]"
      style={{ width: px, height: px }}
      onError={() => {
        if (stage === 'primary' && domain) setStage('favicon')
        else setStage('initial')
      }}
    />
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TableLead {
  id: string
  initials: string
  initialsColor: string
  name: string
  title: string
  company: string
  location: string
  signalStrength: "strong" | "some" | "low" | "scanning" | "queued"
  researched?: boolean
  signals: string[]
  // Contact — populated for enriched leads, availability flags for ICP shells
  email?: string
  phone?: string
  linkedinUrl?: string
  hasEmail?: boolean
  hasPhone?: boolean
  // Status (bulk upload)
  status?: "ready" | "missing" | "duplicate" | "shell"
  // Track if already added to list
  isAddedToList?: boolean
  // Company metadata
  logoUrl?: string
  companyDomain?: string
  companyDescription?: string
}

type SortKey = "newest" | "name-asc" | "name-desc" | "company-asc" | "signal"

interface ResultsTableProps {
  leads: TableLead[]
  emptyStateMessage?: string
  showStatusColumn?: boolean   // bulk upload only
  statusSummary?: string
  actionButtonLabel?: string
  onActionClick?: (selectedLeads: string[]) => void
  autoSelectReady?: boolean
  showConfirmationBanner?: boolean
  confirmationMessage?: string
  onDismissBanner?: () => void
  /** variant="icp" hides Status column, shows availability-only contact icons */
  variant?: "specific" | "icp" | "bulk"
}

export function ResultsTable({
  leads,
  emptyStateMessage = "Your researched leads will appear here",
  showStatusColumn = false,
  statusSummary,
  actionButtonLabel = "Add to My List",
  onActionClick,
  autoSelectReady = false,
  showConfirmationBanner = false,
  confirmationMessage = "",
  onDismissBanner,
  variant = "specific",
}: ResultsTableProps) {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [previewLead, setPreviewLead] = useState<TableLead | null>(null)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [hasEmailOnly, setHasEmailOnly] = useState(false)
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("newest")
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Banner auto-dismiss after 3s
  useEffect(() => {
    if (showConfirmationBanner) {
      setBannerVisible(true)
      const t = setTimeout(() => {
        setBannerVisible(false)
        onDismissBanner?.()
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [showConfirmationBanner, onDismissBanner])

  // Auto-select ready leads when autoSelectReady is true
  useEffect(() => {
    if (autoSelectReady && leads.length > 0) {
      const readyLeadIds = leads.filter(l => l.status === "ready" && !l.isAddedToList).map(l => l.id)
      setSelectedLeads(readyLeadIds)
    }
  }, [autoSelectReady, leads])

  // ─── Filter + sort logic ──────────────────────────────────────────────────

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    )
  }

  const filteredLeads = useMemo(() => {
    let out = [...leads]

    // Text search — name, company, title, or location
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        (l.location || "").toLowerCase().includes(q)
      )
    }

    // Contact toggles
    if (hasEmailOnly) out = out.filter(l => l.email || l.hasEmail)
    if (hasPhoneOnly) out = out.filter(l => l.phone || l.hasPhone)

    // Sort
    if (sortKey !== "newest") {
      out.sort((a, b) => {
        if (sortKey === "name-asc") return a.name.localeCompare(b.name)
        if (sortKey === "name-desc") return b.name.localeCompare(a.name)
        if (sortKey === "company-asc") return (a.company || "").localeCompare(b.company || "")
        if (sortKey === "signal") {
          const rank = { strong: 0, some: 1, low: 2, scanning: 3, queued: 4 }
          return (rank[a.signalStrength] ?? 5) - (rank[b.signalStrength] ?? 5)
        }
        return 0
      })
    }
    // "newest" preserves the original array order (API returns newest first)

    return out
  }, [leads, search, hasEmailOnly, hasPhoneOnly, sortKey])

  const toggleAllLeads = () => {
    const selectable = filteredLeads.filter(l => !l.isAddedToList).map(l => l.id)
    if (selectedLeads.length === selectable.length && selectable.length > 0) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(selectable)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  // ─── Badge helpers ─────────────────────────────────────────────────────────

  const getSignalBadge = (strength: TableLead["signalStrength"]) => {
    switch (strength) {
      case "strong":
        return <span className="inline-flex px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded-full">Strong</span>
      case "some":
        return <span className="inline-flex px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded-full">Some</span>
      case "low":
        return <span className="inline-flex px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[11px] font-medium rounded-full">Low</span>
      case "scanning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF2FF] text-[#4338CA] text-[11px] font-medium rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />Scanning
          </span>
        )
      case "queued":
        return <span className="inline-flex px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[11px] font-medium rounded-full">—</span>
    }
  }

  const getStatusBadge = (lead: TableLead) => {
    if (lead.isAddedToList) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E0E7FF] text-[#4338CA] text-[11px] font-medium rounded-full">
          <Check className="w-3 h-3" />Added
        </span>
      )
    }
    if (!lead.status) return null
    switch (lead.status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded-full">
            <Check className="w-3 h-3" />Ready
          </span>
        )
      case "shell":
        return <span className="inline-flex px-2 py-0.5 bg-[#FEF9C3] text-[#854D0E] text-[11px] font-medium rounded-full">No contact</span>
      case "missing":
        return <span className="inline-flex px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded-full">Not found</span>
      case "duplicate":
        return <span className="inline-flex px-2 py-0.5 bg-[#FEE2E2] text-[#991B1B] text-[11px] font-medium rounded-full">Duplicate</span>
      default:
        return null
    }
  }

  // ─── Contact cell ──────────────────────────────────────────────────────────

  const ContactCell = ({ lead }: { lead: TableLead }) => {
    const emailAvail = !!(lead.email || lead.hasEmail)
    const phoneAvail = !!(lead.phone || lead.hasPhone)
    const hasFullEmail = !!lead.email
    const hasFullPhone = !!lead.phone

    return (
      <div className="flex items-center gap-2">
        {/* Email */}
        <div className="relative group">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (hasFullEmail) copyToClipboard(lead.email!, `email-${lead.id}`)
            }}
            disabled={!emailAvail}
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
              emailAvail
                ? hasFullEmail
                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-500 cursor-default"
                : "text-[#D1D5DB] cursor-default"
            )}
          >
            {copiedField === `email-${lead.id}`
              ? <Check className="w-3.5 h-3.5 text-emerald-600" />
              : emailAvail && !hasFullEmail
                ? <Lock className="w-3 h-3" />
                : <Mail className="w-3.5 h-3.5" />
            }
          </button>
          {emailAvail && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1C1C1C] text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {hasFullEmail ? lead.email : "Email locked · add to list to reveal"}
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="relative group">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (hasFullPhone) copyToClipboard(lead.phone!, `phone-${lead.id}`)
            }}
            disabled={!phoneAvail}
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
              phoneAvail
                ? hasFullPhone
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  : "bg-amber-50 text-amber-500 cursor-default"
                : "text-[#D1D5DB] cursor-default"
            )}
          >
            {copiedField === `phone-${lead.id}`
              ? <Check className="w-3.5 h-3.5 text-blue-600" />
              : phoneAvail && !hasFullPhone
                ? <Lock className="w-3 h-3" />
                : <Phone className="w-3.5 h-3.5" />
            }
          </button>
          {phoneAvail && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1C1C1C] text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {hasFullPhone ? lead.phone : "Phone locked · add to list to reveal"}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-[#E5E4E0] rounded-xl">
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-[14px] text-[#9CA3AF]">{emptyStateMessage}</span>
        </div>
      </div>
    )
  }

  // ─── Grid template ─────────────────────────────────────────────────────────
  // Text columns use minmax(min, 1fr) — generous minimums prevent crushing,
  // 1fr growth fills available space proportionally. Fixed columns stay exact.
  // Columns: [checkbox] [name] [title] [company] [location] [contact] [signal] [status?]
  const gridCols = showStatusColumn
    ? "40px minmax(180px,1fr) minmax(200px,1.2fr) minmax(140px,0.8fr) minmax(120px,0.7fr) 72px 90px 80px"
    : "40px minmax(180px,1fr) minmax(200px,1.2fr) minmax(140px,0.8fr) minmax(120px,0.7fr) 72px 90px"

  const selectableLeads = filteredLeads.filter(l => !l.isAddedToList)
  const allSelected = selectableLeads.length > 0 && selectableLeads.every(l => selectedLeads.includes(l.id))

  return (
    <div>
      {/* ── Confirmation banner ─────────────────────────────────────────── */}
      {bannerVisible && confirmationMessage && (
        <div className="mb-3 flex items-center justify-between px-4 py-3 bg-[#D1FAE5] text-[#065F46] rounded-lg">
          <span className="text-[13px] font-medium">{confirmationMessage}</span>
          <button
            onClick={() => { setBannerVisible(false); onDismissBanner?.() }}
            className="p-1 hover:bg-[#A7F3D0] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Status summary ──────────────────────────────────────────────── */}
      {statusSummary && (
        <div className="mb-2">
          <span className="text-[13px] text-[#6B7280]">{statusSummary}</span>
        </div>
      )}

      {/* ── Lead count + filter bar ──────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Lead count */}
        <span className="text-[13px] text-[#6B7280] font-medium mr-1">
          {filteredLeads.length === leads.length
            ? `${leads.length} lead${leads.length !== 1 ? "s" : ""}`
            : `${filteredLeads.length} of ${leads.length} leads`}
        </span>

        <div className="w-px h-5 bg-[#E5E4E0] mr-1" />

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name, company, title..."
            className="w-full h-8 pl-8 pr-3 border border-[#E5E4E0] rounded-lg text-[13px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Has email toggle */}
        <button
          onClick={() => setHasEmailOnly(p => !p)}
          className={cn(
            "h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors flex items-center gap-1.5",
            hasEmailOnly
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white border-[#E5E4E0] text-[#6B7280] hover:border-[#9CA3AF]"
          )}
        >
          <Mail className="w-3.5 h-3.5" />
          Has email
        </button>

        {/* Has phone toggle */}
        <button
          onClick={() => setHasPhoneOnly(p => !p)}
          className={cn(
            "h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors flex items-center gap-1.5",
            hasPhoneOnly
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-white border-[#E5E4E0] text-[#6B7280] hover:border-[#9CA3AF]"
          )}
        >
          <Phone className="w-3.5 h-3.5" />
          Has phone
        </button>

        {/* Sort */}
        <div className="relative ml-auto">
          <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="h-8 pl-8 pr-7 border border-[#E5E4E0] rounded-lg text-[12px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white appearance-none"
          >
            <option value="newest">Newest first</option>
            <option value="name-asc">Name A → Z</option>
            <option value="name-desc">Name Z → A</option>
            <option value="company-asc">Company A → Z</option>
            <option value="signal">Signal strength</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E4E0] rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="grid gap-3 px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E4E0] shrink-0"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="flex items-center">
            <Checkbox checked={allSelected} onCheckedChange={toggleAllLeads} />
          </div>
          <span className="text-[12px] font-medium text-[#6B7280]">Name</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Job title</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Company</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Location</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Contact</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Signal</span>
          {showStatusColumn && (
            <span className="text-[12px] font-medium text-[#6B7280]">Status</span>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
          {filteredLeads.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#9CA3AF]">
              No matches — try adjusting your filters
            </div>
          ) : (
            filteredLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => setPreviewLead(prev => prev?.id === lead.id ? null : lead)}
                className={cn(
                  "grid gap-3 px-4 h-[52px] items-center border-b border-[#F3F4F6] last:border-0 cursor-pointer transition-colors",
                  previewLead?.id === lead.id ? "bg-[#F0F4FF]" : "hover:bg-[#F9FAFB]",
                  lead.signalStrength === "scanning" && "animate-pulse",
                  lead.isAddedToList && "opacity-60"
                )}
                style={{ gridTemplateColumns: gridCols }}
              >
                {/* Checkbox */}
                <div
                  className="flex items-center"
                  onClick={e => { e.stopPropagation(); if (!lead.isAddedToList) toggleLeadSelection(lead.id) }}
                >
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    disabled={lead.isAddedToList}
                    onCheckedChange={() => {}}
                  />
                </div>

                {/* Name */}
                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0",
                    lead.initialsColor
                  )}>
                    {lead.initials}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-[#374151] truncate" title={lead.name}>{lead.name}</span>
                      {lead.linkedinUrl && (
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 text-[#9CA3AF] hover:text-indigo-500 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[13px] text-[#6B7280] truncate min-w-0" title={lead.title}>{lead.title}</span>
                <span className="flex items-center gap-1.5 min-w-0 overflow-hidden" title={lead.company}>
                  <CompanyLogo url={lead.logoUrl} domain={lead.companyDomain} company={lead.company} size={16} />
                  <span className="text-[13px] text-[#6B7280] truncate">{lead.company}</span>
                </span>
                <span className="text-[13px] text-[#6B7280] truncate min-w-0" title={lead.location || undefined}>{lead.location || "—"}</span>
                <div onClick={e => e.stopPropagation()}>
                  <ContactCell lead={lead} />
                </div>
                <div className="relative group/signal">
                  {getSignalBadge(lead.signalStrength)}
                  {lead.signals.length > 0 && (
                    <div className="absolute bottom-full right-0 mb-1.5 px-3 py-2 bg-[#1C1C1C] text-white text-[11px] rounded-lg opacity-0 group-hover/signal:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap max-w-[240px]">
                      {lead.signals.map((s, i) => (
                        <div key={i} className="truncate">{s}</div>
                      ))}
                    </div>
                  )}
                </div>
                {showStatusColumn && <div>{getStatusBadge(lead)}</div>}
              </div>
            ))
          )}
        </div>

        {/* Selection action bar — outside scrollable area so it's always visible */}
        {selectedLeads.length > 0 && onActionClick && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-[#E5E4E0] rounded-b-xl shrink-0">
            <span className="text-[13px] text-[#374151] font-medium">
              {selectedLeads.length} lead{selectedLeads.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => { onActionClick(selectedLeads); setSelectedLeads([]) }}
              className="h-[34px] px-4 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
            >
              {actionButtonLabel}
            </button>
          </div>
        )}
      </div>

      {/* ── Lead detail panel (slide-in from right) ───────────────────── */}
      {previewLead && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPreviewLead(null)}
        >
          <div
            className="absolute top-0 right-0 h-full w-[340px] bg-white border-l border-[#E5E4E0] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E4E0] shrink-0">
              <span className="text-[14px] font-semibold text-[#374151]">Lead detail</span>
              <button
                onClick={() => setPreviewLead(null)}
                className="p-1.5 hover:bg-[#F3F4F6] rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Avatar + identity */}
              <div className="flex items-start gap-3 mb-5">
                <CompanyLogo url={previewLead.logoUrl} domain={previewLead.companyDomain} company={previewLead.company} size={44} />
                <div>
                  <h3 className="font-semibold text-[15px] text-[#111827]">{previewLead.name}</h3>
                  <p className="text-[13px] text-[#6B7280] mt-0.5">{previewLead.title}</p>
                  <p className="text-[13px] text-[#6B7280]">{previewLead.company}</p>
                  {previewLead.location && (
                    <p className="text-[12px] text-[#9CA3AF] mt-0.5">{previewLead.location}</p>
                  )}
                  {previewLead.linkedinUrl && (
                    <a
                      href={previewLead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-indigo-500 hover:text-indigo-700 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      LinkedIn profile
                    </a>
                  )}
                </div>
              </div>

              {/* Contact section */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Contact</p>
                {previewLead.email ? (
                  <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[13px] text-[#374151] truncate">{previewLead.email}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(previewLead.email!, "preview-email")}
                      className="p-1.5 hover:bg-[#F3F4F6] rounded text-[#9CA3AF] hover:text-[#374151] transition-colors shrink-0"
                    >
                      {copiedField === "preview-email"
                        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                ) : previewLead.hasEmail ? (
                  <div className="flex items-center gap-2 py-2 border-b border-[#F3F4F6]">
                    <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="text-[13px] text-[#9CA3AF] italic">Email available — add to list to retrieve</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2 border-b border-[#F3F4F6]">
                    <Mail className="w-3.5 h-3.5 text-[#D1D5DB] shrink-0" />
                    <span className="text-[13px] text-[#D1D5DB]">No email found</span>
                  </div>
                )}

                {previewLead.phone ? (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-[13px] text-[#374151]">{previewLead.phone}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(previewLead.phone!, "preview-phone")}
                      className="p-1.5 hover:bg-[#F3F4F6] rounded text-[#9CA3AF] hover:text-[#374151] transition-colors shrink-0"
                    >
                      {copiedField === "preview-phone"
                        ? <Check className="w-3.5 h-3.5 text-blue-500" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                ) : previewLead.hasPhone ? (
                  <div className="flex items-center gap-2 py-2">
                    <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span className="text-[13px] text-[#9CA3AF] italic">Phone available — add to list to retrieve</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <Phone className="w-3.5 h-3.5 text-[#D1D5DB] shrink-0" />
                    <span className="text-[13px] text-[#D1D5DB]">No phone found</span>
                  </div>
                )}
              </div>

              {/* Signal */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Signal</p>
                <div className="mb-2">{getSignalBadge(previewLead.signalStrength)}</div>
                {previewLead.signals.length > 0 && (
                  <ul className="space-y-1.5 mt-2">
                    {previewLead.signals.map((s, i) => (
                      <li key={i} className="text-[13px] text-[#374151] flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-[#E5E4E0] space-y-2 shrink-0">
              {!previewLead.isAddedToList && onActionClick && (
                <button
                  onClick={() => { onActionClick([previewLead.id]); setPreviewLead(null) }}
                  className="w-full h-10 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
                >
                  Add to My List
                </button>
              )}
              {previewLead.isAddedToList && (
                <div className="w-full h-10 flex items-center justify-center gap-2 bg-[#D1FAE5] text-[#065F46] text-[13px] font-medium rounded-lg">
                  <Check className="w-4 h-4" />Added to My List
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
