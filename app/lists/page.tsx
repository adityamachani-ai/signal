"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/signal/sidebar"
import { 
  Plus, 
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
  Upload,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  List,
  ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ListItem {
  id: string
  name: string
  color: string | null
  description: string | null
  lead_count: number
  created_at: string
  updated_at: string | null
}

interface Lead {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  job_title: string | null
  seniority: string | null
  department: string | null
  email: string | null
  email_verified: boolean
  phone_direct: string | null
  phone_mobile: string | null
  linkedin_url: string | null
  company_linkedin_url: string | null
  company_name: string | null
  company_domain: string | null
  company_size_range: string | null
  company_industry: string | null
  company_funding_stage: string | null
  company_total_funding_usd: number | null
  company_headcount: number | null
  company_location: string | null
  city: string | null
  country: string | null
  enriched_at: string | null
  created_at: string | null
  brief_status: 'generating' | 'generated' | null
  brief_generated_at: string | null
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  "bg-signal-accent-tint text-signal-accent-2",
]

function getAvatarColor(_name: string): string {
  return AVATAR_COLORS[0]
}

const COMPANY_COLORS = [
  "bg-signal-raised text-signal-text-2",
]

function getCompanyColor(_name: string): string {
  return COMPANY_COLORS[0]
}

const GOOGLE_FAVICON_URL = 'https://www.google.com/s2/favicons?sz=128&domain='

function CompanyLogo({ domain, company }: { domain: string | null; company: string }) {
  const [failed, setFailed] = useState(false)
  const initial = company.charAt(0).toUpperCase()
  if (!domain || failed) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-signal-raised text-[10px] font-semibold text-signal-text-3 shrink-0 select-none">
        {initial}
      </span>
    )
  }
  return (
    <img
      src={`${GOOGLE_FAVICON_URL}${domain}`}
      alt=""
      className="w-5 h-5 rounded object-contain shrink-0 bg-signal-raised"
      onError={() => setFailed(true)}
    />
  )
}

type DisplaySeniority = "C-Suite" | "VP" | "Director" | "Manager" | "\u2014"

const SENIORITY_MAP: Record<string, DisplaySeniority> = {
  c_level: "C-Suite", owner: "C-Suite", founder: "C-Suite",
  vp: "VP", director: "Director", manager: "Manager",
}

function formatSeniority(s: string | null): DisplaySeniority {
  if (!s) return "\u2014"
  return SENIORITY_MAP[s.toLowerCase()] ?? "\u2014"
}

function formatLocation(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(", ") || "\u2014"
}

function formatFunding(stage: string | null, amount: number | null): string {
  if (!stage) return "\u2014"
  const label = stage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  if (amount) return `${label} \u00b7 $${(amount / 1_000_000).toFixed(0)}M`
  return label
}

function formatCompanySize(range: string | null, headcount: number | null): string {
  if (headcount) return `${headcount.toLocaleString()} employees`
  if (range) return `${range} employees`
  return "\u2014"
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return "1 week ago"
  return `${weeks} weeks ago`
}

