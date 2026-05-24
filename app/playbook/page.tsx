"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/signal/sidebar"
import { Check, Minus, X, GripVertical, Trash2, Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// --- Types ---
type PlaybookSection = "product" | "valueprops" | "competitors" | "voice"

interface Tag { id: string; label: string }
interface ValueProp { id: string; outcome: string; persona: string; delivery: string }
interface Competitor { id: string; name: string; weakness: string; angle: string }

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
    <div className="border border-signal-border rounded-lg px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 items-center focus-within:border-signal-accent focus-within:shadow-[0_0_0_3px_rgba(79,70,229,0.08)]">
      {tags.map(t => (
        <span key={t.id} className="flex items-center gap-1 bg-signal-raised text-signal-text-2 rounded-full px-2.5 py-0.5 text-[12px]">
          {t.label}
          <button onClick={() => setTags(tags.filter(x => x.id !== t.id))} className="text-signal-text-4 hover:text-signal-text-2"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder={placeholder} className="border-none outline-none text-[13px] text-signal-text-2 bg-transparent flex-1 min-w-[140px] placeholder:text-signal-text-4" />
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
              active ? "bg-signal-accent-tint text-signal-accent-2 border-signal-accent-border" : "bg-signal-bg text-signal-text-3 border-signal-border hover:border-signal-accent-border"
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
      <label className="block text-[13px] font-medium text-signal-text-2 mb-1">{label}</label>
      {helper && <p className="text-[12px] text-signal-text-4 mb-2">{helper}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} style={{ minHeight: minH }}
        className="w-full border border-signal-border rounded-lg px-3 py-2.5 text-[13px] text-signal-text-2 resize-none outline-none leading-relaxed focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow" />
    </div>
  )
}

// --- Impact Strip ---
function ImpactStrip({ text, onPreview }: { text: string, onPreview: () => void }) {
  return (
    <div className="bg-signal-accent-tint border-radius-6 rounded-md px-3 py-2 mb-5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-signal-accent-2 shrink-0" />
        <span className="text-[12px] text-signal-accent-2">Used in: {text}</span>
      </div>
      <button onClick={onPreview} className="text-[12px] text-signal-accent hover:underline ml-4 shrink-0">Preview impact</button>
    </div>
  )
}

// --- Section Card ---
function SectionCard({ id, children }: { id: string, children: React.ReactNode }) {
  return (
    <div id={id} className="bg-signal-bg border border-signal-border rounded-xl p-6 mb-4 scroll-mt-6">
      {children}
    </div>
  )
}

// --- Preview Modal ---
function PreviewModal({ title, without, withText, onClose }: { title: string, without: string, withText: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-signal-bg rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-7 w-[560px] relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-signal-text-4 hover:text-signal-text-2"><X className="w-4 h-4" /></button>
        <h2 className="text-[16px] font-semibold text-signal-text-1 mb-5">How this shapes your briefs</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="inline-block bg-signal-raised text-signal-text-3 text-[11px] font-medium rounded px-2 py-0.5 mb-3">Without this configured</span>
            <p className="text-[13px] text-signal-text-3 leading-relaxed">{without}</p>
          </div>
          <div>
            <span className="inline-block bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded px-2 py-0.5 mb-3">With this configured</span>
            <p className="text-[13px] text-signal-text-2 leading-relaxed">{withText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Brief Impact Badge ---
function BriefBadge({ section }: { section: string }) {
  return (
    <span className="ml-2 inline-flex items-center gap-1 bg-signal-accent-tint text-signal-accent-2 text-[11px] font-medium px-2 py-0.5 rounded-full border border-signal-accent-border">
      shapes → {section}
    </span>
  )
}

export default function PlaybookPage() {
  const [activeSection, setActiveSection] = useState<PlaybookSection>("product")
  const [hasChanges, setHasChanges] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [loading, setLoading] = useState(true)
  const [previewModal, setPreviewModal] = useState<{ title: string, without: string, withText: string } | null>(null)

  const markChanged = useCallback(() => setHasChanges(true), [])

  // --- Tab 1: Playbook State ---
  const [productName, setProductName] = useState("")
  const [problem, setProblem] = useState("")
  const [forWho, setForWho] = useState("")
  const [different, setDifferent] = useState("")
  const [valueProps, setValueProps] = useState<ValueProp[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [tone, setTone] = useState(["Conversational"])
  const [neverUse, setNeverUse] = useState<Tag[]>([])

  // Load playbook from DB on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/playbook")
        if (!res.ok) return
        const data = await res.json()
        if (data.product_name) setProductName(data.product_name)
        if (data.problem) setProblem(data.problem)
        if (data.for_who) setForWho(data.for_who)
        if (data.different) setDifferent(data.different)
        if (data.value_props?.length) setValueProps(data.value_props)
        if (data.competitors?.length) setCompetitors(data.competitors)
        if (data.tone?.length) setTone(data.tone)
        if (data.never_use?.length) setNeverUse(data.never_use)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Save handler
  const handleSave = async () => {
    setSaveState("saving")
    try {
      const res = await fetch("/api/playbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          problem,
          for_who: forWho,
          different,
          value_props: valueProps,
          competitors,
          tone,
          never_use: neverUse,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaveState("saved")
      setHasChanges(false)
      setTimeout(() => setSaveState("idle"), 1500)
    } catch {
      setSaveState("idle")
    }
  }

  // Scroll spy
  const sectionIds: PlaybookSection[] = ["product", "valueprops", "competitors", "voice"]
  useEffect(() => {
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
  }, [])

  const scrollToSection = (id: PlaybookSection) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(id)
  }

  const sectionComplete = {
    product: !!(productName.trim() && problem.trim() && forWho.trim() && different.trim()),
    valueprops: valueProps.length > 0,
    competitors: competitors.length > 0,
    voice: tone.length > 0,
  }
  const completedCount = Object.values(sectionComplete).filter(Boolean).length

  const sectionNav = [
    { id: "product" as PlaybookSection, dot: "#8B5CF6", label: "Your product", complete: sectionComplete.product },
    { id: "valueprops" as PlaybookSection, dot: "#22C55E", label: "Value props", complete: sectionComplete.valueprops },
    { id: "competitors" as PlaybookSection, dot: "#EF4444", label: "Competitors", complete: sectionComplete.competitors },
    { id: "voice" as PlaybookSection, dot: "#F59E0B", label: "Your voice", complete: sectionComplete.voice },
  ]

  const previewData: Record<PlaybookSection, { title: string, without: string, withText: string }> = {
    product: { title: "Your product", without: "Position your product as relevant to their current situation.", withText: "Lead with the outbound quality problem she wrote about on LinkedIn — this is exactly the pain Signal solves." },
    valueprops: { title: "Value props", without: "Signal can help your sales team improve performance.", withText: "With 3 new AEs joining next month, lead with the ramp time value prop — new reps get full context in 90 seconds." },
    competitors: { title: "Competitors", without: "Mention your key differentiators in the outreach.", withText: "They use Apollo — lead with the depth angle: Apollo finds people, Signal understands them." },
    voice: { title: "Your voice", without: "Hi [Name], I wanted to reach out about...", withText: "Saw you just hired 3 AEs in 6 weeks — that's either exciting or chaotic, probably both..." },
  }

  return (
    <div className="min-h-screen bg-signal-bg">
      <Sidebar activePage="playbook" />
      <div className="ml-[200px] flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="h-[52px] bg-signal-bg border-b border-signal-border flex items-center px-6 shrink-0">
          <div className="flex-1">
            <span className="text-[18px] font-semibold text-signal-text-1 leading-none block">Playbook</span>
            <span className="text-[12px] text-signal-text-4">Shapes every brief, outreach draft, and signal generated for your team</span>
          </div>
          <div className="flex items-center gap-3">
            {saveState === "saved" ? (
              <span className="text-[12px] text-[#22C55E] font-medium">Saved ✓</span>
            ) : saveState === "saving" ? (
              <span className="text-[12px] text-signal-text-4 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Saving...</span>
            ) : (
              <span className="text-[12px] text-signal-text-4">{hasChanges ? "Unsaved changes" : "All changes saved"}</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveState === "saving" || loading}
              className={cn("h-[34px] px-4 rounded-[8px] text-[13px] font-medium transition-colors",
                hasChanges && saveState !== "saving" && !loading ? "bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] hover:bg-[#2D2D2D] dark:hover:bg-[#E4E4E7]" : "bg-signal-raised text-signal-text-4 cursor-not-allowed"
              )}
            >
              Save changes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-7">

          <div className="grid gap-6" style={{ gridTemplateColumns: "220px 1fr", alignItems: "start" }}>
              {/* Left nav */}
              <div className="bg-signal-bg border border-signal-border rounded-xl p-3 sticky top-7">
                <p className="text-[11px] font-semibold text-signal-text-4 uppercase tracking-wider px-2 py-1 mb-1">Sections</p>
                <div className="flex flex-col gap-0.5">
                  {sectionNav.map(s => (
                    <button key={s.id} onClick={() => scrollToSection(s.id)}
                      className={cn("flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] cursor-pointer transition-colors w-full",
                        activeSection === s.id ? "bg-signal-accent-tint text-signal-accent-2 font-medium" : "text-signal-text-3 hover:bg-signal-surface"
                      )}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                        {s.label}
                      </span>
                      {s.complete ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Minus className="w-3.5 h-3.5 text-signal-text-4" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-signal-border-faint mt-2 pt-2">
                  <p className="text-[12px] text-signal-text-3 px-2 py-1">{completedCount} of 4 complete</p>
                  <div className="mx-2 h-1 bg-signal-raised rounded-full overflow-hidden">
                    <div className="h-full bg-signal-accent rounded-full transition-all" style={{ width: `${(completedCount / 4) * 100}%` }} />
                  </div>
                  <p className="text-[11px] px-2 pt-1.5">Brief quality: <span className={cn("font-medium", completedCount === 4 ? "text-[#22C55E]" : completedCount >= 2 ? "text-[#F59E0B]" : "text-signal-text-4")}>{completedCount === 4 ? "Excellent" : completedCount >= 2 ? "Good" : "Basic"}</span></p>
                </div>
              </div>

              {/* Right sections */}
              <div>
                {/* Section 1: Your product */}
                <SectionCard id="product">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-signal-text-1">
                      <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />Your product
                      <BriefBadge section="The Angle" />
                    </h2>
                  </div>
                  <ImpactStrip text="The Angle in every brief + outreach framing" onPreview={() => setPreviewModal(previewData.product)} />
                  <div className="flex flex-col gap-4">
                    <Field label="Product name" helper="The exact name of your product as you'd say it in an email" value={productName} onChange={v => { setProductName(v); markChanged() }} minH={40} />
                    <Field label="What problem do you solve?" helper="Be specific — not 'we improve sales performance' but the exact painful moment your customer experiences" value={problem} onChange={v => { setProblem(v); markChanged() }} minH={80} />
                    <Field label="Who do you solve it for?" helper="Company stage, size, and the specific person who feels this pain most acutely" value={forWho} onChange={v => { setForWho(v); markChanged() }} minH={60} />
                    <Field label="What makes you different?" helper="What would a happy customer say you do that no competitor does?" value={different} onChange={v => { setDifferent(v); markChanged() }} minH={60} />
                  </div>
                </SectionCard>

                {/* Section 2: Value props */}
                <SectionCard id="valueprops">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-signal-text-1">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />Value props
                      <BriefBadge section="What Hurts" />
                    </h2>
                  </div>
                  <ImpactStrip text="The ‘What Hurts’ section of every brief" onPreview={() => setPreviewModal(previewData.valueprops)} />
                  <div className="grid grid-cols-[40%_30%_1fr] gap-3 px-3 mb-2">
                    <span className="text-[12px] text-signal-text-4">Value prop</span>
                    <span className="text-[12px] text-signal-text-4">Relevant for</span>
                    <span className="text-[12px] text-signal-text-4">How you deliver it</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {valueProps.map((vp, i) => (
                      <div key={vp.id} className="border border-signal-border rounded-lg px-4 py-3 flex items-start gap-3">
                        <div className="flex items-center gap-2 shrink-0 mt-1">
                          <GripVertical className="w-4 h-4 text-signal-text-4" />
                          <span className="w-6 h-6 rounded-full bg-signal-raised text-[12px] font-semibold text-signal-text-2 flex items-center justify-center">{i + 1}</span>
                        </div>
                        <div className="flex-1 grid grid-cols-[2fr_1fr_2fr] gap-3">
                          <input value={vp.outcome} onChange={e => { setValueProps(prev => prev.map(p => p.id === vp.id ? { ...p, outcome: e.target.value } : p)); markChanged() }}
                            className="border-b border-signal-border-faint text-[13px] font-medium text-signal-text-1 outline-none py-1 bg-transparent" placeholder="Outcome e.g. Higher reply rates" />
                          <input value={vp.persona} onChange={e => { setValueProps(prev => prev.map(p => p.id === vp.id ? { ...p, persona: e.target.value } : p)); markChanged() }}
                            className="border-b border-signal-border-faint text-[13px] text-signal-text-1 outline-none py-1 bg-transparent" placeholder="Persona e.g. VP Sales" />
                          <input value={vp.delivery} onChange={e => { setValueProps(prev => prev.map(p => p.id === vp.id ? { ...p, delivery: e.target.value } : p)); markChanged() }}
                            className="border-b border-signal-border-faint text-[13px] text-signal-text-3 outline-none py-1 bg-transparent" placeholder="How you deliver this..." />
                        </div>
                        <button onClick={() => { setValueProps(prev => prev.filter(p => p.id !== vp.id)); markChanged() }} className="text-signal-text-4 hover:text-signal-text-4 mt-1 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setValueProps(prev => [...prev, { id: Date.now().toString(), outcome: "", persona: "", delivery: "" }]); markChanged() }}
                    className="mt-3 text-[13px] text-signal-accent hover:underline">
                    + Add value prop
                  </button>
                </SectionCard>

                {/* Section 3: Competitors */}
                <SectionCard id="competitors">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-signal-text-1">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />Competitors
                      <BriefBadge section="The Angle + Outreach" />
                    </h2>
                  </div>
                  <ImpactStrip text="The Angle + competitive framing in every draft" onPreview={() => setPreviewModal(previewData.competitors)} />
                  <div className="flex flex-col gap-3">
                    {competitors.map(c => (
                      <div key={c.id} className="border border-signal-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <input value={c.name} onChange={e => { setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, name: e.target.value } : p)); markChanged() }}
                            className="text-[14px] font-semibold text-signal-text-1 border-none outline-none bg-transparent flex-1" placeholder="Competitor name" />
                          <button onClick={() => { setCompetitors(prev => prev.filter(p => p.id !== c.id)); markChanged() }}
                            className="text-[12px] text-signal-text-4 hover:text-[#DC2626] ml-4">Remove</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-signal-text-4 uppercase tracking-wider mb-1.5">Their weakness</label>
                            <textarea value={c.weakness} onChange={e => { setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, weakness: e.target.value } : p)); markChanged() }}
                              style={{ minHeight: 64 }} className="w-full border border-signal-border rounded-md px-2.5 py-2 text-[13px] text-signal-text-2 resize-none outline-none leading-relaxed focus:border-signal-accent" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-signal-text-4 uppercase tracking-wider mb-1.5">Your displacement angle</label>
                            <textarea value={c.angle} onChange={e => { setCompetitors(prev => prev.map(p => p.id === c.id ? { ...p, angle: e.target.value } : p)); markChanged() }}
                              style={{ minHeight: 64 }} className="w-full border border-signal-border rounded-md px-2.5 py-2 text-[13px] text-signal-text-2 resize-none outline-none leading-relaxed focus:border-signal-accent" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setCompetitors(prev => [...prev, { id: Date.now().toString(), name: "", weakness: "", angle: "" }]); markChanged() }}
                    className="mt-3 text-[13px] text-signal-accent hover:underline">
                    + Add competitor
                  </button>
                </SectionCard>

                {/* Section 4: Your voice */}
                <SectionCard id="voice">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="flex items-center gap-2 text-[16px] font-semibold text-signal-text-1">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />Your voice
                      <BriefBadge section="all 5 outreach drafts" />
                    </h2>
                  </div>
                  <ImpactStrip text="Tone, language, and word choice across all 5 drafts" onPreview={() => setPreviewModal(previewData.voice)} />
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-[13px] font-medium text-signal-text-2 mb-1">Tone</label>
                      <p className="text-[11px] text-signal-text-4 mb-2">How your brand communicates. Every outreach draft will match this voice.</p>
                      <PillSelector single options={["Formal", "Conversational", "Direct"]} selected={tone} onToggle={v => { setTone([v]); markChanged() }} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-signal-text-2 mb-1">Phrases to never use</label>
                      <p className="text-[11px] text-signal-text-4 mb-2">Signal will never include these in any outreach draft. Good for brand voice guardrails and avoiding clichés.</p>
                      <TagInput tags={neverUse} setTags={v => { setNeverUse(v); markChanged() }} placeholder="Type a phrase and press Enter... e.g. 'just checking in', 'circle back'" />
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>

        </div>
      </div>

      {/* Preview modal */}
      {previewModal && <PreviewModal {...previewModal} onClose={() => setPreviewModal(null)} />}
    </div>
  )
}
