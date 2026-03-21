"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/signal/sidebar"
import { 
  Plus, 
  ChevronDown, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  X,
  Check,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Download,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  name: string
  initials: string
  avatarColor: string
  jobTitle: string
  company: string
  companyInitial: string
  companyColor: string
  location: string
  email: string
  emailVerified: boolean
  signalScore: "Strong" | "Medium" | "Low"
  seniority: "C-Suite" | "VP" | "Director" | "Manager"
  companySizeRange: "1-50" | "51-200" | "201-500" | "500+"
  addedAt: string
  // Detail panel data
  phone?: string
  linkedIn?: string
  tenure?: string
  department?: string
  previousCompany?: string
  previousYears?: string
  industry?: string
  companySize?: string
  funding?: string
  techStack?: string[]
}

const initialLeads: Lead[] = [
  {
    id: "1",
    name: "Jordan Hassan",
    initials: "JH",
    avatarColor: "bg-indigo-500",
    jobTitle: "VP of Sales",
    company: "Meridian",
    companyInitial: "M",
    companyColor: "bg-blue-100 text-blue-700",
    location: "San Francisco, CA",
    email: "jordan@meridian.io",
    emailVerified: true,
    signalScore: "Strong",
    seniority: "VP",
    companySizeRange: "51-200",
    addedAt: "2 hours ago",
    phone: "+1 415 555 0172",
    linkedIn: "linkedin.com/in/jordanhassan",
    tenure: "7 months",
    department: "Sales",
    previousCompany: "Salesforce",
    previousYears: "4 years",
    industry: "SaaS",
    companySize: "127 employees",
    funding: "Series B · $18M",
    techStack: ["Salesforce", "Outreach", "Gong", "Slack"],
  },
  {
    id: "2",
    name: "Sarah Chen",
    initials: "SC",
    avatarColor: "bg-emerald-500",
    jobTitle: "Head of Revenue",
    company: "Stripe",
    companyInitial: "S",
    companyColor: "bg-purple-100 text-purple-700",
    location: "New York, NY",
    email: "sarah@stripe.com",
    emailVerified: true,
    signalScore: "Strong",
    seniority: "VP",
    companySizeRange: "500+",
    addedAt: "Yesterday",
    phone: "+1 650 555 0134",
    linkedIn: "linkedin.com/in/sarahchen",
    tenure: "14 months",
    department: "Revenue",
    previousCompany: "Shopify",
    previousYears: "3 years",
    industry: "Fintech",
    companySize: "8,000 employees",
    funding: "Public",
    techStack: ["Salesforce", "HubSpot", "Gong", "Zoom"],
  },
  {
    id: "3",
    name: "Lisa Thompson",
    initials: "LT",
    avatarColor: "bg-rose-500",
    jobTitle: "CRO",
    company: "Retool",
    companyInitial: "R",
    companyColor: "bg-orange-100 text-orange-700",
    location: "San Francisco, CA",
    email: "lisa@retool.com",
    emailVerified: true,
    signalScore: "Strong",
    seniority: "C-Suite",
    companySizeRange: "201-500",
    addedAt: "1 hour ago",
    phone: undefined,
    linkedIn: "linkedin.com/in/lisathompson",
    tenure: "3 weeks",
    department: "Revenue",
    previousCompany: "Figma",
    previousYears: "2 years",
    industry: "SaaS",
    companySize: "340 employees",
    funding: "Series C · $45M",
    techStack: ["Salesforce", "Outreach", "Chorus", "Slack"],
  },
  {
    id: "4",
    name: "Michael Chen",
    initials: "MC",
    avatarColor: "bg-amber-500",
    jobTitle: "VP of Sales",
    company: "Ramp",
    companyInitial: "R",
    companyColor: "bg-green-100 text-green-700",
    location: "New York, NY",
    email: "m.chen@ramp.com",
    emailVerified: true,
    signalScore: "Strong",
    seniority: "VP",
    companySizeRange: "500+",
    addedAt: "2 days ago",
    phone: "+1 212 555 0198",
    linkedIn: "linkedin.com/in/michaelchen",
    tenure: "11 months",
    department: "Sales",
    previousCompany: "Square",
    previousYears: "3 years",
    industry: "Fintech",
    companySize: "800 employees",
    funding: "Series D · $300M",
    techStack: ["HubSpot", "Outreach", "Gong", "Slack"],
  },
  {
    id: "5",
    name: "Marcus Johnson",
    initials: "MJ",
    avatarColor: "bg-cyan-500",
    jobTitle: "Head of Revenue",
    company: "Notion",
    companyInitial: "N",
    companyColor: "bg-slate-100 text-slate-700",
    location: "New York, NY",
    email: "marcus@notion.so",
    emailVerified: true,
    signalScore: "Medium",
    seniority: "VP",
    companySizeRange: "201-500",
    addedAt: "3 days ago",
    phone: "+1 415 555 0156",
    linkedIn: "linkedin.com/in/marcusjohnson",
    tenure: "8 months",
    department: "Revenue",
    previousCompany: "Asana",
    previousYears: "4 years",
    industry: "SaaS",
    companySize: "500 employees",
    funding: "Series C · $275M",
    techStack: ["Salesforce", "Outreach", "Gong", "Notion"],
  },
  {
    id: "6",
    name: "Emily Rodriguez",
    initials: "ER",
    avatarColor: "bg-purple-500",
    jobTitle: "Sales Director",
    company: "Figma",
    companyInitial: "F",
    companyColor: "bg-pink-100 text-pink-700",
    location: "Austin, TX",
    email: "emily@figma.com",
    emailVerified: true,
    signalScore: "Medium",
    seniority: "Director",
    companySizeRange: "500+",
    addedAt: "4 days ago",
    phone: "+1 512 555 0123",
    linkedIn: "linkedin.com/in/emilyrodriguez",
    tenure: "6 months",
    department: "Sales",
    previousCompany: "InVision",
    previousYears: "3 years",
    industry: "Design Tools",
    companySize: "1,200 employees",
    funding: "Acquired",
    techStack: ["Salesforce", "Outreach", "Chorus", "Slack"],
  },
  {
    id: "7",
    name: "James Wilson",
    initials: "JW",
    avatarColor: "bg-blue-500",
    jobTitle: "VP of Sales",
    company: "Amplitude",
    companyInitial: "A",
    companyColor: "bg-indigo-100 text-indigo-700",
    location: "Seattle, WA",
    email: "james@amplitude.com",
    emailVerified: true,
    signalScore: "Medium",
    seniority: "VP",
    companySizeRange: "500+",
    addedAt: "5 days ago",
    phone: "+1 206 555 0187",
    linkedIn: "linkedin.com/in/jameswilson",
    tenure: "1 year",
    department: "Sales",
    previousCompany: "Mixpanel",
    previousYears: "5 years",
    industry: "Analytics",
    companySize: "650 employees",
    funding: "Public",
    techStack: ["Salesforce", "Outreach", "Gong", "Amplitude"],
  },
  {
    id: "8",
    name: "Aisha Patel",
    initials: "AP",
    avatarColor: "bg-pink-500",
    jobTitle: "Head of Sales",
    company: "Brex",
    companyInitial: "B",
    companyColor: "bg-red-100 text-red-700",
    location: "San Francisco, CA",
    email: "aisha@brex.com",
    emailVerified: true,
    signalScore: "Medium",
    seniority: "VP",
    companySizeRange: "500+",
    addedAt: "3 days ago",
    phone: "+1 415 555 0145",
    linkedIn: "linkedin.com/in/aishapatel",
    tenure: "9 months",
    department: "Sales",
    previousCompany: "Stripe",
    previousYears: "2 years",
    industry: "Fintech",
    companySize: "1,100 employees",
    funding: "Series D · $425M",
    techStack: ["Salesforce", "Outreach", "Gong", "Slack"],
  },
  {
    id: "9",
    name: "Tom Liu",
    initials: "TL",
    avatarColor: "bg-orange-500",
    jobTitle: "CRO",
    company: "Notion",
    companyInitial: "N",
    companyColor: "bg-slate-100 text-slate-700",
    location: "San Francisco, CA",
    email: "tom@notion.so",
    emailVerified: false,
    signalScore: "Low",
    seniority: "C-Suite",
    companySizeRange: "201-500",
    addedAt: "1 week ago",
    phone: undefined,
    linkedIn: "linkedin.com/in/tomliu",
    tenure: "2 months",
    department: "Revenue",
    previousCompany: "Dropbox",
    previousYears: "6 years",
    industry: "SaaS",
    companySize: "500 employees",
    funding: "Series C · $275M",
    techStack: ["Salesforce", "HubSpot", "Zoom", "Notion"],
  },
  {
    id: "10",
    name: "Priya Nair",
    initials: "PN",
    avatarColor: "bg-teal-500",
    jobTitle: "VP of Sales",
    company: "Rippling",
    companyInitial: "R",
    companyColor: "bg-teal-100 text-teal-700",
    location: "San Francisco, CA",
    email: "priya@rippling.com",
    emailVerified: true,
    signalScore: "Strong",
    seniority: "VP",
    companySizeRange: "500+",
    addedAt: "30 minutes ago",
    phone: "+1 415 555 0167",
    linkedIn: "linkedin.com/in/priyanair",
    tenure: "4 months",
    department: "Sales",
    previousCompany: "Gusto",
    previousYears: "3 years",
    industry: "HR Tech",
    companySize: "2,000 employees",
    funding: "Series E · $500M",
    techStack: ["Salesforce", "Outreach", "Gong", "Slack"],
  },
  {
    id: "11",
    name: "David Park",
    initials: "DP",
    avatarColor: "bg-slate-500",
    jobTitle: "VP of Biz Dev",
    company: "Linear",
    companyInitial: "L",
    companyColor: "bg-violet-100 text-violet-700",
    location: "Remote",
    email: "david@linear.app",
    emailVerified: true,
    signalScore: "Low",
    seniority: "VP",
    companySizeRange: "51-200",
    addedAt: "1 week ago",
    phone: "+1 650 555 0199",
    linkedIn: "linkedin.com/in/davidpark",
    tenure: "5 months",
    department: "Business Development",
    previousCompany: "Asana",
    previousYears: "4 years",
    industry: "SaaS",
    companySize: "80 employees",
    funding: "Series B · $35M",
    techStack: ["Linear", "Slack", "Notion", "Figma"],
  },
  {
    id: "12",
    name: "Amanda Kim",
    initials: "AK",
    avatarColor: "bg-violet-500",
    jobTitle: "Sales Manager",
    company: "Figma",
    companyInitial: "F",
    companyColor: "bg-pink-100 text-pink-700",
    location: "Seattle, WA",
    email: "amanda@figma.com",
    emailVerified: true,
    signalScore: "Medium",
    seniority: "Manager",
    companySizeRange: "500+",
    addedAt: "20 minutes ago",
    phone: "+1 206 555 0143",
    linkedIn: "linkedin.com/in/amandakim",
    tenure: "1 year",
    department: "Sales",
    previousCompany: "Canva",
    previousYears: "2 years",
    industry: "Design Tools",
    companySize: "1,200 employees",
    funding: "Acquired",
    techStack: ["Salesforce", "Outreach", "Gong", "Figma"],
  },
]

