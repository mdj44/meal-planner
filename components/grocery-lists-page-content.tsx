"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  CheckSquare, 
  Trash2, 
  Edit3, 
  ArrowUpDown,
  Package,
  Sparkles,
  MapPin
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { GroceryList, GroceryItem, Recipe } from "@/lib/types"

interface GroceryListsPageContentProps {
  initialLists: (GroceryList & { grocery_items: GroceryItem[] })[]
  recipes: Recipe[]
}

// Store sections for categorizing items
const STORE_SECTIONS = [
  { value: "produce", label: "Produce", icon: "🥬" },
  { value: "dairy", label: "Dairy & Eggs", icon: "🥛" },
  { value: "meat", label: "Meat & Seafood", icon: "🥩" },
  { value: "bakery", label: "Bakery", icon: "🍞" },
  { value: "frozen", label: "Frozen", icon: "🧊" },
  { value: "pantry", label: "Pantry & Dry Goods", icon: "🥫" },
  { value: "beverages", label: "Beverages", icon: "🥤" },
  { value: "snacks", label: "Snacks", icon: "🍿" },
  { value: "health", label: "Health & Beauty", icon: "🧴" },
  { value: "household", label: "Household", icon: "🧽" },
  { value: "unclassified", label: "Unclassified", icon: "❓" },
  { value: "other", label: "Other", icon: "📦" }
]

