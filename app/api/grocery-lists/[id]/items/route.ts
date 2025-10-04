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
const COMMON_INGREDIENTS: Record<string, { category: string; confidence: number }> = {
  'pita bread': { category: 'bakery', confidence: 0.95 },
  'white rice': { category: 'pantry', confidence: 0.98 },
  'brown rice': { category: 'pantry', confidence: 0.98 },
  'olive oil': { category: 'pantry', confidence: 0.99 },
  'salt': { category: 'pantry', confidence: 0.99 },
  'black pepper': { category: 'pantry', confidence: 0.99 },
  'pepper': { category: 'pantry', confidence: 0.99 },
  'garlic': { category: 'produce', confidence: 0.99 },
  'onion': { category: 'produce', confidence: 0.99 },
  'tomato': { category: 'produce', confidence: 0.99 },
  'tomatoes': { category: 'produce', confidence: 0.99 },
  'baby tomatoes': { category: 'produce', confidence: 0.99 },
  'chicken breast': { category: 'meat', confidence: 0.99 },
  'ground beef': { category: 'meat', confidence: 0.99 },
  'milk': { category: 'dairy', confidence: 0.99 },
  'eggs': { category: 'dairy', confidence: 0.99 },
  'butter': { category: 'dairy', confidence: 0.99 },
  'cheese': { category: 'dairy', confidence: 0.98 },
  'feta cheese': { category: 'dairy', confidence: 0.98 },
  'parsley': { category: 'produce', confidence: 0.99 },
  'bell pepper': { category: 'produce', confidence: 0.99 },
  'sweet bell pepper': { category: 'produce', confidence: 0.99 },
  'olives': { category: 'produce', confidence: 0.95 },
  'mixed olives': { category: 'produce', confidence: 0.95 },
  'chickpeas': { category: 'pantry', confidence: 0.98 },
  'white wine vinegar': { category: 'pantry', confidence: 0.98 },
  'sugar': { category: 'pantry', confidence: 0.99 },
  'oil': { category: 'pantry', confidence: 0.95 }
}

