"use client"

import { User, Users, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export type Mode = "specific" | "icp" | "bulk"

interface ModeSelectorProps {
  selectedMode: Mode
  onModeChange: (mode: Mode) => void
}

const modes = [
  {
    id: "specific" as Mode,
    icon: User,
    title: "Specific lead",
  },
  {
    id: "icp" as Mode,
    icon: Users,
    title: "ICP discovery",
  },
  {
    id: "bulk" as Mode,
    icon: Upload,
    title: "Bulk upload",
  },
]

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="h-10 flex items-center border-b border-[#E5E4E0]">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={cn(
            "relative h-full flex items-center gap-2 px-4 text-[13px] transition-colors",
            selectedMode === mode.id
              ? "font-medium text-[#1C1C1C]"
              : "text-[#6B7280] hover:text-[#374151]"
          )}
        >
          <mode.icon className="w-3.5 h-3.5" />
          {mode.title}
          {selectedMode === mode.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
          )}
        </button>
      ))}
    </div>
  )
}
