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
    id: "icp" as Mode,
    icon: Users,
    title: "ICP discovery",
  },
  {
    id: "specific" as Mode,
    icon: User,
    title: "Specific lead",
  },
  {
    id: "bulk" as Mode,
    icon: Upload,
    title: "Bulk upload",
  },
]

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="h-10 flex items-center border-b border-signal-border">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={cn(
            "relative h-full flex items-center gap-2 px-4 text-[13px] transition-colors",
            selectedMode === mode.id
              ? "font-medium text-signal-text-1"
              : "text-signal-text-3 hover:text-signal-text-2"
          )}
        >
          <mode.icon className="w-3.5 h-3.5" />
          {mode.title}
          {selectedMode === mode.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-signal-accent" />
          )}
        </button>
      ))}
    </div>
  )
}
