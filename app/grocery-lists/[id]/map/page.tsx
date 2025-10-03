import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StoreMapWithList } from "@/components/store-map-with-list"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function GroceryListMapPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch grocery list with items (including positions)
  const { data: list, error } = await supabase
    .from("grocery_lists")
    .select(`
      *,
      grocery_items (
        id,
        name,
        quantity,
        unit,
        category,
        is_completed,
        position_x,
        position_y,
        store_id,
        created_at,
        updated_at,
        grocery_list_id,
        aisle,
        recipe_id
      )
    `)
    .eq("id", params.id)
    .single()

  if (error || !list) {
    redirect("/grocery-lists")
  }

  // Get store info if available
  let storeId = list.store_id
  
  // If no store assigned to list, try to get default store or first store
  if (!storeId) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id")
      .limit(1)
    
    if (stores && stores.length > 0) {
      storeId = stores[0].id
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/grocery-lists">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lists
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{list.name}</h1>
            <p className="text-sm text-gray-600">Store Map View</p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {list.grocery_items?.length || 0} items
        </div>
      </div>

      {/* Map Component - Full Screen */}
      <div className="flex-1 overflow-hidden">
        <StoreMapWithList 
          items={list.grocery_items || []} 
          listId={list.id}
          storeId={storeId || undefined}
          onItemToggle={async (itemId, completed) => {
            "use server"
            const supabase = await createClient()
            await supabase
              .from("grocery_items")
              .update({ is_completed: completed })
              .eq("id", itemId)
          }}
        />
      </div>
    </div>
  )
}
