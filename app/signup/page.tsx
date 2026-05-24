"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-signal-bg flex items-center justify-center">
        <div className="bg-signal-bg border border-signal-border rounded-xl p-8 w-[400px] text-center">
          <div className="w-10 h-10 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-[#065F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[16px] font-semibold text-signal-text-1 mb-2">Check your email</h2>
          <p className="text-[13px] text-signal-text-3">
            We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-signal-bg flex items-center justify-center">
      <div className="bg-signal-bg border border-signal-border rounded-xl p-8 w-[400px]">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-[18px] font-semibold text-signal-text-1 tracking-tight">Signal</span>
          <p className="text-[13px] text-signal-text-3 mt-1">Create your account</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full h-10 flex items-center justify-center gap-2.5 border border-signal-border rounded-lg text-[13px] font-medium text-signal-text-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-signal-border" />
          <span className="text-[12px] text-signal-text-4">or</span>
          <div className="flex-1 h-px bg-signal-border" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full h-10 px-3 border border-signal-border rounded-lg text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-signal-text-2 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min 8 characters"
              className="w-full h-10 px-3 border border-signal-border rounded-lg text-[14px] placeholder:text-signal-text-4 focus:outline-none focus:border-signal-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-shadow"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full h-10 bg-[#1C1C1C] dark:bg-[#FAFAFA] text-white dark:text-[#18181B] text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] dark:hover:bg-[#E4E4E7] disabled:bg-[#E5E7EB] dark:disabled:bg-[#3F3F46] disabled:text-signal-text-4 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-[13px] text-signal-text-3 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-signal-accent hover:text-signal-accent-2 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