// Function to classify ingredient using database first, then AI
async function classifyIngredient(ingredientName: string, supabase: any): Promise<{ category: string; confidence?: number }> {
  const normalizedName = normalizeIngredientName(ingredientName)
  
  // First, check our ingredients database (if it exists)
  try {
    const { data: existingIngredient, error: dbError } = await supabase
      .from('ingredients')
      .select('ai_category, ai_confidence')
      .eq('name', normalizedName)
      .single()

    if (!dbError && existingIngredient && existingIngredient.ai_category) {
      console.log(`Found existing classification for "${ingredientName}": ${existingIngredient.ai_category}`)
      return {
        category: existingIngredient.ai_category,
        confidence: existingIngredient.ai_confidence
      }
    }
  } catch (error) {
    console.log('Ingredients table not available, checking hardcoded ingredients')
  }

  // Check hardcoded common ingredients
  const hardcodedMatch = COMMON_INGREDIENTS[normalizedName]
  if (hardcodedMatch) {
    console.log(`Found hardcoded classification for "${ingredientName}": ${hardcodedMatch.category}`)
    return {
      category: hardcodedMatch.category,
      confidence: hardcodedMatch.confidence
    }
  }

  // If not found in database or hardcoded list, call our classification API
  try {
    console.log(`Classifying new ingredient: "${ingredientName}"`)
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/classify-ingredient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientName })
    })

    if (response.ok) {
      const data = await response.json()
      return {
        category: data.category || 'unclassified',
        confidence: data.confidence
      }
    }
  } catch (error) {
    console.error('Error classifying ingredient:', error)
  }

  // Fallback to unclassified
  return { category: 'unclassified' }
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

    const { name, quantity, unit, category } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 })
    }

    // Verify the grocery list exists and belongs to the user
    const { data: groceryList, error: listError } = await supabase
      .from("grocery_lists")
      .select("id, user_id")
      .eq("id", id)
      .single()

    if (listError || !groceryList) {
      return NextResponse.json({ error: "Grocery list not found" }, { status: 404 })
    }

    if (groceryList.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this grocery list" }, { status: 403 })
    }

    // Auto-classify the item if no category provided
    let finalCategory = category
    if (!category || category === 'unclassified') {
      const classification = await classifyIngredient(name.trim(), supabase)
      finalCategory = classification.category
    }

    // Get the next sort order
    const { data: existingItems } = await supabase
      .from("grocery_items")
      .select("sort_order")
      .eq("grocery_list_id", id)
      .order("sort_order", { ascending: false })
      .limit(1)

    const nextSortOrder = existingItems && existingItems.length > 0 
      ? (existingItems[0].sort_order || 0) + 1 
      : 0

    // Get smart positioning data
    const [{ data: existingItemPositions }, { data: categoryPositions }, { data: sameCategoryItems }] = await Promise.all([
      supabase
        .from("grocery_items")
        .select("name, position_x, position_y, store_id")
        .eq("name", name.trim())
        .not("position_x", "is", null)
        .not("position_y", "is", null)
        .limit(1),
      supabase
        .from("category_positions")
        .select("*")
        .eq("category", finalCategory || "unclassified")
        .limit(1),
      supabase
        .from("grocery_items")
        .select("name, position_x, position_y, store_id")
        .eq("category", finalCategory || "unclassified")
        .not("position_x", "is", null)
        .not("position_y", "is", null)
        .neq("name", name.trim()) // Not the same item
        .limit(5)
    ])

    // Determine position and store_id
    let position_x = null
    let position_y = null
    let store_id = null

    if (existingItemPositions && existingItemPositions.length > 0) {
      // Use exact item position
      const existingItem = existingItemPositions[0]
      position_x = existingItem.position_x
      position_y = existingItem.position_y
      store_id = existingItem.store_id
    } else if (sameCategoryItems && sameCategoryItems.length > 0) {
      // Use position near existing items of same category
      const referenceItem = sameCategoryItems[0] // Use first matching item as reference
      const randomOffset = (Math.random() - 0.5) * 6 // ±3% variation for nearby placement
      position_x = Math.max(0, Math.min(100, referenceItem.position_x + randomOffset))
      position_y = Math.max(0, Math.min(100, referenceItem.position_y + randomOffset))
      store_id = referenceItem.store_id
    } else if (categoryPositions && categoryPositions.length > 0) {
      // Use category average position with slight randomization
      const categoryPosition = categoryPositions[0]
      const randomOffset = (Math.random() - 0.5) * 4 // ±2% variation
      position_x = Math.max(0, Math.min(100, categoryPosition.avg_position_x + randomOffset))
      position_y = Math.max(0, Math.min(100, categoryPosition.avg_position_y + randomOffset))
      store_id = categoryPosition.store_id
    }

    // Add the new item
    const { data: newItem, error: insertError } = await supabase
      .from("grocery_items")
      .insert({
        grocery_list_id: id,
        name: name.trim(),
        quantity: quantity?.trim() || "1",
        unit: unit?.trim() || "",
        category: finalCategory || "unclassified",
        is_completed: false,
        sort_order: nextSortOrder,
        notes: "",
        position_x,
        position_y,
        store_id
      })
      .select()
      .single()

    if (insertError) {
      console.error("Database insert error:", insertError)
      return NextResponse.json({ error: "Failed to add item to grocery list" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      item: newItem,
      message: "Item added successfully"
    })
  } catch (error) {
    console.error("Add grocery item error:", error)
    return NextResponse.json({
      error: "Failed to add item to grocery list",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Verify the grocery list exists and belongs to the user
    const { data: groceryList, error: listError } = await supabase
      .from("grocery_lists")
      .select("id, user_id")
      .eq("id", id)
      .single()

    if (listError || !groceryList) {
      return NextResponse.json({ error: "Grocery list not found" }, { status: 404 })
    }

    if (groceryList.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this grocery list" }, { status: 403 })
    }

    // Get all items for this grocery list
    const { data: items, error: itemsError } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("grocery_list_id", id)
      .order("sort_order", { ascending: true })

    if (itemsError) {
      console.error("Database query error:", itemsError)
      return NextResponse.json({ error: "Failed to fetch grocery items" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      items: items || []
    })
  } catch (error) {
    console.error("Get grocery items error:", error)
    return NextResponse.json({
      error: "Failed to fetch grocery items",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}