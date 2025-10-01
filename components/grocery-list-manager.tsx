"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ShoppingCart, Trash2, MapPin, RefreshCw } from "lucide-react"
import type { GroceryList, GroceryItem } from "@/lib/types"

interface GroceryListManagerProps {
  initialLists?: GroceryList[]
}

export function GroceryListManager({ initialLists = [] }: GroceryListManagerProps) {
  const [groceryLists, setGroceryLists] = useState<(GroceryList & { grocery_items: GroceryItem[] })[]>(initialLists)
  const [selectedList, setSelectedList] = useState<string | null>(null)
  const [newListName, setNewListName] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState("")
  const [newItemUnit, setNewItemUnit] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isClassifying, setIsClassifying] = useState<string | null>(null)
  const [isRecomputing, setIsRecomputing] = useState(false)

  useEffect(() => {
    fetchGroceryLists()
  }, [])

  const fetchGroceryLists = async () => {
    try {
      const response = await fetch("/api/grocery-lists")
      const data = await response.json()
      if (response.ok) {
        setGroceryLists(data.groceryLists)
      }
    } catch (error) {
      console.error("Failed to fetch grocery lists:", error)
    }
  }

  const createGroceryList = async () => {
    if (!newListName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/grocery-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName }),
      })

      if (response.ok) {
        setNewListName("")
        await fetchGroceryLists()
      }
    } catch (error) {
      console.error("Failed to create grocery list:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addItemToList = async (listId: string) => {
    if (!newItemName.trim()) return

    setIsLoading(true)
    try {
      // First classify the item
      setIsClassifying(newItemName)
      const classifyResponse = await fetch("/api/classify-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: newItemName }),
      })

      let category = ""
      let aisle = ""

      if (classifyResponse.ok) {
        const classification = await classifyResponse.json()
        category = classification.category
        aisle = classification.aisle
      }

      // Add item to list
      const response = await fetch(`/api/grocery-lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
          quantity: newItemQuantity || null,
          unit: newItemUnit || null,
          category,
          aisle,
        }),
      })

      if (response.ok) {
        setNewItemName("")
        setNewItemQuantity("")
        setNewItemUnit("")
        await fetchGroceryLists()
      }
    } catch (error) {
      console.error("Failed to add item:", error)
    } finally {
      setIsLoading(false)
      setIsClassifying(null)
    }
  }

  const recomputeGroceryList = async (listId: string) => {
    setIsRecomputing(true)
    try {
      const response = await fetch(`/api/grocery-lists/${listId}/recompute`, {
        method: "POST",
      })

      if (response.ok) {
        const { count } = await response.json()
        await fetchGroceryLists()
        alert(`Successfully refreshed ${count} items from recipes!`)
      } else {
        const error = await response.json()
        alert(`Failed to refresh list: ${error.error}`)
      }
    } catch (error) {
      console.error("Failed to recompute list:", error)
      alert("Failed to refresh list. Please try again.")
    } finally {
      setIsRecomputing(false)
    }
  }

  const toggleItemCompleted = async (itemId: string, isCompleted: boolean) => {
    try {
      await fetch(`/api/grocery-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: isCompleted }),
      })

      await fetchGroceryLists()
    } catch (error) {
      console.error("Failed to update item:", error)
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      await fetch(`/api/grocery-items/${itemId}`, {
        method: "DELETE",
      })

      await fetchGroceryLists()
    } catch (error) {
      console.error("Failed to delete item:", error)
    }
  }

  const selectedListData = groceryLists.find((list) => list.id === selectedList)
  const groupedItems =
    selectedListData?.grocery_items.reduce(
      (acc, item) => {
        const category = item.category || "uncategorized"
        if (!acc[category]) acc[category] = []
        acc[category].push(item)
        return acc
      },
      {} as Record<string, GroceryItem[]>,
    ) || {}

  return (
    <div className="space-y-6">
      {/* Create New List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Grocery Lists
          </CardTitle>
          <CardDescription>Create and manage your grocery lists</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="New list name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGroceryList()}
            />
            <Button onClick={createGroceryList} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List Selection */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groceryLists.map((list) => (
          <Card
            key={list.id}
            className={`cursor-pointer transition-colors ${selectedList === list.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedList(list.id)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{list.name}</CardTitle>
              <CardDescription>
                {list.grocery_items.length} items • {list.grocery_items.filter((item) => item.is_completed).length}{" "}
                completed
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Selected List Details */}
      {selectedListData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedListData.name}</CardTitle>
                <CardDescription>Manage items in your grocery list</CardDescription>
              </div>
              {selectedListData.recipe_ids && selectedListData.recipe_ids.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => recomputeGroceryList(selectedListData.id)}
                  disabled={isRecomputing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRecomputing ? "animate-spin" : ""}`} />
                  {isRecomputing ? "Refreshing..." : "Refresh from Recipes"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Item */}
            <div className="flex gap-2">
              <Input
                placeholder="Item name..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Qty"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className="w-20"
              />
              <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="oz">oz</SelectItem>
                  <SelectItem value="cups">cups</SelectItem>
                  <SelectItem value="tbsp">tbsp</SelectItem>
                  <SelectItem value="tsp">tsp</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => addItemToList(selectedListData.id)} disabled={isLoading}>
                {isClassifying ? "Classifying..." : "Add"}
              </Button>
            </div>

            {/* Grouped Items */}
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">{category}</h4>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          item.is_completed ? "bg-muted/50" : "bg-background"
                        }`}
                      >
                        <Checkbox
                          checked={item.is_completed}
                          onCheckedChange={(checked) => toggleItemCompleted(item.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div
                            className={`font-medium ${item.is_completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {item.name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {item.quantity && item.unit && (
                              <span>
                                {item.quantity} {item.unit}
                              </span>
                            )}
                            {item.aisle && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {item.aisle}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
