import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const { storeId, itemName, category, aisle, positionX, positionY } = await request.json()

    if (!storeId || !itemName) {
      return NextResponse.json({ error: "Store ID and item name are required" }, { status: 400 })
    }

    // Upsert item location (update if exists, insert if not)
    const { data: location, error: dbError } = await supabase
      .from("item_locations")
      .upsert(
        {
          store_id: storeId,
          item_name: itemName.toLowerCase(),
          category,
          aisle,
          position_x: positionX,
          position_y: positionY,
          created_by: user.id,
        },
        {
          onConflict: "store_id,item_name",
          ignoreDuplicates: false,
        },
      )
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save location" }, { status: 500 })
    }

    // Increment confidence score for existing locations
    if (location) {
      await supabase
        .from("item_locations")
        .update({
          confidence_score: location.confidence_score + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", location.id)
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error("Tag location error:", error)
    return NextResponse.json({ error: "Failed to tag location" }, { status: 500 })
  }
}
