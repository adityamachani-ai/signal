"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/signal/sidebar"
import { Check, Minus, X, GripVertical, Trash2, AlertTriangle, Info, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// --- Types ---
type MainTab = "playbook" | "signal-settings" | "watchlist"
type PlaybookSection = "product" | "customer" | "valueprops" | "competitors" | "communication"

interface Tag { id: string; label: string }
interface ValueProp { id: string; outcome: string; persona: string; delivery: string }
interface Competitor { id: string; name: string; weakness: string; angle: string }
interface WatchCompany { id: string; name: string; industry: string; since: string; signal: string | null }
interface WatchCompetitor { id: string; name: string; category: string; since: string; signal: string | null; leadsCount: number }

// --- TagInput Component ---
function TagInput({ tags, setTags, placeholder }: { tags: Tag[], setTags: (t: Tag[]) => void, placeholder: string }) {
  const [input, setInput] = useState("")
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      setTags([...tags, { id: Date.now().toString(), label: input.trim() }])
      setInput("")
    }
  }
  return (
    <div className="border border-[#E5E4E0] rounded-lg px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 items-center focus-within:border-[#4F46E5] focus-within:shadow-[0_0_0_3px_rgba(79,70,229,0.08)]">
      {tags.map(t => (
        <span key={t.id} className="flex items-center gap-1 bg-[#F3F4F6] text-[#374151] rounded-full px-2.5 py-0.5 text-[12px]">
          {t.label}
          <button onClick={() => setTags(tags.filter(x => x.id !== t.id))} className="text-[#9CA3AF] hover:text-[#374151]"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder={placeholder} className="border-none outline-none text-[13px] text-[#374151] bg-transparent flex-1 min-w-[140px] placeholder:text-[#9CA3AF]" />
    </div>
  )
}

function IndigoTagInput({ tags, setTags, placeholder }: { tags: Tag[], setTags: (t: Tag[]) => void, placeholder: string }) {
  const [input, setInput] = useState("")
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      setTags([...tags, { id: Date.now().toString(), label: input.trim() }])
      setInput("")
    }
  }
  return (
    <div className="border border-[#E5E4E0] rounded-lg px-3 py-2 min-h-[80px] flex flex-wrap gap-1.5 items-start focus-within:border-[#4F46E5] focus-within:shadow-[0_0_0_3px_rgba(79,70,229,0.08)]">
      {tags.map(t => (
        <span key={t.id} className="flex items-center gap-1 bg-[#EEF2FF] text-[#4338CA] rounded-full px-2.5 py-1 text-[12px]">
          {t.label}
          <button onClick={() => setTags(tags.filter(x => x.id !== t.id))} className="text-[#6366F1] hover:text-[#4338CA]"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder={placeholder} className="border-none outline-none text-[13px] text-[#374151] bg-transparent flex-1 min-w-[160px] placeholder:text-[#9CA3AF]" />
    </div>
  )
}

// --- PillSelector ---
function PillSelector({ options, selected, onToggle, single }: { options: string[], selected: string[], onToggle: (v: string) => void, single?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt)
        return (
          <button key={opt} onClick={() => onToggle(opt)}
            className={cn("rounded-full px-3.5 py-1 text-[12px] font-medium border transition-colors",
              active ? "bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]" : "bg-white text-[#6B7280] border-[#E5E4E0] hover:border-[#C7D2FE]"
            )}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// --- Textarea ---
function Field({ label, helper, value, onChange, minH = 80 }: { label: string, helper?: string, value: string, onChange: (v: string) => void, minH?: number }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] mb-1">{label}</label>
      {helper && <p className="text-[12px] text-[#9CA3AF] mb-2">{helper}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} style={{ minHeight: minH }}
        className="w-full border border-[#E5E4E0] rounded-lg px-3 py-2.5 text-[13px] text-[#374151] resize-none outline-none leading-relaxed focus:border-[#4F46E5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow" />
    </div>
  )
}

// --- Impact Strip ---
function ImpactStrip({ text, onPreview }: { text: string, onPreview: () => void }) {
  return (
    <div className="bg-[#F0F4FF] border-radius-6 rounded-md px-3 py-2 mb-5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-[#4338CA] shrink-0" />
        <span className="text-[12px] text-[#4338CA]">Used in: {text}</span>
      </div>
      <button onClick={onPreview} className="text-[12px] text-[#4F46E5] hover:underline ml-4 shrink-0">Preview impact</button>
    </div>
  )
}

// --- Section Card ---
function SectionCard({ id, children }: { id: string, children: React.ReactNode }) {
  return (
    <div id={id} className="bg-white border border-[#E5E4E0] rounded-xl p-6 mb-4 scroll-mt-6">
      {children}
    </div>
  )
}

// --- Preview Modal ---
function PreviewModal({ title, without, withText, onClose }: { title: string, without: string, withText: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-7 w-[560px] relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#374151]"><X className="w-4 h-4" /></button>
        <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-5">How this shapes your briefs</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="inline-block bg-[#F3F4F6] text-[#6B7280] text-[11px] font-medium rounded px-2 py-0.5 mb-3">Without this configured</span>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">{without}</p>
          </div>
          <div>
            <span className="inline-block bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded px-2 py-0.5 mb-3">With this configured</span>
            <p className="text-[13px] text-[#374151] leading-relaxed">{withText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlaybookPage() {
  const [mainTab, setMainTab] = useState<MainTab>("playbook")
  const [activeSection, setActiveSection] = useState<PlaybookSection>("product")
  const [hasChanges, setHasChanges] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle")
  const [previewModal, setPreviewModal] = useState<{ title: string, without: string, withText: string } | null>(null)

  const markChanged = useCallback(() => setHasChanges(true), [])

  // --- Tab 1: Playbook State ---
  const [problem, setProblem] = useState("We help B2B sales teams at Series A–C companies maintain outbound quality and reply rates when scaling AE headcount rapidly. The core problem: adding 3+ AEs in 60 days breaks most outbound motions — generic emails, no research, reply rates collapse.")
  const [forWho, setForWho] = useState("VP of Sales and Head of Sales at B2B SaaS companies, Series A through C, 30–300 employees, actively hiring sales headcount and running outbound.")
  const [different, setDifferent] = useState("We generate genuine intelligence — not just data fields — so reps send 20 highly relevant messages instead of 500 generic ones. The brief is the product. No competitor synthesises across sources the way we do.")

  const [companySizes, setCompanySizes] = useState(["51–200", "201–500"])
  const [fundingStages, setFundingStages] = useState(["Series A", "Series B", "Series C"])
  const [industries, setIndustries] = useState<Tag[]>([{ id: "1", label: "B2B SaaS" }, { id: "2", label: "Fintech" }, { id: "3", label: "HR Tech" }])
  const [techStack, setTechStack] = useState<Tag[]>([{ id: "1", label: "Salesforce" }, { id: "2", label: "Outreach" }, { id: "3", label: "Gong" }, { id: "4", label: "LinkedIn Sales Nav" }])
  const [targetTitles, setTargetTitles] = useState<Tag[]>([{ id: "1", label: "VP of Sales" }, { id: "2", label: "Head of Sales" }, { id: "3", label: "Chief Revenue Officer" }, { id: "4", label: "VP Revenue" }])
  const [seniority, setSeniority] = useState(["C-Suite", "VP"])
  const [negativeICP, setNegativeICP] = useState("Companies under 20 employees (too early stage), companies over 500 employees (too complex a sale), teams not running outbound, non-SaaS businesses, companies outside the US and UK.")

  const [valueProps, setValueProps] = useState<ValueProp[]>([
    { id: "1", outcome: "Higher outbound reply rates at scale", persona: "VP of Sales", delivery: "AI briefs surface non-obvious signals — every message is genuinely relevant, not spray-and-pray" },
    { id: "2", outcome: "Faster AE ramp time", persona: "Head of Sales", delivery: "New reps get full prospect context in 90 seconds instead of 45 minutes of manual research" },
    { id: "3", outcome: "Signal-timed outreach", persona: "CRO", delivery: "Automated monitoring tells reps the perfect moment to reach out — funding, job change, competitor event" },
  ])

  const [competitors, setCompetitors] = useState<Competitor[]>([
    { id: "1", name: "Apollo.io", weakness: "Broad database with shallow intelligence. Reps still do all the research manually — Apollo finds people but doesn't understand them. Outreach is template-based and generic.", angle: "Apollo finds people. Signal understands them. If your rep is spending 45 minutes researching before every email, Signal fixes that — Apollo doesn't try to." },
    { id: "2", name: "ZoomInfo", weakness: "Enterprise pricing, opaque annual contracts, data accuracy issues outside major US markets. Built for RevOps and data teams, not individual reps.", angle: "ZoomInfo costs $15–50K/year and still requires manual research. Signal costs a fraction and does the thinking. Right tool, different job." },
    { id: "3", name: "Clay", weakness: "Powerful but requires a GTM engineer or technical RevOps person to operate. No rep-facing interface. Steep learning curve — not built for daily rep use.", angle: "Clay is what RevOps builds workflows with. Signal is what reps open every morning. If they need Clay, they also need Signal." },
  ])

  const [tone, setTone] = useState(["Conversational"])
  const [msgLength, setMsgLength] = useState(["Medium — 75 to 150 words"])
  const [neverUse, setNeverUse] = useState<Tag[]>([])
  const [goodOpeners, setGoodOpeners] = useState("")

  // --- Tab 2: Signal Settings ---
  const [weights, setWeights] = useState([
    { id: "1", color: "#22C55E", label: "Funding & financial", desc: "New funding rounds, revenue milestones, M&A activity", weight: 9 },
    { id: "2", color: "#3B82F6", label: "Job change / promotion", desc: "New role, promotion, company change in last 90 days", weight: 8 },
    { id: "3", color: "#EAB308", label: "Published content", desc: "Blog posts, LinkedIn articles, social posts about relevant topics", weight: 7 },
    { id: "4", color: "#8B5CF6", label: "Company hiring surge", desc: "Rapid headcount growth, specific role types being hired", weight: 6 },
    { id: "5", color: "#EF4444", label: "Competitor event", desc: "Competitor outage, pricing change, negative press, customer complaints", weight: 8 },
    { id: "6", color: "#F97316", label: "Leadership change", desc: "New CXO, VP, or Director joining the company", weight: 5 },
  ])
  const [keywords, setKeywords] = useState<Tag[]>([
    { id: "1", label: "outbound quality" }, { id: "2", label: "SDR burnout" }, { id: "3", label: "sales stack" }, { id: "4", label: "reply rates" }, { id: "5", label: "outbound at scale" },
  ])
  const [alertThreshold, setAlertThreshold] = useState(6)
  const [alertFreq, setAlertFreq] = useState("Real-time")
  const [notifyVia, setNotifyVia] = useState(["In-app notification", "Email"])

  // --- Tab 3: Watchlist ---
  const [watchCompanies, setWatchCompanies] = useState<WatchCompany[]>([
    { id: "1", name: "Stripe", industry: "Fintech", since: "3 weeks", signal: "New CRO hired" },
    { id: "2", name: "Rippling", industry: "HR Tech", since: "1 month", signal: "Raised Series E" },
    { id: "3", name: "Notion", industry: "SaaS", since: "2 weeks", signal: null },
    { id: "4", name: "Ramp", industry: "Fintech", since: "5 days", signal: "Published outbound strategy post" },
  ])
  const [watchCompetitors] = useState<WatchCompetitor[]>([
    { id: "1", name: "Apollo.io", category: "Sales Intelligence", since: "2 months", signal: "Pricing page updated", leadsCount: 6 },
    { id: "2", name: "ZoomInfo", category: "Sales Intelligence", since: "2 months", signal: "Negative G2 reviews spike", leadsCount: 4 },
    { id: "3", name: "Clay", category: "GTM tooling", since: "1 month", signal: null, leadsCount: 2 },
  ])
  const [jobAlertsOn, setJobAlertsOn] = useState(true)
  const [jobDepts, setJobDepts] = useState(["Sales", "Revenue"])
  const [jobMin, setJobMin] = useState(["3+ roles"])

  // Save handler
  const handleSave = () => {
    setSaveState("saved")
    setHasChanges(false)
    setTimeout(() => setSaveState("idle"), 1500)
  }

  // Wrap state setters to mark changed
  const wrap = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); markChanged() }

  // Scroll spy
  const sectionIds: PlaybookSection[] = ["product", "customer", "valueprops", "competitors", "communication"]
  useEffect(() => {
    if (mainTab !== "playbook") return
    const handleScroll = () => {
      for (const id of [...sectionIds].reverse()) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(id as PlaybookSection)
          return
        }
      }
      setActiveSection("product")
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [mainTab])

  const scrollToSection = (id: PlaybookSection) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(id)
  }

  const sectionNav = [
    { id: "product" as PlaybookSection, dot: "#8B5CF6", label: "Your product", complete: true },
    { id: "customer" as PlaybookSection, dot: "#3B82F6", label: "Ideal customer", complete: true },
    { id: "valueprops" as PlaybookSection, dot: "#22C55E", label: "Value props", complete: true },
    { id: "competitors" as PlaybookSection, dot: "#EF4444", label: "Competitors", complete: true },
    { id: "communication" as PlaybookSection, dot: "#F59E0B", label: "Communication", complete: false },
  ]

  const previewData: Record<PlaybookSection, { title: string, without: string, withText: string }> = {
    product: { title: "Your product", without: "Position your product as relevant to their current situation.", withText: "Lead with the outbound quality problem she wrote about on LinkedIn — this is exactly the pain Signal solves." },
    customer: { title: "Ideal customer", without: "This lead appears to be in your target market.", withText: "Strong ICP fit — Series B SaaS, 80 employees, actively hiring AEs, using Salesforce + Outreach." },
    valueprops: { title: "Value props", without: "Signal can help your sales team improve performance.", withText: "With 3 new AEs joining next month, lead with the ramp time value prop — new reps get full context in 90 seconds." },
    competitors: { title: "Competitors", without: "Mention your key differentiators in the outreach.", withText: "They use Apollo — lead with the depth angle: Apollo finds people, Signal understands them." },
    communication: { title: "Communication", without: "Hi [Name], I wanted to reach out about...", withText: "Saw you just hired 3 AEs in 6 weeks — that's either exciting or chaotic, probably both..." },
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <Sidebar activePage="playbook" />
      <div className="ml-[200px] flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="h-[52px] bg-white border-b border-[#E5E4E0] flex items-center px-6 shrink-0">
          <div className="flex-1">
            <span className="text-[18px] font-semibold text-[#1C1C1C] leading-none block">Playbook</span>
            <span className="text-[12px] text-[#9CA3AF]">Shapes every brief, outreach draft, and signal generated for your team</span>
          </div>
          <div className="flex items-center gap-3">
            {saveState === "saved" ? (
              <span className="text-[12px] text-[#22C55E] font-medium">Saved ✓</span>
            ) : (
              <span className="text-[12px] text-[#9CA3AF]">Last saved 2 minutes ago</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={cn("h-[34px] px-4 rounded-[8px] text-[13px] font-medium transition-colors",
                hasChanges ? "bg-[#1C1C1C] text-white hover:bg-[#2D2D2D]" : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
              )}
            >
              Save changes
            </button>
          </div>
        </div>

        {/* Tab strip */}
        <div className="bg-white border-b border-[#E5E4E0] px-7 flex gap-6">
          {(["playbook", "signal-settings", "watchlist"] as MainTab[]).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)}
              className={cn("py-3 text-[14px] border-b-2 transition-colors",
                mainTab === tab ? "text-[#1C1C1C] font-medium border-[#1C1C1C]" : "text-[#6B7280] border-transparent hover:text-[#374151]"
              )}>
              {tab === "playbook" ? "Playbook" : tab === "signal-settings" ? "Signal settings" : "Watchlist"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-7">

          {/* TAB 1: PLAYBOOK */}
          {mainTab === "playbook" && (
            <div className="grid gap-6" style={{ gridTemplateColumns: "220px 1fr", alignItems: "start" }}>
              {/* Left nav */}
              <div className="bg-white border border-[#E5E4E0] rounded-xl p-3 sticky top-7">
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-2 py-1 mb-1">Sections</p>
                <div className="flex flex-col gap-0.5">
                  {sectionNav.map(s => (
                    <button key={s.id} onClick={() => scrollToSection(s.id)}
                      className={cn("flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] cursor-pointer transition-colors w-full",
                        activeSection === s.id ? "bg-[#EEF2FF] text-[#4338CA] font-medium" : "text-[#6B7280] hover:bg-[#F9FAFB]"
                      )}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                        {s.label}
                      </span>
                      {s.complete ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Minus className="w-3.5 h-3.5 text-[#D1D5DB]" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#F3F4F6] mt-2 pt-2">
                  <p className="text-[12px] text-[#6B7280] px-2 py-1">4 of 5 complete</p>
                  <div className="mx-2 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "80%" }} />
                  </div>
                </div>
              </div>

              {/* Right sections */}
              <div>
                {/* Section 1: Your product */}
                <SectionCard id="product">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#1C1C1C]">
                      <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />Your product
                    </h2>
                  </div>
                  <ImpactStrip text="Brief recommended approach · Outreach drafts" onPreview={() => setPreviewModal(previewData.product)} />
                  <div className="flex flex-col gap-4">
                    <Field label="What problem do you solve?" helper="Be specific — not 'we improve sales performance' but the exact painful moment your customer experiences" value={problem} onChange={v => { setProblem(v); markChanged() }} minH={80} />
                    <Field label="Who do you solve it for?" helper="Company stage, size, and the specific person who feels this pain most acutely" value={forWho} onChange={v => { setForWho(v); markChanged() }} minH={60} />
                    <Field label="What makes you different?" helper="What would a happy customer say you do that no competitor does?" value={different} onChange={v => { setDifferent(v); markChanged() }} minH={60} />
                  </div>
                </SectionCard>

                {/* Section 2: Ideal customer */}
                <SectionCard id="customer">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#1C1C1C]">
                      <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />Ideal customer
                    </h2>
                  </div>
                  <ImpactStrip text="Signal relevance scoring · ICP fit score on every lead · Search default filters" onPreview={() => setPreviewModal(previewData.customer)} />
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-[#374151] mb-2">Company size</label>
                        <PillSelector options={["1–10", "11–50", "51–200", "201–500", "500+"]} selected={companySizes} onToggle={v => { setCompanySizes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]); markChanged() }} />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#374151] mb-2">Funding stage</label>
                        <PillSelector options={["Bootstrapped", "Seed", "Series A", "Series B", "Series C", "Series D+", "Public"]} selected={fundingStages} onToggle={v => { setFundingStages(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]); markChanged() }} />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#374151] mb-2">Industries to target</label>
                        <TagInput tags={industries} setTags={v => { setIndustries(v); markChanged() }} placeholder="Add industry + Enter" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#374151] mb-1">Tech stack signals</label>
                        <p className="text-[11px] text-[#9CA3AF] mb-2">Leads using these tools are higher ICP fit</p>
                        <TagInput tags={techStack} setTags={v => { setTechStack(v); markChanged() }} placeholder="Add tool + Enter" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-[#374151] mb-2">Target job titles</label>
                        <TagInput tags={targetTitles} setTags={v => { setTargetTitles(v); markChanged() }} placeholder="Add title + Enter" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#374151] mb-2">Seniority</label>
                        <PillSelector options={["C-Suite", "VP", "Director", "Manager", "IC"]} selected={seniority} onToggle={v => { setSeniority(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]); markChanged() }} />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#374151] mb-1">Who to exclude — negative ICP</label>
                        <p className="text-[11px] text-[#9CA3AF] mb-2">Leads matching these criteria will be flagged as low fit</p>
                        <textarea value={negativeICP} onChange={e => { setNegativeICP(e.target.value); markChanged() }} style={{ minHeight: 80 }}
                          className="w-full border border-[#E5E4E0] rounded-lg px-3 py-2.5 text-[13px] text-[#374151] resize-none outline-none leading-relaxed focus:border-[#4F46E5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)]" />
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Section 3: Value props */}
                <SectionCard id="valueprops">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#1C1C1C]">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />Value props
                    </h2>
                  </div>
                  <ImpactStrip text="Outreach drafts — most relevant prop selected per lead · Brief recommended approach" onPreview={() => setPreviewModal(previewData.valueprops)} />
                  <div className="grid grid-cols-[40%_30%_1fr] gap-3 px-3 mb-2">
                    <span className="text-[12px] text-[#9CA3AF]">Value prop</span>
                    <span className="text-[12px] text-[#9CA3AF]">Relevant for</span>
                    <span className="text-[12px] text-[#9CA3AF]">How you deliver it</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {valueProps.map((vp, i) => (
                      <div key={vp.id} className="border border-[#E5E4E0] rounded-lg px-4 py-3 flex items-start gap-3">
                        <div className="flex items-center gap-2 shrink-0 mt-1">
                          <GripVertical className="w-4 h-4 text-[#D1D5DB]" />
                          <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[12px] font-semibold text-[#374151] flex items-center justify-center">{i + 1}</span>
                        </div>
                        <div className="flex-1 grid grid-cols-[2fr_1fr_2fr] gap-3">
                          <input value={vp.outcome} onChange={e => { setValueProps(prev => prev.map(p => p.id === vp.id ? { ...p, outcome: e.target.value } : p)); markChanged() }}
                            className="border-b border-[#F3F4F6] text-[13px] font-medium text-[#1C1C1C] outline-none py-1 bg-transparent" placeholder="Outcome e.g. Higher reply rates" />
                          <input value={vp.persona} onChange={e => { setValueProps(prev => prev.map(p => p.id === vp.id ? { ...p, persona: e.target.value } : p)); markChanged() }}
                            className="border-b border-[#F3F4F6] text-[13px] text-[#1C1C1C] outline-none py-1 bg-transparent" placeholder="Persona e.g. VP Sales" />
                          <input value={vp.delivery} onChange={e => { setValueProps(prev => prev.map(p => p.id === vp.id ? { ...p, delivery: e.target.value } : p)); markChanged() }}
                            className="border-b border-[#F3F4F6] text-[13px] text-[#6B7280] outline-none py-1 bg-transparent" placeholder="How you deliver this..." />
                        </div>
                        <button onClick={() => { setValueProps(prev => prev.filter(p => p.id !== vp.id)); markChanged() }} className="text-[#D1D5DB] hover:text-[#9CA3AF] mt-1 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setValueProps(prev => [...prev, { id: Date.now().toString(), outcome: "", persona: "", delivery: "" }]); markChanged() }}
                    className="mt-3 text-[13px] text-[#4F46E5] hover:underline">
                    + Add value prop
                  </button>
                </SectionCard>

                {/* Section 4: Competitors */}
                <SectionCard id="competitors">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#1C1C1C]">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />Competitors
                    </h2>
                  </div>
                  <ImpactStrip text="Brief recommended approach when competitor tech stack detected · Signal feed displacement alerts" onPreview={() => setPreviewModal(previewData.competitors)} />
                  <div className="flex flex-col gap-3">
                    {competitors.map(c => (
                      <div key={c.id} className="border border-[#E5E4E0] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <input value={c.name} onChange={e => { setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, name: e.target.value } : p)); markChanged() }}
                            className="text-[14px] font-semibold text-[#1C1C1C] border-none outline-none bg-transparent flex-1" placeholder="Competitor name" />
                          <button onClick={() => { setCompetitors(prev => prev.filter(p => p.id !== c.id)); markChanged() }}
                            className="text-[12px] text-[#9CA3AF] hover:text-[#DC2626] ml-4">Remove</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Their weakness</label>
                            <textarea value={c.weakness} onChange={e => { setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, weakness: e.target.value } : p)); markChanged() }}
                              style={{ minHeight: 64 }} className="w-full border border-[#E5E4E0] rounded-md px-2.5 py-2 text-[13px] text-[#374151] resize-none outline-none leading-relaxed focus:border-[#4F46E5]" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Your displacement angle</label>
                            <textarea value={c.angle} onChange={e => { setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, angle: e.target.value } : p)); markChanged() }}
                              style={{ minHeight: 64 }} className="w-full border border-[#E5E4E0] rounded-md px-2.5 py-2 text-[13px] text-[#374151] resize-none outline-none leading-relaxed focus:border-[#4F46E5]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setCompetitors(prev => [...prev, { id: Date.now().toString(), name: "", weakness: "", angle: "" }]); markChanged() }}
                    className="mt-3 text-[13px] text-[#4F46E5] hover:underline">
                    + Add competitor
                  </button>
                </SectionCard>

                {/* Section 5: Communication */}
                <SectionCard id="communication">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#1C1C1C]">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />Communication preferences
                    </h2>
                  </div>
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-2.5 mb-5 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                    <span className="text-[13px] text-[#92400E]">Incomplete — outreach will use Signal defaults until you configure this.</span>
                  </div>
                  <ImpactStrip text="All outreach drafts generated for your team" onPreview={() => setPreviewModal(previewData.communication)} />
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-2">Default tone</label>
                      <PillSelector single options={["Formal", "Conversational", "Direct"]} selected={tone} onToggle={v => { setTone([v]); markChanged() }} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-2">Default message length</label>
                      <PillSelector single options={["Short — under 75 words", "Medium — 75 to 150 words", "Long — 150+ words"]} selected={msgLength} onToggle={v => { setMsgLength([v]); markChanged() }} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1">Phrases to never use</label>
                      <p className="text-[11px] text-[#9CA3AF] mb-2">Signal will never include these in any outreach draft for your team</p>
                      <TagInput tags={neverUse} setTags={v => { setNeverUse(v); markChanged() }} placeholder="Type a phrase and press Enter... e.g. 'just checking in', 'circle back'" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1">Opening lines that have worked well</label>
                      <p className="text-[11px] text-[#9CA3AF] mb-2">Share examples of openers that have gotten replies. Signal learns your team's voice from these.</p>
                      <textarea value={goodOpeners} onChange={e => { setGoodOpeners(e.target.value); markChanged() }} style={{ minHeight: 80 }}
                        placeholder="e.g. 'Saw you just hired 3 AEs in 6 weeks — that's either exciting or chaotic, probably both...'"
                        className="w-full border border-[#E5E4E0] rounded-lg px-3 py-2.5 text-[13px] text-[#374151] resize-none outline-none leading-relaxed placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)]" />
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {/* TAB 2: SIGNAL SETTINGS */}
          {mainTab === "signal-settings" && (
            <div className="max-w-[860px]">
              {/* Signal weights */}
              <div className="bg-white border border-[#E5E4E0] rounded-xl p-6 mb-4">
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-1">Signal weights</h2>
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">Controls how each signal type contributes to the overall timing score on every brief and lead. Higher weight = more influence on whether a lead shows as Strong, Medium, or Low.</p>
                <div className="flex flex-col">
                  {weights.map((row, i) => (
                    <div key={row.id} className={cn("flex items-center gap-4 py-3", i < weights.length - 1 ? "border-b border-[#F3F4F6]" : "")}>
                      <div className="flex items-center gap-2 w-[200px] shrink-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                        <span className="text-[14px] font-medium text-[#1C1C1C]">{row.label}</span>
                      </div>
                      <p className="text-[12px] text-[#6B7280] flex-1 leading-relaxed">{row.desc}</p>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[16px] font-semibold text-[#1C1C1C] w-7 text-right">{row.weight}</span>
                        <input type="range" min={0} max={10} step={1} value={row.weight}
                          onChange={e => { setWeights(prev => prev.map(w => w.id === row.id ? { ...w, weight: Number(e.target.value) } : w)); markChanged() }}
                          className="w-[120px] accent-indigo-600" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-lg p-3 mt-4">
                  <p className="text-[12px] font-medium text-[#374151] mb-1">How scores are calculated</p>
                  <p className="text-[12px] text-[#6B7280] leading-relaxed">Signal score = sum of active signal weights × recency multiplier (1.0 for this week, 0.7 for this month, 0.3 for older). Scores above 15 = Strong, 8–15 = Medium, below 8 = Low.</p>
                </div>
              </div>

              {/* Custom keywords */}
              <div className="bg-white border border-[#E5E4E0] rounded-xl p-6 mb-4">
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-1">Custom keywords</h2>
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">Signal will alert you whenever any monitored lead or company publishes content or appears in news mentioning these phrases. Use these to catch intent signals specific to your product.</p>
                <IndigoTagInput tags={keywords} setTags={v => { setKeywords(v); markChanged() }} placeholder="Add keyword or phrase + Enter" />
                <p className="text-[12px] text-[#9CA3AF] mt-2">These keywords are monitored across Google News, LinkedIn posts, and company blog content. Each keyword match creates a Content signal in your feed.</p>
              </div>

              {/* Alert preferences */}
              <div className="bg-white border border-[#E5E4E0] rounded-xl p-6">
                <h2 className="text-[16px] font-semibold text-[#1C1C1C] mb-1">Alert preferences</h2>
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">Controls when and how Signal notifies you and your team about new signals.</p>

                <div className="flex flex-col gap-6">
                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1">Minimum signal score to alert</label>
                    <p className="text-[12px] text-[#9CA3AF] mb-3">Only notify when a lead's signal score exceeds this threshold. Prevents noise from low-relevance events.</p>
                    <p className="text-[15px] font-semibold text-[#4F46E5] mb-2">Score {alertThreshold}+</p>
                    <input type="range" min={1} max={10} step={1} value={alertThreshold}
                      onChange={e => { setAlertThreshold(Number(e.target.value)); markChanged() }}
                      className="w-full accent-indigo-600" />
                    <div className="flex justify-between mt-1">
                      <span className="text-[11px] text-[#9CA3AF]">1 — All signals</span>
                      <span className="text-[11px] text-[#9CA3AF]">10 — Only exceptional</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-1">Alert frequency</label>
                    <p className="text-[12px] text-[#9CA3AF] mb-3">How often Signal delivers new signal alerts to your team.</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "Real-time", sub: "Alert as soon as a signal is detected" },
                        { key: "Daily digest", sub: "One summary email every morning at 8am" },
                        { key: "Weekly", sub: "Summary every Monday morning" },
                      ].map(opt => (
                        <button key={opt.key} onClick={() => { setAlertFreq(opt.key); markChanged() }}
                          className={cn("border rounded-lg p-3 text-left transition-colors",
                            alertFreq === opt.key ? "border-2 border-[#4F46E5] bg-[#FAFAFE]" : "border border-[#E5E4E0] hover:border-[#4F46E5]"
                          )}>
                          <p className="text-[13px] font-medium text-[#1C1C1C]">{opt.key}</p>
                          <p className="text-[12px] text-[#6B7280] mt-0.5">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#374151] mb-3">Notify via</label>
                    <div className="flex flex-col gap-2">
                      {["In-app notification", "Email"].map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={notifyVia.includes(opt)}
                            onChange={() => { setNotifyVia(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]); markChanged() }}
                            className="rounded accent-indigo-600" />
                          <span className="text-[13px] text-[#374151]">{opt}</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                        <input type="checkbox" disabled className="rounded" />
                        <span className="text-[13px] text-[#374151]">Slack (not connected)</span>
                        <a href="#" className="text-[12px] text-[#4F46E5] ml-1">Connect Slack →</a>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WATCHLIST */}
          {mainTab === "watchlist" && (
            <div className="max-w-[860px]">
              {/* Company watchlist */}
              <div className="bg-white border border-[#E5E4E0] rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[16px] font-semibold text-[#1C1C1C]">Company watchlist</h2>
                  <button onClick={() => { setWatchCompanies(prev => [...prev, { id: Date.now().toString(), name: "", industry: "", since: "Just added", signal: null }]); markChanged() }}
                    className="h-8 px-3.5 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D]">
                    + Add company
                  </button>
                </div>
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">Monitor these companies for signals even without a specific contact. When a signal fires, Signal suggests relevant people to research at that company.</p>
                <div className="flex flex-col">
                  {watchCompanies.map((co, i) => (
                    <div key={co.id} className={cn("flex items-center gap-3 py-3", i < watchCompanies.length - 1 ? "border-b border-[#F3F4F6]" : "")}>
                      <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4338CA] text-[13px] font-semibold flex items-center justify-center shrink-0">
                        {co.name ? co.name[0] : "?"}
                      </div>
                      <span className="text-[14px] font-medium text-[#1C1C1C] w-[150px] shrink-0">{co.name || <span className="text-[#9CA3AF]">New company</span>}</span>
                      <span className="bg-[#F3F4F6] text-[#374151] rounded px-2 py-0.5 text-[12px]">{co.industry || "—"}</span>
                      <span className="text-[12px] text-[#9CA3AF] flex-1">Monitoring since {co.since}</span>
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span className={cn("w-1.5 h-1.5 rounded-full", co.signal ? "bg-[#22C55E]" : "bg-[#D1D5DB]")} />
                        <span className={co.signal ? "text-[#374151]" : "text-[#9CA3AF]"}>{co.signal || "No signals yet"}</span>
                      </span>
                      <button onClick={() => { setWatchCompanies(prev => prev.filter(c => c.id !== co.id)); markChanged() }}
                        className="text-[12px] text-[#9CA3AF] hover:text-[#DC2626] ml-2">Remove</button>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full border border-dashed border-[#E5E4E0] rounded-lg py-4 text-[13px] text-[#9CA3AF] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors text-center"
                  onClick={() => { setWatchCompanies(prev => [...prev, { id: Date.now().toString(), name: "", industry: "", since: "Just added", signal: null }]); markChanged() }}>
                  + Add a company to monitor
                </button>
              </div>

              {/* Competitor monitoring */}
              <div className="bg-white border border-[#E5E4E0] rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[16px] font-semibold text-[#1C1C1C]">Competitor monitoring</h2>
                  <button className="h-8 px-3.5 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D]">+ Add competitor</button>
                </div>
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">Signal watches these competitors for outages, pricing changes, negative press, and customer complaints. When something happens, it creates displacement signals for all leads using that competitor.</p>
                <div className="flex flex-col">
                  {watchCompetitors.map((co, i) => (
                    <div key={co.id} className={cn("flex items-center gap-3 py-3", i < watchCompetitors.length - 1 ? "border-b border-[#F3F4F6]" : "")}>
                      <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#991B1B] text-[13px] font-semibold flex items-center justify-center shrink-0">
                        {co.name[0]}
                      </div>
                      <span className="text-[14px] font-medium text-[#1C1C1C] w-[130px] shrink-0">{co.name}</span>
                      <span className="bg-[#F3F4F6] text-[#374151] rounded px-2 py-0.5 text-[12px]">{co.category}</span>
                      <span className="text-[12px] text-[#9CA3AF] flex-1">Monitoring since {co.since}</span>
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span className={cn("w-1.5 h-1.5 rounded-full", co.signal ? "bg-[#22C55E]" : "bg-[#D1D5DB]")} />
                        <span className={co.signal ? "text-[#374151]" : "text-[#9CA3AF]"}>{co.signal || "No signals yet"}</span>
                      </span>
                      <span className="bg-[#FEF3C7] text-[#92400E] rounded-full px-2 py-0.5 text-[11px]">{co.leadsCount} leads use {co.name.split(".")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job posting alerts */}
              <div className="bg-white border border-[#E5E4E0] rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[16px] font-semibold text-[#1C1C1C]">Job posting alerts</h2>
                  <button onClick={() => { setJobAlertsOn(v => !v); markChanged() }}
                    className={cn("w-10 h-6 rounded-full transition-colors relative", jobAlertsOn ? "bg-indigo-600" : "bg-[#D1D5DB]")}>
                    <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform", jobAlertsOn ? "translate-x-5" : "translate-x-1")} />
                  </button>
                </div>
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-5">Signal scans job postings across all monitored companies and leads. When a company posts a role matching your criteria, it creates a hiring signal — indicating growth, budget, and tool evaluation.</p>
                {jobAlertsOn && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-2">Alert me when a company posts roles in these departments</label>
                      <PillSelector options={["Sales", "Revenue", "Marketing", "Engineering", "Customer Success", "Operations"]} selected={jobDepts} onToggle={v => { setJobDepts(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]); markChanged() }} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#374151] mb-1">Minimum number of new postings to trigger a signal</label>
                      <p className="text-[12px] text-[#9CA3AF] mb-3">Prevents a single new role from creating noise — only alert when hiring is clearly accelerating</p>
                      <PillSelector single options={["1+ roles", "3+ roles", "5+ roles"]} selected={jobMin} onToggle={v => { setJobMin([v]); markChanged() }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewModal && <PreviewModal {...previewModal} onClose={() => setPreviewModal(null)} />}
    </div>
  )
}
