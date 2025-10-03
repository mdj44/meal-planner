import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserProfile } from "@/components/user-profile"
import { AppHeader } from "@/components/app-header"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Load profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} profile={profile} />
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <UserProfile />
        </div>
      </main>
    </div>
  )
}