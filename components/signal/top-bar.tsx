"use client"

import { useRef, useEffect, useState } from "react"
import { Search, Loader2, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

const ICP_EXAMPLES = [
  "VP of Sales at Series B SaaS companies in India",
  "CTOs at fintech startups in Bangalore",
  "Head of Engineering at enterprise software companies",
  "Founders of AI startups raising Series A in the US",
  "Collection heads at major Indian banks",
  "Chief Marketing Officers at e-commerce companies",
]

const TYPE_SPEED = 38
const DELETE_SPEED = 18
const PAUSE_AFTER_TYPE = 2200
const PAUSE_AFTER_DELETE = 400

function useTypewriter(examples: string[], active: boolean) {
  const [displayed, setDisplayed] = useState("")
  const [exampleIndex, setExampleIndex] = useState(0)
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setDisplayed("")
      setPhase("typing")
      setExampleIndex(0)
      return
    }

    const target = examples[exampleIndex]

    if (phase === "typing") {
      if (displayed.length < target.length) {
        timeoutRef.current = setTimeout(
          () => setDisplayed(target.slice(0, displayed.length + 1)),
          TYPE_SPEED
        )
      } else {
        timeoutRef.current = setTimeout(() => setPhase("holding"), PAUSE_AFTER_TYPE)
      }
    } else if (phase === "holding") {
      timeoutRef.current = setTimeout(() => setPhase("deleting"), 0)
    } else if (phase === "deleting") {
      if (displayed.length > 0) {
        timeoutRef.current = setTimeout(
          () => setDisplayed(prev => prev.slice(0, -1)),
          DELETE_SPEED
        )
      } else {
        timeoutRef.current = setTimeout(() => {
          setExampleIndex(i => (i + 1) % examples.length)
          setPhase("typing")
        }, PAUSE_AFTER_DELETE)
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [active, displayed, phase, exampleIndex, examples])

  return { displayed, isHolding: phase === "holding" }
}

// Detect the type of input a user has entered in the Specific Lead top bar
export function detectInputType(value: string): { type: "linkedin"; linkedinUrl: string } | { type: "email"; email: string } | { type: "name"; firstName: string; lastName: string; company: string } | null {
  const v = value.trim()
  if (!v) return null

  // LinkedIn URL
  if (v.includes("linkedin.com/in/")) {
    return { type: "linkedin", linkedinUrl: v }
  }

  // Email
  if (v.includes("@") && v.includes(".") && !v.includes(" ")) {
    return { type: "email", email: v }
  }

  // Name + Company: "FirstName LastName, Company" or "FirstName LastName at Company"
  const atMatch = v.match(/^(.+?)\s+at\s+(.+)$/i)
  if (atMatch) {
    const nameParts = atMatch[1].trim().split(/\s+/)
    return {
      type: "name",
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" ") || "",
      company: atMatch[2].trim(),
    }
  }

  const commaMatch = v.match(/^(.+?),\s*(.+)$/)
  if (commaMatch) {
    const nameParts = commaMatch[1].trim().split(/\s+/)
    return {
      type: "name",
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" ") || "",
      company: commaMatch[2].trim(),
    }
  }

  return null
}

export type SpecificLookupPayload =
  | { type: "linkedin"; linkedinUrl: string }
  | { type: "email"; email: string }
  | { type: "name"; firstName: string; lastName: string; company: string }

type ActiveMode = "specific" | "icp" | "bulk"

interface TopBarProps {
  mode?: ActiveMode
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSearch?: () => void
  onSpecificLookup?: (payload: SpecificLookupPayload) => void
  specificLoading?: boolean
  /** @deprecated Use mode="icp" instead */
  isICPMode?: boolean
}

