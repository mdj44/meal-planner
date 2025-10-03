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

  // Only fetch profile for header - recipes will load client-side
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} profile={profile} />
      <RecipesPageContent initialRecipes={[]} />
    </div>
  )
}
