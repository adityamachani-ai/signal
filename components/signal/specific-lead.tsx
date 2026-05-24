"use client"

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { Loader2, RefreshCw, X, Clock } from "lucide-react"
import { ResultsTable, TableLead } from "./results-table"
import type { SpecificLookupPayload } from "./top-bar"

type TabType = 'linkedin' | 'email' | 'name'

const INITIALS_COLORS = [
  'bg-signal-accent-tint text-signal-accent-2',
]

function getInitialsColor(_name: string) {
  return INITIALS_COLORS[0]
}

function getInitials(first: string, last: string) {
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbLeadToTableLead(lead: Record<string, any>): TableLead {
  return {
    id: lead.id,
    initials: getInitials(lead.first_name ?? '', lead.last_name ?? ''),
    initialsColor: getInitialsColor(lead.full_name ?? ''),
    name: lead.full_name,
    title: lead.job_title || '—',
    company: lead.company_name || '—',
    location: [lead.city, lead.country].filter(Boolean).join(', ') || '—',
    email: lead.email || undefined,
    phone: lead.phone_direct || lead.phone_mobile || undefined,
    linkedinUrl: lead.linkedin_url || undefined,
    hasEmail: !!lead.email,
    hasPhone: !!(lead.phone_direct || lead.phone_mobile),
    isAddedToList: !!lead.in_list,
    logoUrl: undefined,
    companyDomain: lead.company_domain || undefined,
    enrichedAt: lead.enriched_at || undefined,
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

  // Cached lead popup state
  const [cachedPopup, setCachedPopup] = useState<{
    lead: Record<string, unknown>
    payload: SpecificLookupPayload
  } | null>(null)

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

  const doLookup = useCallback(async (payload: SpecificLookupPayload, force = false) => {
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
      initialsColor: 'bg-signal-accent-tint text-signal-accent-2',
      name: force ? 'Refreshing...' : 'Looking up...',
      title: '—',
      company: '—',
      location: '—',
    }
    if (!force) {
      setLeads(prev => [placeholder, ...prev])
    }

    try {
      const res = await fetch('/api/research/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, force }),
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
        // Cached: remove temp row, show popup asking user if they want to refresh
        setLeads(prev => prev.filter(l => l.id !== tempId))
        setCachedPopup({ lead, payload })
      } else {
        if (force) {
          // Refresh: replace old entry (match by id, name, or linkedin) with fresh data
          setLeads(prev => {
            const match = (l: TableLead) =>
              l.id === lead.id ||
              (l.name === realRow.name && l.company === realRow.company) ||
              (l.linkedinUrl && l.linkedinUrl === realRow.linkedinUrl)
            const hasMatch = prev.some(match)
            if (hasMatch) {
              // Replace first match, remove any additional duplicates
              let replaced = false
              return prev.reduce<TableLead[]>((acc, l) => {
                if (match(l)) {
                  if (!replaced) { acc.push(realRow); replaced = true }
                  // skip duplicates
                } else {
                  acc.push(l)
                }
                return acc
              }, [])
            }
            return [realRow, ...prev]
          })
          setSuccessMessage('Lead refreshed with latest data')
          setSuccessBanner(true)
        } else {
          // New: replace scanning placeholder in-place
          setLeads(prev => prev.map(l => l.id === tempId ? realRow : l))
        }
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
    // The ListPicker component now handles the API call directly.
    // This callback just marks the leads as added in local state.
    setLeads(prev => prev.map(l =>
      selectedIds.includes(l.id) ? { ...l, isAddedToList: true } : l
    ))
    const count = selectedIds.length
    setSuccessMessage(`${count} lead${count !== 1 ? 's' : ''} added to list`)
    setSuccessBanner(true)
  }, [])

  const handleRefreshLead = useCallback(async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    const payload: SpecificLookupPayload = lead.linkedinUrl
      ? { type: 'linkedin', linkedinUrl: lead.linkedinUrl }
      : { type: 'name', firstName: lead.name.split(' ')[0] ?? '', lastName: lead.name.split(' ').slice(1).join(' '), company: lead.company }

    // Show scanning state on the lead being refreshed
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l } : l))

    await doLookup(payload, true)
  }, [leads, doLookup])

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

      {/* Cached lead popup */}
      {cachedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setCachedPopup(null)}>
          <div className="bg-signal-bg rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-signal-border">
              <h3 className="text-[15px] font-semibold text-signal-text-1">Lead already exists</h3>
              <button onClick={() => setCachedPopup(null)} className="p-1 hover:bg-signal-raised rounded-lg transition-colors">
                <X className="w-4 h-4 text-signal-text-3" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-signal-accent-tint flex items-center justify-center text-signal-accent-2 text-[13px] font-semibold shrink-0">
                  {((cachedPopup.lead.first_name as string)?.[0] ?? '').toUpperCase()}
                  {((cachedPopup.lead.last_name as string)?.[0] ?? '').toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-signal-text-1">{cachedPopup.lead.full_name as string}</p>
                  <p className="text-[13px] text-signal-text-3">{cachedPopup.lead.job_title as string} at {cachedPopup.lead.company_name as string}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg mb-4">
                <Clock className="w-4 h-4 text-[#EA580C] shrink-0" />
                <span className="text-[13px] text-[#9A3412]">
                  Data fetched {cachedPopup.lead.enriched_at
                    ? new Date(cachedPopup.lead.enriched_at as string).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })
                    : 'previously'}
                </span>
              </div>
              <p className="text-[13px] text-signal-text-3 mb-4">
                This lead is already in your list. Would you like to refresh with the latest data?
              </p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-signal-border bg-signal-surface">
              <button
                onClick={() => setCachedPopup(null)}
                className="flex-1 h-9 border border-signal-border text-[13px] font-medium text-signal-text-2 rounded-lg hover:bg-signal-bg transition-colors"
              >
                Keep existing
              </button>
              <button
                onClick={() => {
                  const { payload } = cachedPopup
                  setCachedPopup(null)
                  doLookup(payload, true)
                }}
                className="flex-1 h-9 bg-signal-accent text-white text-[13px] font-medium rounded-lg hover:bg-signal-accent-2 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input panel */}
      <div className="bg-signal-bg border border-signal-border rounded-xl p-6">

        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-signal-raised rounded-lg mb-5 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setError(null) }}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-signal-bg text-signal-text-1 shadow-sm'
                  : 'text-signal-text-3 hover:text-signal-text-2'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LinkedIn tab */}
        {activeTab === 'linkedin' && (
          <div>
            <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">
              LinkedIn profile URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFindLead()}
              placeholder="https://www.linkedin.com/in/john-doe"
              className="w-full h-10 px-3 border border-signal-border rounded-lg text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
            />
            {linkedinUrl && !linkedinUrl.includes('linkedin.com/in/') && (
              <p className="mt-1.5 text-[12px] text-[#92400E]">Paste the full URL — should contain /in/</p>
            )}
          </div>
        )}

        {/* Email tab */}
        {activeTab === 'email' && (
          <div>
            <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">
              Work email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFindLead()}
              placeholder="john@acme.com"
              className="w-full h-10 px-3 border border-signal-border rounded-lg text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
            />
          </div>
        )}

        {/* Name + Company tab */}
        {activeTab === 'name' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full h-10 px-3 border border-signal-border rounded-lg text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Sharma"
                  className="w-full h-10 px-3 border border-signal-border rounded-lg text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFindLead()}
                placeholder="HDFC Bank"
                className="w-full h-10 px-3 border border-signal-border rounded-lg text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
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
          className="mt-4 h-10 px-5 bg-signal-accent text-white text-[13px] font-medium rounded-lg hover:bg-signal-accent-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
        <div className="bg-signal-bg border border-signal-border rounded-xl overflow-hidden">
          {/* Skeleton rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 h-[52px] border-b border-signal-border-faint last:border-0">
              <div className="w-8 h-8 rounded-full bg-signal-raised animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-signal-raised rounded animate-pulse" />
                <div className="h-2.5 w-48 bg-signal-raised rounded animate-pulse" />
              </div>
              <div className="h-3 w-20 bg-signal-raised rounded animate-pulse" />
              <div className="h-3 w-16 bg-signal-raised rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <ResultsTable
          leads={leads}
          variant="specific"
          emptyStateMessage="Look up a lead above — results will appear here"
          actionButtonLabel="Add to List"
          onActionClick={handleAddToList}
          onRefreshLead={handleRefreshLead}
          showConfirmationBanner={successBanner}
          confirmationMessage={successMessage}
          onDismissBanner={() => setSuccessBanner(false)}
        />
      )}
    </div>
  )
})
