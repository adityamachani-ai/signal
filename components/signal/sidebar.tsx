"use client"

import Link from "next/link"
import { Search, List, BookMarked, Settings, LogOut, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

interface SidebarProps {
  activePage?: "research" | "lists" | "playbook" | "settings"
}

function getInitials(user: User): string {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || ""
  return name.split(/[\s@]/).filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
}

const navigationItems = [
  { icon: Search, label: "Research", id: "research" as const, href: "/research" },
  { icon: List, label: "Lists", id: "lists" as const, href: "/lists" },
  { icon: BookMarked, label: "Playbook", id: "playbook" as const, href: "/playbook" },
]

export function Sidebar({ activePage = "research" }: SidebarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)

  interface CreditsData {
    is_admin: boolean
    icp_searches: { used: number; limit: number }
    enrichments:  { used: number; limit: number }
    briefs:       { used: number; limit: number }
  }
  const [credits, setCredits] = useState<CreditsData | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetch('/api/credits').then(r => r.ok ? r.json() : null).then(d => d && setCredits(d))
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || ""

  return (
    <aside className="fixed left-0 top-0 w-[200px] h-screen bg-signal-bg border-r border-signal-border flex flex-col z-20">
      {/* Wordmark */}
      <div className="h-14 flex items-center px-4 gap-2 border-b border-signal-border shrink-0">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[15px] font-semibold text-signal-text-1 tracking-tight">Signal</span>
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
                  ? "bg-signal-accent-tint text-signal-accent-2"
                  : "text-signal-text-3 hover:bg-signal-surface"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Credits widget */}
      {credits && (
        <div className="mx-2 mb-1 shrink-0">
          <div className="px-3 py-2.5 rounded-lg bg-signal-surface border border-signal-border">
            {credits.is_admin ? (
              <p className="text-[10px] text-signal-text-3 font-medium">Admin · Unlimited</p>
            ) : (
              <>
                <p className="text-[10px] font-medium text-signal-text-3 mb-2">Usage</p>
                {([
                  { label: 'ICP Searches', ...credits.icp_searches },
                  { label: 'Enrichments',  ...credits.enrichments  },
                  { label: 'Briefs',       ...credits.briefs        },
                ] as Array<{ label: string; used: number; limit: number }>).map(({ label, used, limit }) => (
                  <div key={label} className="mb-1.5 last:mb-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] text-signal-text-4">{label}</span>
                      <span className={cn(
                        "text-[10px] font-medium tabular-nums",
                        used >= limit ? "text-red-500" : "text-signal-text-3"
                      )}>{used}/{limit}</span>
                    </div>
                    <div className="h-0.5 rounded-full bg-signal-raised overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", used >= limit ? "bg-red-400" : "bg-signal-accent")}
                        style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Settings link */}
      <div className="px-2 pb-1 shrink-0">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors w-full",
            "settings" === activePage
              ? "bg-signal-accent-tint text-signal-accent-2"
              : "text-signal-text-3 hover:bg-signal-surface"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      {/* User profile */}
      <div className="px-3 pb-3 pt-1 border-t border-signal-border-faint shrink-0">
        <div className="flex items-center gap-2.5 py-2">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-signal-accent-tint flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-[11px] font-semibold text-signal-accent-2">
                {user ? getInitials(user) : "…"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-signal-text-1 truncate">{displayName || user?.email}</p>
            {displayName && <p className="text-[11px] text-signal-text-4 truncate">{user?.email}</p>}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-signal-text-4 hover:text-signal-text-2 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
