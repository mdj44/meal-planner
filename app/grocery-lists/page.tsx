import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GroceryListsPageContent } from "@/components/grocery-lists-page-content"
import { AppHeader } from "@/components/app-header"

export default async function GroceryListsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Only fetch profile for header - lists will load client-side
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} profile={profile} />
      <GroceryListsPageContent initialLists={[]} recipes={[]} />
    </div>
  )
}
