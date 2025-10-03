import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Simple function to call OpenAI directly
async function extractRecipeWithOpenAI(content: string, isImage: boolean = false) {
  try {
    let messages: any[] = []

    if (isImage) {
      // For images, we need to use vision capabilities
      messages = [
        {
          role: "system",
          content: "You are a recipe extraction assistant. Analyze the image and extract recipe information. Return ONLY valid JSON with this structure: {\"title\": \"Recipe Name\", \"description\": \"Brief description\", \"ingredients\": [{\"name\": \"ingredient\", \"quantity\": \"amount\", \"unit\": \"unit\"}], \"instructions\": [{\"step\": 1, \"instruction\": \"Step description\"}], \"prep_time\": 15, \"cook_time\": 30, \"servings\": 4, \"cuisine\": \"type\", \"difficulty\": \"easy/medium/hard\"}. If you cannot read the recipe clearly, return: {\"title\": \"Unable to extract recipe\", \"ingredients\": [], \"instructions\": []}"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract the recipe information from this image and return it as JSON:"
            },
            {
              type: "image_url",
              image_url: {
                url: content // content should be a data URL for images
              }
            }
          ]
        }
      ]
    } else {
      // For text content
      messages = [
        {
          role: "system",
          content: "You are a recipe extraction assistant. Extract recipe information and return ONLY valid JSON with the following structure: {\"title\": \"Recipe Name\", \"description\": \"Brief description\", \"ingredients\": [{\"name\": \"ingredient\", \"quantity\": \"amount\", \"unit\": \"unit\"}], \"instructions\": [{\"step\": 1, \"instruction\": \"Step description\"}], \"prep_time\": 15, \"cook_time\": 30, \"servings\": 4, \"cuisine\": \"type\", \"difficulty\": \"easy/medium/hard\"}"
        },
        {
          role: "user",
          content: `Extract recipe information from this content: ${content}`
        }
      ]
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isImage ? "gpt-4o-mini" : "gpt-4o-mini",
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again, or check your OpenAI API usage limits.")
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

    // Clean up the response - remove markdown code blocks if present
    content_text = content_text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Try to parse as JSON
    try {
      return JSON.parse(content_text)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Raw content:", content_text)
      
      // If JSON parsing fails, return a fallback response
      return {
        title: "Unable to extract recipe",
        description: "The AI could not extract recipe information from this content",
        ingredients: [],
        instructions: [],
        prep_time: null,
        cook_time: null,
        servings: null,
        error_details: content_text
      }
    }
  } catch (error) {
    console.error("OpenAI extraction error:", error)
    throw error
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const url = formData.get("url") as string
    const text = formData.get("text") as string
    const fileCount = parseInt(formData.get("file_count") as string || "0")

    let content = ""
    let imageUrl = ""
    let imageUrls: string[] = []

    // Handle different input types
    // Check for multiple files first
    if (fileCount > 0) {
      const files: File[] = []
      for (let i = 0; i < fileCount; i++) {
        const multiFile = formData.get(`file_${i}`) as File
        if (multiFile) files.push(multiFile)
      }

      if (files.length === 0) {
        return NextResponse.json({ error: "No valid files found" }, { status: 400 })
      }

      // Process multiple files
      const fileContents: string[] = []
      for (const [index, currentFile] of files.entries()) {
        if (!currentFile.type.startsWith("image/")) {
          return NextResponse.json({ error: `File ${index + 1} must be an image` }, { status: 400 })
        }

        // Upload file to Supabase storage
        const fileExt = currentFile.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}_${index}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("recipe-uploads")
          .upload(fileName, currentFile)

        if (uploadError) {
          console.error("Storage upload error:", uploadError)
          return NextResponse.json(
            {
              error: `Failed to upload file ${index + 1}. Please make sure the storage bucket is properly configured.`,
            },
            { status: 500 },
          )
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("recipe-uploads").getPublicUrl(fileName)

        imageUrls.push(publicUrl)

        // Convert to base64 for OpenAI
        const bytes = await currentFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')
        fileContents.push(`data:${currentFile.type};base64,${base64Image}`)
      }

      // Use the first image as primary content, but mention multiple images
      content = fileContents[0]
      imageUrl = imageUrls[0]
      
      // If multiple images, modify the prompt
      if (fileContents.length > 1) {
        content = `${fileContents[0]} [Note: This is image 1 of ${fileContents.length} images for this recipe. Please extract all visible recipe information.]`
      }
    } else if (file) {
      // Upload file to Supabase storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("recipe-uploads")
        .upload(fileName, file)

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        return NextResponse.json(
          {
            error: "Failed to upload file. Please make sure the storage bucket is properly configured.",
          },
          { status: 500 },
        )
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-uploads").getPublicUrl(fileName)

      imageUrl = publicUrl

      // For images, convert to base64 for vision model
      if (file.type.startsWith("image/")) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')
        content = `data:${file.type};base64,${base64Image}`
      } else {
        // For other text files, convert to text first
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
    const isImage = file && file.type.startsWith("image/")
    const parsedRecipe = await extractRecipeWithOpenAI(content, isImage)

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
        image_urls: imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
        source_url: url || null,
        raw_content: content,
        version_number: 1,
        is_modified: false
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 })
    }

    // Generate JSON export in your preferred format
    const jsonExport = {
      id: `r${String(recipe.id).padStart(3, '0')}`,
      name: recipe.title,
      ingredients: recipe.ingredients.map(ing => 
        `${ing.quantity || '1'} ${ing.unit || ''} ${ing.name}`.trim()
      ),
      instructions: recipe.instructions.map(inst => inst.instruction),
      modifications: {
        // Placeholder for future modifications
        "default": "No modifications"
      },
      metadata: {
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
        description: recipe.description,
        image_url: recipe.image_url,
        source_url: recipe.source_url,
        created_at: new Date().toISOString()
      }
    }

    return NextResponse.json({ 
      recipe,
      json_export: jsonExport,
      message: "Recipe uploaded and parsed successfully! JSON export available."
    })
  } catch (error) {
    console.error("Recipe upload error:", error)
    return NextResponse.json({ 
      error: "Failed to process recipe",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
