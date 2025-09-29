import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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

    // Sample recipe data
    const sampleRecipe = {
      user_id: user.id,
      title: "Classic Spaghetti Carbonara",
      description: "A traditional Italian pasta dish with eggs, cheese, and pancetta",
      ingredients: [
        { name: "spaghetti", quantity: "400", unit: "g" },
        { name: "pancetta", quantity: "150", unit: "g" },
        { name: "eggs", quantity: "3", unit: "large" },
        { name: "parmesan cheese", quantity: "100", unit: "g" },
        { name: "black pepper", quantity: "1", unit: "tsp" },
        { name: "salt", quantity: "to taste", unit: "" },
      ],
      instructions: [
        {
          step: 1,
          instruction: "Bring a large pot of salted water to boil and cook spaghetti according to package directions.",
        },
        { step: 2, instruction: "While pasta cooks, dice pancetta and cook in a large skillet until crispy." },
        { step: 3, instruction: "In a bowl, whisk together eggs, grated parmesan, and black pepper." },
        { step: 4, instruction: "Drain pasta, reserving 1 cup pasta water. Add hot pasta to pancetta." },
        { step: 5, instruction: "Remove from heat and quickly stir in egg mixture, adding pasta water as needed." },
        { step: 6, instruction: "Serve immediately with extra parmesan and black pepper." },
      ],
      prep_time: 10,
      cook_time: 15,
      servings: 4,
      raw_content: "Sample recipe for testing purposes",
    }

    // Save recipe to database
    const { data: recipe, error: dbError } = await supabase.from("recipes").insert(sampleRecipe).select().single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 })
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error("Test recipe error:", error)
    return NextResponse.json({ error: "Failed to create test recipe" }, { status: 500 })
  }
}
