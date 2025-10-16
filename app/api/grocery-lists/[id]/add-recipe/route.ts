import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function normalizeIngredientName(name: string): string {
  return name.toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
}

// Function to classify ingredient using the comprehensive ingredients database
async function classifyIngredient(ingredientName: string, supabase: any): Promise<{ category: string; confidence?: number; aisle?: string }> {
  const normalizedName = normalizeIngredientName(ingredientName)
  
  // First, check our comprehensive ingredients database
  try {
    const { data: existingIngredient, error: dbError } = await supabase
      .from('ingredients')
      .select('ai_category, ai_confidence, ai_aisle')
      .eq('name', normalizedName)
      .single()

    if (!dbError && existingIngredient && existingIngredient.ai_category) {
      console.log(`Found existing classification for "${ingredientName}": ${existingIngredient.ai_category}`)
      return {
        category: existingIngredient.ai_category,
        confidence: existingIngredient.ai_confidence,
        aisle: existingIngredient.ai_aisle
      }
    }
  } catch (error) {
    console.log(`No existing classification found for "${ingredientName}", will classify with AI`)
  }

  // If not found in database, use AI classification with timeout
  try {
    console.log(`Classifying new ingredient with AI: "${ingredientName}"`)
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI classification timeout')), 5000) // 5 second timeout
    })
    
    const classificationPromise = fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/classify-ingredient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientName })
    })

    const response = await Promise.race([classificationPromise, timeoutPromise]) as Response

    if (response.ok) {
      const data = await response.json()
      
      // Store the new classification in the database for future use
      try {
        await supabase
          .from('ingredients')
          .upsert({
            name: normalizedName,
            display_name: ingredientName,
            ai_category: data.category,
            ai_aisle: data.aisle,
            ai_confidence: data.confidence,
            ai_classified_at: new Date().toISOString(),
            usage_count: 1
          })
      } catch (dbError) {
        console.error('Failed to store new classification in database:', dbError)
      }
      
      return {
        category: data.category || 'unclassified',
        confidence: data.confidence,
        aisle: data.aisle
      }
    }
  } catch (error) {
    console.error('Error classifying ingredient with AI (timeout or other error):', error)
    // Don't fail the entire operation, just mark as unclassified
  }

  // If AI classification fails, fallback to unclassified
  return { category: 'unclassified' }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Received params:', params)
    
    if (!params || !params.id) {
      console.error('Invalid params received:', params)
      return NextResponse.json({ error: "Invalid grocery list ID" }, { status: 400 })
    }
    
    const { id } = params
    console.log('Using grocery list ID:', id)
    
    const { recipeId } = await request.json()

    if (!recipeId) {
      return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 })
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Create Supabase client with JWT token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: "Invalid token or unauthorized" }, { status: 401 })
    }

    // Verify the grocery list exists and belongs to the user
    const { data: groceryList, error: listError } = await supabase
      .from("grocery_lists")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (listError || !groceryList) {
      return NextResponse.json({ error: "Grocery list not found" }, { status: 404 })
    }

    // Get the recipe and its ingredients
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id, title, ingredients")
      .eq("id", recipeId)
      .eq("user_id", user.id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    // Check if recipe ingredients are already in the grocery list
    const { data: existingItems } = await supabase
      .from("grocery_items")
      .select("name, recipe_id")
      .eq("grocery_list_id", id)
      .eq("recipe_id", recipeId)

    if (existingItems && existingItems.length > 0) {
      return NextResponse.json({ 
        error: "Recipe ingredients are already in this grocery list",
        existingCount: existingItems.length
      }, { status: 400 })
    }

    // Create grocery items from recipe ingredients with classification
    const groceryItems = []
    for (const ingredient of recipe.ingredients) {
      // Classify the ingredient
      const classification = await classifyIngredient(ingredient.name, supabase)
      
      groceryItems.push({
        grocery_list_id: id,
        name: ingredient.name,
        quantity: ingredient.quantity || null,
        unit: ingredient.unit || null,
        category: classification.category,
        aisle: classification.aisle || null,
        recipe_id: recipeId,
        is_completed: false,
      })
    }

    // Insert the grocery items
    const { data: insertedItems, error: insertError } = await supabase
      .from("grocery_items")
      .insert(groceryItems)
      .select()

    if (insertError) {
      console.error("Error inserting grocery items:", insertError)
      return NextResponse.json({ error: "Failed to add ingredients to grocery list" }, { status: 500 })
    }

    // Update the grocery list to include the recipe ID
    const { error: updateError } = await supabase
      .from("grocery_lists")
      .update({
        recipe_ids: [...(groceryList.recipe_ids || []), recipeId]
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating grocery list recipe_ids:", updateError)
      // Don't fail the request since the items were added successfully
    }

    // Count classified vs unclassified items
    const classifiedCount = insertedItems.filter(item => item.category !== 'unclassified').length
    const unclassifiedCount = insertedItems.length - classifiedCount

    return NextResponse.json({
      message: `Added ${insertedItems.length} ingredients from "${recipe.title}" to "${groceryList.name}"${classifiedCount > 0 ? ` (${classifiedCount} categorized)` : ''}${unclassifiedCount > 0 ? ` (${unclassifiedCount} need manual categorization)` : ''}`,
      addedItems: insertedItems.length,
      classifiedItems: classifiedCount,
      unclassifiedItems: unclassifiedCount,
      groceryList: groceryList.name,
      recipe: recipe.title
    })

  } catch (error) {
    console.error("Add recipe to grocery list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
