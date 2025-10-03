import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Define the order of store sections for optimal shopping flow
const SECTION_ORDER = [
  "produce",
  "bakery", 
  "dairy",
  "meat",
  "seafood",
  "frozen",
  "pantry",
  "beverages",
  "snacks",
  "health",
  "household",
  "other"
]

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

    const { sortBy, itemOrder } = await request.json()

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

    if (itemsError || !items) {
      console.error("Database query error:", itemsError)
      return NextResponse.json({ error: "Failed to fetch grocery items" }, { status: 500 })
    }

    // Sort items based on the sortBy parameter
    let sortedItems = [...items]
    
    if (sortBy === "manual" && itemOrder) {
      // Manual sort by provided order
      const orderMap = new Map(itemOrder.map((id: string, index: number) => [id, index]))
      sortedItems.sort((a, b) => {
        const aOrder = orderMap.get(a.id) ?? 999
        const bOrder = orderMap.get(b.id) ?? 999
        return aOrder - bOrder
      })
    } else if (sortBy === "category") {
      // Sort by store section order for optimal shopping flow
      sortedItems.sort((a, b) => {
        const aOrder = SECTION_ORDER.indexOf(a.category) !== -1 ? SECTION_ORDER.indexOf(a.category) : SECTION_ORDER.length
        const bOrder = SECTION_ORDER.indexOf(b.category) !== -1 ? SECTION_ORDER.indexOf(b.category) : SECTION_ORDER.length
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder
        }
        
        // If same category, sort alphabetically by name
        return a.name.localeCompare(b.name)
      })
    } else if (sortBy === "name") {
      sortedItems.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "completed") {
      sortedItems.sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1 // Incomplete items first
        }
        return a.name.localeCompare(b.name)
      })
    }

    // Update sort_order for all items
    const updates = sortedItems.map((item, index) => ({
      id: item.id,
      sort_order: index
    }))

    // Batch update the sort orders
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("grocery_items")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id)

      if (updateError) {
        console.error(`Failed to update sort order for item ${update.id}:`, updateError)
      }
    }

    // Return the sorted items with updated sort_order
    const updatedItems = sortedItems.map((item, index) => ({
      ...item,
      sort_order: index
    }))

    return NextResponse.json({
      success: true,
      sortedItems: updatedItems,
      message: `Items sorted by ${sortBy}`
    })
  } catch (error) {
    console.error("Sort grocery items error:", error)
    return NextResponse.json({
      error: "Failed to sort grocery items",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
