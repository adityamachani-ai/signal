"use client"

import { useState, useEffect } from "react"
import { X, Check, Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

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
  status?: "ready" | "missing" | "duplicate" // For bulk upload
}

interface ResultsTableProps {
  leads: TableLead[]
  emptyStateMessage?: string
  showStatusColumn?: boolean
  statusSummary?: string
  actionButtonLabel?: string
  onActionClick?: (selectedLeads: string[]) => void
  isGenerating?: boolean
  generatingProgress?: number
  generatingSteps?: { label: string; status: "pending" | "loading" | "complete" }[]
  autoSelectReady?: boolean
  showConfirmationBanner?: boolean
  confirmationMessage?: string
  onDismissBanner?: () => void
}

export function ResultsTable({
  leads,
  emptyStateMessage = "Your researched leads will appear here",
  showStatusColumn = false,
  statusSummary,
  actionButtonLabel = "Generate briefs for selected",
  onActionClick,
  isGenerating = false,
  generatingProgress = 0,
  generatingSteps = [],
  autoSelectReady = false,
  showConfirmationBanner = false,
  confirmationMessage = "",
  onDismissBanner,
}: ResultsTableProps) {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [previewLead, setPreviewLead] = useState<TableLead | null>(null)

  // Auto-select ready leads when autoSelectReady is true
  useEffect(() => {
    if (autoSelectReady && leads.length > 0) {
      const readyLeadIds = leads.filter(l => l.status === "ready").map(l => l.id)
      setSelectedLeads(readyLeadIds)
    }
  }, [autoSelectReady, leads])

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    )
  }

  const toggleAllLeads = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map(l => l.id))
    }
  }

  const handleRowClick = (lead: TableLead) => {
    if (previewLead?.id === lead.id) {
      setPreviewLead(null)
    } else {
      setPreviewLead(lead)
    }
  }

  const getSignalBadge = (strength: TableLead["signalStrength"]) => {
    switch (strength) {
      case "strong":
        return (
          <span className="inline-flex px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded-full">
            Strong signals
          </span>
        )
      case "some":
        return (
          <span className="inline-flex px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded-full">
            Some signals
          </span>
        )
      case "low":
        return (
          <span className="inline-flex px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[11px] font-medium rounded-full">
            Low signals
          </span>
        )
      case "scanning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF2FF] text-[#4338CA] text-[11px] font-medium rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            Scanning...
          </span>
        )
      case "queued":
        return (
          <span className="inline-flex px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[11px] font-medium rounded-full">
            Queued
          </span>
        )
    }
  }

  const getStatusBadge = (status?: TableLead["status"]) => {
    if (!status) return null
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded-full">
            <Check className="w-3 h-3" />
            Ready
          </span>
        )
      case "missing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded-full">
            Missing URL
          </span>
        )
      case "duplicate":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEE2E2] text-[#991B1B] text-[11px] font-medium rounded-full">
            Duplicate
          </span>
        )
    }
  }

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="bg-white border border-[#E5E4E0] rounded-xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-[14px] text-[#9CA3AF]">{emptyStateMessage}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Confirmation banner */}
      {showConfirmationBanner && confirmationMessage && (
        <div className="mb-3 flex items-center justify-between px-4 py-3 bg-[#D1FAE5] text-[#065F46] rounded-lg">
          <span className="text-[13px]">{confirmationMessage}</span>
          <button
            onClick={onDismissBanner}
            className="p-1 hover:bg-[#A7F3D0] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status summary */}
      {statusSummary && (
        <div className="mb-3">
          <span className="text-[13px] text-[#6B7280]">{statusSummary}</span>
        </div>
      )}

      {/* Results table */}
      <div className="bg-white border border-[#E5E4E0] rounded-xl overflow-hidden">
        {/* Table header */}
        <div 
          className={cn(
            "grid gap-4 px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E4E0]",
            showStatusColumn 
              ? "grid-cols-[40px_1fr_140px_120px_100px_100px_100px]"
              : "grid-cols-[40px_1fr_140px_120px_100px_100px]"
          )}
        >
          <div className="flex items-center">
            <Checkbox
              checked={selectedLeads.length === leads.length && leads.length > 0}
              onCheckedChange={toggleAllLeads}
            />
          </div>
          <span className="text-[12px] font-medium text-[#6B7280]">Name</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Job title</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Company</span>
          <span className="text-[12px] font-medium text-[#6B7280]">Location</span>
          {showStatusColumn && (
            <span className="text-[12px] font-medium text-[#6B7280]">Status</span>
          )}
          <span className="text-[12px] font-medium text-[#6B7280]">Signal score</span>
        </div>

        {/* Table rows */}
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => handleRowClick(lead)}
            className={cn(
              "grid gap-4 px-4 h-[52px] items-center border-b border-[#F3F4F6] last:border-0 cursor-pointer transition-colors",
              previewLead?.id === lead.id ? "bg-[#F0F4FF]" : "hover:bg-[#F9FAFB]",
              lead.signalStrength === "scanning" && "animate-pulse"
            )}
            style={showStatusColumn 
              ? { gridTemplateColumns: "40px 1fr 140px 120px 100px 100px 100px" }
              : { gridTemplateColumns: "40px 1fr 140px 120px 100px 100px" }
            }
          >
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedLeads.includes(lead.id)}
                onCheckedChange={() => toggleLeadSelection(lead.id)}
              />
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0",
                  lead.initialsColor
                )}
              >
                {lead.initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[#374151] truncate">
                    {lead.name}
                  </span>
                  {lead.researched && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#E0E7FF] text-[#4338CA] text-[10px] font-medium rounded">
                      <Check className="w-2.5 h-2.5" />
                      Researched
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[13px] text-[#6B7280] truncate">{lead.title}</span>
            <span className="text-[13px] text-[#6B7280] truncate">{lead.company}</span>
            <span className="text-[13px] text-[#6B7280] truncate">{lead.location}</span>
            {showStatusColumn && (
              <div>{getStatusBadge(lead.status)}</div>
            )}
            <div>{getSignalBadge(lead.signalStrength)}</div>
          </div>
        ))}

        {/* Selection action bar */}
        {selectedLeads.length > 0 && !isGenerating && onActionClick && (
          <div className="sticky bottom-0 flex items-center justify-between px-4 py-3 bg-white border-t border-[#E5E4E0]">
            <span className="text-[13px] text-[#374151] font-medium">
              {selectedLeads.length} lead{selectedLeads.length > 1 ? "s" : ""} selected
            </span>
            <button 
              onClick={() => onActionClick(selectedLeads)}
              className="h-[36px] px-4 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#2D2D2D] transition-colors"
            >
              {actionButtonLabel.replace("selected", String(selectedLeads.length))}
            </button>
          </div>
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="sticky bottom-0 px-4 py-4 bg-white border-t border-[#E5E4E0]">
            <div className="flex items-center gap-4 mb-3">
              {generatingSteps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-2">
                  {step.status === "complete" ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : step.status === "loading" ? (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[#E5E4E0]" />
                  )}
                  <span className={cn(
                    "text-[12px]",
                    step.status === "complete" ? "text-green-700" :
                    step.status === "loading" ? "text-indigo-700" : "text-[#9CA3AF]"
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={generatingProgress} className="h-1 bg-[#E5E4E0]" />
          </div>
        )}
      </div>

      {/* Preview panel */}
      {previewLead && (
        <div className="fixed top-0 right-0 w-[320px] h-full bg-white border-l border-[#E5E4E0] shadow-xl z-50 animate-in slide-in-from-right">
          <div className="p-4 border-b border-[#E5E4E0] flex items-center justify-between">
            <span className="font-medium text-[14px] text-[#374151]">Lead preview</span>
            <button
              onClick={() => setPreviewLead(null)}
              className="p-1 hover:bg-[#F3F4F6] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>
          <div className="p-4">
            {/* Lead info */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-medium",
                  previewLead.initialsColor
                )}
              >
                {previewLead.initials}
              </div>
              <div>
                <h3 className="font-medium text-[15px] text-[#374151]">{previewLead.name}</h3>
                <p className="text-[13px] text-[#6B7280]">{previewLead.title}</p>
                <p className="text-[13px] text-[#6B7280]">{previewLead.company}</p>
              </div>
            </div>

            {/* Signal badge */}
            <div className="mb-4">{getSignalBadge(previewLead.signalStrength)}</div>

            {/* Signals */}
            {previewLead.signals.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                  Signals
                </h4>
                <ul className="space-y-2">
                  {previewLead.signals.map((signal, i) => (
                    <li key={i} className="text-[13px] text-[#374151] flex items-start gap-2">
                      <span className="text-indigo-500 mt-1">•</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action */}
            <button 
              onClick={() => onActionClick?.([previewLead.id])}
              className="w-full h-10 bg-[#4F46E5] text-white text-[13px] font-medium rounded-lg hover:bg-[#4338CA] transition-colors"
            >
              Generate full brief — 1 credit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
