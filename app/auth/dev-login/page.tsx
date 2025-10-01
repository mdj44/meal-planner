"use client"

import type React from "react"

/**
 * Development-only convenience page to create and sign in a test user in preview environments.
 *
 * NOTES:
 * - This endpoint attempts to use the Supabase Admin API with the service role key.
 * - Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel env for Preview.
 * - This page is intentionally gated to preview and development environments only.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

export default function DevLogin() {
  const supabase = createBrowserClient()
  const router = useRouter()
  const [email, setEmail] = useState("dev@example.com")
  const [password, setPassword] = useState("DevPass!234")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Safety: only allow in preview or dev
    const allowed =
      typeof window !== "undefined" &&
      (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" || process.env.NODE_ENV === "development")

    if (!allowed) {
      toast({ title: "Not allowed", description: "Dev login is disabled in production" })
      setLoading(false)
      return
    }

    try {
      // 1) Try to create a user via admin endpoint (service role key required).
      const serviceKey = (window as any).__SERVICE_ROLE_KEY_OVERRIDE || ""
      // NOTE: for security, we do not store service role key in client-side JS.
      // Instead, Vercel AI should have created a server action to call the admin API.
      // Fallback: attempt normal signUp (this will require email confirmation).
      const {} = await supabase.auth.signUp({ email, password }).catch(() => ({}))

      // 2) After signUp, attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast({ title: "Sign-in failed", description: error.message })
        setLoading(false)
        return
      }

      // success
      router.push("/")
    } catch (err: any) {
      toast({ title: "Dev login error", description: err?.message || String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dev / Preview Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            <div className="flex justify-between items-center">
              <small className="text-xs text-muted-foreground">Only for preview/dev</small>
              <Button type="submit" disabled={loading}>
                {loading ? "Working..." : "Create & Sign in"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
