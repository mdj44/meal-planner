import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const updates = await request.json()

    // Update item (RLS will ensure user can only update their own items)
    const { data: item, error: updateError } = await supabase
      .from("grocery_items")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        grocery_lists!inner(user_id)
      `)
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Update item error:", error)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Delete item (RLS will ensure user can only delete their own items)
    const { error: deleteError } = await supabase.from("grocery_items").delete().eq("id", id)

    if (deleteError) {
      console.error("Database error:", deleteError)
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete item error:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
