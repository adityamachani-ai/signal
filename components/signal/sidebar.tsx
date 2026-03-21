"use client"

import Link from "next/link"
import { Search, List, Zap, Users, BookMarked, Activity, Settings } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activePage?: "research" | "lists" | "signals" | "playbook" | "settings"
}

const navigationItems = [
  { icon: Search, label: "Research", id: "research" as const, href: "/" },
  { icon: List, label: "Lists", id: "lists" as const, href: "/lists" },
  { icon: Zap, label: "Signals", id: "signals" as const, href: "/signals" },
]

const teamItems = [
  { icon: Users, label: "Team", id: "team" as const, href: "#" },
  { icon: BookMarked, label: "Playbook", id: "playbook" as const, href: "/playbook" },
  { icon: Activity, label: "Activity", id: "activity" as const, href: "#" },
]

export function Sidebar({ activePage = "research" }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 w-[200px] h-screen bg-white border-r border-[#E5E4E0] flex flex-col z-20">
      {/* Wordmark */}
      <div className="h-[52px] flex items-center px-5 border-b border-[#E5E4E0] shrink-0">
        <span className="text-[15px] font-semibold text-[#1C1C1C] tracking-tight">Signal</span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-4">
        {/* Main Nav */}
        <nav className="px-2 flex flex-col gap-0.5">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors w-full text-left",
                item.id === activePage
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-[#6B7280] hover:bg-[#F7F6F3]"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Team section */}
        <div>
          <p className="px-5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Team</p>
          <nav className="px-2 flex flex-col gap-0.5">
            {teamItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors w-full text-left",
                  item.id === activePage
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-[#6B7280] hover:bg-[#F7F6F3]"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Settings link */}
      <div className="px-2 pb-1 shrink-0">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors w-full",
            "settings" === activePage
              ? "bg-indigo-50 text-indigo-700"
              : "text-[#6B7280] hover:bg-[#F7F6F3]"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      {/* Credits widget */}
      <div className="p-3 shrink-0">
        <div className="bg-[#F7F6F3] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[#374151]">Credits</span>
            <span className="text-[12px] font-semibold text-[#1C1C1C]">124 / 200</span>
          </div>
          <Progress value={62} className="h-1.5 bg-[#E5E4E0]" />
          <p className="text-[11px] text-[#9CA3AF] mt-2">124 of 200 credits used this month</p>
        </div>
      </div>
    </aside>
  )
}
