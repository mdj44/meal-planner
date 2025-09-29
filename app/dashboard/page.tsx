import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user's data
  const [{ data: recipes }, { data: groceryLists }, { data: profile }] = await Promise.all([
    supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase
      .from("grocery_lists")
      .select(`*, grocery_items(*)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ])

  return (
    <DashboardContent
      user={user}
      profile={profile}
      initialRecipes={recipes || []}
      initialGroceryLists={groceryLists || []}
    />
  )
}
