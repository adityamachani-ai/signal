"use client"

import { useState, useEffect } from "react"
import { Upload, File, Check, ArrowRight, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultsTable, TableLead } from "./results-table"

type UploadState = "upload" | "mapping" | "preview" | "enriching" | "complete"

interface ColumnMapping {
  detected: string
  mappedTo: string
}

const columnOptions = [
  "First name",
  "Last name",
  "Company",
  "LinkedIn URL",
  "Email",
  "Job title",
  "Skip this column",
]

const initialMappings: ColumnMapping[] = [
  { detected: "first_name", mappedTo: "First name" },
  { detected: "company", mappedTo: "Company" },
  { detected: "linkedin", mappedTo: "LinkedIn URL" },
  { detected: "email_addr", mappedTo: "Email" },
]

const initialLeads: TableLead[] = [
  { id: "1", initials: "JH", initialsColor: "bg-blue-500", name: "Jordan Hassan", title: "VP of Sales", company: "Meridian", location: "San Francisco CA", signalStrength: "queued", status: "ready", signals: [] },
  { id: "2", initials: "SC", initialsColor: "bg-pink-500", name: "Sarah Chen", title: "Head of Revenue", company: "Stripe", location: "New York NY", signalStrength: "queued", status: "ready", signals: [] },
  { id: "3", initials: "MW", initialsColor: "bg-green-500", name: "Marcus Webb", title: "Sales Director", company: "Lattice", location: "Austin TX", signalStrength: "queued", status: "missing", signals: [] },
  { id: "4", initials: "PN", initialsColor: "bg-purple-500", name: "Priya Nair", title: "VP of Sales", company: "Rippling", location: "Remote", signalStrength: "queued", status: "ready", signals: [] },
  { id: "5", initials: "TL", initialsColor: "bg-orange-500", name: "Tom Liu", title: "CRO", company: "Notion", location: "San Francisco CA", signalStrength: "queued", status: "duplicate", signals: [] },
  { id: "6", initials: "AK", initialsColor: "bg-teal-500", name: "Amanda Kim", title: "Sales Manager", company: "Figma", location: "Seattle WA", signalStrength: "queued", status: "ready", signals: [] },
]

