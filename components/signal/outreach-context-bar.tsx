"use client"

interface OutreachContextBarProps {
  value: string
  onChange: (value: string) => void
}

export function OutreachContextBar({ value, onChange }: OutreachContextBarProps) {
  return (
    <div className="h-12 flex items-center gap-3 px-4 bg-signal-accent-tint border-b border-signal-accent-border">
      <span className="text-[12px] font-medium text-signal-text-3 shrink-0">
        Outreach context:
      </span>
      <div className="flex-1 relative">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-signal-accent" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What are you trying to achieve with this outreach?"
          className="w-full h-8 pl-3 pr-3 bg-transparent border-none text-[13px] text-signal-text-2 placeholder:text-signal-text-4 focus:outline-none"
        />
      </div>
    </div>
  )
}
