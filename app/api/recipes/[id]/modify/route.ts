import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Direct OpenAI API call function for recipe modification
async function modifyRecipeWithOpenAI(baseRecipe: any, modificationRequest: string) {
  try {
    console.log("Calling OpenAI for recipe modification...")
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You modify an existing recipe according to a natural language request. Return ONLY valid JSON with this exact structure:
{
  "updated_recipe": {
    "title": "Recipe Name",
    "description": "Brief description",
    "ingredients": [{"name": "ingredient", "quantity": "amount", "unit": "unit"}],
    "instructions": [{"step": 1, "instruction": "Step description"}],
    "prep_time": 15,
    "cook_time": 30,
    "servings": 4
  }
}

Keep the JSON shape stable and realistic. Keep servings coherent. Prefer substitutions over deletions where possible. Include short notes in the recipe description if technique changes are needed.`
          },
          {
            role: "user",
            content: `Modify this recipe: ${JSON.stringify(baseRecipe)}

Modification request: ${modificationRequest}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.")
      } else if (response.status === 401) {
        throw new Error("Invalid OpenAI API key. Please check your API key configuration.")
      } else if (response.status === 400) {
        throw new Error(`Invalid request to OpenAI: ${errorData.error?.message || 'Bad request'}`)
      } else {
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`)
      }
    }

    const data = await response.json()
    let content_text = data.choices[0]?.message?.content
    
    if (!content_text) {
      throw new Error("No content returned from OpenAI")
    }

    console.log("Raw OpenAI response:", content_text)

    // Clean up the response - remove markdown code blocks if present
    content_text = content_text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Try to parse as JSON
    try {
      const result = JSON.parse(content_text)
      console.log("Parsed OpenAI result:", result)
      return result
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Raw content:", content_text)
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`)
    }
  } catch (error) {
    console.error("OpenAI modification error:", error)
    throw error
  }
}

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

    console.log("Starting recipe modification for recipe:", id)
    console.log("Modification prompt:", prompt.trim())

    const baseRecipe = {
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      image_url: recipe.image_url,
      source_url: recipe.source_url,
    }

    const aiResult = await modifyRecipeWithOpenAI(baseRecipe, prompt.trim())

    // Get the next version number for this recipe family
    const originalRecipeId = recipe.original_recipe_id || recipe.id
    const { data: existingVersions } = await supabase
      .from("recipes")
      .select("version_number")
      .or(`id.eq.${originalRecipeId},original_recipe_id.eq.${originalRecipeId}`)
      .order("version_number", { ascending: false })
      .limit(1)

    const nextVersionNumber = existingVersions && existingVersions.length > 0 
      ? (existingVersions[0].version_number || 1) + 1 
      : 2

    // Create a new recipe version instead of updating the original
    const modifiedTitle = `*${aiResult.updated_recipe.title} +${prompt.trim().substring(0, 20)}${prompt.trim().length > 20 ? '...' : ''}`
    
    const { data: newRecipeVersion, error: insertError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        title: modifiedTitle,
        description: aiResult.updated_recipe.description,
        ingredients: aiResult.updated_recipe.ingredients,
        instructions: aiResult.updated_recipe.instructions,
        prep_time: aiResult.updated_recipe.prep_time,
        cook_time: aiResult.updated_recipe.cook_time,
        servings: aiResult.updated_recipe.servings,
        image_url: aiResult.updated_recipe.image_url || recipe.image_url,
        source_url: aiResult.updated_recipe.source_url || recipe.source_url,
        raw_content: recipe.raw_content,
        original_recipe_id: originalRecipeId,
        version_number: nextVersionNumber,
        modification_prompt: prompt.trim(),
        is_modified: true,
        image_urls: recipe.image_urls || (recipe.image_url ? [recipe.image_url] : [])
      })
      .select()
      .single()

    if (insertError) {
      console.error("Database insert error:", insertError)
      return NextResponse.json({ error: "Failed to create recipe version" }, { status: 500 })
    }

    console.log("Successfully created new recipe version:", newRecipeVersion.id)

    return NextResponse.json({
      ok: true,
      recipe: newRecipeVersion,
      message: `Created new recipe version: ${modifiedTitle}`
    })
  } catch (error) {
    console.error("Recipe modification error:", error)
    return NextResponse.json({ error: "Failed to modify recipe" }, { status: 500 })
  }
}
