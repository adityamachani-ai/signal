"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "@/components/signal/sidebar"
import { TopBar } from "@/components/signal/top-bar"
import { ModeSelector, type Mode } from "@/components/signal/mode-selector"
import { OutreachContextBar } from "@/components/signal/outreach-context-bar"
import { SpecificLead } from "@/components/signal/specific-lead"
import { ICPDiscovery } from "@/components/signal/icp-discovery"
import { BulkUpload } from "@/components/signal/bulk-upload"

export default function SignalPage() {
  const [selectedMode, setSelectedMode] = useState<Mode>("specific")
  const [outreachContext, setOutreachContext] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearch, setActiveSearch] = useState("")

  const handleSearch = useCallback(() => {
    setActiveSearch(searchQuery)
  }, [searchQuery])

  const handleModeChange = (mode: Mode) => {
    setSelectedMode(mode)
    // Reset search when switching modes
    if (mode !== "icp") {
      setSearchQuery("")
      setActiveSearch("")
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="ml-[200px] flex flex-col min-h-screen">
        {/* Top bar */}
        <TopBar
          isICPMode={selectedMode === "icp"}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
        />

        {/* Tab strip */}
        <div className="bg-white px-6">
          <ModeSelector
            selectedMode={selectedMode}
            onModeChange={handleModeChange}
          />
        </div>

        {/* Outreach context bar */}
        <OutreachContextBar
          value={outreachContext}
          onChange={setOutreachContext}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1200px] mx-auto">
            {/* Mode content */}
            {selectedMode === "specific" && <SpecificLead />}
            {selectedMode === "icp" && (
              <ICPDiscovery 
                activeSearch={activeSearch} 
                onClearSearch={() => {
                  setSearchQuery("")
                  setActiveSearch("")
                }}
              />
            )}
            {selectedMode === "bulk" && <BulkUpload />}
          </div>
        </main>
      </div>
    </div>
  )
}
