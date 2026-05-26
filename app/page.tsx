"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  ArrowRight, Zap, Brain, Target, CheckCircle, TrendingUp,
  Users, Clock, Search, FileText, Database, GitBranch,
  Layers, Sparkles, ChevronRight, BarChart3, Activity, MessageSquare,
} from "lucide-react"

// ─── Animated counter (fires once when scrolled into view) ───────────────────
function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return
      done.current = true
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - t0) / 1800, 1)
        setV(Math.round((1 - Math.pow(1 - p, 3)) * to))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{prefix}{v.toLocaleString()}{suffix}</span>
}

// ─── Hero brief mockup ────────────────────────────────────────────────────────
const BRIEF_LINES = [
  { label: "WHO THEY ARE", text: "Alex Chen is VP Sales at Stripe — 180-person enterprise org. Former Salesforce AE, went operator-side in 2019. Pragmatic, direct, metrics-obsessed.", delay: 700 },
  { label: "WHY NOW", text: "Stripe raised processing fees 40% last week. Alex's board pipeline review is Friday. His LinkedIn posts are unusually candid right now.", delay: 1600 },
  { label: "THE ANGLE", text: "Lead with cost reduction — not features. Reference the fee change by name. He respects directness; skip the discovery theater.", delay: 2500 },
  { label: "OUTREACH DRAFT", text: "Hey Alex — saw the news on Stripe's fee restructure last week. Wanted to share how teams in your position are absorbing the delta without touching headcount…", delay: 3400 },
]

