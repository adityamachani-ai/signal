"use client"

import { useState, useCallback, useRef } from "react"
import { Sidebar } from "@/components/signal/sidebar"
import { TopBar, type SpecificLookupPayload } from "@/components/signal/top-bar"
import { ModeSelector, type Mode } from "@/components/signal/mode-selector"
import { SpecificLead, type SpecificLeadHandle } from "@/components/signal/specific-lead"
import { ICPDiscovery } from "@/components/signal/icp-discovery"
import { BulkUpload } from "@/components/signal/bulk-upload"

export default function SignalPage() {
  const [selectedMode, setSelectedMode] = useState<Mode>("specific")
  const [searchQuery, setSearchQuery] = useState("")
  // Counter-based trigger so the same query can re-fire
  const [searchTrigger, setSearchTrigger] = useState(0)

  const specificLeadRef = useRef<SpecificLeadHandle>(null)

  const handleSearch = useCallback(() => {
    setSearchTrigger(c => c + 1)
  }, [])

  const handleModeChange = (mode: Mode) => {
    setSelectedMode(mode)
    setSearchQuery("")
    setSearchTrigger(0)
  }

  const handleSpecificLookup = useCallback((payload: SpecificLookupPayload) => {
    specificLeadRef.current?.lookupFromTopBar(payload)
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="ml-[200px] flex flex-col min-h-screen">
        {/* Top bar */}
        <TopBar
          mode={selectedMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
          onSpecificLookup={handleSpecificLookup}
          specificLoading={specificLeadRef.current?.isLoading ?? false}
        />

        {/* Tab strip */}
        <div className="bg-white px-6">
          <ModeSelector
            selectedMode={selectedMode}
            onModeChange={handleModeChange}
          />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1200px] mx-auto">
            {/* Mode content — keep all mounted to preserve state */}
            <div style={{ display: selectedMode === "specific" ? "block" : "none" }}>
              <SpecificLead
                ref={specificLeadRef}
                onLoadingChange={() => {/* force re-render for TopBar button */}}
              />
            </div>
            <div style={{ display: selectedMode === "icp" ? "block" : "none" }}>
              <ICPDiscovery
                activeSearch={searchQuery}
                searchTrigger={searchTrigger}
                onClearSearch={() => {
                  setSearchQuery("")
                  setSearchTrigger(0)
                }}
              />
            </div>
            <div style={{ display: selectedMode === "bulk" ? "block" : "none" }}>
              <BulkUpload />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
