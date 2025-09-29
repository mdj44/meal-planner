import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { createClient } from "@/lib/supabase/server"

// Item classification schema
const classificationSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: [
        "produce",
        "dairy",
        "meat",
        "seafood",
        "bakery",
        "frozen",
        "pantry",
        "beverages",
        "snacks",
        "health",
        "household",
        "other",
      ],
    },
    aisle: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["category", "aisle", "confidence"],
} as const

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

    const { itemName, storeId } = await request.json()

    if (!itemName) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 })
    }

    // Check if we have existing location data for this item at this store
    if (storeId) {
      const { data: existingLocation } = await supabase
        .from("item_locations")
        .select("*")
        .eq("store_id", storeId)
        .eq("item_name", itemName.toLowerCase())
        .single()

      if (existingLocation) {
        return NextResponse.json({
          category: existingLocation.category,
          aisle: existingLocation.aisle,
          confidence: Math.min(existingLocation.confidence_score / 10, 1),
          source: "crowdsourced",
        })
      }
    }

    // Use AI to classify the item
    const { object: classification } = await generateObject({
      model: "openai/gpt-4o-mini",
      prompt: `Classify this grocery item into a category and suggest which aisle it would typically be found in at a grocery store. Item: "${itemName}"`,
      schema: classificationSchema,
    })

    return NextResponse.json({
      ...classification,
      source: "ai",
    })
  } catch (error) {
    console.error("Item classification error:", error)
    return NextResponse.json({ error: "Failed to classify item" }, { status: 500 })
  }
}