function BriefMockup() {
  const [visible, setVisible] = useState(0)
  const [cycle, setCycle] = useState(0)
  useEffect(() => {
    setVisible(0)
    const timers = BRIEF_LINES.map((l, i) => setTimeout(() => setVisible(i + 1), l.delay))
    const reset = setTimeout(() => { setVisible(0); setCycle(c => c + 1) }, 6200)
    return () => { timers.forEach(clearTimeout); clearTimeout(reset) }
  }, [cycle])

  return (
    <div className="relative w-full max-w-[500px] rounded-2xl border border-white/10 bg-[#0b0b14] shadow-[0_0_80px_rgba(99,102,241,0.15)] overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.07]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c840]" />
        <span className="ml-3 text-[11px] font-mono text-white/25">signal — brief generation</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-white/30">5 agents active</span>
        </div>
      </div>
      {/* Prospect header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[12px] font-bold shrink-0">AC</div>
        <div>
          <p className="text-[13px] font-semibold">Alex Chen</p>
          <p className="text-[11px] text-white/40">VP Sales · Stripe · San Francisco</p>
        </div>
        <div className="ml-auto">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-mono tracking-wider">SCORE 94</span>
        </div>
      </div>
      {/* Brief content */}
      <div className="px-4 py-4 space-y-3.5 min-h-[200px]">
        {visible === 0 && (
          <div className="flex items-center gap-2.5 text-white/25 pt-1">
            <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-[11px] font-mono">Researching across 5 sources…</span>
          </div>
        )}
        {BRIEF_LINES.slice(0, visible).map((line, i) => (
          <div key={i} style={{ animation: "fadeUp 0.4s ease-out both" }}>
            <p className="text-[9px] font-mono tracking-[0.14em] text-indigo-400/60 mb-1">{line.label}</p>
            <p className="text-[12px] text-white/65 leading-relaxed">
              {line.text}
              {i === visible - 1 && (
                <span className="inline-block w-[2px] h-[12px] bg-indigo-400 ml-0.5 align-middle animate-pulse" />
              )}
            </p>
          </div>
        ))}
      </div>
      {/* Agent strip */}
      <div className="flex items-center gap-1.5 flex-wrap px-4 py-2.5 border-t border-white/[0.04] bg-[#090912]">
        {["LinkedIn", "Web", "News", "Jobs", "CRM"].map((a, i) => (
          <span key={a} className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border transition-all duration-500 ${
            i < visible
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
              : "bg-white/[0.03] text-white/20 border-white/[0.06]"
          }`}>
            {i < visible ? "✓" : "·"} {a}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Waterfall enrichment visual ──────────────────────────────────────────────
function WaterfallGrid() {
  const [wave, setWave] = useState(0)
  const ROWS = ["Contact DB", "LinkedIn", "News API", "Job Boards", "CRM Layer"]
  const COLS = 10
  useEffect(() => {
    const id = setInterval(() => setWave(w => (w + 1) % (COLS + ROWS.length + 4)), 180)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b14] p-5 w-full">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em]">enrichment pipeline</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[10px] font-mono text-white/25">live · 247 leads in queue</span>
        </div>
      </div>
      <div className="space-y-2">
        {ROWS.map((row, r) => (
          <div key={row} className="flex items-center gap-2.5">
            <span className="text-[9px] font-mono text-white/25 w-[70px] text-right shrink-0">{row}</span>
            <div className="flex gap-1 flex-1">
              {Array.from({ length: COLS }, (_, c) => {
                const dist = Math.abs(wave - (r + c + 1))
                const lit = dist < 4
                const intensity = lit ? Math.max(0, 1 - dist * 0.22) : 0
                return (
                  <div
                    key={c}
                    className="flex-1 h-[18px] rounded-[3px] transition-all duration-150"
                    style={{
                      background: lit
                        ? `rgba(${90 + r * 8}, ${98 - r * 4}, 241, ${0.15 + intensity * 0.55})`
                        : "rgba(255,255,255,0.03)",
                      boxShadow: lit ? `0 0 8px rgba(99,102,241,${intensity * 0.45})` : "none",
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.05] flex justify-between">
        <span className="text-[9px] font-mono text-white/20">avg enrichment time</span>
        <span className="text-[9px] font-mono text-indigo-300/70">~0.8 sec / lead · 0 credits wasted</span>
      </div>
    </div>
  )
}

// ─── Multi-agent workflow visual ──────────────────────────────────────────────
function WorkflowDiagram() {
  const [step, setStep] = useState(0)
  const AGENTS = [
    { icon: "🔍", name: "Research Agent", sub: "LinkedIn · Web · News · Jobs" },
    { icon: "👤", name: "Who They Are", sub: "Profile synthesis" },
    { icon: "⚡", name: "Pain Map", sub: "Pressure points" },
    { icon: "⏱", name: "Why Now", sub: "Timing signals" },
    { icon: "🎯", name: "The Angle", sub: "Best approach vector" },
    { icon: "✉️", name: "Outreach Draft", sub: "5 channel variants" },
  ]
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % (AGENTS.length + 2)), 620)
    return () => clearInterval(id)
  }, [])
  const done = (i: number) => step > i
  const active = (i: number) => step === i
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b14] p-5 w-full">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em]">multi-agent workflow</span>
        <span className="text-[10px] font-mono text-indigo-300/70">{Math.min(step, 6)}/6 agents complete</span>
      </div>
      {/* Research agent */}
      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 mb-3 ${
        done(0) ? "border-indigo-500/30 bg-indigo-500/[0.08]" : active(0) ? "border-indigo-500/20 bg-indigo-500/[0.04]" : "border-white/[0.06]"
      }`}>
        <span className="text-lg">{AGENTS[0].icon}</span>
        <div className="flex-1">
          <p className="text-[12px] font-semibold">{AGENTS[0].name}</p>
          <p className="text-[9px] text-white/30 font-mono mt-0.5">{AGENTS[0].sub}</p>
        </div>
        {done(0) ? <span className="text-emerald-400 text-xs">✓</span>
          : active(0) ? <div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          : null}
      </div>
      {/* Arrow */}
      <div className="flex justify-center mb-3">
        <div className="flex flex-col items-center gap-[2px]">
          {[0, 1, 2, 3].map(i => <div key={i} className="w-px h-1.5 bg-indigo-500/20" />)}
        </div>
      </div>
      {/* Parallel brief agents */}
      <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest text-center mb-2.5">parallel brief agents</p>
      <div className="grid grid-cols-2 gap-2">
        {AGENTS.slice(1).map((agent, i) => (
          <div key={agent.name} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-300 ${
            done(i + 1) ? "border-indigo-500/30 bg-indigo-500/[0.08]"
              : active(i + 1) ? "border-indigo-500/20 bg-indigo-500/[0.04]"
              : "border-white/[0.06]"
          }`}>
            <span className="text-base">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">{agent.name}</p>
              <p className="text-[8px] text-white/25 font-mono">{agent.sub}</p>
            </div>
            {done(i + 1) && <span className="text-emerald-400 text-[10px] shrink-0">✓</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#050508]/90 backdrop-blur-xl border-b border-white/[0.07]" : ""}`}>
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Signal</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#for-teams" className="hover:text-white transition-colors">For teams</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] text-white/50 hover:text-white transition-colors px-3 py-1.5">
            Sign in
          </Link>
          <Link href="/signup" className="text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-dots-bg pointer-events-none" />
      <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 w-full py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[11px] font-mono tracking-widest uppercase mb-8">
            <Sparkles className="w-3 h-3" />
            AI-Powered Sales Intelligence
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[64px] font-black leading-[1.05] tracking-tight mb-6">
            Every rep.{" "}
            <span className="gradient-text">Fully briefed.</span>
            {" "}In seconds.
          </h1>

          <p className="text-lg text-white/50 leading-relaxed mb-8 max-w-lg">
            Signal researches every prospect in parallel — their world, their pain points, the perfect timing, and exactly what to say. What used to take 45 minutes takes under 30 seconds.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-10">
            <Link href="/signup" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 text-[15px] shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/70 hover:text-white px-6 py-3 rounded-xl transition-all duration-200 text-[15px]">
              Sign in
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[12px] text-white/35">
            {["No credit card required", "30-second onboarding", "Works with HubSpot & Salesforce"].map(item => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400/60" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Right — Brief mockup */}
        <div className="flex justify-center lg:justify-end">
          <div style={{ animation: "floatY 6s ease-in-out infinite" }}>
            <BriefMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Feature grid ─────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: Database,
      color: "indigo",
      title: "Waterfall Enrichment",
      desc: "Multi-source data cascade: contact DB, LinkedIn, web scraping, news, and job signals — all in a single pass, deduplicated and ranked by quality.",
    },
    {
      icon: Brain,
      color: "violet",
      title: "Agentic Brief Generation",
      desc: "A Research Agent fetches intelligence across 5 sources, then 5 parallel Brief Agents synthesize it into a structured, actionable brief in under 30 seconds.",
    },
    {
      icon: Target,
      color: "cyan",
      title: "ICP Discovery",
      desc: "Describe your ideal customer in plain English. Signal translates it into structured filters, searches across millions of contacts, and surfaces the best matches.",
    },
    {
      icon: Zap,
      color: "amber",
      title: "Timing Intelligence",
      desc: "The 'Why Now' engine monitors every lead for trigger events — funding, job changes, competitor outages, frustrated LinkedIn posts — and tells you when to strike.",
    },
    {
      icon: GitBranch,
      color: "indigo",
      title: "Multi-Agent Workflow",
      desc: "Not one AI doing everything — a directed graph of specialized agents: researcher, profile analyst, pain mapper, angle finder, and outreach drafter.",
    },
    {
      icon: Layers,
      color: "violet",
      title: "Playbook Intelligence",
      desc: "Configure your ICP, value props, competitors, and communication style once. Every brief, every draft, every signal is shaped by your team's unique context.",
    },
  ]

  const colorMap: Record<string, string> = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  }

  return (
    <section id="features" className="py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-[11px] font-mono tracking-[0.18em] text-indigo-400/70 uppercase mb-4">Capabilities</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-5">
            Built for the rep who wants to{" "}
            <span className="gradient-text">actually close.</span>
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            Signal does the research. You do the selling.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="group relative p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 ${colorMap[f.color]}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold mb-2">{f.title}</h3>
              <p className="text-[13px] text-white/45 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Search,
      title: "Find your prospects",
      desc: "Paste a LinkedIn URL, drop an email address, describe who you're looking for in plain English (ICP discovery), or upload a CSV of hundreds at once.",
    },
    {
      step: "02",
      icon: Database,
      title: "Waterfall enrichment runs",
      desc: "Signal hits every data source simultaneously — contact database, LinkedIn, web search, news feeds, job postings. Results are deduplicated, scored, and ranked.",
    },
    {
      step: "03",
      icon: Brain,
      title: "Multi-agent research fires",
      desc: "A Research Agent fetches raw intelligence. Five parallel Brief Agents synthesize it: who they are, their pain, why now, the best angle, and what to say.",
    },
    {
      step: "04",
      icon: FileText,
      title: "Read the 2-minute brief",
      desc: "A structured intelligence document covering everything you need: their world right now, the trigger events, communication style, and the angle that will land.",
    },
    {
      step: "05",
      icon: MessageSquare,
      title: "Send with confidence",
      desc: "Channel-specific outreach draft ready to go. Email, LinkedIn, phone, or DM — each one grounded in the brief, not generic copy-paste.",
    },
  ]

  return (
    <section id="how-it-works" className="py-32 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-600/5 blur-[140px] rounded-full" />
      </div>
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-[11px] font-mono tracking-[0.18em] text-indigo-400/70 uppercase mb-4">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-5">
            From prospect to pipeline.{" "}
            <span className="gradient-text">Instantly.</span>
          </h2>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute left-10 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />

          <div className="space-y-6">
            {steps.map((s) => (
              <div key={s.step} className="relative flex gap-8 items-start group">
                <div className="relative z-10 w-20 h-20 shrink-0 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.08] flex flex-col items-center justify-center gap-1 transition-all duration-300 group-hover:border-indigo-500/40 group-hover:bg-indigo-500/[0.12]">
                  <span className="text-[9px] font-mono text-indigo-400/60 tracking-widest">{s.step}</span>
                  <s.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1 pt-5 pb-6 border-b border-white/[0.05] last:border-0">
                  <h3 className="text-[17px] font-bold mb-2">{s.title}</h3>
                  <p className="text-[14px] text-white/45 leading-relaxed max-w-2xl">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Waterfall section ────────────────────────────────────────────────────────
function WaterfallSection() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-[11px] font-mono tracking-[0.18em] text-indigo-400/70 uppercase mb-5">Waterfall Enrichment</p>
          <h2 className="text-4xl sm:text-[44px] font-black tracking-tight leading-tight mb-6">
            Every data source.{" "}
            <span className="gradient-text">One pass.</span>
          </h2>
          <p className="text-[16px] text-white/45 leading-relaxed mb-8">
            Signal doesn&apos;t pick one data provider and hope for the best. It cascades across your entire enrichment stack — contact databases, LinkedIn, live web search, news APIs, and job signal feeds — all simultaneously.
          </p>
          <ul className="space-y-3">
            {[
              "Deduplication across all sources with smart merging",
              "Per-company lead limits to prevent list saturation",
              "Sub-second enrichment per lead at scale",
              "City normalization, alias resolution, and data hygiene built in",
            ].map(item => (
              <li key={item} className="flex items-start gap-3 text-[13px] text-white/50">
                <CheckCircle className="w-4 h-4 text-indigo-400/70 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <WaterfallGrid />
        </div>
      </div>
    </section>
  )
}

// ─── Agentic section ──────────────────────────────────────────────────────────
function AgenticSection() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="order-2 lg:order-1">
          <WorkflowDiagram />
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-[11px] font-mono tracking-[0.18em] text-violet-400/70 uppercase mb-5">Multi-Agent Architecture</p>
          <h2 className="text-4xl sm:text-[44px] font-black tracking-tight leading-tight mb-6">
            Not one AI.{" "}
            <span style={{ background: "linear-gradient(135deg, #a78bfa, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              A team of them.
            </span>
          </h2>
          <p className="text-[16px] text-white/45 leading-relaxed mb-8">
            Signal runs a directed graph of specialized agents, each trained for one job. The Research Agent fetches raw intelligence. Five brief agents work in parallel to synthesize understanding — no bottlenecks, no hallucinations from context overload.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🔍", label: "Research Agent", sub: "5 concurrent source fetches" },
              { icon: "👤", label: "Who They Are", sub: "Profile + career synthesis" },
              { icon: "⚡", label: "Pain Map", sub: "Pressure point identification" },
              { icon: "⏱", label: "Why Now", sub: "Trigger event detection" },
              { icon: "🎯", label: "The Angle", sub: "Message strategy" },
              { icon: "✉️", label: "Outreach Draft", sub: "5 channel variants" },
            ].map(a => (
              <div key={a.label} className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <span className="text-lg shrink-0">{a.icon}</span>
                <div>
                  <p className="text-[11px] font-semibold">{a.label}</p>
                  <p className="text-[9px] text-white/30 font-mono">{a.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── The brief ────────────────────────────────────────────────────────────────
function TheBrief() {
  return (
    <section className="py-32 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-[11px] font-mono tracking-[0.18em] text-indigo-400/70 uppercase mb-4">The Brief</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-5">
            2 minutes to read.{" "}
            <span className="gradient-text">45 minutes replaced.</span>
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            Every brief has the same six sections. Reps know exactly what to look for. No noise, no data dumps.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: "👤", title: "Who They Are", desc: "Career trajectory, leadership style, professional identity, and what drives their decisions. Not just a title — a person." },
            { icon: "🌍", title: "Their World Right Now", desc: "What's happening at their company today. Headcount changes, strategic shifts, competitive pressure, public statements." },
            { icon: "⏱", title: "Why Now", desc: "The most important section. Trigger events that make this the right moment — funding, job change, product launch, public frustration." },
            { icon: "💬", title: "Communication Style", desc: "How they write, what they respond to, what they ignore. Inferred from their LinkedIn posts, comments, and activity patterns." },
            { icon: "🎯", title: "The Angle", desc: "The one message that will land. Not a template — a specific approach vector grounded in everything above." },
            { icon: "✉️", title: "Outreach Draft", desc: "A ready-to-send first touch for Email, LinkedIn, phone, and DM — each one grounded in the brief, not a fill-in-the-blanks template." },
          ].map(card => (
            <div key={card.title} className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300">
              <span className="text-2xl mb-4 block">{card.icon}</span>
              <h3 className="text-[15px] font-bold mb-2">{card.title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── For teams ────────────────────────────────────────────────────────────────
function ForTeams() {
  return (
    <section id="for-teams" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-indigo-600/6 blur-[150px] rounded-full" />
      </div>
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-[11px] font-mono tracking-[0.18em] text-indigo-400/70 uppercase mb-4">For Sales Teams</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-5">
            Your best rep&apos;s research quality.
            <span className="gradient-text"> For every rep.</span>
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            The difference between your top performer and your average rep is almost always research quality and timing instinct. Signal gives everyone on your team both.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: TrendingUp,
              title: "Reps focus on closing",
              desc: "Research that used to take 45 minutes per prospect takes under 30 seconds. Your reps spend their time on conversations, not Google.",
            },
            {
              icon: Users,
              title: "Consistent team quality",
              desc: "New reps send outreach as researched as your veterans from week one. No more quality gap between your best and worst performers.",
            },
            {
              icon: Activity,
              title: "Signal monitoring at scale",
              desc: "Signal watches every lead in your pipeline for trigger events — promotions, funding, competitor outages, frustration signals — and alerts at the right moment.",
            },
          ].map(card => (
            <div key={card.title} className="p-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-indigo-500/20 hover:bg-indigo-500/[0.03] transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <card.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-[17px] font-bold mb-3">{card.title}</h3>
              <p className="text-[14px] text-white/40 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-8 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: Clock, stat: "45 min → 30 sec", label: "Research per prospect" },
            { icon: BarChart3, stat: "3× higher", label: "Reply rates with timed outreach" },
            { icon: CheckCircle, stat: "0 missed", label: "Trigger events across your pipeline" },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-2">
              <item.icon className="w-5 h-5 text-indigo-400/60 mb-1" />
              <p className="text-[22px] font-black text-white">{item.stat}</p>
              <p className="text-[12px] text-white/35">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section className="py-24 border-y border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: 98, suffix: "%", label: "Enrichment hit rate", sub: "across the waterfall stack" },
            { value: 30, suffix: "s", label: "Average brief generation", sub: "from search to outreach draft" },
            { value: 5, suffix: "", label: "Parallel agents", sub: "per brief, never sequential" },
            { value: 247, suffix: "", label: "Leads enriched per run", sub: "with deduplication built in" },
          ].map(s => (
            <div key={s.label} className="group">
              <p className="text-4xl sm:text-5xl font-black mb-2 gradient-text">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="text-[14px] font-semibold text-white/70 mb-1">{s.label}</p>
              <p className="text-[12px] text-white/30">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-40 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/8 blur-[120px] rounded-full" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/6 blur-[100px] rounded-full" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <p className="text-[11px] font-mono tracking-[0.18em] text-indigo-400/70 uppercase mb-6">Get started today</p>
        <h2 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6">
          The best reps don&apos;t{" "}
          <span className="gradient-text">research harder.</span>
          {" "}They research smarter.
        </h2>
        <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
          Give your team Signal. Every prospect, fully researched, perfectly timed, ready to close.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-[16px] shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)]">
            Start for free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white px-8 py-4 rounded-xl transition-all duration-200 text-[16px]">
            Sign in to your account
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[14px] font-semibold">Signal</span>
            </div>
            <p className="text-[12px] text-white/35 leading-relaxed">
              AI research intelligence for B2B sales teams. Find, research, brief, close.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-4">Product</p>
            <ul className="space-y-2.5 text-[13px] text-white/40">
              {["Features", "How it works", "For teams", "Integrations"].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-4">Platform</p>
            <ul className="space-y-2.5 text-[13px] text-white/40">
              {["Research", "Lists", "Playbook", "Signals"].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-4">Account</p>
            <ul className="space-y-2.5 text-[13px] text-white/40">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">Get started</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.05] pt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] text-white/20 font-mono">© 2026 Signal. All rights reserved.</p>
          <p className="text-[11px] text-white/20 font-mono">B2B sales intelligence · Agentic research · Multi-source enrichment</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .gradient-text {
          background: linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .grid-dots-bg {
          background-image: radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        html { scroll-behavior: smooth; }
      `}</style>
      <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden selection:bg-indigo-500/30">
        <Navbar />
        <Hero />
        <Features />
        <HowItWorks />
        <WaterfallSection />
        <AgenticSection />
        <TheBrief />
        <ForTeams />
        <Stats />
        <FinalCTA />
        <Footer />
      </div>
    </>
  )
}
