import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get item locations for this store
    const { data: itemLocations, error } = await supabase
      .from("item_locations")
      .select("*")
      .eq("store_id", id)
      .order("confidence_score", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch item locations" }, { status: 500 })
    }

    return NextResponse.json({ itemLocations })
  } catch (error) {
    console.error("Item locations fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch item locations" }, { status: 500 })
  }
}
