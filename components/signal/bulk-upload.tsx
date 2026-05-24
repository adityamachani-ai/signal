"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, File, Check, ArrowRight, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultsTable, TableLead } from "./results-table"
import type { BulkRow, BulkRowResult } from "@/app/api/research/bulk-enrich/route"

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState = "upload" | "mapping" | "enriching" | "preview"

type FieldTarget =
  | "First name" | "Last name" | "Full name" | "Company"
  | "LinkedIn URL" | "Email" | "Job title" | "Skip this column"

interface ColumnMapping {
  detected: string   // original CSV header
  mappedTo: FieldTarget
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_OPTIONS: FieldTarget[] = [
  "First name", "Last name", "Full name", "Company",
  "LinkedIn URL", "Email", "Job title", "Skip this column",
]

// Heuristic auto-mapper: lowercase header → FieldTarget
const HEADER_MAP: Record<string, FieldTarget> = {
  // LinkedIn
  linkedin: "LinkedIn URL", linkedin_url: "LinkedIn URL", linkedinurl: "LinkedIn URL",
  "linkedin url": "LinkedIn URL", profile_url: "LinkedIn URL", profile: "LinkedIn URL",
  li: "LinkedIn URL",
  // Email
  email: "Email", email_address: "Email", emailaddress: "Email",
  work_email: "Email", "work email": "Email", mail: "Email",
  // First name
  first: "First name", first_name: "First name", firstname: "First name",
  fname: "First name", "first name": "First name", given_name: "First name",
  // Last name
  last: "Last name", last_name: "Last name", lastname: "Last name",
  lname: "Last name", "last name": "Last name", surname: "Last name",
  // Full name
  name: "Full name", full_name: "Full name", fullname: "Full name",
  "full name": "Full name", contact: "Full name", contact_name: "Full name",
  // Company
  company: "Company", company_name: "Company", companyname: "Company",
  organization: "Company", org: "Company", account: "Company",
  employer: "Company", "company name": "Company",
  // Job title
  title: "Job title", job_title: "Job title", jobtitle: "Job title",
  role: "Job title", position: "Job title", "job title": "Job title",
}

const AVATAR_COLORS = [
  "bg-signal-accent-tint text-signal-accent-2",
]

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
}

function getColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function autoMap(header: string): FieldTarget {
  return HEADER_MAP[header.toLowerCase().trim()] ?? "Skip this column"
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(splitLine)
  return { headers, rows }
}

// ─── Sample CSV download ──────────────────────────────────────────────────────

