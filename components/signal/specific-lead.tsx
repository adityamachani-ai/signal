"use client"

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { Loader2 } from "lucide-react"
import { ResultsTable, TableLead } from "./results-table"
import type { SpecificLookupPayload } from "./top-bar"

type TabType = 'linkedin' | 'email' | 'name'

const INITIALS_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-sky-500',
]

function getInitialsColor(name: string) {
  return INITIALS_COLORS[name.charCodeAt(0) % INITIALS_COLORS.length]
}

function getInitials(first: string, last: string) {
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbLeadToTableLead(lead: Record<string, any>): TableLead {
  const signalMap: Record<string, TableLead['signalStrength']> = {
    strong: 'strong', medium: 'some', low: 'low',
  }
  return {
    id: lead.id,
    initials: getInitials(lead.first_name ?? '', lead.last_name ?? ''),
    initialsColor: getInitialsColor(lead.full_name ?? ''),
    name: lead.full_name,
    title: lead.job_title || '—',
    company: lead.company_name || '—',
    location: [lead.city, lead.country].filter(Boolean).join(', ') || '—',
    signalStrength: signalMap[lead.signal_score] ?? 'low',
    signals: Array.isArray(lead.signal_reasons) ? lead.signal_reasons : [],
    email: lead.email || undefined,
    phone: lead.phone_direct || lead.phone_mobile || undefined,
    linkedinUrl: lead.linkedin_url || undefined,
    hasEmail: !!lead.email,
    hasPhone: !!(lead.phone_direct || lead.phone_mobile),
    isAddedToList: !!lead.in_list,
    logoUrl: undefined,
    companyDomain: lead.company_domain || undefined,
  }
}

// Minimum time the scanning row stays visible to prevent flicker
const MIN_SCAN_MS = 600

export interface SpecificLeadHandle {
  lookupFromTopBar: (payload: SpecificLookupPayload) => void
  isLoading: boolean
}

interface SpecificLeadProps {
  onLoadingChange?: () => void
}

export const SpecificLead = forwardRef<SpecificLeadHandle, SpecificLeadProps>(
  function SpecificLead({ onLoadingChange }, ref) {
  const [activeTab, setActiveTab] = useState<TabType>('linkedin')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [leads, setLeads] = useState<TableLead[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [addingToList, setAddingToList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  // Load existing enriched leads from DB on mount
  useEffect(() => {
    fetch('/api/research/leads')
      .then(r => r.json())
      .then(data => {
        if (data.leads?.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setLeads(data.leads.map((l: any) => dbLeadToTableLead(l)))
        }
      })
      .catch(() => {/* silent — fresh state is fine */})
      .finally(() => setInitialLoading(false))
  }, [])

  const isValid = () => {
    if (activeTab === 'linkedin') return linkedinUrl.includes('linkedin.com/in/')
    if (activeTab === 'email') return email.includes('@') && email.includes('.')
    return firstName.trim().length > 0 && company.trim().length > 0
  }

  const buildPayload = (): SpecificLookupPayload => {
    if (activeTab === 'linkedin') return { type: 'linkedin', linkedinUrl: linkedinUrl.trim() }
    if (activeTab === 'email') return { type: 'email', email: email.trim() }
    return { type: 'name', firstName: firstName.trim(), lastName: lastName.trim(), company: company.trim() }
  }

  const clearInputs = () => {
    if (activeTab === 'linkedin') setLinkedinUrl('')
    if (activeTab === 'email') setEmail('')
    if (activeTab === 'name') { setFirstName(''); setLastName(''); setCompany('') }
  }

  const doLookup = useCallback(async (payload: SpecificLookupPayload) => {
    if (loading) return
    setLoading(true)
    setError(null)
    setListError(null)
    onLoadingChange?.()

    const scanStart = Date.now()

    // Show a scanning placeholder row immediately
    const tempId = `temp_${Date.now()}`
    const placeholder: TableLead = {
      id: tempId,
      initials: '...',
      initialsColor: 'bg-indigo-500',
      name: 'Looking up...',
      title: '—',
      company: '—',
      location: '—',
      signalStrength: 'scanning',
      signals: [],
    }
    setLeads(prev => [placeholder, ...prev])

    try {
      const res = await fetch('/api/research/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      // Ensure scanning row is visible for at least MIN_SCAN_MS
      const elapsed = Date.now() - scanStart
      if (elapsed < MIN_SCAN_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_SCAN_MS - elapsed))
      }

      if (!res.ok) {
        setLeads(prev => prev.filter(l => l.id !== tempId))
        setError(data.error ?? 'Failed to find lead')
        return
      }

      const lead = data.lead
      const realRow = dbLeadToTableLead(lead)

      if (data.cached) {
        // Cached: remove temp row, highlight existing row in-place (don't move it)
        setLeads(prev => {
          const withoutTemp = prev.filter(l => l.id !== tempId)
          const existingIdx = withoutTemp.findIndex(l => l.id === lead.id)
          if (existingIdx >= 0) {
            // Update in-place — don't reorder
            return withoutTemp.map(l => l.id === lead.id ? realRow : l)
          }
          // Not in list yet (shouldn't happen, but handle gracefully)
          return [realRow, ...withoutTemp]
        })
      } else {
        // New: replace scanning placeholder in-place
        setLeads(prev => prev.map(l => l.id === tempId ? realRow : l))
      }

      clearInputs()
    } catch {
      setLeads(prev => prev.filter(l => l.id !== tempId))
      setError('Network error — check your connection and try again')
    } finally {
      setLoading(false)
      onLoadingChange?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, onLoadingChange])

  const handleFindLead = useCallback(async () => {
    if (!isValid() || loading) return
    await doLookup(buildPayload())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, linkedinUrl, email, firstName, lastName, company, loading, doLookup])

  // Expose to parent via ref
  useImperativeHandle(ref, () => ({
    lookupFromTopBar: (payload: SpecificLookupPayload) => {
      doLookup(payload)
    },
    isLoading: loading,
  }), [doLookup, loading])

  const handleAddToList = useCallback(async (selectedIds: string[]) => {
    setAddingToList(true)
    setListError(null)
    try {
      const res = await fetch('/api/research/add-to-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedIds }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to add to list')
      }
      setLeads(prev => prev.map(l =>
        selectedIds.includes(l.id) ? { ...l, isAddedToList: true } : l
      ))
      const count = selectedIds.length
      setSuccessMessage(`${count} lead${count !== 1 ? 's' : ''} added to My List`)
      setSuccessBanner(true)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to add leads — please try again')
      setTimeout(() => setListError(null), 4000)
    } finally {
      setAddingToList(false)
    }
  }, [])

  const tabs: { key: TabType; label: string }[] = [
    { key: 'linkedin', label: 'LinkedIn URL' },
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name + Company' },
  ]

  return (
    <div className="space-y-6">
      {/* Error toast for list actions */}
      {listError && (
        <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <span className="text-[13px] font-medium">{listError}</span>
        </div>
      )}

      {/* Input panel */}
      <div className="bg-white border border-[#E5E4E0] rounded-xl p-6">

        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-[#F3F4F6] rounded-lg mb-5 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setError(null) }}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-[#1C1C1C] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LinkedIn tab */}
        {activeTab === 'linkedin' && (
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              LinkedIn profile URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFindLead()}
              placeholder="https://www.linkedin.com/in/john-doe"
              className="w-full h-10 px-3 border border-[#E5E4E0] rounded-lg text-[14px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {linkedinUrl && !linkedinUrl.includes('linkedin.com/in/') && (
              <p className="mt-1.5 text-[12px] text-amber-600">Paste the full URL — should contain /in/</p>
            )}
          </div>
        )}

        {/* Email tab */}
        {activeTab === 'email' && (
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Work email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFindLead()}
              placeholder="john@acme.com"
              className="w-full h-10 px-3 border border-[#E5E4E0] rounded-lg text-[14px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        )}

        {/* Name + Company tab */}
        {activeTab === 'name' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full h-10 px-3 border border-[#E5E4E0] rounded-lg text-[14px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Sharma"
                  className="w-full h-10 px-3 border border-[#E5E4E0] rounded-lg text-[14px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFindLead()}
                placeholder="HDFC Bank"
                className="w-full h-10 px-3 border border-[#E5E4E0] rounded-lg text-[14px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Find button */}
        <button
          onClick={handleFindLead}
          disabled={!isValid() || loading}
          className="mt-4 h-10 px-5 bg-[#4F46E5] text-white text-[13px] font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Looking up…
            </>
          ) : (
            'Find lead'
          )}
        </button>
      </div>

      {/* Results table */}
      {initialLoading ? (
        <div className="bg-white border border-[#E5E4E0] rounded-xl overflow-hidden">
          {/* Skeleton rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 h-[52px] border-b border-[#F3F4F6] last:border-0">
              <div className="w-8 h-8 rounded-full bg-[#F3F4F6] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-[#F3F4F6] rounded animate-pulse" />
                <div className="h-2.5 w-48 bg-[#F3F4F6] rounded animate-pulse" />
              </div>
              <div className="h-3 w-20 bg-[#F3F4F6] rounded animate-pulse" />
              <div className="h-3 w-16 bg-[#F3F4F6] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <ResultsTable
          leads={leads}
          variant="specific"
          emptyStateMessage="Look up a lead above — results will appear here"
          actionButtonLabel={addingToList ? "Adding…" : "Add to My List"}
          onActionClick={handleAddToList}
          showConfirmationBanner={successBanner}
          confirmationMessage={successMessage}
          onDismissBanner={() => setSuccessBanner(false)}
        />
      )}
    </div>
  )
})
