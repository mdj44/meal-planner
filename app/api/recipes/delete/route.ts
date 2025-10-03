import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recipeIds } = body

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return NextResponse.json({ error: "Recipe IDs are required" }, { status: 400 })
    }

    // Verify all recipes belong to the user
    const { data: recipes, error: fetchError } = await supabase
      .from("recipes")
      .select("id, title, user_id, original_recipe_id, version_number, is_modified")
      .in("id", recipeIds)

    if (fetchError) {
      console.error("Error fetching recipes:", fetchError)
      return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
    }

    if (!recipes || recipes.length !== recipeIds.length) {
      return NextResponse.json({ error: "Some recipes not found" }, { status: 404 })
    }

    // Check ownership
    const unauthorizedRecipes = recipes.filter(recipe => recipe.user_id !== user.id)
    if (unauthorizedRecipes.length > 0) {
      return NextResponse.json({ error: "You don't own all selected recipes" }, { status: 403 })
    }

    // Handle deletion logic for versioned recipes
    const deletionResults = []
    
    for (const recipe of recipes) {
      // If deleting an original recipe that has versions, we need to handle it carefully
      if (!recipe.is_modified && !recipe.original_recipe_id) {
        // This is an original recipe - check if it has versions
        const { data: versions } = await supabase
          .from("recipes")
          .select("id, title")
          .eq("original_recipe_id", recipe.id)

        if (versions && versions.length > 0) {
          // Original recipe has versions - we'll delete all versions too
          const allVersionIds = [recipe.id, ...versions.map(v => v.id)]
          
          const { error: deleteError } = await supabase
            .from("recipes")
            .delete()
            .in("id", allVersionIds)

          if (deleteError) {
            console.error("Error deleting recipe family:", deleteError)
            deletionResults.push({
              id: recipe.id,
              title: recipe.title,
              success: false,
              error: "Failed to delete recipe and its versions"
            })
          } else {
            deletionResults.push({
              id: recipe.id,
              title: recipe.title,
              success: true,
              versionsDeleted: versions.length
            })
          }
        } else {
          // Original recipe with no versions - simple delete
          const { error: deleteError } = await supabase
            .from("recipes")
            .delete()
            .eq("id", recipe.id)

          deletionResults.push({
            id: recipe.id,
            title: recipe.title,
            success: !deleteError,
            error: deleteError?.message
          })
        }
      } else {
        // This is a modified version - simple delete
        const { error: deleteError } = await supabase
          .from("recipes")
          .delete()
          .eq("id", recipe.id)

        deletionResults.push({
          id: recipe.id,
          title: recipe.title,
          success: !deleteError,
          error: deleteError?.message
        })
      }
    }

    const successCount = deletionResults.filter(r => r.success).length
    const failureCount = deletionResults.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${successCount} recipe(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results: deletionResults
    })

  } catch (error) {
    console.error("Recipe deletion error:", error)
    return NextResponse.json({ error: "Failed to delete recipes" }, { status: 500 })
  }
}