export default function ListsPage() {
  const router = useRouter()

  // ─── Lists state ──────────────────────────────────────────────────────────
  const [lists, setLists] = useState<ListItem[]>([])
  const [listsLoading, setListsLoading] = useState(true)
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [creatingList, setCreatingList] = useState(false)
  const [renamingListId, setRenamingListId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [listMenuOpenId, setListMenuOpenId] = useState<string | null>(null)
  const listMenuRef = useRef<HTMLDivElement>(null)

  // ─── Leads state ──────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [deletingLeads, setDeletingLeads] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  
  const [showFilters, setShowFilters] = useState(false)
  const [seniorityFilter, setSeniorityFilter] = useState<"All" | "C-Suite" | "VP" | "Director" | "Manager">("All")
  const [companySizeFilter, setCompanySizeFilter] = useState<"All" | "1-50" | "51-200" | "201-500" | "500+">("All")
  
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [addLeadForm, setAddLeadForm] = useState({
    full_name: '', linkedin_url: '', company_name: '', job_title: '',
    company_linkedin_url: '', email: '', city: '', country: '', company_domain: '',
  })
  const [addingLead, setAddingLead] = useState(false)
  const [addLeadError, setAddLeadError] = useState('')
  const [showAddLeadsMenu, setShowAddLeadsMenu] = useState(false)
  const addLeadsMenuRef = useRef<HTMLDivElement>(null)

  // ─── Fetch lists ──────────────────────────────────────────────────────────
  const fetchLists = useCallback(async () => {
    setListsLoading(true)
    try {
      const res = await fetch("/api/lists")
      const data = await res.json()
      const fetched: ListItem[] = data.lists ?? []
      setLists(fetched)
      // Auto-select first list if none selected
      if (!activeListId && fetched.length > 0) {
        setActiveListId(fetched[0].id)
      }
    } catch {}
    setListsLoading(false)
  }, [activeListId])

  useEffect(() => { fetchLists() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch leads for active list ──────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!activeListId) {
      setLeads([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/research/leads?listId=${activeListId}`)
      const data = await res.json()
      setLeads(data.leads ?? [])
    } catch {}
    setLoading(false)
  }, [activeListId])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // ─── Create list ──────────────────────────────────────────────────────────
  const handleCreateList = async () => {
    const name = newListName.trim()
    if (!name || creatingList) return
    setCreatingList(true)
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const { list } = await res.json()
      setLists(prev => [...prev, list])
      setActiveListId(list.id)
      setNewListName("")
      setShowNewListInput(false)
    } catch {}
    setCreatingList(false)
  }

  // ─── Rename list ──────────────────────────────────────────────────────────
  const handleRenameList = async (listId: string) => {
    const name = renameValue.trim()
    if (!name) return
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      setLists(prev => prev.map(l => l.id === listId ? { ...l, name } : l))
    } catch {}
    setRenamingListId(null)
    setRenameValue("")
  }

  // ─── Delete list ──────────────────────────────────────────────────────────
  const handleDeleteList = async (listId: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setLists(prev => prev.filter(l => l.id !== listId))
      if (activeListId === listId) {
        const remaining = lists.filter(l => l.id !== listId)
        setActiveListId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch {}
    setListMenuOpenId(null)
  }

  // Close list menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target as Node)) {
        setListMenuOpenId(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Close add-leads dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addLeadsMenuRef.current && !addLeadsMenuRef.current.contains(e.target as Node)) {
        setShowAddLeadsMenu(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const hasActiveFilters = seniorityFilter !== "All" || companySizeFilter !== "All"

  const clearFilters = () => {
    setSeniorityFilter("All")
    setCompanySizeFilter("All")
  }

  const filteredLeads = useMemo(() => {
    let result = leads
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (lead) =>
          lead.full_name.toLowerCase().includes(query) ||
          (lead.company_name ?? "").toLowerCase().includes(query) ||
          (lead.job_title ?? "").toLowerCase().includes(query)
      )
    }
    
    if (seniorityFilter !== "All") {
      result = result.filter((lead) => formatSeniority(lead.seniority) === seniorityFilter)
    }
    
    if (companySizeFilter !== "All") {
      result = result.filter((lead) => lead.company_size_range === companySizeFilter)
    }
    
    return result
  }, [leads, searchQuery, seniorityFilter, companySizeFilter])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showAddLeadsMenu) {
        setShowAddLeadsMenu(false)
      } else if (showAddLeadModal) {
        setShowAddLeadModal(false)
        setAddLeadError('')
      } else if (showImportModal) {
        setShowImportModal(false)
        setSelectedFile(null)
      } else if (isPanelOpen) {
        setIsPanelOpen(false)
        setSelectedLead(null)
      }
    }
  }, [isPanelOpen, showImportModal, showAddLeadModal, showAddLeadsMenu])

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

  const handleRemoveSelected = async () => {
    if (removing || selectedLeads.length === 0 || !activeListId) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/lists/${activeListId}/leads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: selectedLeads }),
      })
      if (!res.ok) throw new Error("Failed to remove")
      setLeads(prev => prev.filter(lead => !selectedLeads.includes(lead.id)))
      // Update lead count in sidebar
      setLists(prev => prev.map(l =>
        l.id === activeListId ? { ...l, lead_count: Math.max(0, l.lead_count - selectedLeads.length) } : l
      ))
      setSelectedLeads([])
      if (isPanelOpen && selectedLead && selectedLeads.includes(selectedLead.id)) {
        setIsPanelOpen(false)
        setSelectedLead(null)
      }
    } catch (err) {
      console.error("Remove failed:", err)
    } finally {
      setRemoving(false)
    }
  }

  const handleDeleteLeads = async () => {
    if (deletingLeads || selectedLeads.length === 0) return
    setDeletingLeads(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeads }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      const deletedIds = new Set(selectedLeads)
      setLeads(prev => prev.filter(lead => !deletedIds.has(lead.id)))
      setLists(prev => prev.map(l =>
        l.id === activeListId ? { ...l, lead_count: Math.max(0, l.lead_count - deletedIds.size) } : l
      ))
      if (isPanelOpen && selectedLead && deletedIds.has(selectedLead.id)) {
        setIsPanelOpen(false)
        setSelectedLead(null)
      }
      setSelectedLeads([])
      setConfirmDelete(false)
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeletingLeads(false)
    }
  }

  const handleExportCSV = () => {
    const rows = filteredLeads.map(lead => ({
      Name: lead.full_name,
      "Job Title": lead.job_title ?? "",
      Company: lead.company_name ?? "",
      Email: lead.email ?? "",
      "Phone (Direct)": lead.phone_direct ?? "",
      "Phone (Mobile)": lead.phone_mobile ?? "",
      LinkedIn: lead.linkedin_url ?? "",
      Location: formatLocation(lead.city, lead.country),
      Seniority: formatSeniority(lead.seniority),
      "Company Size": lead.company_size_range ?? "",
      Industry: lead.company_industry ?? "",
    }))
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(","),
      ...rows.map(row => headers.map(h => {
        const val = String((row as Record<string, string>)[h]).replace(/"/g, '""')
        return '"' + val + '"'
      }).join(","))
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "signal-leads.csv"
    a.click()
    URL.revokeObjectURL(url)
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

  const handleAddLead = async () => {
    if (addingLead || !activeListId) return
    setAddLeadError('')
    setAddingLead(true)
    try {
      const res = await fetch('/api/leads/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addLeadForm, list_id: activeListId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddLeadError(data.error ?? 'Failed to add lead')
        return
      }
      const newLead: Lead = data.lead
      setLeads(prev => {
        if (prev.some(l => l.id === newLead.id)) return prev
        return [newLead, ...prev]
      })
      setLists(prev => prev.map(l =>
        l.id === activeListId && !data.existed
          ? { ...l, lead_count: l.lead_count + 1 }
          : l
      ))
      setShowAddLeadModal(false)
      setAddLeadForm({ full_name: '', linkedin_url: '', company_name: '', job_title: '', company_linkedin_url: '', email: '', city: '', country: '', company_domain: '' })
      setSelectedLead(newLead)
      setIsPanelOpen(true)
    } catch {
      setAddLeadError('Something went wrong. Please try again.')
    } finally {
      setAddingLead(false)
    }
  }

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length

  const activeList = lists.find(l => l.id === activeListId)

  return (
    <div className="min-h-screen bg-signal-bg">
      <Sidebar activePage="lists" />

      <div className="ml-[200px] flex min-h-screen">
        {/* ─── List sidebar ──────────────────────────────────────────────── */}
        <div className="w-[220px] border-r border-signal-border flex flex-col shrink-0 bg-signal-surface">
          <div className="h-[52px] px-4 flex items-center justify-between border-b border-signal-border shrink-0">
            <span className="text-[13px] font-semibold text-signal-text-1">Lists</span>
            <button
              onClick={() => setShowNewListInput(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-signal-raised transition-colors"
              title="New list"
            >
              <Plus className="w-4 h-4 text-signal-text-3" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5">
            {listsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 text-signal-text-4 animate-spin" />
              </div>
            ) : lists.length === 0 && !showNewListInput ? (
              <div className="px-4 py-8 text-center">
                <List className="w-8 h-8 text-signal-text-4 mx-auto mb-2" />
                <p className="text-[13px] text-signal-text-3">No lists yet</p>
                <button
                  onClick={() => setShowNewListInput(true)}
                  className="mt-2 text-[13px] text-signal-accent hover:underline"
                >
                  Create your first list
                </button>
              </div>
            ) : (
              lists.map(list => (
                <div
                  key={list.id}
                  className="relative group"
                  ref={listMenuOpenId === list.id ? listMenuRef : undefined}
                >
                  {renamingListId === list.id ? (
                    <div className="px-3 py-1.5">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleRenameList(list.id)
                          if (e.key === "Escape") { setRenamingListId(null); setRenameValue("") }
                        }}
                        onBlur={() => handleRenameList(list.id)}
                        className="w-full h-8 px-2 border border-signal-accent rounded-md text-[13px] focus:outline-none focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                      />
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActiveListId(list.id)
                        setSelectedLeads([])
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 flex items-center justify-between transition-colors cursor-pointer",
                        activeListId === list.id
                          ? "bg-signal-bg border-r-2 border-signal-accent"
                          : "hover:bg-signal-raised"
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn(
                          "text-[13px] truncate",
                          activeListId === list.id ? "font-medium text-signal-text-1" : "text-signal-text-2"
                        )}>
                          {list.name}
                        </p>
                        <p className="text-[11px] text-signal-text-4">
                          {list.lead_count} {list.lead_count === 1 ? 'lead' : 'leads'}
                        </p>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setListMenuOpenId(listMenuOpenId === list.id ? null : list.id)
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-signal-raised transition-all shrink-0"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5 text-signal-text-3" />
                      </button>
                    </div>
                  )}

                  {/* Context menu */}
                  {listMenuOpenId === list.id && (
                    <div className="absolute right-2 top-full z-30 w-[140px] bg-signal-bg border border-signal-border rounded-lg shadow-lg py-1">
                      <button
                        onClick={() => {
                          setRenamingListId(list.id)
                          setRenameValue(list.name)
                          setListMenuOpenId(null)
                        }}
                        className="w-full px-3 py-1.5 text-left text-[13px] text-signal-text-2 hover:bg-signal-surface flex items-center gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {showNewListInput && (
              <div className="px-3 py-1.5">
                <input
                  autoFocus
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="List name..."
                  onKeyDown={e => {
                    if (e.key === "Enter") handleCreateList()
                    if (e.key === "Escape") { setShowNewListInput(false); setNewListName("") }
                  }}
                  onBlur={() => {
                    if (newListName.trim()) handleCreateList()
                    else { setShowNewListInput(false); setNewListName("") }
                  }}
                  className="w-full h-8 px-2 border border-signal-accent rounded-md text-[13px] focus:outline-none focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                  disabled={creatingList}
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── Main content ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-[52px] px-5 flex items-center justify-between border-b border-signal-border shrink-0">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-signal-text-3">Lists</span>
            <span className="text-signal-text-3">/</span>
            <span className="text-signal-text-1 font-medium">{activeList?.name ?? "Select a list"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowImportModal(true)}
              className="h-[34px] px-3 border border-signal-border rounded-lg text-[13px] font-medium text-signal-text-2 hover:bg-signal-surface transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <div className="relative" ref={addLeadsMenuRef}>
              <button
                onClick={() => setShowAddLeadsMenu(v => !v)}
                disabled={!activeListId}
                className="h-[34px] px-3 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-lg text-[13px] font-medium flex items-center gap-1.5 hover:bg-[#333] dark:hover:bg-[#E4E4E7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add leads
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showAddLeadsMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-[200px] bg-signal-bg border border-signal-border rounded-lg shadow-lg py-1">
                  <button
                    onClick={() => { setShowAddLeadModal(true); setAddLeadError(''); setShowAddLeadsMenu(false) }}
                    className="w-full px-3 py-2 text-left text-[13px] text-signal-text-1 hover:bg-signal-surface flex items-center gap-2.5"
                  >
                    <Pencil className="w-3.5 h-3.5 text-signal-text-3" />
                    Add manually
                  </button>
                  <button
                    onClick={() => { router.push("/"); setShowAddLeadsMenu(false) }}
                    className="w-full px-3 py-2 text-left text-[13px] text-signal-text-1 hover:bg-signal-surface flex items-center gap-2.5"
                  >
                    <Search className="w-3.5 h-3.5 text-signal-text-3" />
                    Find with research
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="px-5 py-3 flex items-center justify-between border-b border-signal-border shrink-0">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 px-2.5 border border-signal-border rounded-md text-[13px] text-signal-text-2 flex items-center gap-2 hover:bg-signal-surface transition-colors relative"
            >
              <Filter className="w-4 h-4 text-signal-text-3" />
              Show filters
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-signal-accent rounded-full" />
              )}
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-signal-text-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-[200px] pl-8 pr-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
              />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="px-5 py-2.5 flex items-center gap-2.5 border-b border-signal-border bg-signal-bg shrink-0">
            <select
              value={seniorityFilter}
              onChange={(e) => setSeniorityFilter(e.target.value as typeof seniorityFilter)}
              className="h-8 px-2.5 border border-signal-border rounded-md text-[13px] text-signal-text-2 bg-signal-bg focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
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
              className="h-8 px-2.5 border border-signal-border rounded-md text-[13px] text-signal-text-2 bg-signal-bg focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
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
                className="text-[13px] text-signal-accent hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        <div className="px-5 py-2 border-b border-signal-border-faint shrink-0">
          <span className="text-[12px] text-signal-text-3">
            {loading ? "Loading..." : `${filteredLeads.length} records`}
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-signal-text-4 animate-spin" />
              <span className="ml-2 text-[13px] text-signal-text-4">Loading leads...</span>
            </div>
          ) : !activeListId ? (
            <div className="flex flex-col items-center justify-center py-20">
              <List className="w-10 h-10 text-signal-text-4 mb-3" />
              <span className="text-[14px] text-signal-text-3">Select a list to view leads</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-[14px] text-signal-text-3">
                {leads.length === 0
                  ? "No leads in your list yet"
                  : "No leads match your filters"}
              </span>
              {leads.length === 0 && (
                <button
                  onClick={() => router.push("/")}
                  className="mt-3 h-9 px-4 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-lg text-[13px] font-medium hover:bg-[#333] dark:hover:bg-[#E4E4E7] transition-colors"
                >
                  Find leads
                </button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-signal-surface border-b border-signal-border">
                  <th className="w-10 h-9 px-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-signal-text-4 text-signal-accent focus:ring-[#4F46E5]"
                    />
                  </th>
                  <th className="w-[220px] h-9 px-3 text-left text-[11px] font-semibold text-signal-text-3 uppercase tracking-wide">Name</th>
                  <th className="w-[180px] h-9 px-3 text-left text-[11px] font-semibold text-signal-text-3 uppercase tracking-wide">Job Title</th>
                  <th className="w-[160px] h-9 px-3 text-left text-[11px] font-semibold text-signal-text-3 uppercase tracking-wide">Company</th>
                  <th className="w-[150px] h-9 px-3 text-left text-[11px] font-semibold text-signal-text-3 uppercase tracking-wide">Location</th>
                  <th className="w-[220px] h-9 px-3 text-left text-[11px] font-semibold text-signal-text-3 uppercase tracking-wide">Email</th>
                  <th className="w-[110px] h-9 px-3 text-left text-[11px] font-semibold text-signal-text-3 uppercase tracking-wide">Added</th>
                  <th className="w-[90px] h-9 px-3 text-left text-[11px] font-semibold text-signal-text-3 uppercase tracking-wide">Brief</th>
                  <th className="h-9 px-3" />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleRowClick(lead)}
                      className="h-12 border-b border-signal-border-faint hover:bg-signal-surface cursor-pointer"
                    >
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => handleCheckboxChange(lead.id, e.target.checked)}
                          className="w-4 h-4 rounded border-signal-text-4 text-signal-accent focus:ring-[#4F46E5]"
                        />
                      </td>
                      <td className="px-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-medium", getAvatarColor(lead.full_name))}>
                            {getInitials(lead.full_name)}
                          </div>
                          <span className="text-[13px] font-medium text-signal-text-1">{lead.full_name}</span>
                        </div>
                      </td>
                      <td className="px-3 text-[13px] text-signal-text-2">{lead.job_title ?? "\u2014"}</td>
                      <td className="px-3">
                        {lead.company_name ? (
                          <div className="flex items-center gap-1.5">
                            <CompanyLogo domain={lead.company_domain} company={lead.company_name} />
                            <span className="text-[13px] text-signal-text-2">{lead.company_name}</span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-signal-text-4">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-3 text-[13px] text-signal-text-3">{formatLocation(lead.city, lead.country)}</td>
                      <td className="px-3">
                        {lead.email ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] text-signal-accent">{lead.email}</span>
                            {lead.email_verified && (
                              <Check className="w-2.5 h-2.5 text-[#059669]" />
                            )}
                          </div>
                        ) : (
                          <span className="text-[13px] text-signal-text-4">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-3 text-[12px] text-signal-text-4">{timeAgo(lead.created_at)}</td>
                      <td className="px-3">
                        {lead.brief_status === 'generating' ? (
                          <span className="flex items-center gap-1 text-[12px] text-signal-text-4">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating
                          </span>
                        ) : lead.brief_status === 'generated' ? (
                          <span className="flex items-center gap-1 text-[12px] text-[#059669]">
                            <Check className="w-3 h-3" />
                            {lead.brief_generated_at ? timeAgo(lead.brief_generated_at) : 'Ready'}
                          </span>
                        ) : (
                          <span className="text-[12px] text-signal-text-4">—</span>
                        )}
                      </td>
                      <td className="px-3" />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {!loading && filteredLeads.length > 0 && (
            <button
              onClick={() => router.push("/")}
              className="w-full px-5 py-2.5 text-left text-[13px] text-signal-text-4 border-b border-signal-border-faint hover:bg-signal-surface transition-colors"
            >
              + Add a row
            </button>
          )}
        </div>

        <div className="px-5 py-2.5 flex items-center justify-between border-t border-signal-border shrink-0">
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-signal-raised text-signal-text-3 disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 flex items-center justify-center rounded border border-signal-border text-[13px] font-medium text-signal-text-2">
              1
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-signal-raised text-signal-text-3 disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[12px] text-signal-text-3">1 - {filteredLeads.length} of {filteredLeads.length}</span>
        </div>

        {selectedLeads.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-signal-bg border border-signal-border rounded-xl px-5 py-2.5 shadow-lg flex items-center gap-4">
            <span className="text-[13px] font-medium text-signal-text-2">{selectedLeads.length} selected</span>
            <button 
              onClick={handleRemoveSelected}
              disabled={removing}
              className="h-8 px-3 border border-red-200 rounded-md text-[13px] text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {removing ? "Removing..." : "Remove from list"}
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-signal-text-3">Delete permanently?</span>
                <button
                  onClick={handleDeleteLeads}
                  disabled={deletingLeads}
                  className="h-8 px-3 bg-red-600 rounded-md text-[13px] text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingLeads ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="h-8 px-3 border border-signal-border rounded-md text-[13px] text-signal-text-2 hover:bg-signal-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="h-8 px-3 border border-red-200 rounded-md text-[13px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="h-8 px-3 border border-signal-border rounded-md text-[13px] text-signal-text-2 flex items-center gap-1.5 hover:bg-signal-surface transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button 
              onClick={() => { setSelectedLeads([]); setConfirmDelete(false) }}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-signal-raised text-signal-text-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        </div>{/* close main content */}

      {isPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/[0.12] z-40"
          onClick={handleClosePanel}
        />
      )}

      <div className={cn(
        "fixed top-0 right-0 h-full w-[420px] bg-signal-bg border-l border-signal-border z-50 transform transition-transform duration-200 ease-out overflow-y-auto",
        isPanelOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedLead && (
          <>
            <div className="px-5 py-4 border-b border-signal-border">
              <button 
                onClick={handleClosePanel}
                className="absolute top-5 right-5 text-signal-text-4 hover:text-signal-text-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-medium", getAvatarColor(selectedLead.full_name))}>
                {getInitials(selectedLead.full_name)}
              </div>
              <div className="flex items-center justify-between mt-2">
                <h2 className="text-[17px] font-semibold text-signal-text-1">{selectedLead.full_name}</h2>
              </div>
              <p className="text-[13px] text-signal-text-3 mt-0.5">
                {[selectedLead.job_title, selectedLead.company_name].filter(Boolean).join(" \u00b7 ") || "\u2014"}
              </p>
            </div>

            <div className="px-5 py-3.5 border-b border-signal-border">
              <span className="text-[10px] font-semibold text-signal-text-4 uppercase tracking-wider">Contact</span>
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-signal-text-4" />
                  <span className="text-[13px] text-signal-text-2">{selectedLead.email || "Not available"}</span>
                  {selectedLead.email && selectedLead.email_verified && (
                    <span className="px-1.5 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[10px] rounded-full">Verified</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-signal-text-4" />
                  <span className="text-[13px] text-signal-text-2">{selectedLead.phone_direct || selectedLead.phone_mobile || "Not available"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Linkedin className="w-3.5 h-3.5 text-signal-text-4" />
                  {selectedLead.linkedin_url ? (
                    <a href={selectedLead.linkedin_url.startsWith("http") ? selectedLead.linkedin_url : "https://" + selectedLead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-signal-accent hover:underline">View LinkedIn profile</a>
                  ) : (
                    <span className="text-[13px] text-signal-text-2">Not available</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-signal-text-4" />
                  <span className="text-[13px] text-signal-text-2">{formatLocation(selectedLead.city, selectedLead.country)}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-b border-signal-border">
              <span className="text-[10px] font-semibold text-signal-text-4 uppercase tracking-wider">Professional</span>
              <div className="mt-2.5 space-y-2">
                <div className="flex">
                  <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Current role</span>
                  <span className="text-[13px] text-signal-text-2">{selectedLead.job_title || "\u2014"}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Seniority</span>
                  <span className="text-[13px] text-signal-text-2">{formatSeniority(selectedLead.seniority)}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Department</span>
                  <span className="text-[13px] text-signal-text-2">{selectedLead.department || "\u2014"}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-b border-signal-border">
              <span className="text-[10px] font-semibold text-signal-text-4 uppercase tracking-wider">Company</span>
              <div className="mt-2.5 space-y-2">
                <div className="flex">
                  <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Name</span>
                  <span className="text-[13px] text-signal-text-2">{selectedLead.company_name || "\u2014"}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Industry</span>
                  <span className="text-[13px] text-signal-text-2">{selectedLead.company_industry || "\u2014"}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Size</span>
                  <span className="text-[13px] text-signal-text-2">{formatCompanySize(selectedLead.company_size_range, selectedLead.company_headcount)}</span>
                </div>
                <div className="flex">
                  <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Funding</span>
                  <span className="text-[13px] text-signal-text-2">{formatFunding(selectedLead.company_funding_stage, selectedLead.company_total_funding_usd)}</span>
                </div>
                {selectedLead.company_domain && (
                  <div className="flex">
                    <span className="text-[12px] text-signal-text-4 w-[110px] shrink-0">Domain</span>
                    <span className="text-[13px] text-signal-text-2">{selectedLead.company_domain}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="bg-signal-accent-tint border border-signal-accent-border rounded-xl p-4">
                {selectedLead.brief_status === 'generating' ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 className="w-4 h-4 text-signal-accent animate-spin" />
                      <h3 className="text-[14px] font-semibold text-signal-text-1">Brief generating…</h3>
                    </div>
                    <p className="text-[13px] text-signal-text-3 mb-3.5">Generation is in progress. The brief will be ready shortly.</p>
                    <a
                      href={`/brief/${selectedLead.id}`}
                      className="w-full h-10 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-lg text-[14px] font-medium flex items-center justify-center hover:bg-[#333] dark:hover:bg-[#E4E4E7] transition-colors"
                    >
                      Watch progress
                    </a>
                  </>
                ) : selectedLead.brief_status === 'generated' ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-[14px] font-semibold text-signal-text-1">Brief ready</h3>
                      {selectedLead.brief_generated_at && (
                        <span className="text-[11px] text-signal-text-4">{timeAgo(selectedLead.brief_generated_at)}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-signal-text-3 mb-3.5">Intelligence brief with timing signals, pain map, and outreach drafts.</p>
                    <a
                      href={`/brief/${selectedLead.id}`}
                      className="w-full h-10 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-lg text-[14px] font-medium flex items-center justify-center hover:bg-[#333] dark:hover:bg-[#E4E4E7] transition-colors"
                    >
                      View Brief
                    </a>
                  </>
                ) : (
                  <>
                    <h3 className="text-[14px] font-semibold text-signal-text-1">Ready to go deeper?</h3>
                    <p className="text-[13px] text-signal-text-3 leading-relaxed mt-1 mb-3.5">
                      Generate a full intelligence brief with AI synthesis, timing signals, and a personalised outreach draft.
                    </p>
                    <a
                      href={`/brief/${selectedLead.id}`}
                      className="w-full h-10 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-lg text-[14px] font-medium flex items-center justify-center hover:bg-[#333] dark:hover:bg-[#E4E4E7] transition-colors"
                    >
                      Generate Brief
                    </a>
                    <p className="text-[11px] text-signal-text-4 text-center mt-1.5">Uses 1 credit · ~90 seconds</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showImportModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/[0.12] z-50"
            onClick={() => {
              setShowImportModal(false)
              setSelectedFile(null)
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] bg-signal-bg rounded-xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <button 
              onClick={() => {
                setShowImportModal(false)
                setSelectedFile(null)
              }}
              className="absolute top-5 right-5 text-signal-text-4 hover:text-signal-text-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-[16px] font-semibold text-signal-text-1">Import leads from CSV</h2>
            <p className="text-[13px] text-signal-text-3 mt-1 mb-5">
              Upload a CSV file with your leads. We will add them to this list.
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
                isDragOver ? "border-signal-accent bg-signal-surface" : "border-signal-border hover:border-signal-accent hover:bg-signal-surface"
              )}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-7 h-7 text-signal-text-4 mb-2" />
              {selectedFile ? (
                <span className="text-[14px] font-medium text-signal-text-1">{selectedFile.name}</span>
              ) : (
                <>
                  <span className="text-[14px] font-medium text-signal-text-1">Drop your CSV here</span>
                  <span className="text-[13px] text-signal-accent mt-1">or browse files</span>
                </>
              )}
            </label>
            
            <div className="text-center mt-2.5">
              <a href="#" className="text-[12px] text-signal-accent hover:underline">
                Download sample CSV template
              </a>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setSelectedFile(null)
                }}
                className="h-9 px-4 border border-signal-border rounded-lg text-[13px] font-medium text-signal-text-2 hover:bg-signal-surface transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedFile}
                className="h-9 px-4 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-lg text-[13px] font-medium hover:bg-[#333] dark:hover:bg-[#E4E4E7] disabled:bg-[#E5E4E0] disabled:text-signal-text-4 disabled:cursor-not-allowed transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </>
      )}
      {showAddLeadModal && (
        <>
          <div
            className="fixed inset-0 bg-black/[0.12] z-50"
            onClick={() => { setShowAddLeadModal(false); setAddLeadError('') }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] bg-signal-bg rounded-xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowAddLeadModal(false); setAddLeadError('') }}
              className="absolute top-5 right-5 text-signal-text-4 hover:text-signal-text-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-[16px] font-semibold text-signal-text-1">Add lead manually</h2>
            <p className="text-[13px] text-signal-text-3 mt-1 mb-5">
              No Lusha credits used. All four required fields unlock the best brief quality.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-signal-text-2 mb-1">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addLeadForm.full_name}
                  onChange={e => setAddLeadForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Jane Smith"
                  className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-signal-text-2 mb-1">
                  LinkedIn URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={addLeadForm.linkedin_url}
                  onChange={e => setAddLeadForm(p => ({ ...p, linkedin_url: e.target.value }))}
                  placeholder="linkedin.com/in/janesmith"
                  className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-signal-text-2 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addLeadForm.company_name}
                  onChange={e => setAddLeadForm(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-signal-text-2 mb-1">
                  Job title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addLeadForm.job_title}
                  onChange={e => setAddLeadForm(p => ({ ...p, job_title: e.target.value }))}
                  placeholder="e.g. Head of Sales"
                  className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-signal-text-2 mb-1">
                  Company LinkedIn URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={addLeadForm.company_linkedin_url}
                  onChange={e => setAddLeadForm(p => ({ ...p, company_linkedin_url: e.target.value }))}
                  placeholder="linkedin.com/company/acme-corp"
                  className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-signal-text-2 mb-1">
                  Company domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addLeadForm.company_domain}
                  onChange={e => setAddLeadForm(p => ({ ...p, company_domain: e.target.value }))}
                  placeholder="icicibank.com"
                  className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>

              <div className="pt-1 border-t border-signal-border-faint">
                <p className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-wider mb-3">Optional</p>
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[12px] font-medium text-signal-text-2 mb-1">Email</label>
                    <input
                      type="email"
                      value={addLeadForm.email}
                      onChange={e => setAddLeadForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="jane@acme.com"
                      className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[12px] font-medium text-signal-text-2 mb-1">City</label>
                      <input
                        type="text"
                        value={addLeadForm.city}
                        onChange={e => setAddLeadForm(p => ({ ...p, city: e.target.value }))}
                        placeholder="San Francisco"
                        className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] font-medium text-signal-text-2 mb-1">Country</label>
                      <input
                        type="text"
                        value={addLeadForm.country}
                        onChange={e => setAddLeadForm(p => ({ ...p, country: e.target.value }))}
                        placeholder="US"
                        className="w-full h-9 px-3 border border-signal-border rounded-md text-[13px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {addLeadError && (
              <p className="mt-3 text-[13px] text-red-500">{addLeadError}</p>
            )}

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                onClick={() => { setShowAddLeadModal(false); setAddLeadError('') }}
                className="h-9 px-4 border border-signal-border rounded-lg text-[13px] font-medium text-signal-text-2 hover:bg-signal-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLead}
                disabled={addingLead || !addLeadForm.full_name.trim() || !addLeadForm.linkedin_url.trim() || !addLeadForm.company_name.trim() || !addLeadForm.job_title.trim() || !addLeadForm.company_linkedin_url.trim() || !addLeadForm.company_domain.trim()}
                className="h-9 px-4 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] rounded-lg text-[13px] font-medium hover:bg-[#333] dark:hover:bg-[#E4E4E7] disabled:bg-[#E5E4E0] disabled:text-signal-text-4 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {addingLead && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Add lead
              </button>
            </div>
          </div>
        </>
      )}
    </div>{/* close ml-[200px] flex wrapper */}
  </div>
  )
}
