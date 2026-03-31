"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Search, X, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultsTable, TableLead } from "./results-table"

// ─── Constants ────────────────────────────────────────────────────────────────

const SENIORITY_OPTIONS: Array<{ label: string; id: string }> = [
  { label: "Founder", id: "10" },
  { label: "Partner", id: "7" },
  { label: "C-Suite", id: "9" },
  { label: "Vice President", id: "8" },
  { label: "Director", id: "6" },
  { label: "Manager", id: "5" },
  { label: "Senior", id: "4" },
  { label: "Entry", id: "3" },
  { label: "Intern", id: "2" },
  { label: "Other", id: "1" },
]

const DEPARTMENT_OPTIONS = [
  "Business Development", "Consulting", "Customer Service", "Engineering & Technical",
  "Finance", "General Management", "Health Care & Medical", "Human Resources",
  "Information Technology", "Legal", "Marketing", "Operations", "Other",
  "Product", "Research & Analytics", "Sales",
]

const COMPANY_SIZE_OPTIONS: Array<{ label: string; min: number; max: number }> = [
  { label: "Startup (1–50)", min: 1, max: 50 },
  { label: "Small (51–200)", min: 51, max: 200 },
  { label: "Mid-size (201–1K)", min: 201, max: 1000 },
  { label: "Large (1K–10K)", min: 1001, max: 10000 },
  { label: "Enterprise (10K+)", min: 10001, max: 999999 },
]

const KNOWN_COUNTRIES = [
  "United States", "India", "United Kingdom", "Brazil", "Canada", "Australia",
  "France", "Germany", "Netherlands", "Italy", "South Africa", "Mexico",
  "Sweden", "China", "Indonesia", "Belgium", "Spain", "United Arab Emirates",
  "Argentina", "Switzerland", "Singapore", "Saudi Arabia", "Ireland", "Colombia",
  "Chile", "Malaysia", "Egypt", "Nigeria", "Japan", "Hong Kong", "Finland",
  "Denmark", "Taiwan", "Bangladesh", "Austria", "Czech Republic", "Peru",
  "Kenya", "Vietnam", "Poland", "Ukraine", "Thailand", "South Korea",
  "New Zealand", "Portugal", "Turkey",
]

const PAGE_SIZE = 25
const MAX_PAGES = 5

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  jobTitles: string[]
  departments: string[]
  seniorities: string[]
  locations: Array<{ country?: string; city?: string }>
  companyNames: string[]
  companySizes: Array<{ min: number; max: number }>
}

interface ParsedFilters extends FilterState {
  seniorityIds: string[]
  notes: string[]
  summary: string
  relatedRoles?: string[]
}

interface SearchResult {
  contactId: string
  personId: number
  name: string
  jobTitle: string
  companyName: string
  companyId: number
  fqdn: string
  companyDescription: string
  logoUrl: string
  location: string
  hasEmail: boolean
  hasPhone: boolean
  hasMobilePhone: boolean
  hasDirectPhone: boolean
  hasLinkedIn: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIALS_COLORS = [
  "bg-pink-500", "bg-blue-500", "bg-green-500", "bg-purple-500",
  "bg-orange-500", "bg-teal-500", "bg-red-500", "bg-indigo-500",
]

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function getColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return INITIALS_COLORS[Math.abs(h) % INITIALS_COLORS.length]
}

function formatLocation(loc: { country?: string; city?: string }) {
  return [loc.city, loc.country].filter(Boolean).join(", ")
}

function parseLocationInput(raw: string): { country?: string; city?: string } {
  const value = raw.trim()
  if (!value) return {}
  if (value.includes(",")) {
    const [city, country] = value.split(",").map(s => s.trim())
    return { city: city || undefined, country: country || undefined }
  }
  const matched = KNOWN_COUNTRIES.find(c => c.toLowerCase() === value.toLowerCase())
  if (matched) return { country: matched }
  return { city: value }
}

const EMPTY_FILTERS: FilterState = {
  jobTitles: [], departments: [], seniorities: [],
  locations: [], companyNames: [], companySizes: [],
}

