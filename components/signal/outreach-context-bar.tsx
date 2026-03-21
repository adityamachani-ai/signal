"use client"

interface OutreachContextBarProps {
  value: string
  onChange: (value: string) => void
}

export function OutreachContextBar({ value, onChange }: OutreachContextBarProps) {
  return (
    <div className="h-12 flex items-center gap-3 px-4 bg-[#F0F4FF] border-b border-[#E0E7FF]">
      <span className="text-[12px] font-medium text-[#6B7280] shrink-0">
        Outreach context:
      </span>
      <div className="flex-1 relative">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#4F46E5]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What are you trying to achieve with this outreach?"
          className="w-full h-8 pl-3 pr-3 bg-transparent border-none text-[13px] text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none"
        />
      </div>
    </div>
  )
}
