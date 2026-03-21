"use client"

import { useState, useEffect } from "react"
import { User } from "lucide-react"
import { ResultsTable, TableLead } from "./results-table"

export function SpecificLead() {
  const [inputValue, setInputValue] = useState("")
  const [leads, setLeads] = useState<TableLead[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingProgress, setGeneratingProgress] = useState(0)
  const [generatingSteps, setGeneratingSteps] = useState<{ label: string; status: "pending" | "loading" | "complete" }[]>([])

  const getHintContent = () => {
    if (!inputValue) {
      return {
        type: "default",
        text: "Paste any identifier — we'll figure out the rest",
      }
    }
    if (inputValue.includes("linkedin.com/in/")) {
      return {
        type: "success",
        text: "LinkedIn profile detected",
      }
    }
    if (inputValue.includes("@") && inputValue.includes(".")) {
      return {
        type: "success",
        text: "Email detected — we'll match this to a person",
      }
    }
    return {
      type: "default",
      text: "Try adding their company name for better matching",
    }
  }

  const hint = getHintContent()

  const extractNameFromInput = (input: string) => {
    if (input.includes("linkedin.com/in/")) {
      const slug = input.split("/in/")[1]?.split("/")[0] || "unknown"
      // Convert slug to name-like format
      return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    }
    if (input.includes("@")) {
      const username = input.split("@")[0]
      return username.split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    }
    return input
  }

  const getInitials = (name: string) => {
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleGenerateBrief = () => {
    const name = extractNameFromInput(inputValue)
    const initials = getInitials(name)
    
    // Add lead to table immediately with scanning state
    const newLead: TableLead = {
      id: Date.now().toString(),
      initials,
      initialsColor: "bg-indigo-500",
      name,
      title: "Loading...",
      company: "Loading...",
      location: "Loading...",
      signalStrength: "scanning",
      signals: [],
    }
    
    setLeads(prev => [newLead, ...prev])
    setInputValue("")
    
    // After 2 seconds, update to strong signals
    setTimeout(() => {
      setLeads(prev => prev.map(lead => 
        lead.id === newLead.id 
          ? {
              ...lead,
              title: "VP of Sales",
              company: "Acme Corp",
              location: "San Francisco CA",
              signalStrength: "strong" as const,
              signals: [
                "Recently promoted to VP of Sales (2 weeks ago)",
                "Company raised Series D, likely scaling team",
                "Posted about improving outbound metrics on LinkedIn",
              ],
            }
          : lead
      ))
    }, 2000)
  }

  const handleActionClick = (selectedIds: string[]) => {
    setIsGenerating(true)
    setGeneratingSteps([
      { label: "Pulling contact data", status: "pending" },
      { label: "Reading LinkedIn profiles", status: "pending" },
      { label: "Scanning news and signals", status: "pending" },
      { label: "Generating intelligence briefs", status: "pending" },
    ])
    setGeneratingProgress(0)

    // Animate steps
    const delays = [0, 1200, 2400, 3600]
    delays.forEach((delay, index) => {
      setTimeout(() => {
        setGeneratingSteps((prev) =>
          prev.map((step, i) => (i === index ? { ...step, status: "loading" } : step))
        )
        setGeneratingProgress((index + 1) * 20)
      }, delay)

      setTimeout(() => {
        setGeneratingSteps((prev) =>
          prev.map((step, i) => (i === index ? { ...step, status: "complete" } : step))
        )
        setGeneratingProgress((index + 1) * 25)
      }, delay + 1000)
    })

    setTimeout(() => {
      setIsGenerating(false)
    }, 5500)
  }

  return (
    <div className="space-y-6">
      {/* Input panel */}
      <div className="bg-white border border-[#E5E4E0] rounded-xl p-6">
        {/* Label */}
        <label className="block text-[13px] font-medium text-[#374151] mb-2">
          LinkedIn URL, email address, or name + company
        </label>

        {/* Input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue) {
              handleGenerateBrief()
            }
          }}
          placeholder="e.g. linkedin.com/in/jordan-hassan or jordan@meridian.io"
          className="w-full h-10 px-3 border border-[#E5E4E0] rounded-lg text-[14px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />

        {/* Hint */}
        <div className="mt-2 mb-4">
          {hint.type === "success" ? (
            <span className="inline-flex px-2.5 py-1 bg-[#D1FAE5] text-[#065F46] text-[12px] font-medium rounded-full">
              {hint.text}
            </span>
          ) : (
            <span className="text-[12px] text-[#9CA3AF]">{hint.text}</span>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateBrief}
            disabled={!inputValue}
            className="h-[36px] px-4 bg-[#1C1C1C] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#2D2D2D] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed transition-colors"
          >
            Generate brief
          </button>
          <span className="text-[12px] text-[#9CA3AF]">Uses 1 credit</span>
        </div>
      </div>

      {/* Results table - only show after generating */}
      {leads.length > 0 ? (
        <ResultsTable
          leads={leads}
          emptyStateMessage="Your researched leads will appear here"
          actionButtonLabel="Generate briefs for selected"
          onActionClick={handleActionClick}
          isGenerating={isGenerating}
          generatingProgress={generatingProgress}
          generatingSteps={generatingSteps}
        />
      ) : (
        <div className="bg-white border border-[#E5E4E0] rounded-xl overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-[14px] text-[#9CA3AF]">Your researched leads will appear here</span>
          </div>
        </div>
      )}
    </div>
  )
}