export function TopBar({
  mode = "specific",
  searchQuery = "",
  onSearchChange,
  onSearch,
  onSpecificLookup,
  specificLoading = false,
  isICPMode,
}: TopBarProps) {
  // Support legacy isICPMode prop
  const effectiveMode = isICPMode != null ? (isICPMode ? "icp" : "specific") : mode

  const isICP = effectiveMode === "icp"
  const isSpecific = effectiveMode === "specific"
  const isBulk = effectiveMode === "bulk"

  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  // Typewriter active only in ICP mode when input is empty and unfocused
  const typewriterActive = isICP && !searchQuery && !isFocused
  const { displayed, isHolding } = useTypewriter(ICP_EXAMPLES, typewriterActive)

  // ⌘K shortcut — only focus in modes where the search bar exists
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (!isBulk) inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isBulk])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return

    if (isICP && onSearch) {
      onSearch()
    } else if (isSpecific && onSpecificLookup) {
      const detected = detectInputType(searchQuery)
      if (detected) {
        onSpecificLookup(detected)
      }
    }
  }

  // Derive placeholder & validation for specific mode
  const specificDetected = isSpecific ? detectInputType(searchQuery) : null
  const specificHasInput = isSpecific && searchQuery.trim().length > 0
  const specificValid = specificHasInput && specificDetected !== null

  const getPlaceholder = () => {
    if (isICP) return ""
    if (isSpecific) return "Paste a LinkedIn URL, email, or type name at company..."
    return ""
  }

  // In Bulk mode, show only the header (no search input)
  if (isBulk) {
    return (
      <header className="h-14 bg-signal-bg border-b border-signal-border flex items-center px-4 shrink-0">
        <div className="ml-auto flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-signal-raised transition-colors text-signal-text-3"
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>
    )
  }

  return (
    <header className="h-14 bg-signal-bg border-b border-signal-border flex items-center px-4 shrink-0">
      {/* Search Input */}
      <div className={cn("relative", isICP ? "flex-1" : "flex-1 max-w-[600px]")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-signal-text-4 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={getPlaceholder()}
          className={cn(
            "w-full h-10 pl-10 border border-signal-border text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow bg-signal-bg relative z-10",
            isICP ? "pr-4 rounded-l-lg rounded-r-none border-r-0" : "pr-14 rounded-lg"
          )}
        />

        {/* Animated typewriter placeholder — ICP mode, empty + unfocused */}
        {isICP && !searchQuery && !isFocused && (
          <div
            className="absolute inset-y-0 left-10 flex items-center pointer-events-none z-20"
            aria-hidden="true"
          >
            <span className="text-[14px] text-signal-text-4">{displayed}</span>
            <span
              className={cn(
                "inline-block w-[1.5px] h-[14px] ml-[1px] bg-signal-text-4 rounded-full",
                isHolding ? "opacity-0" : "animate-pulse"
              )}
            />
          </div>
        )}

        {/* Static hint when focused and empty — ICP mode */}
        {isICP && !searchQuery && isFocused && (
          <div
            className="absolute inset-y-0 left-10 flex items-center pointer-events-none z-20"
            aria-hidden="true"
          >
            <span className="text-[14px] text-signal-text-4">Describe the people you want to find…</span>
          </div>
        )}

        {/* ⌘K badge — Specific Lead mode */}
        {isSpecific && !searchQuery && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-signal-raised rounded text-[11px] text-signal-text-3 font-medium z-10">
            <span>⌘</span>
            <span>K</span>
          </div>
        )}

        {/* Input type indicator — Specific Lead mode */}
        {isSpecific && specificHasInput && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {specificDetected ? (
              <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded-full border border-[#A7F3D0]">
                {specificDetected.type === "linkedin" ? "LinkedIn" : specificDetected.type === "email" ? "Email" : "Name + Company"}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded-full border border-[#FDE68A]">
                Try: name at company
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search Button — ICP mode */}
      {isICP && (
        <button
          onClick={onSearch}
          disabled={!searchQuery.trim()}
          className="h-10 px-5 bg-signal-accent text-white text-[14px] font-medium rounded-r-lg hover:bg-signal-accent-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Search
        </button>
      )}

      {/* Find Lead Button — Specific Lead mode */}
      {isSpecific && specificHasInput && (
        <button
          onClick={() => specificDetected && onSpecificLookup?.(specificDetected)}
          disabled={!specificValid || specificLoading}
          className="ml-2 h-10 px-5 bg-signal-accent text-white text-[14px] font-medium rounded-lg hover:bg-signal-accent-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {specificLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Looking up…
            </>
          ) : (
            "Find lead"
          )}
        </button>
      )}

      {/* Theme toggle */}
      <div className="ml-auto pl-4 flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-signal-raised transition-colors text-signal-text-3"
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  )
}
