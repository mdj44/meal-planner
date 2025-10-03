import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { listIds } = await request.json()

    if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
      return NextResponse.json({ error: "List IDs are required" }, { status: 400 })
    }

    const results: { id: string; success: boolean; error?: string }[] = []

    for (const listId of listIds) {
      try {
        // Verify ownership before deleting
        const { data: listToDelete, error: fetchError } = await supabase
          .from("grocery_lists")
          .select("id, user_id")
          .eq("id", listId)
          .single()

        if (fetchError || !listToDelete) {
          results.push({ id: listId, success: false, error: "Grocery list not found or access denied" })
          continue
        }

        if (listToDelete.user_id !== user.id) {
          results.push({ id: listId, success: false, error: "Unauthorized to delete this grocery list" })
          continue
        }

        // Delete the grocery list (items will be cascade deleted)
        const { error: deleteError } = await supabase
          .from("grocery_lists")
          .delete()
          .eq("id", listId)

        if (deleteError) {
          console.error(`Failed to delete grocery list ${listId}:`, deleteError)
          results.push({ id: listId, success: false, error: deleteError.message })
        } else {
          results.push({ id: listId, success: true })
        }
      } catch (innerError) {
        console.error(`Unexpected error deleting grocery list ${listId}:`, innerError)
        results.push({ 
          id: listId, 
          success: false, 
          error: innerError instanceof Error ? innerError.message : "Unknown error" 
        })
      }
    }

    const successfulDeletions = results.filter((r) => r.success).length
    const failedDeletions = results.filter((r) => !r.success).length

    if (successfulDeletions > 0 && failedDeletions === 0) {
      return NextResponse.json({ 
        message: "Selected grocery lists deleted successfully", 
        results 
      }, { status: 200 })
    } else if (successfulDeletions > 0 && failedDeletions > 0) {
      return NextResponse.json({ 
        message: "Some grocery lists deleted, some failed", 
        results 
      }, { status: 200 })
    } else {
      return NextResponse.json({ 
        error: "Failed to delete any grocery lists", 
        results 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Batch delete grocery lists error:", error)
    return NextResponse.json({
      error: "Failed to process batch delete request",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

