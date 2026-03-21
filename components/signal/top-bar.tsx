"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopBarProps {
  isICPMode?: boolean
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSearch?: () => void
}

export function TopBar({ isICPMode = false, searchQuery = "", onSearchChange, onSearch }: TopBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isICPMode && onSearch) {
      onSearch()
    }
  }

  return (
    <header className="h-14 bg-white border-b border-[#E5E4E0] flex items-center px-4 shrink-0">
      {/* Search Input */}
      <div className={cn("relative", isICPMode ? "flex-1 mr-4" : "w-[480px]")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isICPMode
              ? "Search for people — e.g. VP of Sales at Series B SaaS companies in the US"
              : "Paste a LinkedIn URL, email, or name + company..."
          }
          className={cn(
            "w-full h-10 pl-10 border border-[#E5E4E0] text-[14px] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
            isICPMode ? "pr-4 rounded-l-lg rounded-r-none border-r-0" : "pr-14 rounded-lg"
          )}
        />
        {!isICPMode && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-[#F3F4F6] rounded text-[11px] text-[#6B7280] font-medium">
            <span>⌘</span>
            <span>K</span>
          </div>
        )}
      </div>

      {/* Search Button (ICP mode only) */}
      {isICPMode && (
        <button
          onClick={onSearch}
          className="h-10 px-5 bg-[#4F46E5] text-white text-[14px] font-medium rounded-r-lg hover:bg-[#4338CA] transition-colors"
        >
          Search
        </button>
      )}

      {/* User Avatar */}
      <div className="ml-auto pl-4">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <span className="text-[12px] font-semibold text-white">JH</span>
        </div>
      </div>
    </header>
  )
}