export function BulkUpload() {
  const [uploadState, setUploadState] = useState<UploadState>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [mappings, setMappings] = useState<ColumnMapping[]>(initialMappings)
  const [outreachContext, setOutreachContext] = useState("")
  const [leads, setLeads] = useState<TableLead[]>([])
  const [showStatusColumn, setShowStatusColumn] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingProgress, setGeneratingProgress] = useState(0)
  const [generatingSteps, setGeneratingSteps] = useState<{ label: string; status: "pending" | "loading" | "complete" }[]>([])
  const [showConfirmationBanner, setShowConfirmationBanner] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setUploadState("mapping")
  }

  const handleUploadClick = () => {
    setUploadState("mapping")
  }

  const handlePreviewClick = () => {
    setLeads(initialLeads)
    setShowStatusColumn(true)
    setUploadState("preview")
  }

  const [showToast, setShowToast] = useState(false)
  const [toastCount, setToastCount] = useState(0)

  const handleQueueClick = (selectedIds: string[]) => {
    // Show toast
    setToastCount(selectedIds.length)
    setShowToast(true)
    
    // Reset and go back to upload
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
    
    // Clear leads and go back to initial state
    setLeads([])
    setUploadState("upload")
    setShowStatusColumn(true)
  }

  const handleBackToUpload = () => {
    setUploadState("upload")
    setMappings(initialMappings)
    setLeads([])
  }

  const handleBackToMapping = () => {
    setUploadState("mapping")
    setLeads([])
  }

  const updateMapping = (index: number, value: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, mappedTo: value } : m))
    )
  }

  const readyCount = leads.filter(l => l.status === "ready").length
  const missingCount = leads.filter(l => l.status === "missing").length
  const duplicateCount = leads.filter(l => l.status === "duplicate").length

  // Toast component to share across all states
  const ToastNotification = () => (
    showToast ? (
      <div className="fixed top-6 right-6 z-50 bg-[#065F46] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
        <Check className="w-4 h-4" />
        <span className="text-[13px] font-medium">{toastCount} lead{toastCount !== 1 ? "s" : ""} added to My List</span>
      </div>
    ) : null
  )

  if (uploadState === "complete" || uploadState === "enriching" || uploadState === "preview") {
    return (
      <>
      <ToastNotification />
      <div className="space-y-6">
        {/* Compact header for preview/enriching state */}
        {uploadState === "preview" && (
          <div className="bg-white border border-[#E5E4E0] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToMapping}
                  className="flex items-center gap-1 text-[13px] text-[#6B7280] hover:text-[#374151] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-[#6B7280]" />
                  <span className="font-medium text-[14px] text-[#374151]">q4_leads.csv</span>
                  <span className="text-[13px] text-[#6B7280]">248 rows</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Outreach context (inline) */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0F4FF] border border-[#E0E7FF] rounded-lg">
                  <span className="text-[11px] font-semibold text-[#4338CA] uppercase">Context:</span>
                  <input
                    type="text"
                    value={outreachContext}
                    onChange={(e) => setOutreachContext(e.target.value)}
                    placeholder="e.g. Re-engaging cold leads"
                    className="w-[200px] text-[13px] text-[#374151] bg-transparent border-none outline-none placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results table */}
        <ResultsTable
          leads={leads}
          emptyStateMessage="Upload a CSV to see leads here"
          showStatusColumn={showStatusColumn}
          statusSummary={showStatusColumn ? `${readyCount} leads ready · ${missingCount} missing data · ${duplicateCount} duplicates` : undefined}
          actionButtonLabel={showStatusColumn ? "Add to My List" : ""}
          onActionClick={showStatusColumn ? handleQueueClick : undefined}
          isGenerating={isGenerating}
          generatingProgress={generatingProgress}
          generatingSteps={generatingSteps}
          autoSelectReady={showStatusColumn}
          showConfirmationBanner={showConfirmationBanner}
          confirmationMessage={`${queuedCount} leads queued for enrichment. We'll notify you when briefs are ready. Uses ~${(queuedCount * 0.1).toFixed(1)} credits for Tier 1 scan.`}
          onDismissBanner={() => setShowConfirmationBanner(false)}
        />

        {/* Upload another button after completion */}
        {uploadState === "complete" && (
          <div className="text-center">
            <button
              onClick={handleBackToUpload}
              className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Upload another file
            </button>
          </div>
        )}
      </div>
      </>
    )
  }

  if (uploadState === "mapping") {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-[#E5E4E0] rounded-xl p-6">
          {/* File preview */}
          <div className="flex items-center justify-between p-3 bg-[#F9FAFB] border border-[#E5E4E0] rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <File className="w-5 h-5 text-[#6B7280]" />
              <span className="font-medium text-[14px] text-[#374151]">q4_leads.csv</span>
              <span className="text-[13px] text-[#6B7280]">248 rows detected</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded-full">
                <Check className="w-3 h-3" />
                Valid
              </span>
              <button
                onClick={handleBackToUpload}
                className="text-[12px] text-[#6B7280] hover:text-[#374151] transition-colors"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Column mapping */}
          <h3 className="text-[14px] font-medium text-[#374151] mb-4">Map your columns</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {mappings.map((mapping, index) => (
              <div key={mapping.detected} className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-[#F3F4F6] text-[12px] text-[#6B7280] rounded-md font-mono">
                  {mapping.detected}
                </span>
                <ArrowRight className="w-4 h-4 text-[#9CA3AF]" />
                <select
                  value={mapping.mappedTo}
                  onChange={(e) => updateMapping(index, e.target.value)}
                  className="flex-1 h-9 px-3 border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  {columnOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Outreach context */}
          <div className="bg-[#F0F4FF] border border-[#E0E7FF] rounded-lg p-3 mb-6">
            <span className="text-[11px] font-semibold text-[#4338CA] uppercase tracking-wide">
              Outreach context
            </span>
            <p className="text-[11px] text-[#6366F1] mt-0.5 mb-2">
              Shapes how every brief is generated from this batch
            </p>
            <input
              type="text"
              value={outreachContext}
              onChange={(e) => setOutreachContext(e.target.value)}
              placeholder="e.g. Re-engaging cold leads from Q4 with a new product update"
              className="w-full text-[13px] text-[#374151] bg-transparent border-none outline-none placeholder:text-[#9CA3AF]"
            />
          </div>

          {/* Preview button */}
          <button
            onClick={handlePreviewClick}
            className="w-full h-10 bg-[#18181B] text-white text-[13px] font-medium rounded-lg hover:bg-[#27272A] transition-colors"
          >
            Preview leads
          </button>
        </div>

        {/* Empty results table */}
        <ResultsTable
          leads={[]}
          emptyStateMessage="Your uploaded leads will appear here after preview"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5E4E0] rounded-xl p-6">
        {/* Upload zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-indigo-500 bg-[#FAFAFE]"
              : "border-[#E5E4E0] hover:border-indigo-500 hover:bg-[#FAFAFE]"
          )}
        >
          <Upload className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[#374151] mb-1">
            Drop your CSV here
          </p>
          <p className="text-[13px] text-[#9CA3AF]">
            or{" "}
            <span className="text-indigo-600 hover:text-indigo-700 cursor-pointer">
              browse files
            </span>
            {" — up to 1,000 leads per upload"}
          </p>
        </div>

        {/* Outreach context */}
        <div className="mt-4 bg-[#F0F4FF] border border-[#E0E7FF] rounded-lg p-3">
          <span className="text-[11px] font-semibold text-[#4338CA] uppercase tracking-wide">
            Outreach context
          </span>
          <p className="text-[11px] text-[#6366F1] mt-0.5 mb-2">
            Shapes how every brief is generated from this batch
          </p>
          <input
            type="text"
            value={outreachContext}
            onChange={(e) => setOutreachContext(e.target.value)}
            placeholder="e.g. Re-engaging cold leads from Q4 with a new product update"
            className="w-full text-[13px] text-[#374151] bg-transparent border-none outline-none placeholder:text-[#9CA3AF]"
          />
        </div>
      </div>

      {/* Empty results table */}
      <ResultsTable
        leads={[]}
        emptyStateMessage="Upload a CSV to see leads here"
      />
    </div>
  )
}
