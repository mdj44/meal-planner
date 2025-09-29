import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GroceryListsPageContent } from "@/components/grocery-lists-page-content"

export default async function GroceryListsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user's grocery lists and recipes
  const [{ data: groceryLists }, { data: recipes }] = await Promise.all([
    supabase
      .from("grocery_lists")
      .select(`*, grocery_items(*)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ])

  return <GroceryListsPageContent initialLists={groceryLists || []} recipes={recipes || []} />
}
