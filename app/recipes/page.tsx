import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RecipesPageContent } from "@/components/recipes-page-content"
import { AppHeader } from "@/components/app-header"

export default async function RecipesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user's recipes and profile
  const [{ data: recipes }, { data: profile }] = await Promise.all([
    supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} profile={profile} />
      <RecipesPageContent initialRecipes={recipes || []} />
    </div>
  )
}
