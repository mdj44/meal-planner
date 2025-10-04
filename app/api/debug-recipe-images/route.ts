import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
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

    // Get recent recipes with image data
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("id, title, image_url, image_urls, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
    }

    return NextResponse.json({
      recipes: recipes?.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image_url: recipe.image_url,
        image_urls: recipe.image_urls,
        image_urls_length: recipe.image_urls ? recipe.image_urls.length : 0,
        created_at: recipe.created_at
      }))
    })

  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ 
      error: "Failed to debug recipes",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