function getSignalBadgeStyles(score: Lead["signalScore"]) {
  switch (score) {
    case "Strong":
      return "bg-[#D1FAE5] text-[#065F46]"
    case "Medium":
      return "bg-[#FEF3C7] text-[#92400E]"
    case "Low":
      return "bg-[#F3F4F6] text-[#6B7280]"
  }
}

export default function ListsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [signalFilter, setSignalFilter] = useState<"All" | "Strong" | "Medium" | "Low">("All")
  const [seniorityFilter, setSeniorityFilter] = useState<"All" | "C-Suite" | "VP" | "Director" | "Manager">("All")
  const [companySizeFilter, setCompanySizeFilter] = useState<"All" | "1-50" | "51-200" | "201-500" | "500+">("All")
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Check if any filters are active
  const hasActiveFilters = signalFilter !== "All" || seniorityFilter !== "All" || companySizeFilter !== "All"

  // Clear all filters
  const clearFilters = () => {
    setSignalFilter("All")
    setSeniorityFilter("All")
    setCompanySizeFilter("All")
  }

  // Filter leads based on search and filters
  const filteredLeads = useMemo(() => {
    let result = leads
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query)
      )
    }
    
    // Signal score filter
    if (signalFilter !== "All") {
      result = result.filter((lead) => lead.signalScore === signalFilter)
    }
    
    // Seniority filter
    if (seniorityFilter !== "All") {
      result = result.filter((lead) => lead.seniority === seniorityFilter)
    }
    
    // Company size filter
    if (companySizeFilter !== "All") {
      result = result.filter((lead) => lead.companySizeRange === companySizeFilter)
    }
    
    return result
  }, [leads, searchQuery, signalFilter, seniorityFilter, companySizeFilter])

  // Handle escape key to close panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showImportModal) {
        setShowImportModal(false)
        setSelectedFile(null)
      } else if (isPanelOpen) {
        setIsPanelOpen(false)
        setSelectedLead(null)
      }
    }
  }, [isPanelOpen, showImportModal])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead)
    setIsPanelOpen(true)
  }

  const handleClosePanel = () => {
    setIsPanelOpen(false)
    setSelectedLead(null)
  }

  const handleCheckboxChange = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads((prev) => [...prev, leadId])
    } else {
      setSelectedLeads((prev) => prev.filter((id) => id !== leadId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map((lead) => lead.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleRemoveSelected = () => {
    setLeads((prev) => prev.filter((lead) => !selectedLeads.includes(lead.id)))
    setSelectedLeads([])
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === "text/csv") {
      setSelectedFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length

  return (
    <div className="min-h-screen bg-white">
      <Sidebar activePage="lists" />

      <div className="ml-[200px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-[52px] px-5 flex items-center justify-between border-b border-[#E5E4E0] shrink-0">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-[#6B7280]">Lists</span>
            <span className="text-[#6B7280]">/</span>
            <span className="text-[#1C1C1C] font-medium">My prospects</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowImportModal(true)}
              className="h-[34px] px-3 border border-[#E5E4E0] rounded-lg text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button 
              onClick={() => router.push("/")}
              className="h-[34px] px-3 bg-[#1C1C1C] text-white rounded-lg text-[13px] font-medium flex items-center gap-1.5 hover:bg-[#333] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add records to list
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-[#E5E4E0] shrink-0">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 px-2.5 border border-[#E5E4E0] rounded-md text-[13px] text-[#374151] flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors relative"
            >
              <Filter className="w-4 h-4 text-[#6B7280]" />
              Show filters
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#4F46E5] rounded-full" />
              )}
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-[200px] pl-8 pr-3 border border-[#E5E4E0] rounded-md text-[13px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Filter row */}
        {showFilters && (
          <div className="px-5 py-2.5 flex items-center gap-2.5 border-b border-[#E5E4E0] bg-white shrink-0">
            <select
              value={signalFilter}
              onChange={(e) => setSignalFilter(e.target.value as typeof signalFilter)}
              className="h-8 px-2.5 border border-[#E5E4E0] rounded-md text-[13px] text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="All">Signal score: All</option>
              <option value="Strong">Strong</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={seniorityFilter}
              onChange={(e) => setSeniorityFilter(e.target.value as typeof seniorityFilter)}
              className="h-8 px-2.5 border border-[#E5E4E0] rounded-md text-[13px] text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="All">Seniority: All</option>
              <option value="C-Suite">C-Suite</option>
              <option value="VP">VP</option>
              <option value="Director">Director</option>
              <option value="Manager">Manager</option>
            </select>
            <select
              value={companySizeFilter}
              onChange={(e) => setCompanySizeFilter(e.target.value as typeof companySizeFilter)}
              className="h-8 px-2.5 border border-[#E5E4E0] rounded-md text-[13px] text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="All">Company size: All</option>
              <option value="1-50">1-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="500+">500+</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[13px] text-[#4F46E5] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Record count */}
        <div className="px-5 py-2 border-b border-[#F3F4F6] shrink-0">
          <span className="text-[12px] text-[#6B7280]">{filteredLeads.length} records</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E4E0]">
                <th className="w-10 h-9 px-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D1D5DB] text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="w-[220px] h-9 px-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Name
                </th>
                <th className="w-[180px] h-9 px-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Job Title
                </th>
                <th className="w-[160px] h-9 px-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Company
                </th>
                <th className="w-[150px] h-9 px-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Location
                </th>
                <th className="w-[220px] h-9 px-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Email
                </th>
                <th className="w-[130px] h-9 px-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Signal Score
                </th>
                <th className="w-[110px] h-9 px-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Added
                </th>
                <th className="h-9 px-3 text-right">
                  <button className="text-[12px] text-[#6B7280] hover:text-[#374151]">
                    + Add column
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => handleRowClick(lead)}
                  className="h-12 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer"
                >
                  <td className="px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => handleCheckboxChange(lead.id, e.target.checked)}
                      className="w-4 h-4 rounded border-[#D1D5DB] text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[11px] font-medium", lead.avatarColor)}>
                        {lead.initials}
                      </div>
                      <span className="text-[13px] font-medium text-[#1C1C1C]">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-3 text-[13px] text-[#374151]">{lead.jobTitle}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0", lead.companyColor)}>
                        {lead.companyInitial}
                      </div>
                      <span className="text-[13px] text-[#374151]">{lead.company}</span>
                    </div>
                  </td>
                  <td className="px-3 text-[13px] text-[#6B7280]">{lead.location}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] text-[#4F46E5]">{lead.email}</span>
                      {lead.emailVerified && (
                        <Check className="w-2.5 h-2.5 text-[#059669]" />
                      )}
                    </div>
                  </td>
                  <td className="px-3">
                    <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium", getSignalBadgeStyles(lead.signalScore))}>
                      {lead.signalScore}
                    </span>
                  </td>
                  <td className="px-3 text-[12px] text-[#9CA3AF]">{lead.addedAt}</td>
                  <td className="px-3" />
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add row button */}
          <button className="w-full px-5 py-2.5 text-left text-[13px] text-[#9CA3AF] border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
            + Add a row
          </button>
        </div>

        {/* Pagination */}
        <div className="px-5 py-2.5 flex items-center justify-between border-t border-[#E5E4E0] shrink-0">
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F4F6] text-[#6B7280] disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 flex items-center justify-center rounded border border-[#E5E4E0] text-[13px] font-medium text-[#374151]">
              1
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F4F6] text-[#6B7280] disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[12px] text-[#6B7280]">1 - {filteredLeads.length} of {filteredLeads.length}</span>
        </div>

        {/* Bulk action bar */}
        {selectedLeads.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-[#E5E4E0] rounded-xl px-5 py-2.5 shadow-lg flex items-center gap-4">
            <span className="text-[13px] font-medium text-[#374151]">{selectedLeads.length} selected</span>
            <button 
              onClick={handleRemoveSelected}
              className="h-8 px-3 border border-red-200 rounded-md text-[13px] text-red-600 hover:bg-red-50 transition-colors"
            >
              Remove from list
            </button>
            <button className="h-8 px-3 border border-[#E5E4E0] rounded-md text-[13px] text-[#374151] flex items-center gap-1.5 hover:bg-[#F9FAFB] transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button 
              onClick={() => setSelectedLeads([])}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F4F6] text-[#6B7280]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Overlay */}
      {isPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/[0.12] z-40"
          onClick={handleClosePanel}
        />
      )}

      {/* Detail panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[420px] bg-white border-l border-[#E5E4E0] z-50 transform transition-transform duration-200 ease-out overflow-y-auto",
        isPanelOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedLead && (
          <>
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-[#E5E4E0]">
              <button 
                onClick={handleClosePanel}
                className="absolute top-5 right-5 text-[#9CA3AF] hover:text-[#374151] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-medium", selectedLead.avatarColor)}>
                {selectedLead.initials}
              </div>
              <div className="flex items-center justify-between mt-2">
                <h2 className="text-[17px] font-semibold text-[#1C1C1C]">{selectedLead.name}</h2>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[12px] font-medium", getSignalBadgeStyles(selectedLead.signalScore))}>
                  {selectedLead.signalScore}
                </span>
              </div>
              <p className="text-[13px] text-[#6B7280] mt-0.5">{selectedLead.jobTitle} · {selectedLead.company}</p>
            </div>

            {/* Contact section */}
            <div className="px-5 py-3.5 border-b border-[#E5E4E0]">
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Contact</span>
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span className="text-[13px] text-[#374151]">{selectedLead.email}</span>
                  {selectedLead.emailVerified && (
                    <span className="px-1.5 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[10px] rounded-full">Verified</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span className="text-[13px] text-[#374151]">{selectedLead.phone || "Not available"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Linkedin className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <a href="#" className="text-[13px] text-[#4F46E5] hover:underline">View LinkedIn profile</a>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span className="text-[13px] text-[#374151]">{selectedLead.location}</span>
                </div>
              </div>
            </div>

            {/* Professional section */}
            <div className="px-5 py-3.5 border-b border-[#E5E4E0]">
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Professional</span>
              <div className="mt-2.5 space-y-2">
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Current role</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.jobTitle} · {selectedLead.tenure}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Seniority</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.seniority}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Department</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.department}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Previous</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.previousCompany} · {selectedLead.previousYears}</span>
                </div>
              </div>
            </div>

            {/* Company section */}
            <div className="px-5 py-3.5 border-b border-[#E5E4E0]">
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Company</span>
              <div className="mt-2.5 space-y-2">
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Name</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.company}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Industry</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.industry}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Size</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.companySize}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Funding</span>
                  <span className="text-[13px] text-[#374151]">{selectedLead.funding}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-[12px] text-[#9CA3AF] w-[110px] shrink-0">Tech stack</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedLead.techStack?.map((tech) => (
                      <span key={tech} className="px-2 py-0.5 bg-[#F3F4F6] text-[#374151] text-[11px] rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Brief section */}
            <div className="px-5 py-4">
              <div className="bg-[#F0F4FF] border border-[#E0E7FF] rounded-xl p-4">
                <h3 className="text-[14px] font-semibold text-[#1C1C1C]">Ready to go deeper?</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed mt-1 mb-3.5">
                  Generate a full intelligence brief with AI synthesis, timing signals, DISC analysis, and a personalised outreach draft.
                </p>
                <a
                  href={`/brief/${selectedLead.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="w-full h-10 bg-[#1C1C1C] text-white rounded-lg text-[14px] font-medium flex items-center justify-center hover:bg-[#333] transition-colors"
                >
                  Generate Brief
                </a>
                <p className="text-[11px] text-[#9CA3AF] text-center mt-1.5">Uses 1 credit · ~90 seconds</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/[0.12] z-50"
            onClick={() => {
              setShowImportModal(false)
              setSelectedFile(null)
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] bg-white rounded-xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <button 
              onClick={() => {
                setShowImportModal(false)
                setSelectedFile(null)
              }}
              className="absolute top-5 right-5 text-[#9CA3AF] hover:text-[#374151] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-[16px] font-semibold text-[#1C1C1C]">Import leads from CSV</h2>
            <p className="text-[13px] text-[#6B7280] mt-1 mb-5">
              Upload a CSV file with your leads. We'll add them to this list.
            </p>
            
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-[10px] p-8 cursor-pointer transition-colors",
                isDragOver ? "border-[#4F46E5] bg-[#FAFAFE]" : "border-[#E5E4E0] hover:border-[#4F46E5] hover:bg-[#FAFAFE]"
              )}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-7 h-7 text-[#9CA3AF] mb-2" />
              {selectedFile ? (
                <span className="text-[14px] font-medium text-[#1C1C1C]">{selectedFile.name}</span>
              ) : (
                <>
                  <span className="text-[14px] font-medium text-[#1C1C1C]">Drop your CSV here</span>
                  <span className="text-[13px] text-[#4F46E5] mt-1">or browse files</span>
                </>
              )}
            </label>
            
            <div className="text-center mt-2.5">
              <a href="#" className="text-[12px] text-[#4F46E5] hover:underline">
                Download sample CSV template
              </a>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setSelectedFile(null)
                }}
                className="h-9 px-4 border border-[#E5E4E0] rounded-lg text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedFile}
                className="h-9 px-4 bg-[#1C1C1C] text-white rounded-lg text-[13px] font-medium hover:bg-[#333] disabled:bg-[#E5E4E0] disabled:text-[#9CA3AF] disabled:cursor-not-allowed transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
