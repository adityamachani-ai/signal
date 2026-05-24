"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, Plus, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ListOption {
  id: string
  name: string
  lead_count: number
}

interface ListPickerProps {
  /** Lead IDs to add when a list is selected */
  leadIds: string[]
  /** Called after successfully adding leads to a list */
  onAdded?: (listId: string, listName: string, count: number) => void
  /** Custom handler — if provided, called instead of the default API call. Must return true on success. */
  onAddToList?: (listId: string, listName: string) => Promise<boolean>
  /** Button label override */
  label?: string
  /** Additional className for the trigger button */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Open dropdown upward instead of downward */
  dropUp?: boolean
}

export function ListPicker({ leadIds, onAdded, onAddToList, label = "Add to List", className, disabled, dropUp }: ListPickerProps) {
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<ListOption[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [showNewInput, setShowNewInput] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchLists = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/lists")
      if (!res.ok) {
        console.error("ListPicker: failed to fetch lists", res.status)
        setLists([])
        setLoading(false)
        return
      }
      const data = await res.json()
      setLists(data.lists ?? [])
    } catch (err) {
      console.error("ListPicker: fetch error", err)
    }
    setLoading(false)
  }, [])

  // Fetch lists when dropdown opens
  useEffect(() => {
    if (open) fetchLists()
  }, [open, fetchLists])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowNewInput(false)
        setNewName("")
      }
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleAddToList = async (listId: string, listName: string) => {
    if (adding || leadIds.length === 0) return
    setAdding(listId)
    try {
      if (onAddToList) {
        // Custom handler (e.g., ICP save-leads flow)
        const ok = await onAddToList(listId, listName)
        if (ok) {
          onAdded?.(listId, listName, leadIds.length)
          setOpen(false)
        }
      } else {
        // Default: add existing leads to list
        const res = await fetch(`/api/lists/${listId}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds }),
        })
        if (!res.ok) throw new Error()
        onAdded?.(listId, listName, leadIds.length)
        setOpen(false)
      }
    } catch {}
    setAdding(null)
  }

  const handleCreateAndAdd = async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const { list } = await res.json()
      setLists(prev => [...prev, list])
      setNewName("")
      setShowNewInput(false)
      // Auto-add leads to the new list
      await handleAddToList(list.id, list.name)
    } catch {}
    setCreating(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || leadIds.length === 0}
        className={cn(
          "h-[34px] px-4 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] dark:hover:bg-[#E4E4E7] transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 w-[220px] bg-signal-bg border border-signal-border rounded-lg shadow-lg z-50 py-1 max-h-[280px] overflow-y-auto",
          dropUp ? "bottom-full mb-1" : "top-full mt-1"
        )}>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-signal-text-4 animate-spin" />
            </div>
          ) : lists.length === 0 && !showNewInput ? (
            <div className="px-3 py-3 text-center">
              <p className="text-[13px] text-signal-text-3 mb-2">No lists yet</p>
              <button
                onClick={() => setShowNewInput(true)}
                className="text-[13px] text-signal-accent hover:underline"
              >
                Create your first list
              </button>
            </div>
          ) : (
            <>
              {lists.map(list => (
                <button
                  key={list.id}
                  onClick={() => handleAddToList(list.id, list.name)}
                  disabled={adding === list.id}
                  className="w-full px-3 py-2 text-left hover:bg-signal-surface transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-signal-text-2 truncate">{list.name}</p>
                    <p className="text-[11px] text-signal-text-4">{list.lead_count} leads</p>
                  </div>
                  {adding === list.id ? (
                    <Loader2 className="w-3.5 h-3.5 text-signal-text-4 animate-spin shrink-0" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-signal-text-4 opacity-0 group-hover:opacity-100 shrink-0" />
                  )}
                </button>
              ))}
              <div className="border-t border-signal-border-faint mt-1 pt-1">
                {showNewInput ? (
                  <div className="px-3 py-1.5">
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="List name..."
                      onKeyDown={e => {
                        if (e.key === "Enter") handleCreateAndAdd()
                        if (e.key === "Escape") { setShowNewInput(false); setNewName("") }
                      }}
                      className="w-full h-7 px-2 border border-signal-border rounded text-[13px] focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                      disabled={creating}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewInput(true)}
                    className="w-full px-3 py-2 text-left hover:bg-signal-surface transition-colors flex items-center gap-2 text-[13px] text-signal-accent"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New list
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
