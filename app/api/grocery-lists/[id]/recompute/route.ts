import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: groceryList, error: listError } = await supabase
      .from("grocery_lists")
      .select("*")
      .eq("id", id)
      .single()

    if (listError || !groceryList) {
      return NextResponse.json({ error: "Grocery list not found" }, { status: 404 })
    }

    if (groceryList.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this grocery list" }, { status: 403 })
    }

    const recipeIds = groceryList.recipe_ids || []

    if (recipeIds.length === 0) {
      return NextResponse.json({ ok: true, count: 0, message: "No recipes in this list" })
    }

    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("id, ingredients")
      .in("id", recipeIds)
      .eq("user_id", user.id)

    if (recipesError) {
      console.error("Failed to fetch recipes:", recipesError)
      return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from("grocery_items")
      .delete()
      .eq("grocery_list_id", id)
      .not("recipe_id", "is", null)

    if (deleteError) {
      console.error("Failed to delete old items:", deleteError)
      return NextResponse.json({ error: "Failed to delete old items" }, { status: 500 })
    }

    const groceryItems = []

    for (const recipe of recipes || []) {
      for (const ingredient of recipe.ingredients || []) {
        groceryItems.push({
          grocery_list_id: id,
          name: ingredient.name,
          quantity: ingredient.quantity || null,
          unit: ingredient.unit || null,
          category: null,
          aisle: null,
          recipe_id: recipe.id,
        })
      }
    }

    let insertedCount = 0
    if (groceryItems.length > 0) {
      const { error: insertError, count } = await supabase.from("grocery_items").insert(groceryItems).select()

      if (insertError) {
        console.error("Failed to insert items:", insertError)
        return NextResponse.json({ error: "Failed to insert new items" }, { status: 500 })
      }

      insertedCount = count || groceryItems.length
    }

    return NextResponse.json({
      ok: true,
      count: insertedCount,
    })
  } catch (error) {
    console.error("Grocery list recompute error:", error)
    return NextResponse.json({ error: "Failed to recompute grocery list" }, { status: 500 })
  }
}
