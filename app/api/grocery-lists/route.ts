import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's grocery lists with items
    const { data: groceryLists, error } = await supabase
      .from("grocery_lists")
      .select(`
        *,
        grocery_items (*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch grocery lists" }, { status: 500 })
    }

    return NextResponse.json({ groceryLists })
  } catch (error) {
    console.error("Grocery lists fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch grocery lists" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, recipeIds } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 })
    }

    // Create grocery list
    const { data: groceryList, error: listError } = await supabase
      .from("grocery_lists")
      .insert({
        user_id: user.id,
        name,
        recipe_ids: recipeIds || [],
      })
      .select()
      .single()

    if (listError) {
      console.error("Database error:", listError)
      return NextResponse.json({ error: "Failed to create grocery list" }, { status: 500 })
    }

    // If recipe IDs provided, generate grocery items from recipes
    if (recipeIds && recipeIds.length > 0) {
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id, ingredients")
        .in("id", recipeIds)
        .eq("user_id", user.id)

      if (recipes) {
        const groceryItems = []

        for (const recipe of recipes) {
          for (const ingredient of recipe.ingredients) {
            groceryItems.push({
              grocery_list_id: groceryList.id,
              name: ingredient.name,
              quantity: ingredient.quantity || null,
              unit: ingredient.unit || null,
              recipe_id: recipe.id,
            })
          }
        }

        if (groceryItems.length > 0) {
          await supabase.from("grocery_items").insert(groceryItems)
        }
      }
    }

    return NextResponse.json({ groceryList })
  } catch (error) {
    console.error("Grocery list creation error:", error)
    return NextResponse.json({ error: "Failed to create grocery list" }, { status: 500 })
  }
}
