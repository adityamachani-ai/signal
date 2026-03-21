"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronDown, ChevronUp, X, Check, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { TagInput } from "./tag-input"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  initials: string
  initialsColor: string
  name: string
  title: string
  company: string
  location: string
  signalStrength: "strong" | "some" | "low"
  researched?: boolean
  signals: string[]
}

const sampleLeads: Lead[] = [
  {
    id: "1",
    initials: "SC",
    initialsColor: "bg-pink-500",
    name: "Sarah Chen",
    title: "VP of Sales",
    company: "Lattice",
    location: "San Francisco CA",
    signalStrength: "strong",
    signals: [
      "Recently promoted to VP of Sales (2 weeks ago)",
      "Company raised Series D, likely scaling team",
      "Posted about improving outbound metrics on LinkedIn",
    ],
  },
  {
    id: "2",
    initials: "MJ",
    initialsColor: "bg-blue-500",
    name: "Marcus Johnson",
    title: "Head of Revenue",
    company: "Notion",
    location: "New York NY",
    signalStrength: "strong",
    researched: true,
    signals: [
      "Hiring 5 new SDRs this quarter",
      "Spoke at SaaStr about sales efficiency",
      "Company expanding to EMEA market",
    ],
  },
  {
    id: "3",
    initials: "ER",
    initialsColor: "bg-green-500",
    name: "Emily Rodriguez",
    title: "Sales Director",
    company: "Figma",
    location: "Austin TX",
    signalStrength: "some",
    signals: [
      "Transitioned from individual contributor recently",
      "Figma acquired by Adobe (deal in progress)",
      "Active in sales leadership communities",
    ],
  },
  {
    id: "4",
    initials: "DP",
    initialsColor: "bg-purple-500",
    name: "David Park",
    title: "VP of Business Development",
    company: "Linear",
    location: "Remote",
    signalStrength: "some",
    signals: [
      "Linear growing rapidly in developer tools space",
      "Looking to expand partnership channels",
      "Previously at Stripe (strong network)",
    ],
  },
  {
    id: "5",
    initials: "LT",
    initialsColor: "bg-orange-500",
    name: "Lisa Thompson",
    title: "Chief Revenue Officer",
    company: "Retool",
    location: "San Francisco CA",
    signalStrength: "low",
    signals: [
      "Joined Retool 6 months ago",
      "Building out go-to-market strategy",
      "Focus on enterprise accounts",
    ],
  },
  {
    id: "6",
    initials: "JW",
    initialsColor: "bg-teal-500",
    name: "James Wilson",
    title: "VP of Sales",
    company: "Amplitude",
    location: "Seattle WA",
    signalStrength: "strong",
    signals: [
      "Company went public recently",
      "Expanding sales team by 40%",
      "Focus on product-led sales motion",
    ],
  },
]

type FilterKey = "jobTitle" | "seniority" | "industry" | "companySize" | "funding" | "location" | "technology" | "keywords"

interface Filters {
  jobTitle: string[]
  seniority: string[]
  industry: string[]
  companySize: string[]
  funding: string[]
  location: string[]
  technology: string[]
  keywords: string
}

interface FilterPill {
  type: FilterKey | "search"
  label: string
  value: string
}

interface ICPDiscoveryProps {
  activeSearch?: string
  onClearSearch?: () => void
}

