import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { combineQuantities } from "@/lib/quantity-utils"

// Simple in-memory cache for grocery list generation
const groceryListCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Basic ingredient classification for fallback
const BASIC_INGREDIENTS: Record<string, string> = {
  'pita bread': 'bakery',
  'white rice': 'pantry',
  'brown rice': 'pantry',
  'olive oil': 'pantry',
  'salt': 'pantry',
  'black pepper': 'pantry',
  'pepper': 'pantry',
  'garlic': 'produce',
  'onion': 'produce',
  'tomato': 'produce',
  'tomatoes': 'produce',
  'baby tomatoes': 'produce',
  'chicken breast': 'meat',
  'ground beef': 'meat',
  'milk': 'dairy',
  'eggs': 'dairy',
  'butter': 'dairy',
  'cheese': 'dairy',
  'feta cheese': 'dairy',
  'parsley': 'produce',
  'bell pepper': 'produce',
  'sweet bell pepper': 'produce',
  'olives': 'produce',
  'mixed olives': 'produce',
  'chickpeas': 'pantry',
  'white wine vinegar': 'pantry',
  'sugar': 'pantry',
  'oil': 'pantry'
}

function classifyIngredientBasic(name: string): string {
  const normalizedName = name.toLowerCase().trim()
  return BASIC_INGREDIENTS[normalizedName] || 'unclassified'
}

// Function to normalize ingredient names for combining
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b(fresh|dried|ground|chopped|diced|minced|sliced)\b/g, '') // Remove common descriptors
    .trim()
}

// Function to combine duplicate ingredients across recipes
function combineIngredients(recipeData: any[]): any[] {
  const ingredientMap: Record<string, Array<{ quantity: string; unit: string; name: string; originalName: string }>> = {}

  // Collect all ingredients
  for (const recipe of recipeData) {
    for (const ingredient of recipe.ingredients || []) {
      const normalizedName = normalizeIngredientName(ingredient.name || '')
      
      if (!ingredientMap[normalizedName]) {
        ingredientMap[normalizedName] = []
      }
      
      ingredientMap[normalizedName].push({
        quantity: ingredient.quantity || '1',
        unit: ingredient.unit || '',
        name: normalizedName,
        originalName: ingredient.name || normalizedName
      })
    }
  }

  // Combine quantities for each ingredient
  const combinedIngredients = []
  
  for (const [normalizedName, quantities] of Object.entries(ingredientMap)) {
    const combined = combineQuantities(quantities)
    const displayName = quantities[0].originalName // Use first occurrence as display name
    
    combinedIngredients.push({
      name: displayName,
      quantity: combined.combinedQuantity,
      unit: combined.combinedUnit,
      usageCount: combined.usageCount,
      originalQuantities: combined.originalQuantities
    })
  }

  return combinedIngredients
}