export function GroceryListsPageContent({ initialLists, recipes }: GroceryListsPageContentProps) {
  const [groceryLists, setGroceryLists] = useState(initialLists)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)
  const [addItemDialogOpen, setAddItemDialogOpen] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState("")
  const [newItemUnit, setNewItemUnit] = useState("")
  const [newItemCategory, setNewItemCategory] = useState("")
  const [sortedBy, setSortedBy] = useState<"name" | "category" | "created">("created")
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [shoppingListId, setShoppingListId] = useState<string | null>(null)

  const toggleListSelection = (listId: string) => {
    setSelectedLists(prev => {
      const newSet = new Set(prev)
      if (newSet.has(listId)) {
        newSet.delete(listId)
      } else {
        newSet.add(listId)
      }
      return newSet
    })
  }

  const selectAllLists = () => {
    setSelectedLists(new Set(filteredLists.map(list => list.id)))
  }

  const clearSelection = () => {
    setSelectedLists(new Set())
    setIsSelectionMode(false)
  }

  const handleDeleteLists = async () => {
    if (selectedLists.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/grocery-lists/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listIds: Array.from(selectedLists) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete grocery lists")
      }

      // Remove deleted lists from the UI
      const deletedIds = data.results.filter((r: any) => r.success).map((r: any) => r.id)
      setGroceryLists(prev => prev.filter(list => !deletedIds.includes(list.id)))

      clearSelection()
      setDeleteDialogOpen(false)
      console.log(data.message)
    } catch (error) {
      console.error("Delete error:", error)
      alert(`Failed to delete grocery lists: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddItem = async (listId: string) => {
    if (!newItemName.trim()) return

    try {
      const response = await fetch(`/api/grocery-lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName.trim(),
          quantity: newItemQuantity.trim() || "1",
          unit: newItemUnit.trim(),
          category: newItemCategory || "other",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add item")
      }

      // Update the grocery list with the new item
      setGroceryLists(prev => prev.map(list => 
        list.id === listId 
          ? { ...list, grocery_items: [...list.grocery_items, data.item] }
          : list
      ))

      // Reset form
      setNewItemName("")
      setNewItemQuantity("")
      setNewItemUnit("")
      setNewItemCategory("")
      setAddItemDialogOpen(null)
    } catch (error) {
      console.error("Add item error:", error)
      alert(`Failed to add item: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleSortItems = async (listId: string, sortBy: "category" | "name" = "category") => {
    try {
      const response = await fetch(`/api/grocery-lists/${listId}/sort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortBy }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sort items")
      }

      // Update the grocery list with sorted items
      setGroceryLists(prev => prev.map(list => 
        list.id === listId 
          ? { ...list, grocery_items: data.sortedItems }
          : list
      ))
    } catch (error) {
      console.error("Sort error:", error)
      alert(`Failed to sort items: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleClassifyItem = async (listId: string, itemId: string, itemName: string) => {
    try {
      const response = await fetch("/api/classify-ingredient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredientName: itemName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to classify item")
      }

      // Update the item category in the database
      const updateResponse = await fetch(`/api/grocery-lists/${listId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: data.category }),
      })

      if (updateResponse.ok) {
        // Update the UI
        setGroceryLists(prev => prev.map(list => 
          list.id === listId 
            ? { 
                ...list, 
                grocery_items: list.grocery_items.map(item => 
                  item.id === itemId 
                    ? { ...item, category: data.category }
                    : item
                )
              }
            : list
        ))
      }
    } catch (error) {
      console.error("Classify error:", error)
      alert(`Failed to classify item: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const response = await fetch(`/api/grocery-lists/${listId}/items/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item")
      }

      // Update the UI by removing the item
      setGroceryLists(prev => prev.map(list => 
        list.id === listId 
          ? { 
              ...list, 
              grocery_items: list.grocery_items.filter(item => item.id !== itemId)
            }
          : list
      ))
    } catch (error) {
      console.error("Delete item error:", error)
      alert(`Failed to delete item: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, listId: string, targetIndex: number) => {
    e.preventDefault()
    
    if (!draggedItem) return

    const list = groceryLists.find(l => l.id === listId)
    if (!list) return

    // Sort items by current sort_order to get correct indices
    const sortedItems = [...list.grocery_items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const draggedIndex = sortedItems.findIndex(item => item.id === draggedItem)
    
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null)
      setDragOverIndex(null)
      return
    }

    // Reorder items locally first for immediate feedback
    const newItems = [...sortedItems]
    const [draggedItemData] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, draggedItemData)

    // Update sort_order for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      sort_order: index
    }))

    // Update UI immediately
    setGroceryLists(prev => prev.map(l => 
      l.id === listId 
        ? { ...l, grocery_items: updatedItems }
        : l
    ))

    // Update sort_order in database (batch update)
    try {
      // Use the sort API instead of individual PATCH requests
      await fetch(`/api/grocery-lists/${listId}/sort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sortBy: "manual",
          itemOrder: updatedItems.map(item => item.id)
        }),
      })
    } catch (error) {
      console.error("Failed to update sort order:", error)
      // Revert UI changes if database update fails
      setGroceryLists(prev => prev.map(l => 
        l.id === listId 
          ? { ...l, grocery_items: list.grocery_items }
          : l
      ))
    }

    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const getSectionIcon = (category: string) => {
    const section = STORE_SECTIONS.find(s => s.value === category)
    return section?.icon || "📦"
  }

  const getSectionLabel = (category: string) => {
    const section = STORE_SECTIONS.find(s => s.value === category)
    return section?.label || "Other"
  }

  const filteredLists = groceryLists.filter(list => 
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedLists = [...filteredLists].sort((a, b) => {
    switch (sortedBy) {
      case "name":
        return a.name.localeCompare(b.name)
      case "category":
        return a.grocery_items.length - b.grocery_items.length
      case "created":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grocery Lists</h1>
              <p className="text-gray-600">Manage your shopping lists and organize your grocery trips</p>
            </div>
            <div className="flex items-center gap-4">
              {!isSelectionMode ? (
                <>
                  <Link href="/recipes">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create from Recipes
                    </Button>
                  </Link>
                  {groceryLists.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setIsSelectionMode(true)}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">
                    {selectedLists.size} selected
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllLists}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={selectedLists.size === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedLists.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Sort Controls */}
        <div className="mb-6 flex justify-between items-center">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search grocery lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-select" className="text-sm text-gray-600">Sort by:</Label>
            <Select value={sortedBy} onValueChange={(value: any) => setSortedBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Item Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grocery Lists Grid */}
        {sortedLists.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedLists.map((list) => (
              <Card 
                key={list.id} 
                className={`overflow-hidden relative ${isSelectionMode ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''} ${selectedLists.has(list.id) ? 'ring-2 ring-blue-500' : ''}`}
                onClick={isSelectionMode ? () => toggleListSelection(list.id) : undefined}
              >
                {isSelectionMode && (
                  <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLists.has(list.id)}
                      onCheckedChange={() => toggleListSelection(list.id)}
                      className="bg-white border-2 shadow-lg"
                    />
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="line-clamp-2 flex items-start gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{list.name}</span>
                  </CardTitle>
                  <CardDescription>
                    Created {new Date(list.created_at).toLocaleDateString()}
                    {list.total_estimated_cost && list.total_estimated_cost > 0 && (
                      <span className="ml-2 text-green-600 font-medium">
                        ~${list.total_estimated_cost.toFixed(2)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* Items Preview */}
                    <div className="space-y-1">
                      {list.grocery_items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-lg">{getSectionIcon(item.category)}</span>
                          <span className="flex-1 truncate">
                            {item.quantity} {item.unit} {item.name}
                          </span>
                        </div>
                      ))}
                      {list.grocery_items.length > 3 && (
                        <div className="text-xs text-gray-500 pl-6">
                          +{list.grocery_items.length - 3} more items
                        </div>
                      )}
                    </div>

                    {/* Category Summary */}
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(list.grocery_items.map(item => item.category))).slice(0, 4).map(category => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {getSectionIcon(category)} {getSectionLabel(category)}
                        </Badge>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    {!isSelectionMode && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setShoppingListId(list.id)}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Shop
                        </Button>
                        <Link href={`/grocery-lists/${list.id}/map`}>
                          <Button variant="outline" size="sm" className="flex-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            Map
                          </Button>
                        </Link>
                        <Dialog
                          open={editDialogOpen === list.id}
                          onOpenChange={(open) => setEditDialogOpen(open ? list.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Grocery List: {list.name}</DialogTitle>
                              <DialogDescription>
                                Manage items in your grocery list
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {/* Add Item Section */}
                              <div className="border rounded-lg p-4 bg-gray-50">
                                <h4 className="font-medium mb-3">Add New Item</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <Input
                                    placeholder="Item name"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                  />
                                  <Input
                                    placeholder="Quantity"
                                    value={newItemQuantity}
                                    onChange={(e) => setNewItemQuantity(e.target.value)}
                                  />
                                  <Input
                                    placeholder="Unit"
                                    value={newItemUnit}
                                    onChange={(e) => setNewItemUnit(e.target.value)}
                                  />
                                  <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STORE_SECTIONS.map(section => (
                                        <SelectItem key={section.value} value={section.value}>
                                          {section.icon} {section.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <Button 
                                    onClick={() => handleAddItem(list.id)}
                                    disabled={!newItemName.trim()}
                                    size="sm"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Item
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => handleSortItems(list.id, "category")}
                                    size="sm"
                                  >
                                    <ArrowUpDown className="h-3 w-3 mr-1" />
                                    Sort by Section
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => handleSortItems(list.id, "name")}
                                    size="sm"
                                  >
                                    <ArrowUpDown className="h-3 w-3 mr-1" />
                                    Sort A-Z
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  >
                                    🤏 Manual Sort
                                  </Button>
                                </div>
                              </div>

                              {/* Items List */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">Items ({list.grocery_items.length})</h4>
                                  <div className="text-xs text-gray-500">
                                    💡 Drag items to reorder by your store layout
                                  </div>
                                </div>
                                <div className="max-h-96 overflow-y-auto space-y-2">
                                  {list.grocery_items
                                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                                    .map((item, index) => (
                                    <div 
                                      key={item.id} 
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, item.id)}
                                      onDragOver={(e) => handleDragOver(e, index)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => handleDrop(e, list.id, index)}
                                      onDragEnd={handleDragEnd}
                                      className={`
                                        flex items-center gap-3 p-2 border rounded transition-all duration-200 cursor-move
                                        ${draggedItem === item.id ? 'opacity-50 scale-95' : 'hover:bg-gray-50'}
                                        ${dragOverIndex === index ? 'border-blue-400 bg-blue-50' : ''}
                                        ${item.is_completed ? 'opacity-60 line-through' : ''}
                                      `}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                                          ⋮⋮
                                        </div>
                                        <span className="text-lg">{getSectionIcon(item.category)}</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                          <span>
                                            {item.quantity} {item.unit} • {getSectionLabel(item.category)}
                                            {item.notes && item.notes.includes('*') && (
                                              <span className="text-blue-600 font-medium ml-1">{item.notes}</span>
                                            )}
                                          </span>
                                          {item.category === 'unclassified' && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-6 px-2 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleClassifyItem(list.id, item.id, item.name)
                                              }}
                                            >
                                              <Sparkles className="h-3 w-3 mr-1" />
                                              Classify
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Checkbox 
                                          checked={item.is_completed}
                                          onCheckedChange={(checked) => {
                                            // TODO: Update item completion status
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteItem(list.id, item.id)
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLists(new Set([list.id]))
                            setDeleteDialogOpen(true)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? "No grocery lists found" : "No grocery lists yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Create your first grocery list from your recipes"}
            </p>
            {!searchTerm && (
              <Link href="/recipes">
                <Button>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create from Recipes
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Grocery Lists</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedLists.size} grocery list{selectedLists.size !== 1 ? 's' : ''}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteLists}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : `Delete ${selectedLists.size} List${selectedLists.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* Shopping View Modal */}
      {shoppingListId && (() => {
        const selectedList = groceryLists.find(l => l.id === shoppingListId)
        return selectedList ? (
          <ShoppingView 
            list={selectedList}
            onClose={() => setShoppingListId(null)}
            onToggleComplete={async (itemId, completed) => {
              // Update UI immediately
              setGroceryLists(prev => prev.map(list => 
                list.id === shoppingListId
                  ? {
                      ...list,
                      grocery_items: list.grocery_items.map(item =>
                        item.id === itemId ? { ...item, is_completed: completed } : item
                      )
                    }
                  : list
              ))

              // Update database
              try {
                await fetch(`/api/grocery-lists/${shoppingListId}/items/${itemId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ is_completed: completed }),
                })
              } catch (error) {
                console.error("Failed to update item completion:", error)
                // Revert UI change on error
                setGroceryLists(prev => prev.map(list => 
                  list.id === shoppingListId
                    ? {
                        ...list,
                        grocery_items: list.grocery_items.map(item =>
                          item.id === itemId ? { ...item, is_completed: !completed } : item
                        )
                      }
                    : list
                ))
              }
            }}
          />
        ) : null
      })()}
    </div>
  )
}

// Shopping View Component
function ShoppingView({ 
  list, 
  onClose, 
  onToggleComplete 
}: { 
  list: any
  onClose: () => void
  onToggleComplete: (itemId: string, completed: boolean) => void
}) {
  const sortedItems = (list.grocery_items || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
  const completedCount = sortedItems.filter((item: any) => item.is_completed).length
  const totalCount = sortedItems.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{list.name}</h1>
            <p className="text-blue-100">
              {completedCount} of {totalCount} items completed
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white hover:bg-blue-700"
          >
            ✕ Done
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 bg-blue-700 rounded-full h-2">
          <div 
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Shopping List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {sortedItems.map((item: any, index: number) => (
            <div 
              key={item.id}
              className={`
                flex items-center gap-4 p-4 border rounded-lg transition-all duration-200
                ${item.is_completed 
                  ? 'bg-green-50 border-green-200 opacity-60' 
                  : 'bg-white border-gray-200 shadow-sm'
                }
              `}
            >
              <Checkbox
                checked={item.is_completed}
                onCheckedChange={(checked) => onToggleComplete(item.id, !!checked)}
                className="h-6 w-6"
              />
              
              <div className="flex-1">
                <div className={`font-medium text-lg ${item.is_completed ? 'line-through text-gray-500' : ''}`}>
                  {item.name}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="text-lg">{getSectionIcon(item.category)}</span>
                  <span>{item.quantity} {item.unit}</span>
                  <span>•</span>
                  <span>{getSectionLabel(item.category)}</span>
                  {item.notes && item.notes.includes('*') && (
                    <span className="text-blue-600 font-medium">{item.notes}</span>
                  )}
                </div>
              </div>

              {item.is_completed && (
                <div className="text-green-600">
                  ✓
                </div>
              )}
            </div>
          ))}

          {totalCount === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in this list</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="max-w-2xl mx-auto flex justify-between items-center text-sm text-gray-600">
          <span>{totalCount} total items</span>
          <span>{completedCount} completed</span>
          <span>{totalCount - completedCount} remaining</span>
        </div>
      </div>
    </div>
  )
}
