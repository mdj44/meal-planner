import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
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

    // Get all stores
    const { data: stores, error } = await supabase.from("stores").select("*").order("name")

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 })
    }

    return NextResponse.json({ stores })
  } catch (error) {
    console.error("Stores fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 })
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

    const { name, address, layoutData } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 })
    }

    // Create store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .insert({
        name,
        address,
        layout_data: layoutData || {},
      })
      .select()
      .single()

    if (storeError) {
      console.error("Database error:", storeError)
      return NextResponse.json({ error: "Failed to create store" }, { status: 500 })
    }

    return NextResponse.json({ store })
  } catch (error) {
    console.error("Store creation error:", error)
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 })
  }
}
