import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Function to normalize ingredient names for database lookup
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
}

// Hardcoded classifications for common ingredients (fallback when DB not available)
const COMMON_INGREDIENTS: Record<string, { category: string; aisle: string; confidence: number }> = {
  'pita bread': { category: 'bakery', aisle: 'Bakery Section', confidence: 0.95 },
  'white rice': { category: 'pantry', aisle: 'Aisle 5 - Grains', confidence: 0.98 },
  'brown rice': { category: 'pantry', aisle: 'Aisle 5 - Grains', confidence: 0.98 },
  'olive oil': { category: 'pantry', aisle: 'Aisle 7 - Oils & Vinegars', confidence: 0.99 },
  'salt': { category: 'pantry', aisle: 'Aisle 8 - Spices', confidence: 0.99 },
  'black pepper': { category: 'pantry', aisle: 'Aisle 8 - Spices', confidence: 0.99 },
  'pepper': { category: 'pantry', aisle: 'Aisle 8 - Spices', confidence: 0.99 },
  'garlic': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'onion': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'tomato': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'tomatoes': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'baby tomatoes': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'chicken breast': { category: 'meat', aisle: 'Meat Department', confidence: 0.99 },
  'ground beef': { category: 'meat', aisle: 'Meat Department', confidence: 0.99 },
  'milk': { category: 'dairy', aisle: 'Dairy Section', confidence: 0.99 },
  'eggs': { category: 'dairy', aisle: 'Dairy Section', confidence: 0.99 },
  'butter': { category: 'dairy', aisle: 'Dairy Section', confidence: 0.99 },
  'cheese': { category: 'dairy', aisle: 'Dairy Section', confidence: 0.98 },
  'feta cheese': { category: 'dairy', aisle: 'Dairy Section', confidence: 0.98 },
  'parsley': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'bell pepper': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'sweet bell pepper': { category: 'produce', aisle: 'Produce Section', confidence: 0.99 },
  'olives': { category: 'produce', aisle: 'Produce Section', confidence: 0.95 },
  'mixed olives': { category: 'produce', aisle: 'Produce Section', confidence: 0.95 },
  'chickpeas': { category: 'pantry', aisle: 'Aisle 6 - Canned Goods', confidence: 0.98 },
  'white wine vinegar': { category: 'pantry', aisle: 'Aisle 7 - Oils & Vinegars', confidence: 0.98 },
  'sugar': { category: 'pantry', aisle: 'Aisle 8 - Baking', confidence: 0.99 },
  'oil': { category: 'pantry', aisle: 'Aisle 7 - Oils & Vinegars', confidence: 0.95 }
}

// Direct OpenAI API call function for ingredient classification
async function classifyIngredientWithOpenAI(ingredientName: string) {
  try {
    console.log("Calling OpenAI for ingredient classification:", ingredientName)
    
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
            content: `You classify grocery ingredients into categories and suggest aisles. Return ONLY valid JSON with this exact structure:
{
  "category": "produce|dairy|meat|seafood|bakery|frozen|pantry|beverages|snacks|health|household|other",
  "aisle": "aisle name or number",
  "confidence": 0.95
}

Categories:
- produce: fruits, vegetables, herbs, fresh items
- dairy: milk, cheese, yogurt, eggs, butter
- meat: beef, pork, chicken, deli meats, fresh meat
- seafood: fish, shellfish, canned fish
- bakery: bread, pastries, cakes, fresh baked goods
- frozen: frozen foods, ice cream, frozen vegetables
- pantry: canned goods, spices, oils, grains, dry goods
- beverages: drinks, juices, soda, water, alcohol
- snacks: chips, crackers, candy, nuts
- health: vitamins, medicine, personal care
- household: cleaning supplies, paper products
- other: anything that doesn't fit above categories`
          },
          {
            role: "user",
            content: `Classify this ingredient for grocery shopping: "${ingredientName}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
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
    console.error("OpenAI ingredient classification error:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Note: This API is public for internal use by other APIs

    const { ingredientName, storeId } = await request.json()

    if (!ingredientName || typeof ingredientName !== 'string') {
      return NextResponse.json({ error: "Ingredient name is required" }, { status: 400 })
    }

    console.log("Classifying ingredient:", ingredientName)
    
    const normalizedName = normalizeIngredientName(ingredientName)
    console.log("Normalized name:", normalizedName)

    // Step 1: Check if we have this ingredient in our database
    const { data: existingIngredient, error: dbError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('name', normalizedName)
      .single()

    // If database error (table doesn't exist), check hardcoded list
    if (dbError && dbError.code !== 'PGRST116') {
      console.log('Ingredients table not found, checking hardcoded ingredients:', dbError.message)
      
      // Check hardcoded common ingredients
      const hardcodedMatch = COMMON_INGREDIENTS[normalizedName]
      if (hardcodedMatch) {
        console.log(`Found hardcoded classification for "${ingredientName}": ${hardcodedMatch.category}`)
        return NextResponse.json({
          category: hardcodedMatch.category,
          aisle: hardcodedMatch.aisle,
          confidence: hardcodedMatch.confidence,
          source: "hardcoded"
        })
      }
    } else if (existingIngredient && existingIngredient.ai_category) {
        console.log("Found existing classification in database:", existingIngredient)
        
        // Step 2: Check for store-specific location if storeId provided
        let storeLocation = null
        if (storeId) {
          const { data: location } = await supabase
            .from('store_ingredient_locations')
            .select('*')
            .eq('store_id', storeId)
            .eq('ingredient_id', existingIngredient.id)
            .single()
          
          storeLocation = location
        }

        return NextResponse.json({
          category: storeLocation?.user_category || existingIngredient.ai_category,
          aisle: storeLocation?.user_aisle || existingIngredient.ai_aisle,
          confidence: storeLocation?.confidence_score || existingIngredient.ai_confidence,
          source: storeLocation ? "store_mapping" : "database",
          ingredient_id: existingIngredient.id,
          store_location: storeLocation
        })
    }

    // Step 3: No classification found, use AI
    console.log("No existing classification found, calling OpenAI...")
    const aiClassification = await classifyIngredientWithOpenAI(ingredientName)

    // Step 4: Save AI classification to database (if table exists)
    let ingredientId = null
    try {
      const { data: newIngredient, error: insertError } = await supabase
        .from('ingredients')
        .insert({
          name: normalizedName,
          display_name: ingredientName.trim(),
          ai_category: aiClassification.category,
          ai_aisle: aiClassification.aisle,
          ai_confidence: aiClassification.confidence,
          ai_classified_at: new Date().toISOString(),
          usage_count: 1
        })
        .select()
        .single()

      if (insertError) {
        console.log('Could not save to ingredients table (table may not exist):', insertError.message)
      } else {
        ingredientId = newIngredient?.id
        console.log("Saved AI classification to database for ingredient ID:", ingredientId)
      }
    } catch (saveError) {
      console.log('Could not save to ingredients table:', saveError)
    }

    return NextResponse.json({
      ...aiClassification,
      source: "ai_fresh",
      ingredient_id: ingredientId,
      message: "New ingredient classified and saved to database"
    })

  } catch (error) {
    console.error("Ingredient classification error:", error)
    return NextResponse.json({ 
      error: "Failed to classify ingredient",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
