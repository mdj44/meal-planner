/**
 * Offline-first flow (future):
 * 1. normalizeName(name)
 * 2. try lookupLocal(); if null and online, try lookupRemote()
 * 3. if still unknown:
 *    - if online: call model once, then cacheLocal() + submitContribution()
 *    - if offline: mark "Unclassified (offline)" and let user tag manually
 * 4. Tags and classifications queue offline, sync later
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Direct OpenAI API call function for item classification
async function classifyItemWithOpenAI(itemName: string) {
  try {
    console.log("Calling OpenAI for item classification:", itemName)
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You classify grocery items into categories and suggest aisles. Return ONLY valid JSON with this exact structure:
{
  "category": "produce|dairy|meat|seafood|bakery|frozen|pantry|beverages|snacks|health|household|other",
  "aisle": "aisle name or number",
  "confidence": 0.95
}

Categories:
- produce: fruits, vegetables, herbs
- dairy: milk, cheese, yogurt, eggs
- meat: beef, pork, chicken, deli meats
- seafood: fish, shellfish, canned fish
- bakery: bread, pastries, cakes
- frozen: frozen foods, ice cream
- pantry: canned goods, spices, oils, grains
- beverages: drinks, juices, soda
- snacks: chips, crackers, candy
- health: vitamins, medicine, personal care
- household: cleaning supplies, paper products
- other: anything that doesn't fit above`
          },
          {
            role: "user",
            content: `Classify this grocery item: "${itemName}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.")
      } else if (response.status === 401) {
        throw new Error("Invalid OpenAI API key. Please check your API key configuration.")
      } else if (response.status === 400) {
        throw new Error(`Invalid request to OpenAI: ${errorData.error?.message || 'Bad request'}`)
      } else {
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`)
      }
    }

    const data = await response.json()
    let content_text = data.choices[0]?.message?.content
    
    if (!content_text) {
      throw new Error("No content returned from OpenAI")
    }

    console.log("Raw OpenAI response:", content_text)

    // Clean up the response - remove markdown code blocks if present
    content_text = content_text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Try to parse as JSON
    try {
      const result = JSON.parse(content_text)
      console.log("Parsed OpenAI result:", result)
      return result
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Raw content:", content_text)
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`)
    }
  } catch (error) {
    console.error("OpenAI item classification error:", error)
    throw error
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
    const classification = await classifyItemWithOpenAI(itemName)

    return NextResponse.json({
      ...classification,
      source: "ai",
    })
  } catch (error) {
    console.error("Item classification error:", error)
    return NextResponse.json({ error: "Failed to classify item" }, { status: 500 })
  }
}
