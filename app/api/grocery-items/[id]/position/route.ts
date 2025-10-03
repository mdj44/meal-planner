import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { position_x, position_y, store_id } = await request.json()

    // Update the item position
    const { data, error } = await supabase
      .from("grocery_items")
      .update({
        position_x,
        position_y,
        store_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating item position:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating item position:", error)
    return NextResponse.json(
      { error: "Failed to update item position" },
      { status: 500 }
    )
  }
}

// Get suggested position for an item based on category
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("store_id")

    if (!storeId) {
      return NextResponse.json({ error: "store_id required" }, { status: 400 })
    }

    // Get the item
    const { data: item, error: itemError } = await supabase
      .from("grocery_items")
      .select("category, position_x, position_y")
      .eq("id", params.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // If item already has a position, return it
    if (item.position_x !== null && item.position_y !== null) {
      return NextResponse.json({
        x: item.position_x,
        y: item.position_y,
        source: "item",
      })
    }

    // Try to get category average position
    if (item.category) {
      const { data: categoryPos, error: catError } = await supabase
        .from("category_positions")
        .select("avg_position_x, avg_position_y")
        .eq("store_id", storeId)
        .eq("category", item.category)
        .single()

      if (!catError && categoryPos) {
        // Add small random offset to avoid exact overlap
        const offsetX = (Math.random() - 0.5) * 5 // ±2.5%
        const offsetY = (Math.random() - 0.5) * 5

        return NextResponse.json({
          x: Math.max(0, Math.min(100, categoryPos.avg_position_x + offsetX)),
          y: Math.max(0, Math.min(100, categoryPos.avg_position_y + offsetY)),
          source: "category",
        })
      }
    }

    // No position found, return null
    return NextResponse.json({ x: null, y: null, source: "none" })
  } catch (error) {
    console.error("Error getting suggested position:", error)
    return NextResponse.json(
      { error: "Failed to get suggested position" },
      { status: 500 }
    )
  }
}