export function ICPDiscovery({ activeSearch = "", onClearSearch }: ICPDiscoveryProps) {
  const [expandedFilter, setExpandedFilter] = useState<FilterKey | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [previewLead, setPreviewLead] = useState<Lead | null>(null)
  


  // Staged filters (what user is currently selecting)
  const [filters, setFilters] = useState<Filters>({
    jobTitle: [],
    seniority: [],
    industry: [],
    companySize: [],
    funding: [],
    location: [],
    technology: [],
    keywords: "",
  })

  // Applied filters (what's actually being used for query)
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    jobTitle: [],
    seniority: [],
    industry: [],
    companySize: [],
    funding: [],
    location: [],
    technology: [],
    keywords: "",
  })

  const seniorityOptions = ["C-Suite", "VP", "Director", "Manager", "Individual Contributor"]
  const industryOptions = ["SaaS", "Fintech", "Healthcare", "E-commerce", "Manufacturing", "Other"]
  const companySizeOptions = ["1-10", "11-50", "51-200", "201-500", "500+"]
  const fundingOptions = ["Seed", "Series A", "Series B", "Series C", "Series D+", "Public"]

  const filterLabels: Record<FilterKey, string> = {
    jobTitle: "Job title",
    seniority: "Seniority",
    industry: "Industry",
    companySize: "Company size",
    funding: "Funding stage",
    location: "Location",
    technology: "Technology",
    keywords: "Keywords",
  }

  // Check if staged filters differ from applied
  const hasStagedFilters = useMemo(() => {
    return (
      filters.jobTitle.length > 0 ||
      filters.seniority.length > 0 ||
      filters.industry.length > 0 ||
      filters.companySize.length > 0 ||
      filters.funding.length > 0 ||
      filters.location.length > 0 ||
      filters.technology.length > 0 ||
      filters.keywords.trim().length > 0
    )
  }, [filters])

  // Generate filter pills from APPLIED filters (not staged)
  const filterPills = useMemo(() => {
    const pills: FilterPill[] = []
    
    // Add search query as a pill if active
    if (activeSearch.trim()) {
      pills.push({ type: "search", label: "Search", value: activeSearch })
    }
    
    appliedFilters.jobTitle.forEach(v => pills.push({ type: "jobTitle", label: "Job title", value: v }))
    appliedFilters.seniority.forEach(v => pills.push({ type: "seniority", label: "Seniority", value: v }))
    appliedFilters.industry.forEach(v => pills.push({ type: "industry", label: "Industry", value: v }))
    appliedFilters.companySize.forEach(v => pills.push({ type: "companySize", label: "Company size", value: v }))
    appliedFilters.funding.forEach(v => pills.push({ type: "funding", label: "Funding stage", value: v }))
    appliedFilters.location.forEach(v => pills.push({ type: "location", label: "Location", value: v }))
    appliedFilters.technology.forEach(v => pills.push({ type: "technology", label: "Technology", value: v }))
    if (appliedFilters.keywords.trim()) {
      pills.push({ type: "keywords", label: "Keywords", value: appliedFilters.keywords })
    }
    
    return pills
  }, [appliedFilters, activeSearch])

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedFilters.jobTitle.length > 0 ||
      appliedFilters.seniority.length > 0 ||
      appliedFilters.industry.length > 0 ||
      appliedFilters.companySize.length > 0 ||
      appliedFilters.funding.length > 0 ||
      appliedFilters.location.length > 0 ||
      appliedFilters.technology.length > 0 ||
      appliedFilters.keywords.trim().length > 0
    )
  }, [appliedFilters])

  const hasSearch = activeSearch.trim().length > 0
  
  // Show results if either search OR filters are applied
  const hasResults = hasSearch || hasAppliedFilters

  // Simulate result counts based on search and filters
  const baseResultCount = hasSearch ? 1247 : (hasAppliedFilters ? 892 : 0)
  const filteredResultCount = (hasSearch && hasAppliedFilters) 
    ? Math.max(100, Math.floor(baseResultCount * (1 - filterPills.filter(p => p.type !== "search").length * 0.15))) 
    : baseResultCount

  // Show "Apply filters" button when:
  // - Filters are staged AND
  // - No search query has been run
  const showApplyFiltersButton = hasStagedFilters && !hasSearch

  const applyFilters = () => {
    setAppliedFilters({ ...filters })
  }

  // When search is executed, also apply any staged filters
  useEffect(() => {
    if (hasSearch && hasStagedFilters) {
      setAppliedFilters({ ...filters })
    }
  }, [activeSearch])

  const removeFilterPill = (pill: FilterPill) => {
    if (pill.type === "search") {
      // Clear search via parent callback
      onClearSearch?.()
      return
    }

    const updateFilters = (prev: Filters) => {
      const newFilters = { ...prev }
      if (pill.type === "keywords") {
        newFilters.keywords = ""
      } else {
        const key = pill.type as keyof Omit<Filters, "keywords">
        newFilters[key] = prev[key].filter(v => v !== pill.value)
      }
      return newFilters
    }

    setFilters(updateFilters)
    setAppliedFilters(updateFilters)
  }

  const toggleFilter = (filter: FilterKey) => {
    setExpandedFilter(expandedFilter === filter ? null : filter)
  }

  const clearAll = () => {
    const emptyFilters = {
      jobTitle: [],
      seniority: [],
      industry: [],
      companySize: [],
      funding: [],
      location: [],
      technology: [],
      keywords: "",
    }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    onClearSearch?.()
  }

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    )
  }

  const handleRowClick = (lead: Lead) => {
    if (previewLead?.id === lead.id) {
      setPreviewLead(null)
    } else {
      setPreviewLead(lead)
    }
  }

  const [showToast, setShowToast] = useState(false)
  const [toastCount, setToastCount] = useState(0)

  const handleGenerateBriefs = () => {
    // Show toast
    setToastCount(selectedLeads.length)
    setShowToast(true)
    setSelectedLeads([])
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  const getSignalBadge = (strength: Lead["signalStrength"]) => {
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
    }
  }

  const FilterAccordion = ({
    filterKey,
    label,
    children,
  }: {
    filterKey: FilterKey
    label: string
    children: React.ReactNode
  }) => (
    <div className="border-b border-[#F3F4F6] last:border-0">
      <button
        onClick={() => toggleFilter(filterKey)}
        className="w-full flex items-center justify-between py-3 text-[13px] text-[#374151] hover:text-[#111827] transition-colors"
      >
        {label}
        {expandedFilter === filterKey ? (
          <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          expandedFilter === filterKey ? "max-h-[300px] pb-3" : "max-h-0"
        )}
      >
        {children}
      </div>
    </div>
  )

  const CheckboxGroup = ({
    options,
    selected,
    onChange,
  }: {
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
  }) => (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 cursor-pointer text-[13px] text-[#374151]"
        >
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...selected, option])
              } else {
                onChange(selected.filter((s) => s !== option))
              }
            }}
          />
          {option}
        </label>
      ))}
    </div>
  )

  return (
    <>
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#065F46] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4" />
          <span className="text-[13px] font-medium">{toastCount} lead{toastCount !== 1 ? "s" : ""} added to My List</span>
        </div>
      )}
      <div className="flex gap-6">
      {/* Left Column - Filters */}
      <div className="w-[260px] shrink-0">
        <div className="bg-white border border-[#E5E4E0] rounded-xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-[14px] text-[#374151]">Filters</span>
            {(hasStagedFilters || hasAppliedFilters) && (
              <button
                onClick={clearAll}
                className="text-[12px] text-indigo-600 hover:text-indigo-700"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter Accordions */}
          <div>
            <FilterAccordion filterKey="jobTitle" label="Job title">
              <TagInput
                tags={filters.jobTitle}
                onTagsChange={(tags) => setFilters((prev) => ({ ...prev, jobTitle: tags }))}
                placeholder="e.g. VP of Sales"
              />
            </FilterAccordion>

            <FilterAccordion filterKey="seniority" label="Seniority level">
              <CheckboxGroup
                options={seniorityOptions}
                selected={filters.seniority}
                onChange={(selected) => setFilters((prev) => ({ ...prev, seniority: selected }))}
              />
            </FilterAccordion>

            <FilterAccordion filterKey="industry" label="Industry">
              <CheckboxGroup
                options={industryOptions}
                selected={filters.industry}
                onChange={(selected) => setFilters((prev) => ({ ...prev, industry: selected }))}
              />
            </FilterAccordion>

            <FilterAccordion filterKey="companySize" label="Company size">
              <CheckboxGroup
                options={companySizeOptions}
                selected={filters.companySize}
                onChange={(selected) => setFilters((prev) => ({ ...prev, companySize: selected }))}
              />
            </FilterAccordion>

            <FilterAccordion filterKey="funding" label="Funding stage">
              <CheckboxGroup
                options={fundingOptions}
                selected={filters.funding}
                onChange={(selected) => setFilters((prev) => ({ ...prev, funding: selected }))}
              />
            </FilterAccordion>

            <FilterAccordion filterKey="location" label="Location">
              <TagInput
                tags={filters.location}
                onTagsChange={(tags) => setFilters((prev) => ({ ...prev, location: tags }))}
                placeholder="e.g. San Francisco"
              />
            </FilterAccordion>

            <FilterAccordion filterKey="technology" label="Technology used">
              <TagInput
                tags={filters.technology}
                onTagsChange={(tags) => setFilters((prev) => ({ ...prev, technology: tags }))}
                placeholder="e.g. Salesforce"
              />
            </FilterAccordion>

            <FilterAccordion filterKey="keywords" label="Keywords">
              <input
                type="text"
                value={filters.keywords}
                onChange={(e) => setFilters((prev) => ({ ...prev, keywords: e.target.value }))}
                placeholder="Search keywords..."
                className="w-full h-9 px-3 border border-[#E5E4E0] rounded-lg text-[13px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </FilterAccordion>
          </div>

          {/* Apply Filters Button - only shows when filters are selected but no search query */}
          {showApplyFiltersButton && (
            <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
              <button
                onClick={applyFilters}
                className="w-full h-10 bg-[#4F46E5] text-white text-[13px] font-medium rounded-lg hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Apply filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="flex-1 min-w-0">
        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-[#6B7280]">
            {hasResults ? (
              hasSearch && hasAppliedFilters ? (
                <>Showing {filteredResultCount.toLocaleString()} of {baseResultCount.toLocaleString()} results <span className="text-[#9CA3AF]">(filtered)</span></>
              ) : (
                <>Showing {baseResultCount.toLocaleString()} results</>
              )
            ) : (
              <>Search or apply filters to discover leads</>
            )}
          </span>
          {hasResults && (
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
                Save search
              </button>
              <button className="h-8 px-3 border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-1">
                Sort by Signal strength
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Filter pills */}
        {filterPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {filterPills.map((pill, index) => (
              <span
                key={`${pill.type}-${pill.value}-${index}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded-full",
                  pill.type === "search" 
                    ? "bg-[#18181B] text-white" 
                    : "bg-[#EEF2FF] text-[#4338CA]"
                )}
              >
                {pill.type === "search" ? `"${pill.value}"` : `${pill.label}: ${pill.value}`}
                <button
                  onClick={() => removeFilterPill(pill)}
                  className={cn(
                    "transition-colors",
                    pill.type === "search" 
                      ? "hover:text-gray-300" 
                      : "hover:text-[#312E81]"
                  )}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-[12px] text-[#6B7280] hover:text-[#374151] transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results table */}
        <div className="bg-white border border-[#E5E4E0] rounded-xl overflow-hidden relative">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E4E0]">
            <div className="flex items-center">
              <Checkbox
                checked={selectedLeads.length === sampleLeads.length && sampleLeads.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedLeads(sampleLeads.map((l) => l.id))
                  } else {
                    setSelectedLeads([])
                  }
                }}
              />
            </div>
            <span className="text-[12px] font-medium text-[#6B7280]">Name</span>
            <span className="text-[12px] font-medium text-[#6B7280]">Job title</span>
            <span className="text-[12px] font-medium text-[#6B7280]">Company</span>
            <span className="text-[12px] font-medium text-[#6B7280]">Location</span>
            <span className="text-[12px] font-medium text-[#6B7280]">Signal score</span>
          </div>

          {/* Table rows */}
          {hasResults && sampleLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => handleRowClick(lead)}
              className={cn(
                "grid grid-cols-[40px_1fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] cursor-pointer transition-colors h-[52px] items-center",
                previewLead?.id === lead.id && "bg-[#F9FAFB]"
              )}
            >
              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedLeads.includes(lead.id)}
                  onCheckedChange={() => toggleLeadSelection(lead.id)}
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    lead.initialsColor
                  )}
                >
                  <span className="text-[11px] font-semibold text-white">{lead.initials}</span>
                </div>
                <span className="font-medium text-[13px] text-[#374151] truncate">{lead.name}</span>
                {lead.researched && (
                  <span className="shrink-0 px-1.5 py-0.5 bg-[#F3F4F6] text-[10px] text-[#6B7280] rounded">
                    Researched
                  </span>
                )}
              </div>
              <span className="text-[13px] text-[#6B7280] truncate">{lead.title}</span>
              <span className="text-[13px] text-[#6B7280] truncate">{lead.company}</span>
              <span className="text-[13px] text-[#6B7280] truncate">{lead.location}</span>
              <div>{getSignalBadge(lead.signalStrength)}</div>
            </div>
          ))}

          {/* Empty state when no search or filters */}
          {!hasResults && (
            <div className="py-16 text-center">
              <div className="text-[#9CA3AF] text-[14px] mb-2">
                Search or apply filters to discover leads
              </div>
              <div className="text-[#D1D5DB] text-[13px]">
                Use the search bar above or the filter panel on the left
              </div>
            </div>
          )}

          {/* Selection action bar */}
          {selectedLeads.length > 0 && (
            <div className="sticky bottom-0 flex items-center justify-between px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E4E0]">
              <span className="text-[13px] text-[#374151]">
                {selectedLeads.length} lead{selectedLeads.length !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={handleGenerateBriefs}
                className="h-9 px-4 bg-[#18181B] text-white text-[13px] font-medium rounded-lg hover:bg-[#27272A] transition-colors"
              >
                Add to My List
              </button>
            </div>
          )}

          {/* Preview Panel - slides in from right within the results area */}
          {previewLead && (
            <div className="absolute top-0 right-0 w-[320px] h-full bg-white border-l border-[#E5E4E0] shadow-lg z-10 animate-in slide-in-from-right duration-200 overflow-y-auto">
              <div className="p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        previewLead.initialsColor
                      )}
                    >
                      <span className="text-[13px] font-semibold text-white">
                        {previewLead.initials}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[15px] text-[#374151]">
                        {previewLead.name}
                      </h3>
                      <p className="text-[12px] text-[#6B7280]">
                        {previewLead.title}, {previewLead.company}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewLead(null)}
                    className="p-1 hover:bg-[#F3F4F6] rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-[#6B7280]" />
                  </button>
                </div>

                {/* Signals */}
                <div className="mb-6 flex-1">
                  <h4 className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide mb-3">
                    Top signals detected
                  </h4>
                  <ul className="space-y-2">
                    {previewLead.signals.map((signal, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#6B7280]">
                        <span className="text-indigo-500 mt-0.5">•</span>
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Generate button */}
                <button className="w-full h-10 bg-[#18181B] text-white text-[13px] font-medium rounded-lg hover:bg-[#27272A] transition-colors">
                  Generate full brief — 1 credit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
