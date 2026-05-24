"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/signal/sidebar"
import { Check, Eye, EyeOff, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

function getDisplayName(user: User): string {
  return user.user_metadata?.full_name || user.user_metadata?.name || ""
}

function getInitials(user: User): string {
  const name = getDisplayName(user) || user.email || ""
  return name.split(/[\s@]/).filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        setName(getDisplayName(user))
      }
    })
  }, [])

  const isGoogleUser = user?.app_metadata?.provider === "google"
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const initials = user ? getInitials(user) : "…"

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwSaving(true)
    setPwError(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) {
      setPwError(error.message)
    } else {
      setPwSaved(true)
      setNewPassword("")
      setShowPasswordForm(false)
      setTimeout(() => setPwSaved(false), 2000)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") return
    setDeleting(true)
    const res = await fetch("/api/account/delete", { method: "POST" })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push("/login")
    } else {
      setDeleting(false)
      setDeleteModal(false)
    }
  }

  return (
    <div className="min-h-screen bg-signal-bg">
      <Sidebar activePage="settings" />

      <div className="ml-[200px] flex flex-col min-h-screen">
        <header className="h-[52px] bg-signal-bg border-b border-signal-border flex items-center px-6 shrink-0">
          <p className="text-[18px] font-semibold text-signal-text-1">Settings</p>
        </header>

        <main className="flex-1 p-7">
          <div className="max-w-[580px]">
            <div className="bg-signal-bg border border-signal-border rounded-xl p-6">
              <h2 className="text-[16px] font-semibold text-signal-text-1 mb-6">Account</h2>

              {/* Avatar row */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-signal-accent-tint flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[20px] font-semibold text-signal-accent-2">{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-signal-text-1">
                    {name || user?.email || "—"}
                  </p>
                  <p className="text-[13px] text-signal-text-3">{user?.email}</p>
                  {isGoogleUser && (
                    <p className="text-[12px] text-signal-text-4 mt-0.5">Signed in with Google</p>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="flex flex-col gap-4 max-w-[480px]">
                <div>
                  <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full border border-signal-border rounded-lg h-10 px-3 text-[14px] text-signal-text-1 outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    className="w-full border border-signal-border rounded-lg h-10 px-3 text-[14px] text-signal-text-1 bg-signal-surface outline-none cursor-not-allowed"
                  />
                  {user?.email_confirmed_at && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-[#D1FAE5] text-[#065F46] rounded-full px-2 py-0.5">
                      <Check className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                </div>

                {saveError && (
                  <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
                )}

                <div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-9 px-4 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] dark:hover:bg-[#E4E4E7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>

              <div className="border-t border-signal-border-faint my-6" />

              {/* Password — email users only */}
              {!isGoogleUser && (
                <div className="mb-6">
                  <p className="text-[13px] font-semibold text-signal-text-2 mb-3">Password</p>
                  {!showPasswordForm ? (
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="text-[13px] text-signal-accent hover:underline"
                    >
                      {pwSaved ? "Password updated ✓" : "Change password →"}
                    </button>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="flex flex-col gap-3 max-w-[480px]">
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="New password (min 8 characters)"
                          className="w-full border border-signal-border rounded-lg h-10 px-3 pr-10 text-[14px] text-signal-text-1 outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-signal-text-4 hover:text-signal-text-2"
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {pwError && (
                        <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={pwSaving}
                          className="h-9 px-4 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] dark:hover:bg-[#E4E4E7] disabled:opacity-50 transition-colors"
                        >
                          {pwSaving ? "Updating…" : "Update password"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPasswordForm(false); setNewPassword(""); setPwError(null) }}
                          className="h-9 px-4 text-[13px] text-signal-text-3 hover:text-signal-text-1 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  <div className="border-t border-signal-border-faint mt-6" />
                </div>
              )}

              {/* Danger zone */}
              <p className="text-[13px] font-semibold text-[#DC2626] mb-3">Danger zone</p>
              <div className="flex items-center py-2.5">
                <div className="flex-1">
                  <p className="text-[13px] text-signal-text-2">Delete account</p>
                  <p className="text-[12px] text-signal-text-4">Permanently deletes all your leads, briefs, and data</p>
                </div>
                <button
                  onClick={() => setDeleteModal(true)}
                  className="text-[13px] text-[#DC2626] border border-[#FCA5A5] rounded-lg h-8 px-3.5 hover:bg-[#FEF2F2] transition-colors"
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setDeleteModal(false); setDeleteConfirmText("") }} />
          <div className="relative bg-signal-bg rounded-xl shadow-2xl w-[440px] p-7 z-10">
            <button
              onClick={() => { setDeleteModal(false); setDeleteConfirmText("") }}
              className="absolute top-4 right-4 text-signal-text-4 hover:text-signal-text-2"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-[16px] font-semibold text-signal-text-1">Delete your account?</h3>
            <p className="text-[13px] text-signal-text-3 mt-1 mb-5">
              This will permanently delete all your briefs, lists, and data. This cannot be undone.
            </p>
            <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">Type DELETE to confirm</label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-signal-border rounded-lg h-10 px-3 text-[13px] outline-none focus:border-[#DC2626] mb-4"
            />
            <button
              onClick={handleDelete}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              className={cn(
                "w-full h-10 text-[13px] font-medium rounded-lg transition-colors",
                deleteConfirmText === "DELETE" && !deleting
                  ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                  : "bg-signal-raised text-signal-text-4 cursor-not-allowed"
              )}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </button>
            <button
              onClick={() => { setDeleteModal(false); setDeleteConfirmText("") }}
              className="w-full text-center text-[13px] text-signal-text-4 mt-3 hover:text-signal-text-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


