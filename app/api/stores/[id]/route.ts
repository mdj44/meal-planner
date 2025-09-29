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

    // Get store details
    const { data: store, error } = await supabase.from("stores").select("*").eq("id", id).single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    return NextResponse.json({ store })
  } catch (error) {
    console.error("Store fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch store" }, { status: 500 })
  }
}
