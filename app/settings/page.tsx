"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/signal/sidebar"
import {
  Plug, User, CreditCard, Bell, Code, X, AlertTriangle,
  Copy, RefreshCw, Eye, EyeOff, ChevronRight, Check
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = "integrations" | "account" | "billing" | "notifications" | "api"

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
        on ? "bg-[#4F46E5]" : "bg-[#D1D5DB]",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
        on ? "translate-x-4.5" : "translate-x-0.5"
      )} style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-[440px] p-7 z-10">
        {children}
        <button onClick={onClose} className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#374151]">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Section nav items ────────────────────────────────────────────────────────

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "account", label: "Account", icon: User },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api", label: "API", icon: Code },
]

// ─── Integrations data ────────────────────────────────────────────────────────

const integrations = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Automatically log outreach activity, sync contacts, and update deal stages",
    connected: true,
    connectedLabel: "Logging outreach activity automatically",
    logoBg: "#FF7A59",
    logoText: "H",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync leads, log calls and emails, update opportunity stages automatically",
    connected: false,
    logoBg: "#00A1E0",
    logoText: "SF",
    logoSmall: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Send outreach directly from Signal using your Gmail account",
    connected: true,
    connectedLabel: "Sending from aditya@dpdzero.com",
    logoIsGmail: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Receive signal alerts and brief notifications in your Slack workspace",
    connected: false,
    logoBg: "#4A154B",
    logoIsSlack: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Open outreach drafts directly in LinkedIn and send connection requests",
    connected: true,
    connectedLabel: "Opening messages in LinkedIn automatically",
    logoBg: "#0A66C2",
    logoText: "in",
  },
  {
    id: "chrome",
    name: "Chrome Extension",
    description: "Research leads from any LinkedIn profile or website without leaving your browser",
    connected: false,
    logoIsChrome: true,
    isExtension: true,
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("integrations")
  const [connectModal, setConnectModal] = useState<string | null>(null)
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null)
  const [connectedSet, setConnectedSet] = useState<Set<string>>(
    new Set(integrations.filter(i => i.connected).map(i => i.id))
  )
  const [accountSaved, setAccountSaved] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiCopied, setApiCopied] = useState(false)
  const [regenModal, setRegenModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [notifFreq, setNotifFreq] = useState<"realtime" | "daily" | "weekly">("realtime")
  const [notifToggles, setNotifToggles] = useState({
    strong: true, funding: true, jobChanges: true,
    content: true, competitor: true, hiring: false,
    inApp: true, email: true, slack: false,
  })

  const sectionRefs = useRef<Record<Section, HTMLDivElement | null>>({
    integrations: null, account: null, billing: null, notifications: null, api: null,
  })

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as Section)
          }
        })
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    )
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: Section) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleSaveAccount = () => {
    setAccountSaved(true)
    setTimeout(() => setAccountSaved(false), 1500)
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText("sk_live_abc123xyz789def456ghi012jkl345")
    setApiCopied(true)
    setTimeout(() => setApiCopied(false), 1500)
  }

  const connectingIntegration = integrations.find(i => i.id === connectModal)
  const disconnectingIntegration = integrations.find(i => i.id === disconnectConfirm)

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <Sidebar activePage="settings" />

      <div className="ml-[200px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-[52px] bg-white border-b border-[#E5E4E0] flex items-center px-6 shrink-0">
          <div>
            <p className="text-[18px] font-semibold text-[#1C1C1C] leading-tight">Settings</p>
            <p className="text-[12px] text-[#9CA3AF]">Manage your account, integrations, and preferences</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-7">
          <div className="grid gap-6" style={{ gridTemplateColumns: "220px 1fr", alignItems: "start" }}>

            {/* Left nav */}
            <div className="bg-white border border-[#E5E4E0] rounded-xl p-3 sticky top-7">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13px] transition-colors",
                    activeSection === item.id
                      ? "bg-[#EEF2FF] text-[#4338CA] font-medium"
                      : "text-[#6B7280] hover:bg-[#F9FAFB]"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right sections */}
            <div className="flex flex-col gap-4">

              {/* ── INTEGRATIONS ── */}
              <div
                id="integrations"
                ref={el => { sectionRefs.current.integrations = el }}
                className="bg-white border border-[#E5E4E0] rounded-xl p-6"
              >
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-1">Integrations</h2>
                <p className="text-[13px] text-[#6B7280] mb-6">
                  Connect Signal to the tools your team already uses. Connected integrations unlock automatic logging, one-click sending, and real-time notifications.
                </p>
                <div className="flex flex-col">
                  {integrations.map((integration, idx) => (
                    <div
                      key={integration.id}
                      className={cn(
                        "flex items-center gap-4 py-4",
                        idx < integrations.length - 1 && "border-b border-[#F3F4F6]"
                      )}
                    >
                      {/* Logo */}
                      <div
                        className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: integration.logoIsGmail ? "white" : integration.logoIsChrome ? "#F3F4F6" : integration.logoBg }}
                      >
                        {integration.logoIsGmail ? (
                          <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                            <div className="bg-[#EA4335] rounded-tl-sm" />
                            <div className="bg-[#4285F4] rounded-tr-sm" />
                            <div className="bg-[#FBBC05] rounded-bl-sm" />
                            <div className="bg-[#34A853] rounded-br-sm" />
                          </div>
                        ) : integration.logoIsSlack ? (
                          <span className="text-white font-bold text-[15px]">#</span>
                        ) : integration.logoIsChrome ? (
                          <div className="w-5 h-5 rounded-full border-2 border-[#9CA3AF] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-[#6B7280]" />
                          </div>
                        ) : (
                          <span
                            className="text-white font-bold"
                            style={{ fontSize: integration.logoSmall ? "11px" : "15px" }}
                          >
                            {integration.logoText}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#1C1C1C]">{integration.name}</p>
                        <p className="text-[13px] text-[#6B7280] mt-0.5">{integration.description}</p>
                        {connectedSet.has(integration.id) && integration.connectedLabel && (
                          <p className="text-[12px] text-[#059669] mt-0.5">{integration.connectedLabel}</p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-3 shrink-0">
                        {connectedSet.has(integration.id) ? (
                          <>
                            <span className="text-[12px] font-medium bg-[#D1FAE5] text-[#065F46] rounded-full px-2.5 py-0.5">
                              Connected
                            </span>
                            {disconnectConfirm === integration.id ? (
                              <div className="flex items-center gap-1.5 bg-white border border-[#E5E4E0] rounded-lg px-3 py-1.5 shadow-sm">
                                <span className="text-[12px] text-[#374151]">Disconnect?</span>
                                <button
                                  onClick={() => {
                                    setConnectedSet(prev => { const n = new Set(prev); n.delete(integration.id); return n })
                                    setDisconnectConfirm(null)
                                  }}
                                  className="text-[12px] text-[#DC2626] font-medium hover:underline"
                                >Confirm</button>
                                <button onClick={() => setDisconnectConfirm(null)} className="text-[12px] text-[#9CA3AF] hover:underline">Cancel</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDisconnectConfirm(integration.id)}
                                className="text-[12px] text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                              >
                                Disconnect
                              </button>
                            )}
                          </>
                        ) : integration.isExtension ? (
                          <button className="text-[13px] text-[#4F46E5] border border-[#4F46E5] rounded-lg h-8 px-3.5 hover:bg-[#EEF2FF] transition-colors">
                            Install extension →
                          </button>
                        ) : (
                          <button
                            onClick={() => setConnectModal(integration.id)}
                            className="text-[13px] text-[#374151] border border-[#E5E4E0] rounded-lg h-8 px-3.5 hover:bg-[#F9FAFB] transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ACCOUNT ── */}
              <div
                id="account"
                ref={el => { sectionRefs.current.account = el }}
                className="bg-white border border-[#E5E4E0] rounded-xl p-6"
              >
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-6">Account</h2>

                {/* Avatar row */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[20px] font-semibold text-[#4338CA] shrink-0">
                    AM
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#1C1C1C]">Aditya Machani</p>
                    <p className="text-[13px] text-[#6B7280]">aditya@dpdzero.com</p>
                    <button className="text-[12px] text-[#4F46E5] mt-1 hover:underline">Change photo</button>
                  </div>
                </div>

                {/* Fields */}
                <div className="flex flex-col gap-4 max-w-[480px]">
                  {[
                    { label: "Full name", defaultValue: "Aditya Machani", type: "text" },
                    { label: "Email address", defaultValue: "aditya@dpdzero.com", type: "email", verified: true },
                    { label: "Company", defaultValue: "DPDzero", type: "text" },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">{field.label}</label>
                      <input
                        type={field.type}
                        defaultValue={field.defaultValue}
                        className="w-full border border-[#E5E4E0] rounded-lg h-10 px-3 text-[14px] text-[#1C1C1C] outline-none focus:border-[#4F46E5] transition-colors"
                      />
                      {field.verified && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-[#D1FAE5] text-[#065F46] rounded-full px-2 py-0.5">
                          <Check className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Role</label>
                    <select className="w-full border border-[#E5E4E0] rounded-lg h-10 px-3 text-[14px] text-[#1C1C1C] outline-none focus:border-[#4F46E5] bg-white">
                      <option>Admin</option>
                      <option>Manager</option>
                      <option>Rep</option>
                    </select>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={handleSaveAccount}
                      className="h-9 px-4 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
                    >
                      {accountSaved ? "Saved ✓" : "Save changes"}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#F3F4F6] my-6" />

                {/* Danger zone */}
                <p className="text-[13px] font-semibold text-[#DC2626] mb-3">Danger zone</p>
                <div className="flex flex-col">
                  <div className="flex items-center py-2.5 border-b border-[#F3F4F6]">
                    <span className="text-[13px] text-[#374151] flex-1">Change password</span>
                    <button className="text-[13px] text-[#4F46E5] hover:underline">Update password →</button>
                  </div>
                  <div className="flex items-center py-2.5">
                    <div className="flex-1">
                      <p className="text-[13px] text-[#374151]">Delete account</p>
                      <p className="text-[12px] text-[#9CA3AF]">This will permanently delete all your briefs and data</p>
                    </div>
                    <button
                      onClick={() => setDeleteModal(true)}
                      className="text-[13px] text-[#DC2626] border border-[#FCA5A5] rounded-lg h-8 px-3.5 hover:bg-[#FEF2F2] transition-colors"
                    >
                      Delete account
                    </button>
                  </div>
                </div>
              </div>

              {/* ── BILLING ── */}
              <div
                id="billing"
                ref={el => { sectionRefs.current.billing = el }}
                className="bg-white border border-[#E5E4E0] rounded-xl p-6"
              >
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-6">Billing</h2>

                {/* Plan card */}
                <div className="bg-[#F9FAFB] border border-[#E5E4E0] rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1C1C1C]">Growth plan</p>
                    <p className="text-[13px] text-[#6B7280] mt-0.5">$999 / month</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-0.5">Renews March 21, 2026</p>
                  </div>
                  <button className="text-[13px] font-medium text-[#4F46E5] border border-[#4F46E5] rounded-lg h-[34px] px-4 hover:bg-[#EEF2FF] transition-colors">
                    Upgrade plan
                  </button>
                </div>

                {/* Credits usage */}
                <div className="mb-5">
                  <p className="text-[13px] font-medium text-[#374151] mb-2.5">Credits this month</p>
                  <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4F46E5] rounded-full" style={{ width: "62%" }} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[13px] text-[#374151]">124 of 200 credits used</span>
                    <div className="text-right">
                      <span className="text-[13px] text-[#6B7280]">76 remaining</span>
                      <div>
                        <span className="text-[12px] text-[#4F46E5] hover:underline cursor-pointer">Need more?</span>
                        <span className="text-[12px] text-[#6B7280] ml-1">Buy 100 credits for $40</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakdown table */}
                <div className="border border-[#F3F4F6] rounded-lg overflow-hidden mb-5">
                  <div className="grid grid-cols-3 bg-[#F9FAFB] px-3 py-2">
                    {["Action", "Credits", "Used this month"].map(h => (
                      <span key={h} className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{h}</span>
                    ))}
                  </div>
                  {[
                    ["Full brief", "1 credit", "87 briefs"],
                    ["Brief refresh", "0.5 credits", "24 refreshes"],
                    ["Tier 1 scan", "0.1 credits", "130 leads scanned"],
                    ["Deep brief", "3 credits", "1 brief"],
                  ].map(([action, credits, used], idx, arr) => (
                    <div
                      key={action}
                      className={cn("grid grid-cols-3 px-3 py-2.5 text-[13px]", idx < arr.length - 1 && "border-b border-[#F3F4F6]")}
                    >
                      <span className="text-[#374151]">{action}</span>
                      <span className="text-[#6B7280]">{credits}</span>
                      <span className="text-[#374151]">{used}</span>
                    </div>
                  ))}
                </div>

                {/* Payment method */}
                <div className="flex items-center gap-3 py-3.5 border-t border-[#F3F4F6]">
                  <CreditCard className="w-5 h-5 text-[#6B7280] shrink-0" />
                  <span className="text-[13px] text-[#374151]">Visa ending in 4242</span>
                  <span className="text-[12px] text-[#9CA3AF]">Expires 12/26</span>
                  <button className="ml-auto text-[12px] text-[#4F46E5] hover:underline">Update card</button>
                </div>

                {/* Invoices */}
                <div className="mt-5">
                  <p className="text-[13px] font-medium text-[#374151] mb-2.5">Recent invoices</p>
                  <div className="flex flex-col">
                    {[
                      { date: "Feb 2026", amount: "$999" },
                      { date: "Jan 2026", amount: "$999" },
                      { date: "Dec 2025", amount: "$999" },
                    ].map((inv, idx, arr) => (
                      <div
                        key={inv.date}
                        className={cn("flex items-center py-2 text-[13px]", idx < arr.length - 1 && "border-b border-[#F3F4F6]")}
                      >
                        <span className="text-[#374151] w-28">{inv.date}</span>
                        <span className="text-[#6B7280] flex-1">Growth plan — monthly</span>
                        <span className="font-medium text-[#1C1C1C] w-20 text-right">{inv.amount}</span>
                        <button className="text-[12px] text-[#4F46E5] w-16 text-right hover:underline">Download</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── NOTIFICATIONS ── */}
              <div
                id="notifications"
                ref={el => { sectionRefs.current.notifications = el }}
                className="bg-white border border-[#E5E4E0] rounded-xl p-6"
              >
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-1">Notifications</h2>
                <p className="text-[13px] text-[#6B7280] mb-6">
                  Personal preferences — these override the team defaults set in Playbook.
                </p>

                {/* Notify me about */}
                <p className="text-[13px] font-medium text-[#374151] mb-3">Notify me about</p>
                <div className="flex flex-col">
                  {([
                    { key: "strong", label: "Strong signals only", desc: "Only notify for leads with composite score above your threshold" },
                    { key: "funding", label: "Funding & financial", desc: "New funding rounds and financial events" },
                    { key: "jobChanges", label: "Job changes", desc: "Role changes and promotions at monitored leads" },
                    { key: "content", label: "Published content", desc: "When monitored leads publish relevant content" },
                    { key: "competitor", label: "Competitor events", desc: "Outages, price changes, negative press at competitors" },
                    { key: "hiring", label: "Company hiring surge", desc: "Rapid headcount growth at monitored companies" },
                  ] as const).map(({ key, label, desc }, idx, arr) => (
                    <div key={key} className={cn("flex items-center justify-between py-2.5", idx < arr.length - 1 && "border-b border-[#F3F4F6]")}>
                      <div>
                        <p className="text-[13px] text-[#374151]">{label}</p>
                        <p className="text-[12px] text-[#9CA3AF]">{desc}</p>
                      </div>
                      <Toggle on={notifToggles[key]} onChange={() => setNotifToggles(p => ({ ...p, [key]: !p[key] }))} />
                    </div>
                  ))}
                </div>

                {/* How to notify */}
                <p className="text-[13px] font-medium text-[#374151] mt-5 mb-3">How to notify me</p>
                <div className="flex flex-col">
                  {([
                    { key: "inApp", label: "In-app", desc: "Show notifications inside Signal" },
                    { key: "email", label: "Email", desc: "Send to aditya@dpdzero.com" },
                    { key: "slack", label: "Slack", desc: null, slackDisabled: true },
                  ] as const).map(({ key, label, desc, slackDisabled }, idx, arr) => (
                    <div key={key} className={cn("flex items-center justify-between py-2.5", idx < arr.length - 1 && "border-b border-[#F3F4F6]")}>
                      <div>
                        <p className={cn("text-[13px]", slackDisabled ? "text-[#9CA3AF]" : "text-[#374151]")}>{label}</p>
                        {slackDisabled ? (
                          <p className="text-[12px] text-[#9CA3AF]">
                            Not connected —{" "}
                            <Link href="/settings" className="text-[#4F46E5] hover:underline">Connect Slack →</Link>
                          </p>
                        ) : (
                          <p className="text-[12px] text-[#9CA3AF]">{desc}</p>
                        )}
                      </div>
                      <Toggle
                        on={notifToggles[key]}
                        onChange={() => !slackDisabled && setNotifToggles(p => ({ ...p, [key]: !p[key] }))}
                        disabled={slackDisabled}
                      />
                    </div>
                  ))}
                </div>

                {/* Frequency */}
                <p className="text-[13px] font-medium text-[#374151] mt-5 mb-3">Frequency</p>
                <div className="flex gap-2.5">
                  {(["realtime", "daily", "weekly"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setNotifFreq(f)}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg border text-[13px] font-medium transition-colors",
                        notifFreq === f
                          ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4338CA]"
                          : "border-[#E5E4E0] text-[#6B7280] hover:bg-[#F9FAFB]"
                      )}
                    >
                      {f === "realtime" ? "Real-time" : f === "daily" ? "Daily digest" : "Weekly"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── API ── */}
              <div
                id="api"
                ref={el => { sectionRefs.current.api = el }}
                className="bg-white border border-[#E5E4E0] rounded-xl p-6"
              >
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-1">API</h2>
                <p className="text-[13px] text-[#6B7280] mb-6">
                  Use the Signal API to integrate with your own tools and workflows.
                </p>

                {/* API key */}
                <p className="text-[13px] font-medium text-[#374151] mb-2">Your API key</p>
                <div className="flex items-center gap-2 max-w-[560px]">
                  <input
                    type="text"
                    readOnly
                    value={apiKeyVisible ? "sk_live_abc123xyz789def456ghi012jkl345" : "sk_live_••••••••••••••••••••••••••••••"}
                    className="flex-1 border border-[#E5E4E0] rounded-lg h-10 px-3 text-[13px] font-mono text-[#374151] bg-[#F9FAFB] outline-none"
                  />
                  <button
                    onClick={() => setApiKeyVisible(p => !p)}
                    className="flex items-center gap-1.5 h-10 px-3 border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors shrink-0"
                  >
                    {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {apiKeyVisible ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 h-10 px-3 border border-[#E5E4E0] rounded-lg text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors shrink-0"
                  >
                    {apiCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {apiCopied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => setRegenModal(true)}
                    className="flex items-center gap-1.5 h-10 px-3 border border-[#FCA5A5] rounded-lg text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-3 py-2 max-w-[560px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#92400E] shrink-0" />
                  <p className="text-[12px] text-[#92400E]">Keep your API key secret. Anyone with this key can access your Signal account and data.</p>
                </div>

                {/* Usage stats */}
                <p className="text-[13px] font-medium text-[#374151] mt-6 mb-3">API usage this month</p>
                <div className="grid grid-cols-3 gap-3 max-w-[480px]">
                  {[
                    { value: "1,247", label: "API calls" },
                    { value: "43", label: "Briefs generated" },
                    { value: "99.8%", label: "Uptime" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-lg p-3 text-center">
                      <p className="text-[20px] font-semibold text-[#1C1C1C]">{stat.value}</p>
                      <p className="text-[12px] text-[#6B7280] mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Docs */}
                <div className="flex items-center justify-between pt-3.5 mt-5 border-t border-[#F3F4F6]">
                  <div>
                    <p className="text-[13px] font-medium text-[#374151]">API documentation</p>
                    <p className="text-[12px] text-[#9CA3AF]">Full reference, guides, and code examples</p>
                  </div>
                  <button className="text-[13px] font-medium text-[#4F46E5] hover:underline">View docs →</button>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* ── CONNECT MODAL ── */}
      <Modal open={!!connectModal} onClose={() => setConnectModal(null)}>
        {connectingIntegration && (
          <>
            <h3 className="text-[16px] font-semibold text-[#1C1C1C]">Connect {connectingIntegration.name}</h3>
            <p className="text-[13px] text-[#6B7280] mt-1 mb-5">{connectingIntegration.description}</p>
            {connectingIntegration.id === "slack" && (
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Slack webhook URL</label>
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full border border-[#E5E4E0] rounded-lg h-10 px-3 text-[13px] outline-none focus:border-[#4F46E5]"
                />
              </div>
            )}
            <button
              onClick={() => {
                setConnectedSet(prev => new Set([...prev, connectingIntegration.id]))
                setConnectModal(null)
              }}
              className="w-full h-10 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
            >
              Connect with {connectingIntegration.name}
            </button>
            <button onClick={() => setConnectModal(null)} className="w-full text-center text-[13px] text-[#9CA3AF] mt-3 hover:text-[#374151]">
              Cancel
            </button>
          </>
        )}
      </Modal>

      {/* ── REGENERATE API KEY MODAL ── */}
      <Modal open={regenModal} onClose={() => setRegenModal(false)}>
        <h3 className="text-[16px] font-semibold text-[#1C1C1C]">Regenerate API key?</h3>
        <p className="text-[13px] text-[#6B7280] mt-1 mb-5">Your current key will stop working immediately. Any integrations using it will need to be updated.</p>
        <button
          onClick={() => setRegenModal(false)}
          className="w-full h-10 bg-[#DC2626] text-white text-[13px] font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
        >
          Regenerate key
        </button>
        <button onClick={() => setRegenModal(false)} className="w-full text-center text-[13px] text-[#9CA3AF] mt-3 hover:text-[#374151]">
          Cancel
        </button>
      </Modal>

      {/* ── DELETE ACCOUNT MODAL ── */}
      <Modal open={deleteModal} onClose={() => { setDeleteModal(false); setDeleteConfirmText("") }}>
        <h3 className="text-[16px] font-semibold text-[#1C1C1C]">Delete your account?</h3>
        <p className="text-[13px] text-[#6B7280] mt-1 mb-5">This will permanently delete all your briefs, lists, and data. This cannot be undone.</p>
        <label className="block text-[13px] font-medium text-[#374151] mb-1.5">Type DELETE to confirm</label>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={e => setDeleteConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full border border-[#E5E4E0] rounded-lg h-10 px-3 text-[13px] outline-none focus:border-[#DC2626] mb-4"
        />
        <button
          disabled={deleteConfirmText !== "DELETE"}
          className={cn(
            "w-full h-10 text-[13px] font-medium rounded-lg transition-colors",
            deleteConfirmText === "DELETE"
              ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
              : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
          )}
        >
          Delete account
        </button>
        <button
          onClick={() => { setDeleteModal(false); setDeleteConfirmText("") }}
          className="w-full text-center text-[13px] text-[#9CA3AF] mt-3 hover:text-[#374151]"
        >
          Cancel
        </button>
      </Modal>
    </div>
  )
}