function downloadSampleCSV() {
  const content = [
    "first_name,last_name,company,linkedin_url,email,job_title",
    "Rahul,Sharma,HDFC Bank,https://linkedin.com/in/rahulsharma,rahul@hdfcbank.com,Head of Collections",
    "Priya,Nair,,https://linkedin.com/in/priyanair,,VP Sales",
    ",,Stripe,,,",
  ].join("\n")
  const blob = new Blob([content], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "signal_sample.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function resultToTableLead(r: BulkRowResult): TableLead {
  const tableStatus =
    r.status === "enriched" ? "ready" :
    r.status === "duplicate" ? "duplicate" :
    r.status === "already_saved" ? "ready" :
    "missing"

  return {
    id: r.leadId || `row_${r.rowIndex}`,
    initials: getInitials(r.name),
    initialsColor: getColor(r.name),
    name: r.name,
    title: r.jobTitle,
    company: r.company,
    location: r.location ?? "",
    signalStrength: "queued",
    status: tableStatus,
    signals: [],
    email: r.email || undefined,
    phone: r.phone || undefined,
    hasEmail: !!r.email,
    hasPhone: !!r.phone,
    logoUrl: undefined,
    companyDomain: r.companyDomain || undefined,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkUpload() {
  const [uploadState, setUploadState] = useState<UploadState>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [rowCount, setRowCount] = useState(0)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [leads, setLeads] = useState<TableLead[]>([])
  const [enrichResults, setEnrichResults] = useState<BulkRowResult[]>([])
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  // ── File handling ───────────────────────────────────────────────────────────

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
  const MAX_API_ROWS = 1000

  const [fileError, setFileError] = useState<string | null>(null)

  const processFile = useCallback((file: File) => {
    setFileError(null)
    if (!file.name.endsWith(".csv")) {
      setFileError("Only .csv files are supported")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`)
      return
    }
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)
      const validRows = rows.filter(r => r.some(cell => cell.trim()))
      setRowCount(validRows.length)
      setCsvRows(validRows)
      setMappings(headers.map(h => ({ detected: h, mappedTo: autoMap(h) })))
      setUploadState("mapping")
    }
    reader.readAsText(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // ── Check if mapping has at least one usable signal ────────────────────────
  const hasUsableMapping = mappings.some(m =>
    m.mappedTo === "LinkedIn URL" || m.mappedTo === "Email" ||
    ((mappings.some(x => x.mappedTo === "First name") || mappings.some(x => x.mappedTo === "Full name")) &&
      mappings.some(x => x.mappedTo === "Company"))
  )

  // ── Build rows from CSV + mappings ─────────────────────────────────────────
  const buildBulkRows = (): BulkRow[] => {
    const headerIndexMap: Record<FieldTarget, number> = {} as Record<FieldTarget, number>
    mappings.forEach((m, i) => {
      if (m.mappedTo !== "Skip this column") headerIndexMap[m.mappedTo] = i
    })

    return csvRows.map((row, idx): BulkRow => ({
      rowIndex: idx,
      linkedinUrl: row[headerIndexMap["LinkedIn URL"]]?.trim() || undefined,
      email: row[headerIndexMap["Email"]]?.trim() || undefined,
      firstName: row[headerIndexMap["First name"]]?.trim() || undefined,
      lastName: row[headerIndexMap["Last name"]]?.trim() || undefined,
      fullName: row[headerIndexMap["Full name"]]?.trim() || undefined,
      company: row[headerIndexMap["Company"]]?.trim() || undefined,
      jobTitle: row[headerIndexMap["Job title"]]?.trim() || undefined,
    }))
  }

  // ── Enrich ─────────────────────────────────────────────────────────────────
  const handleEnrich = async () => {
    setEnrichError(null)
    setUploadState("enriching")

    const rows = buildBulkRows()

    try {
      const res = await fetch("/api/research/bulk-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Enrichment failed (${res.status})`)
      }

      const data = await res.json()
      const results: BulkRowResult[] = data.results
      setEnrichResults(results)
      setLeads(results.map(resultToTableLead))
      setUploadState("preview")
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Enrichment failed")
      setUploadState("mapping")
    }
  }

  // ── Add to list ────────────────────────────────────────────────────────────
  const handleQueueClick = async (selectedLeadIds: string[]) => {
    // The ListPicker component now handles the API call directly.
    // This callback just marks the leads as added in local state.
    const validLeadIds = selectedLeadIds.filter(id => !id.startsWith("row_"))

    if (validLeadIds.length === 0) {
      showToastMessage("No enriched leads to add (missing/skipped rows can't be added)")
      return
    }

    const count = validLeadIds.length
    showToastMessage(`${count} lead${count !== 1 ? "s" : ""} added to list`)
    setLeads(prev => prev.map(l =>
      validLeadIds.includes(l.id) ? { ...l, isAddedToList: true } : l
    ))
  }

  function showToastMessage(msg: string) {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3500)
  }

  const handleBackToUpload = () => {
    setUploadState("upload")
    setMappings([])
    setFileName("")
    setCsvRows([])
    setEnrichResults([])
    setLeads([])
  }

  const handleBackToMapping = () => {
    setUploadState("mapping")
    setLeads([])
  }

  const updateMapping = (index: number, value: FieldTarget) => {
    setMappings(prev => prev.map((m, i) => (i === index ? { ...m, mappedTo: value } : m)))
  }

  const enrichedCount = enrichResults.filter(r => r.status === "enriched").length
  const alreadySavedCount = enrichResults.filter(r => r.status === "already_saved").length
  const missingCount = enrichResults.filter(r => r.status === "missing").length
  const duplicateCount = enrichResults.filter(r => r.status === "duplicate").length
  const skippedCount = enrichResults.filter(r => r.status === "skipped" || r.status === "rate_limited" || r.status === "error").length
  const readyCount = leads.filter(l => l.status === "ready").length

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#065F46] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4" />
          <span className="text-[13px] font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ── ENRICHING: loading state ────────────────────────────────────────── */}
      {uploadState === "enriching" && (
        <div className="bg-signal-bg border border-signal-border rounded-xl p-10 text-center">
          <Loader2 className="w-8 h-8 text-signal-accent animate-spin mx-auto mb-4" />
          <p className="text-[15px] font-medium text-signal-text-2 mb-1">Enriching your leads…</p>
          <p className="text-[13px] text-signal-text-3">Looking up {rowCount} contacts via Lusha. This may take a moment.</p>

        </div>
      )}

      {/* ── PREVIEW: results after enrichment ────────────────────────────────── */}
      {uploadState === "preview" && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="bg-signal-bg border border-signal-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToMapping}
                  className="flex items-center gap-1 text-[13px] text-signal-text-3 hover:text-signal-text-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <File className="w-5 h-5 text-signal-text-3" />
                <span className="font-medium text-[14px] text-signal-text-2">{fileName}</span>
                <span className="text-[13px] text-signal-text-3">{rowCount} rows</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-signal-text-3">
                <span className="text-green-600 font-medium">{enrichedCount} enriched</span>
                {alreadySavedCount > 0 && <span>· {alreadySavedCount} already saved</span>}
                {duplicateCount > 0 && <span>· {duplicateCount} duplicates</span>}
                {missingCount > 0 && <span>· {missingCount} not found</span>}
                {skippedCount > 0 && <span>· {skippedCount} skipped</span>}
              </div>
            </div>
          </div>

          {/* Name-lookup warning */}
          {enrichResults.some(r => r.nameLookupWarning) && (
            <div className="flex items-start gap-2 px-4 py-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl text-[13px] text-[#92400E]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
              <span>
                Some leads were matched by name + company. These may be less accurate — verify before reaching out.
              </span>
            </div>
          )}

          {/* Results table */}
          <ResultsTable
            leads={leads}
            variant="bulk"
            emptyStateMessage="No leads found"
            showStatusColumn={true}
            statusSummary={`${readyCount} lead${readyCount !== 1 ? 's' : ''} ready to add`}
            actionButtonLabel="Add to List"
            onActionClick={handleQueueClick}
            autoSelectReady={true}
          />

          {/* Upload another file CTA — shown after some leads added */}
          {leads.some(l => l.isAddedToList) && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleBackToUpload}
                className="h-9 px-5 bg-signal-bg border border-signal-border rounded-lg text-[13px] text-signal-text-2 hover:bg-signal-surface transition-colors"
              >
                Upload another file
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MAPPING: column mapper ────────────────────────────────────────────── */}
      {uploadState === "mapping" && (
        <div className="space-y-6">
          <div className="bg-signal-bg border border-signal-border rounded-xl p-6">
            {/* File pill */}
            <div className="flex items-center justify-between p-3 bg-signal-surface border border-signal-border rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-signal-text-3" />
                <span className="font-medium text-[14px] text-signal-text-2">{fileName}</span>
                <span className="text-[13px] text-signal-text-3">{rowCount} rows detected</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded-full">
                  <Check className="w-3 h-3" />
                  Valid CSV
                </span>
                <button onClick={handleBackToUpload} className="text-[12px] text-signal-text-3 hover:text-signal-text-2 transition-colors">
                  Remove
                </button>
              </div>
            </div>

            {/* Column mappings */}
            <h3 className="text-[14px] font-medium text-signal-text-2 mb-1">Map your columns</h3>
            <p className="text-[12px] text-signal-text-4 mb-4">
              Each row needs at least one of: <span className="font-medium text-signal-text-3">LinkedIn URL</span> · <span className="font-medium text-signal-text-3">Email</span> · <span className="font-medium text-signal-text-3">First name + Last name + Company</span>
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {mappings.map((mapping, index) => (
                <div key={`${mapping.detected}-${index}`} className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-signal-raised text-[12px] text-signal-text-3 rounded-md font-mono min-w-0 truncate max-w-[120px]">
                    {mapping.detected}
                  </span>
                  <ArrowRight className="w-4 h-4 text-signal-text-4 shrink-0" />
                  <select
                    value={mapping.mappedTo}
                    onChange={(e) => updateMapping(index, e.target.value as FieldTarget)}
                    className="flex-1 h-9 px-3 border border-signal-border rounded-lg text-[13px] text-signal-text-2 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow bg-signal-bg"
                  >
                    {COLUMN_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Error from previous attempt */}
            {enrichError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
                {enrichError}
              </div>
            )}

            {/* Row count warning */}
            {rowCount > MAX_API_ROWS && (
              <div className="mb-4 px-4 py-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg text-[13px] text-[#92400E] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
                <span>
                  Your file has {rowCount.toLocaleString()} rows but the maximum is {MAX_API_ROWS.toLocaleString()}.
                  Only the first {MAX_API_ROWS.toLocaleString()} rows will be enriched.
                </span>
              </div>
            )}

            {/* Enrich button */}
            <button
              onClick={handleEnrich}
              disabled={!hasUsableMapping}
              title={!hasUsableMapping ? "Map at least LinkedIn URL, Email, or Full name + Company" : undefined}
              className="w-full h-10 bg-[#18181B] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] text-[13px] font-medium rounded-lg hover:bg-[#27272A] dark:hover:bg-[#E4E4E7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Enrich &amp; preview {rowCount > MAX_API_ROWS ? `first ${MAX_API_ROWS.toLocaleString()}` : `${rowCount}`} leads
            </button>
            {!hasUsableMapping && (
              <p className="text-[12px] text-[#92400E] text-center mt-2">
                Map at least one of: LinkedIn URL · Email · Full name + Company
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── UPLOAD: drop zone ─────────────────────────────────────────────────── */}
      {uploadState === "upload" && (
        <div className="space-y-6">
          <div className="bg-signal-bg border border-signal-border rounded-xl p-6">
            {/* Drop zone */}
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                isDragging ? "border-signal-accent bg-signal-surface" : "border-signal-border hover:border-signal-accent hover:bg-signal-surface"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-signal-text-4 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-signal-text-2 mb-1">Drop your CSV here</p>
              <p className="text-[13px] text-signal-text-4">
                or <span className="text-signal-accent">browse files</span> — up to 1,000 leads per upload
              </p>
              <p className="text-[12px] text-signal-text-3 mt-3">
                Needs at least one of: <span className="font-medium">LinkedIn URL</span> · <span className="font-medium">work email</span> · <span className="font-medium">first name + last name + company</span>
              </p>
            </label>

            <div className="mt-2 text-center">
              <button onClick={downloadSampleCSV} className="text-[12px] text-signal-accent hover:underline">
                Download sample CSV template
              </button>
            </div>

            {/* File error (size, type) */}
            {fileError && (
              <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
                {fileError}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
