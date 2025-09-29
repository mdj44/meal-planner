import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, quantity, unit, category, aisle } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 })
    }

    // Verify user owns the grocery list
    const { data: groceryList, error: listError } = await supabase
      .from("grocery_lists")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (listError || !groceryList) {
      return NextResponse.json({ error: "Grocery list not found" }, { status: 404 })
    }

    // Add item to grocery list
    const { data: item, error: itemError } = await supabase
      .from("grocery_items")
      .insert({
        grocery_list_id: id,
        name,
        quantity,
        unit,
        category,
        aisle,
      })
      .select()
      .single()

    if (itemError) {
      console.error("Database error:", itemError)
      return NextResponse.json({ error: "Failed to add item" }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Add item error:", error)
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 })
  }
}
