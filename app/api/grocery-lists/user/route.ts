import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Create Supabase client with JWT token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: "Invalid token or unauthorized" }, { status: 401 })
    }

    // Get all grocery lists for the user
    const { data: groceryLists, error: listError } = await supabase
      .from("grocery_lists")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (listError) {
      console.error("Error fetching grocery lists:", listError)
      return NextResponse.json({ error: "Failed to fetch grocery lists" }, { status: 500 })
    }

    return NextResponse.json({ groceryLists })

  } catch (error) {
    console.error("Fetch grocery lists error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