// Direct OpenAI API call function for grocery list generation
async function generateGroceryListWithOpenAI(recipeData: any[], storePreferences?: string, customName?: string) {
  try {
    console.log("Calling OpenAI for grocery list generation...")
    
    // Add timeout for better performance
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let response
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You create optimized grocery lists from recipes. Return ONLY valid JSON with this exact structure:
{
  "list_name": "Grocery List Name",
  "items": [
    {
      "name": "ingredient name",
      "quantity": "amount",
      "unit": "unit",
      "category": "produce|dairy|meat|seafood|pantry|frozen|bakery|beverages|snacks|health|household|other",
      "notes": "optional notes"
    }
  ],
  "total_estimated_cost": 50.00,
  "store_sections": [
    {
      "section": "Produce",
      "items": ["item1", "item2"]
    }
  ]
}

Requirements:
- Combine duplicate ingredients and adjust quantities
- Categorize items by store sections
- Estimate quantities based on servings
- Add missing common ingredients (oil, salt, pepper, etc.)
- Provide realistic estimated costs
- Organize by store layout for efficient shopping`
          },
          {
            role: "user",
            content: `Create a grocery list from these recipes:

${JSON.stringify(recipeData, null, 2)}

${storePreferences ? `Store preferences: ${storePreferences}` : ''}
${customName ? `List name preference: ${customName}` : ''}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error("Request timed out after 10 seconds")
      }
      throw fetchError
    }

    clearTimeout(timeoutId)

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
    console.error("OpenAI grocery list generation error:", error)
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

    const { recipe_ids, custom_name, store_preferences } = await request.json()

    if (!recipe_ids || !Array.isArray(recipe_ids) || recipe_ids.length === 0) {
      return NextResponse.json({ error: "Recipe IDs are required" }, { status: 400 })
    }

    // Create cache key based on recipe IDs and preferences
    const cacheKey = JSON.stringify({ recipe_ids: recipe_ids.sort(), custom_name, store_preferences })
    const cached = groceryListCache.get(cacheKey)
    
    // Check if we have a valid cached result
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("Returning cached grocery list")
      return NextResponse.json(cached.data)
    }

    // Fetch recipes from database
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .in("id", recipe_ids)

    if (recipesError) {
      console.error("Database error:", recipesError)
      return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({ error: "No recipes found" }, { status: 404 })
    }

          // Prepare recipe data for AI processing
          const recipeData = recipes.map(recipe => ({
            title: recipe.title,
            ingredients: recipe.ingredients,
            servings: recipe.servings
          }))

          console.log("Starting grocery list generation...")
          console.log("Recipe data:", recipeData)

          // Combine duplicate ingredients across recipes
          const combinedIngredients = combineIngredients(recipeData)
          console.log("Combined ingredients:", combinedIngredients)

          // Use AI to generate optimized grocery list with combined ingredients
          let groceryList
          try {
            groceryList = await generateGroceryListWithOpenAI(recipeData, store_preferences, custom_name)
          } catch (aiError) {
            console.log("AI generation failed, creating fallback grocery list:", aiError)
            // Create a fallback grocery list without AI, but with basic classification
            groceryList = {
              list_name: custom_name || "Recipe List",
              items: combinedIngredients.map(ingredient => {
                // Use basic classification for fallback
                const category = classifyIngredientBasic(ingredient.name)
                return {
                  name: ingredient.name,
                  quantity: ingredient.combinedQuantity,
                  unit: ingredient.combinedUnit,
                  category: category,
                  notes: ingredient.usageCount > 1 ? `*${ingredient.usageCount} uses` : ""
                }
              }),
              total_estimated_cost: 0,
              store_sections: []
            }
          }

    // Save grocery list to database
    const { data: savedList, error: saveError } = await supabase
      .from("grocery_lists")
      .insert({
        user_id: user.id,
        name: custom_name || groceryList.list_name,
        recipe_ids: recipe_ids
        // Note: total_estimated_cost and store_sections columns need to be added via migration
        // Run scripts/006_add_grocery_list_columns.sql in your Supabase dashboard
      })
      .select()
      .single()

    if (saveError) {
      console.error("Save error:", saveError)
      return NextResponse.json({ error: "Failed to save grocery list" }, { status: 500 })
    }

          // Get existing item positions and category positions for smart placement
          const { data: existingItems } = await supabase
            .from("grocery_items")
            .select("name, position_x, position_y, store_id")
            .not("position_x", "is", null)
            .not("position_y", "is", null)

          const { data: categoryPositions } = await supabase
            .from("category_positions")
            .select("*")

          // Create grocery items with usage notes and smart positioning
          const groceryItems = []
          
          for (let index = 0; index < groceryList.items.length; index++) {
            const item = groceryList.items[index]
            
            // Find the corresponding combined ingredient to get usage count
            const combinedIngredient = combinedIngredients.find(ci => 
              ci.name.toLowerCase().includes(item.name.toLowerCase()) ||
              item.name.toLowerCase().includes(ci.name.toLowerCase())
            )
            
            const usageNote = combinedIngredient && combinedIngredient.usageCount > 1 
              ? `*${combinedIngredient.usageCount} uses`
              : ''

            // Try to find existing position for this exact item name
            const existingItem = existingItems?.find(ei => 
              ei.name.toLowerCase() === item.name.toLowerCase()
            )

            // If no exact match, try to find category position
            const categoryPosition = categoryPositions?.find(cp => 
              cp.category === item.category
            )

            // Determine position and store_id
            let position_x = null
            let position_y = null
            let store_id = null

            if (existingItem) {
              // Use exact item position
              position_x = existingItem.position_x
              position_y = existingItem.position_y
              store_id = existingItem.store_id
            } else if (categoryPosition) {
              // Use category average position with slight randomization
              const randomOffset = (Math.random() - 0.5) * 4 // ±2% variation
              position_x = Math.max(0, Math.min(100, categoryPosition.avg_position_x + randomOffset))
              position_y = Math.max(0, Math.min(100, categoryPosition.avg_position_y + randomOffset))
              store_id = categoryPosition.store_id
            }
            
            groceryItems.push({
              grocery_list_id: savedList.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit || '',
              category: item.category,
              is_completed: false,
              notes: usageNote,
              sort_order: index,
              position_x,
              position_y,
              store_id
            })
          }

    const { error: itemsError } = await supabase
      .from("grocery_items")
      .insert(groceryItems)

    if (itemsError) {
      console.error("Items save error:", itemsError)
      return NextResponse.json({ error: "Failed to save grocery items" }, { status: 500 })
    }

    const responseData = {
      success: true,
      grocery_list: savedList,
      items: groceryItems,
      ai_generated: groceryList,
      message: `Grocery list generated with ${groceryItems.length} items from ${recipes.length} recipes`
    }

    // Cache the result
    groceryListCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error("Grocery list generation error:", error)
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: "Grocery list generation timed out. Please try again with fewer recipes or check your internet connection.",
        details: "OpenAI API request exceeded 10 second timeout"
      }, { status: 408 }) // 408 Request Timeout
    }
    
    return NextResponse.json({ 
      error: "Failed to generate grocery list",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
