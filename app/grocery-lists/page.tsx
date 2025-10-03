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

  // Fetch user's grocery lists, recipes, and profile with performance optimizations
  const [{ data: groceryLists }, { data: recipes }, { data: profile }] = await Promise.all([
    supabase
      .from("grocery_lists")
      .select(`*, grocery_items(*)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20), // Limit for performance
    supabase
      .from("recipes")
      .select("id, title, created_at") // Only fetch needed fields
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} profile={profile} />
      <GroceryListsPageContent initialLists={groceryLists || []} recipes={recipes || []} />
    </div>
  )
}
