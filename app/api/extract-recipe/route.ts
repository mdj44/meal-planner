import { type NextRequest, NextResponse } from "next/server"

// Direct OpenAI API call function for recipe extraction
async function extractRecipeWithOpenAI(base64Image: string, mimeType: string) {
  try {
    console.log("Calling OpenAI for recipe extraction...")
    
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
            content: `You extract recipe information from images. Return ONLY valid JSON with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "quantity",
      "unit": "unit"
    }
  ],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"],
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type"
}

Extract all visible recipe information. Be accurate with measurements and instructions. If you can't determine certain information, omit it rather than guessing.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract the recipe information from this image:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
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
    console.error("OpenAI recipe extraction error:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    
    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    // Convert image to base64 for AI processing
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = imageFile.type

    // Use AI to extract recipe data from the image
    const recipeData = await extractRecipeWithOpenAI(base64Image, mimeType)

    // Add metadata
    const extractedRecipe = {
      ...recipeData,
      extracted_at: new Date().toISOString(),
      source: "image_upload",
      image_filename: imageFile.name,
      image_size: imageFile.size,
      image_type: mimeType
    }

    return NextResponse.json({
      success: true,
      recipe: extractedRecipe
    })

  } catch (error) {
    console.error("Recipe extraction error:", error)
    return NextResponse.json({ 
      error: "Failed to extract recipe from image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
