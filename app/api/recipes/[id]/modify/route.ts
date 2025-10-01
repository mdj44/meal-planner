import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"

const modifiedRecipeSchema = z.object({
  updated_recipe: z.object({
    title: z.string(),
    description: z.string().nullable(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        quantity: z.union([z.string(), z.number()]).nullable(),
        unit: z.string().nullable(),
      }),
    ),
    instructions: z.array(
      z.object({
        step: z.number(),
        instruction: z.string(),
      }),
    ),
    prep_time: z.number().nullable(),
    cook_time: z.number().nullable(),
    servings: z.number().nullable(),
    image_url: z.string().nullable(),
    source_url: z.string().nullable(),
  }),
  diff: z.array(
    z.object({
      op: z.enum(["add", "remove", "replace"]),
      path: z.string(),
      from: z.any().optional(),
      to: z.any().optional(),
    }),
  ),
})

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

    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required and must be a non-empty string" }, { status: 400 })
    }

    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    if (recipe.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this recipe" }, { status: 403 })
    }

    const { object: aiResult } = await generateObject({
      model: "openai/gpt-4o",
      schema: modifiedRecipeSchema,
      system: `You modify an existing recipe according to a natural language request. Keep the JSON shape stable and realistic. Keep servings coherent. Keep ingredients and instructions arrays. Prefer substitutions over deletions where possible. Include short notes in the recipe description if technique changes are needed.`,
      prompt: JSON.stringify({
        base_recipe: {
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          servings: recipe.servings,
          image_url: recipe.image_url,
          source_url: recipe.source_url,
        },
        modification_request: prompt.trim(),
      }),
    })

    const { data: updatedRecipe, error: updateError } = await supabase
      .from("recipes")
      .update({
        title: aiResult.updated_recipe.title,
        description: aiResult.updated_recipe.description,
        ingredients: aiResult.updated_recipe.ingredients,
        instructions: aiResult.updated_recipe.instructions,
        prep_time: aiResult.updated_recipe.prep_time,
        cook_time: aiResult.updated_recipe.cook_time,
        servings: aiResult.updated_recipe.servings,
        image_url: aiResult.updated_recipe.image_url,
        source_url: aiResult.updated_recipe.source_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Database update error:", updateError)
      return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      recipe: updatedRecipe,
      diff: aiResult.diff,
    })
  } catch (error) {
    console.error("Recipe modification error:", error)
    return NextResponse.json({ error: "Failed to modify recipe" }, { status: 500 })
  }
}