function isFiltersEmpty(f: FilterState) {
  return (
    f.jobTitles.length === 0 && f.departments.length === 0 &&
    f.seniorities.length === 0 && f.locations.length === 0 &&
    f.companyNames.length === 0 && f.companySizes.length === 0
  )
}

function buildApiFilters(f: FilterState): ParsedFilters {
  const seniorityIds = f.seniorities
    .map(s => SENIORITY_OPTIONS.find(o => o.label === s)?.id)
    .filter((id): id is string => !!id)

  const parts: string[] = []
  if (f.jobTitles.length) parts.push(f.jobTitles[0])
  else if (f.seniorities.length) parts.push(f.seniorities[0])
  else if (f.departments.length) parts.push(f.departments[0])
  if (f.companyNames.length) parts.push(`at ${f.companyNames.slice(0, 2).join(", ")}`)
  else if (f.locations.length) parts.push(`in ${formatLocation(f.locations[0])}`)

  return { ...f, seniorityIds, notes: [], summary: parts.join(" ") || "Custom search" }
}

function toTableLead(r: SearchResult, addedIds: Set<string>): TableLead {
  return {
    id: r.contactId,
    initials: getInitials(r.name),
    initialsColor: getColor(r.name),
    name: r.name,
    title: r.jobTitle,
    company: r.companyName,
    location: r.location || "—",
    signalStrength: "queued",
    signals: [],
    hasEmail: r.hasEmail,
    hasPhone: r.hasPhone || r.hasDirectPhone || r.hasMobilePhone,
    status: "shell",
    isAddedToList: addedIds.has(r.contactId),
    logoUrl: undefined,
    companyDomain: r.fqdn || undefined,
    companyDescription: r.companyDescription || undefined,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ICPDiscoveryProps {
  activeSearch?: string
  searchTrigger?: number
  onClearSearch?: () => void
}

export function ICPDiscovery({ activeSearch = "", searchTrigger = 0, onClearSearch }: ICPDiscoveryProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)

  const [results, setResults] = useState<SearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  const [loadingState, setLoadingState] = useState<"idle" | "parsing" | "searching">("idle")
  const [error, setError] = useState<string | null>(null)

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [dirtyFilters, setDirtyFilters] = useState(false)

  const [toast, setToast] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Used to auto-expand Department section when AI populates it
  const [aiPopulatedDepts, setAiPopulatedDepts] = useState(false)

  // Related roles suggested by AI parse
  const [relatedRoles, setRelatedRoles] = useState<string[]>([])

  const lastSearchSnapshot = useRef<string>("")
  const resultsRef = useRef<HTMLDivElement>(null)

  const isLoading = loadingState !== "idle"
  const empty = isFiltersEmpty(filters)
  const totalPages = Math.min(Math.ceil(totalResults / PAGE_SIZE), MAX_PAGES)
  const isCapped = totalResults > PAGE_SIZE * MAX_PAGES
  const tableLeads = results.map(r => toTableLead(r, addedIds))

  // Track dirty state whenever filters change after a search
  useEffect(() => {
    if (!hasSearched) return
    const current = JSON.stringify(filters)
    setDirtyFilters(current !== lastSearchSnapshot.current)
  }, [filters, hasSearched])

  // Respond to TopBar search trigger (counter-based so same query re-fires)
  useEffect(() => {
    if (searchTrigger > 0 && activeSearch.trim()) {
      handleAIParse(activeSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger])

  // ─── Core search runner ───────────────────────────────────────────────────
  const runSearch = useCallback(async (filtersToSearch: FilterState, page: number) => {
    if (isFiltersEmpty(filtersToSearch)) return

    setLoadingState("searching")
    setError(null)

    try {
      const apiFilters = buildApiFilters(filtersToSearch)
      const res = await fetch("/api/research/icp-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: apiFilters, limit: PAGE_SIZE, maxPerCompany: 3, page: page - 1 }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Search failed (${res.status})`)
      }
      const data = await res.json()
      setResults(data.results)
      setTotalResults(data.totalResults)
      setCurrentPage(page)
      setHasSearched(true)
      // Preserve addedIds across pages so user sees what they already added
      if (page === 1) setAddedIds(new Set())
      lastSearchSnapshot.current = JSON.stringify(filtersToSearch)
      setDirtyFilters(false)
      resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoadingState("idle")
    }
  }, [])

  // ─── AI parse → populate filters → auto-search ────────────────────────────
  const handleAIParse = useCallback(async (q?: string) => {
    const query = q?.trim()
    if (!query) return

    setLoadingState("parsing")
    setError(null)
    setAiPopulatedDepts(false)

    try {
      const res = await fetch("/api/research/icp-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `AI parse failed (${res.status})`)
      }
      const { filters: parsed }: { filters: ParsedFilters } = await res.json()

      const newFilters: FilterState = {
        jobTitles: parsed.jobTitles,
        departments: parsed.departments,
        seniorities: parsed.seniorities,
        locations: parsed.locations,
        companyNames: parsed.companyNames,
        companySizes: parsed.companySizes,
      }
      setFilters(newFilters)
      if (parsed.departments.length > 0) setAiPopulatedDepts(true)
      setRelatedRoles(parsed.relatedRoles ?? [])

      // Auto-search with freshly parsed filters
      await runSearch(newFilters, 1)
    } catch (err) {
      setLoadingState("idle")
      setError(err instanceof Error ? err.message : "AI parse failed")
    }
  }, [runSearch])

  const handleSearch = useCallback(() => {
    runSearch(filters, 1)
  }, [filters, runSearch])

  const handlePageChange = useCallback((page: number) => {
    runSearch(filters, page)
  }, [filters, runSearch])

  // ─── Add to list ──────────────────────────────────────────────────────────
  const handleAddToList = useCallback(async (selectedIds: string[]) => {
    if (!selectedIds.length) return
    const selected = results.filter(r => selectedIds.includes(r.contactId))
    try {
      const res = await fetch("/api/research/save-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: selected.map(r => ({
            name: r.name, jobTitle: r.jobTitle, companyName: r.companyName,
            fqdn: r.fqdn, logoUrl: r.logoUrl, lushaContactId: r.contactId,
          })),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Save failed")
      }
      const { saved } = await res.json()
      setAddedIds(prev => {
        const next = new Set(prev)
        for (const id of selectedIds) next.add(id)
        return next
      })
      setSuccessMessage(`${saved} lead${saved !== 1 ? "s" : ""} added to My List`)
      setSuccessBanner(true)
    } catch {
      setToast("Failed to add leads — please try again")
      setTimeout(() => setToast(null), 3000)
    }
  }, [results])

  // ─── Filter updaters ──────────────────────────────────────────────────────
  const toggleSeniority = (label: string) =>
    setFilters(p => ({
      ...p,
      seniorities: p.seniorities.includes(label)
        ? p.seniorities.filter(s => s !== label)
        : [...p.seniorities, label],
    }))

  const toggleDepartment = (label: string) =>
    setFilters(p => ({
      ...p,
      departments: p.departments.includes(label)
        ? p.departments.filter(d => d !== label)
        : [...p.departments, label],
    }))

  const toggleCompanySize = (min: number, max: number) =>
    setFilters(p => {
      const exists = p.companySizes.some(s => s.min === min && s.max === max)
      return {
        ...p,
        companySizes: exists
          ? p.companySizes.filter(s => !(s.min === min && s.max === max))
          : [...p.companySizes, { min, max }],
      }
    })

  const addJobTitle = (v: string) => {
    const t = v.trim()
    if (!t) return
    setFilters(p => ({ ...p, jobTitles: p.jobTitles.includes(t) ? p.jobTitles : [...p.jobTitles, t] }))
  }

  const addCompanyName = (v: string) => {
    const t = v.trim()
    if (!t) return
    setFilters(p => ({ ...p, companyNames: p.companyNames.includes(t) ? p.companyNames : [...p.companyNames, t] }))
  }

  const addLocation = (v: string) => {
    const loc = parseLocationInput(v)
    if (!loc.city && !loc.country) return
    setFilters(p => ({ ...p, locations: [...p.locations, loc] }))
  }

  const removeLocation = (displayValue: string) =>
    setFilters(p => ({ ...p, locations: p.locations.filter(l => formatLocation(l) !== displayValue) }))

  const clearAll = () => {
    setFilters(EMPTY_FILTERS)
    setAiPopulatedDepts(false)
    setRelatedRoles([])
    setResults([])
    setTotalResults(0)
    setHasSearched(false)
    setDirtyFilters(false)
    setError(null)
    lastSearchSnapshot.current = ""
    onClearSearch?.()
  }

  // ─── Active filter count for header ────────────────────────────────────────
  const activeFilterCount =
    filters.jobTitles.length + filters.seniorities.length +
    filters.departments.length + filters.locations.length +
    filters.companyNames.length + filters.companySizes.length

  // ─── Company autocomplete via Clearbit ─────────────────────────────────────
  const searchCompanies = useCallback(async (query: string): Promise<SuggestionItem[]> => {
    try {
      const res = await fetch(`/api/research/company-search?q=${encodeURIComponent(query)}`)
      if (!res.ok) return []
      const { results } = await res.json()
      return results ?? []
    } catch {
      return []
    }
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-4 h-4" />
          <span className="text-[13px] font-medium">{toast}</span>
        </div>
      )}

      <div className="flex gap-0 -mx-6 -mb-6" style={{ height: "calc(100vh - 160px)" }}>
        {/* ─── Filter Panel (left) ─────────────────────────────────────── */}
        <aside className="w-[272px] shrink-0 border-r border-[#E5E4E0] bg-white overflow-y-auto">
          <div className="p-4 pb-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#111827]">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full min-w-[18px] text-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {!empty && (
                <button onClick={clearAll} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium">
                  Clear all
                </button>
              )}
            </div>

            {/* Hint: AI search is via the top bar */}
            <p className="text-[11px] text-[#A8A5A0] mb-4">Use the search bar above to auto-fill filters with AI</p>

            {/* ─── CONTACTS section ───────────────────────────────────────── */}
            <p className="text-[10px] font-bold text-[#B0ADA8] uppercase tracking-widest mb-3">Contacts</p>

            <FilterSection label="Job title" icon={<JobTitleIcon />}>
              <TagInput
                values={filters.jobTitles}
                onAdd={addJobTitle}
                onRemove={v => setFilters(p => ({ ...p, jobTitles: p.jobTitles.filter(x => x !== v) }))}
                placeholder="e.g. VP of Sales"
              />
              {/* Related role suggestions from AI */}
              {relatedRoles.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] text-[#9CA3AF] font-medium">Related roles</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {relatedRoles
                      .filter(r => !filters.jobTitles.includes(r))
                      .map(role => (
                        <button
                          key={role}
                          onClick={() => { addJobTitle(role); setRelatedRoles(prev => prev.filter(r => r !== role)) }}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          {role}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </FilterSection>

            <FilterSection label="Seniority" icon={<SeniorityIcon />}>
              <div className="flex flex-wrap gap-1.5">
                {SENIORITY_OPTIONS.map(({ label }) => (
                  <button
                    key={label}
                    onClick={() => toggleSeniority(label)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                      filters.seniorities.includes(label)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-[#6B7280] border-[#E5E4E0] hover:border-indigo-300 hover:text-indigo-600"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection label="Contact location" icon={<LocationIcon />}>
              <TagInput
                values={filters.locations.map(formatLocation)}
                onAdd={addLocation}
                onRemove={removeLocation}
                placeholder="e.g. India or Mumbai, India"
                staticSuggestions={KNOWN_COUNTRIES}
              />
            </FilterSection>

            <FilterSection
              label="Department"
              icon={<DepartmentIcon />}
              collapsible
              forceExpanded={aiPopulatedDepts || filters.departments.length > 0}
            >
              <div className="flex flex-wrap gap-1.5">
                {DEPARTMENT_OPTIONS.map(dept => (
                  <button
                    key={dept}
                    onClick={() => toggleDepartment(dept)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                      filters.departments.includes(dept)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-[#6B7280] border-[#E5E4E0] hover:border-indigo-300 hover:text-indigo-600"
                    )}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </FilterSection>

            <div className="border-t border-[#F0EFEB] my-4" />

            {/* ─── COMPANIES section ──────────────────────────────────────── */}
            <p className="text-[10px] font-bold text-[#B0ADA8] uppercase tracking-widest mb-3">Companies</p>

            <FilterSection label="Company name" icon={<CompanyIcon />}>
              <TagInput
                values={filters.companyNames}
                onAdd={addCompanyName}
                onRemove={v => setFilters(p => ({ ...p, companyNames: p.companyNames.filter(x => x !== v) }))}
                placeholder="e.g. Stripe, Airbnb"
                asyncSearch={searchCompanies}
              />
            </FilterSection>

            <FilterSection label="Company size" icon={<SizeIcon />} collapsible forceExpanded={filters.companySizes.length > 0}>
              <div className="space-y-1.5">
                {COMPANY_SIZE_OPTIONS.map(({ label, min, max }) => {
                  const checked = filters.companySizes.some(s => s.min === min && s.max === max)
                  return (
                    <label key={label} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleCompanySize(min, max)}>
                      <div
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          checked ? "bg-indigo-600 border-indigo-600" : "border-[#D1D5DB] group-hover:border-indigo-300"
                        )}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={cn("text-[12px] select-none", checked ? "text-[#111827] font-medium" : "text-[#6B7280]")}>
                        {label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </FilterSection>

            {/* Search button */}
            <div className="mt-6 pt-4 border-t border-[#F0EFEB]">
              <button
                onClick={handleSearch}
                disabled={empty || isLoading}
                className={cn(
                  "w-full h-10 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2",
                  empty
                    ? "bg-[#F3F4F6] text-[#C0BDB8] cursor-not-allowed"
                    : loadingState === "searching"
                    ? "bg-indigo-600 text-white opacity-80"
                    : dirtyFilters
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-300 ring-offset-1"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
              >
                {loadingState === "searching"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                  : <><Search className="w-4 h-4" /> {dirtyFilters && hasSearched ? "Apply & Search" : "Search"}</>
                }
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Results Panel (right) ─────────────────────────────────────── */}
        <div ref={resultsRef} className="flex-1 min-w-0 overflow-y-auto bg-[#F7F6F3]">
          {/* Empty state — no search yet */}
          {!hasSearched && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center min-h-full text-center px-10" style={{ minHeight: "100%" }}>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Build your contact list</h3>
              <p className="text-[13px] text-[#9CA3AF] max-w-[280px] leading-relaxed">
                Use filters or describe who you want to reach
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[420px]">
                {[
                  "VP of Sales at SaaS companies",
                  "CTOs at fintech startups in India",
                  "Head of Engineering at enterprise software",
                  "Founders of AI startups in the US",
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => handleAIParse(q)}
                    className="px-3 py-1.5 bg-white text-[12px] text-[#374151] rounded-full border border-[#E5E4E0] hover:bg-[#F3F4F6] hover:border-indigo-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-full gap-3" style={{ minHeight: "100%" }}>
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
              <p className="text-[13px] text-[#9CA3AF]">
                {loadingState === "parsing" ? "Generating filters from your description…" : "Searching contacts…"}
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="max-w-[480px] mx-auto pt-16 px-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] text-red-800 font-medium">Search failed</p>
                  <p className="text-[13px] text-red-600 mt-1">{error}</p>
                  <button onClick={handleSearch} disabled={empty} className="mt-2 text-[13px] text-red-700 underline disabled:opacity-40">
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {hasSearched && !isLoading && !error && (
            <div className="p-5">
              {/* No results state */}
              {results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                    <Search className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#111827] mb-2">No contacts found</h3>
                  <p className="text-[13px] text-[#9CA3AF] max-w-[300px] leading-relaxed">
                    Try broadening your filters — remove some seniority levels, expand locations, or use fewer job titles
                  </p>
                </div>
              )}

              {results.length > 0 && (
                <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-[#6B7280]">
                  {isCapped ? (
                    <>
                      Showing <span className="font-semibold text-[#111827]">{(PAGE_SIZE * MAX_PAGES).toLocaleString()}</span> of {totalResults.toLocaleString()} contacts
                      <span className="text-[#C0BDB8] ml-2">
                        (page {currentPage} of {totalPages})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-[#111827]">{totalResults.toLocaleString()}</span> contacts found
                      {totalPages > 1 && (
                        <span className="text-[#C0BDB8] ml-2">
                          {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalResults)}
                        </span>
                      )}
                    </>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {dirtyFilters && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Filters changed — press Search to update
                    </span>
                  )}
                </div>
              </div>

              {/* Contact detail notice */}
              <div className="mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-[12px] text-indigo-700">
                Email and phone are unlocked when you add leads to your list.
              </div>

              <ResultsTable
                leads={tableLeads}
                variant="icp"
                emptyStateMessage="No results found — try adjusting your filters"
                actionButtonLabel="Add to My List"
                onActionClick={handleAddToList}
                showConfirmationBanner={successBanner}
                confirmationMessage={successMessage}
                onDismissBanner={() => setSuccessBanner(false)}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-1.5">
                  <PaginationButton
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    label="‹"
                  />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading}
                      className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50",
                        page === currentPage
                          ? "bg-indigo-600 text-white"
                          : "border border-[#E5E4E0] text-[#374151] hover:bg-[#F9FAFB]"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <PaginationButton
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    label="›"
                  />
                </div>
              )}

              {isCapped && results.length > 0 && (
                <p className="mt-3 text-center text-[12px] text-[#C0BDB8]">
                  Maximum {PAGE_SIZE * MAX_PAGES} results shown. Narrow your search for more targeted results.
                </p>
              )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterSection({
  label, icon, children, collapsible = false, forceExpanded = false,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  forceExpanded?: boolean
}) {
  const [manualCollapse, setManualCollapse] = useState<boolean | null>(null)

  // If collapsible: start collapsed unless forceExpanded is true.
  // Once user manually toggles, respect that until forceExpanded changes.
  const isCollapsed = collapsible
    ? (manualCollapse !== null ? manualCollapse : !forceExpanded)
    : false

  // Reset manual override when AI populates (forceExpanded flips to true)
  useEffect(() => {
    if (forceExpanded) setManualCollapse(null)
  }, [forceExpanded])

  return (
    <div className="mb-4">
      <button
        onClick={collapsible ? () => setManualCollapse(!isCollapsed) : undefined}
        className={cn(
          "flex items-center justify-between w-full mb-2 group",
          collapsible && "cursor-pointer"
        )}
      >
        <span className="flex items-center gap-2">
          {icon && <span className="text-[#9CA3AF]">{icon}</span>}
          <span className="text-[12px] font-semibold text-[#374151]">{label}</span>
        </span>
        {collapsible && (
          <Plus className={cn(
            "w-3.5 h-3.5 text-[#C0BDB8] group-hover:text-[#9CA3AF] transition-transform",
            !isCollapsed && "rotate-45"
          )} />
        )}
      </button>
      {!isCollapsed && children}
    </div>
  )
}

interface SuggestionItem {
  name: string
  domain?: string
  logo?: string
}

function TagInput({
  values, onAdd, onRemove, placeholder,
  asyncSearch,
  staticSuggestions,
}: {
  values: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
  placeholder: string
  /** Async search for suggestions (e.g. Clearbit companies) */
  asyncSearch?: (query: string) => Promise<SuggestionItem[]>
  /** Static list to filter client-side */
  staticSuggestions?: string[]
}) {
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const commit = (value?: string) => {
    const t = (value ?? input).trim()
    if (t) { onAdd(t); setInput(""); setSuggestions([]); setShowDropdown(false); setHighlightIdx(-1) }
  }

  // Handle input changes — trigger autocomplete
  const handleInputChange = (val: string) => {
    setInput(val)
    setHighlightIdx(-1)

    if (val.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    if (asyncSearch) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const results = await asyncSearch(val.trim())
        setSuggestions(results)
        setShowDropdown(results.length > 0)
      }, 250)
    } else if (staticSuggestions) {
      const lower = val.trim().toLowerCase()
      const filtered = staticSuggestions
        .filter(s => s.toLowerCase().includes(lower) && !values.includes(s))
        .slice(0, 8)
        .map(s => ({ name: s }))
      setSuggestions(filtered)
      setShowDropdown(filtered.length > 0)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-full border border-indigo-100">
              {v}
              <button onClick={() => onRemove(v)} className="hover:text-indigo-900 transition-colors ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "ArrowDown" && showDropdown) {
                e.preventDefault()
                setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1))
              } else if (e.key === "ArrowUp" && showDropdown) {
                e.preventDefault()
                setHighlightIdx(i => Math.max(i - 1, 0))
              } else if (e.key === "Enter") {
                e.preventDefault()
                if (highlightIdx >= 0 && suggestions[highlightIdx]) {
                  commit(suggestions[highlightIdx].name)
                } else {
                  commit()
                }
              } else if (e.key === "," && !asyncSearch) {
                e.preventDefault()
                commit()
              } else if (e.key === "Escape") {
                setShowDropdown(false)
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true)
            }}
            placeholder={placeholder}
            className="flex-1 h-7 px-2 border border-[#E5E4E0] rounded-md text-[12px] placeholder:text-[#D1D5DB] focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 bg-[#FAFAF9]"
          />
          <button
            onClick={() => commit()}
            disabled={!input.trim()}
            className="h-7 w-7 flex items-center justify-center border border-[#E5E4E0] rounded-md text-[#C0BDB8] hover:text-indigo-500 hover:border-indigo-300 disabled:opacity-30 transition-colors bg-white"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-7 mt-1 bg-white border border-[#E5E4E0] rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={`${s.name}-${i}`}
                onClick={() => commit(s.name)}
                onMouseEnter={() => setHighlightIdx(i)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors",
                  i === highlightIdx ? "bg-indigo-50" : "hover:bg-[#F9FAFB]"
                )}
              >
                {s.logo && (
                  <img
                    src={s.logo}
                    alt=""
                    className="w-5 h-5 rounded object-contain shrink-0 bg-[#F3F4F6]"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] font-medium text-[#374151] truncate block">{s.name}</span>
                  {s.domain && (
                    <span className="text-[10px] text-[#9CA3AF] truncate block">{s.domain}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PaginationButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E5E4E0] text-[15px] text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  )
}

// ─── Filter section icons (small inline SVGs matching Lusha style) ───────────

function JobTitleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1" />
    </svg>
  )
}

function SeniorityIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1l2 4h4l-3.5 3 1.5 4.5L8 10l-4 2.5L5.5 8 2 5h4z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14s-5-4.5-5-8a5 5 0 1110 0c0 3.5-5 8-5 8z" />
      <circle cx="8" cy="6" r="1.5" />
    </svg>
  )
}

function DepartmentIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="4" r="2" />
      <circle cx="4" cy="11" r="2" />
      <circle cx="12" cy="11" r="2" />
      <path d="M8 6v2M6 9.5L8 8M10 9.5L8 8" />
    </svg>
  )
}

function CompanyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="10" height="12" rx="1" />
      <path d="M6 5h4M6 8h4M6 11h2" />
    </svg>
  )
}

function SizeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="10" cy="6" r="2.5" />
      <circle cx="8" cy="10" r="2.5" />
    </svg>
  )
}
