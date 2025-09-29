import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RecipesPageContent } from "@/components/recipes-page-content"

export default async function RecipesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user's recipes
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return <RecipesPageContent initialRecipes={recipes || []} />
}
