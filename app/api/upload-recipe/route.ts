import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"

// Recipe schema for OpenAI parsing
const recipeSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          unit: { type: "string" },
        },
        required: ["name"],
      },
    },
    instructions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          step: { type: "number" },
          instruction: { type: "string" },
        },
        required: ["step", "instruction"],
      },
    },
    prep_time: { type: "number" },
    cook_time: { type: "number" },
    servings: { type: "number" },
  },
  required: ["title", "ingredients", "instructions"],
} as const

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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const url = formData.get("url") as string
    const text = formData.get("text") as string

    let content = ""
    let imageUrl = ""

    // Handle different input types
    if (file) {
      // Upload file to Supabase storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("recipe-uploads")
        .upload(fileName, file)

      if (uploadError) {
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-uploads").getPublicUrl(fileName)

      imageUrl = publicUrl

      // For images, we'll use vision model
      if (file.type.startsWith("image/")) {
        content = `Please extract the recipe from this image: ${publicUrl}`
      } else {
        // For PDFs or text files, convert to text first
        content = await file.text()
      }
    } else if (url) {
      content = `Please extract the recipe from this URL: ${url}`
    } else if (text) {
      content = text
    } else {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    // Parse recipe using OpenAI
    const { object: parsedRecipe } = await generateObject({
      model: "openai/gpt-4o",
      prompt: `Extract recipe information from the following content and structure it according to the schema. If this is an image, analyze the visual content to extract the recipe. Content: ${content}`,
      schema: recipeSchema,
    })

    // Save recipe to database
    const { data: recipe, error: dbError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        title: parsedRecipe.title,
        description: parsedRecipe.description || "",
        ingredients: parsedRecipe.ingredients,
        instructions: parsedRecipe.instructions,
        prep_time: parsedRecipe.prep_time,
        cook_time: parsedRecipe.cook_time,
        servings: parsedRecipe.servings,
        image_url: imageUrl,
        source_url: url || null,
        raw_content: content,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 })
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error("Recipe upload error:", error)
    return NextResponse.json({ error: "Failed to process recipe" }, { status: 500 })
  }
}
