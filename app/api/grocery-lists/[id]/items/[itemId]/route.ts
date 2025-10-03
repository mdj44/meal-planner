import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const supabase = await createClient()

    // Check authentication
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { is_completed, sort_order } = body

    // Update the grocery item
    const updateData: any = {}
    if (typeof is_completed === 'boolean') {
      updateData.is_completed = is_completed
    }
    if (typeof sort_order === 'number') {
      updateData.sort_order = sort_order
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from("grocery_items")
      .update(updateData)
      .eq("id", itemId)
      .eq("grocery_list_id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Database update error:", updateError)
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: updatedItem })
  } catch (error) {
    console.error("Update item error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const supabase = await createClient()

    // Check authentication
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the grocery item
    const { error: deleteError } = await supabase
      .from("grocery_items")
      .delete()
      .eq("id", itemId)
      .eq("grocery_list_id", id)

    if (deleteError) {
      console.error("Database delete error:", deleteError)
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete item error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}