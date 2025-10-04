"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
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
import { ChefHat, Clock, Users, Search, Plus, ArrowLeft, Wand2, Trash2, CheckSquare, Square, ShoppingCart } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RecipeUploadForm } from "@/components/recipe-upload-form"
import { TestRecipeButton } from "@/components/test-recipe-button"
import { RecipeViewer } from "@/components/recipe-viewer"
import type { Recipe } from "@/lib/types"

interface RecipesPageContentProps {
  initialRecipes: Recipe[]
}

export function RecipesPageContent({ initialRecipes }: RecipesPageContentProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [modifyDialogOpen, setModifyDialogOpen] = useState<string | null>(null)
  const [modifyPrompt, setModifyPrompt] = useState("")
  const [isModifying, setIsModifying] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState<string | null>(null)
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isGroceryListMode, setIsGroceryListMode] = useState(false)
  const [groceryListDialogOpen, setGroceryListDialogOpen] = useState(false)
  const [groceryListName, setGroceryListName] = useState("")
  const [isCreatingGroceryList, setIsCreatingGroceryList] = useState(false)

  // Fetch recipes client-side for instant page loads
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: recipesData } = await supabase
            .from("recipes")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50)
          
          setRecipes(recipesData || [])
        }
      } catch (error) {
        console.error("Failed to fetch recipes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if we don't have initial recipes (for instant loads)
    if (initialRecipes.length === 0) {
      fetchRecipes()
    } else {
      setIsLoading(false)
    }
  }, [initialRecipes.length])

  const handleRecipeUploaded = (newRecipe: Recipe) => {
    setRecipes((prev) => [newRecipe, ...prev])
    setShowUploadForm(false)
  }

  const handleRecipeAdded = () => {
    // Refresh the page to show the new recipe
    window.location.reload()
  }

  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  const selectAllRecipes = () => {
    setSelectedRecipes(new Set(filteredRecipes.map(r => r.id)))
  }

  const clearSelection = () => {
    setSelectedRecipes(new Set())
    setIsSelectionMode(false)
    setIsGroceryListMode(false)
  }

  const startGroceryListMode = () => {
    setSelectedRecipes(new Set())
    setIsSelectionMode(true)
    setIsGroceryListMode(true)
  }

  const handleDeleteRecipes = async () => {
    if (selectedRecipes.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/recipes/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeIds: Array.from(selectedRecipes)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete recipes")
      }

      // Remove deleted recipes from the UI
      const deletedIds = data.results.filter((r: any) => r.success).map((r: any) => r.id)
      setRecipes(prev => prev.filter(recipe => !deletedIds.includes(recipe.id)))
      
      // Clear selection
      clearSelection()
      setDeleteDialogOpen(false)

      // Show success message (you could add a toast here)
      console.log(data.message)
    } catch (error) {
      console.error("Delete error:", error)
      // Show error message (you could add a toast here)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateGroceryList = async () => {
    if (!groceryListName.trim() || selectedRecipes.size === 0) return

    console.log("Creating grocery list with:", {
      recipe_ids: Array.from(selectedRecipes),
      custom_name: groceryListName,
      store_preferences: "Organize by typical grocery store layout"
    })

    setIsCreatingGroceryList(true)
    try {
      const response = await fetch("/api/generate-grocery-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_ids: Array.from(selectedRecipes),
          custom_name: groceryListName,
          store_preferences: "Organize by typical grocery store layout"
        }),
      })

      const data = await response.json()
      console.log("Grocery list response status:", response.status)
      console.log("Grocery list response data:", data)

      if (response.ok) {
        setGroceryListName("")
        clearSelection()
        setGroceryListDialogOpen(false)
        alert(`Grocery list created successfully! Generated ${data.items?.length || 0} items from ${selectedRecipes.size} recipes.`)
      } else {
        console.error("Grocery list creation failed:", data)
        throw new Error(data.details ? `${data.error}: ${data.details}` : data.error || "Failed to create grocery list")
      }
    } catch (error) {
      console.error("Failed to create grocery list:", error)
      alert(`Failed to create grocery list: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsCreatingGroceryList(false)
    }
  }

  const handleModifyRecipe = async (recipeId: string) => {
    if (!modifyPrompt.trim()) return

    console.log("Starting recipe modification for recipe:", recipeId)
    console.log("Modification prompt:", modifyPrompt.trim())

    setIsModifying(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: modifyPrompt }),
      })

      const data = await response.json()
      console.log("Modification response status:", response.status)
      console.log("Modification response data:", data)

      if (response.ok) {
        const { recipe: updatedRecipe, message } = data
        // Add the new version to the recipes list (don't replace the original)
        setRecipes((prev) => [updatedRecipe, ...prev])
        setModifyDialogOpen(null)
        setModifyPrompt("")
        console.log("Recipe modification successful:", message)
        alert(`Recipe modification successful! ${message}`)
      } else {
        console.error("Failed to modify recipe:", data.error)
        alert(`Failed to modify recipe: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error modifying recipe:", error)
      alert(`Error modifying recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsModifying(false)
    }
  }

  const filteredRecipes = recipes.filter((recipe) => recipe.title.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Recipes</h1>
              <p className="text-gray-600">Manage your recipe collection</p>
            </div>
            <div className="flex items-center gap-4">
              {!isSelectionMode ? (
                <>
                  <TestRecipeButton onRecipeAdded={handleRecipeAdded} />
                  <Button onClick={() => setShowUploadForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Recipe
                  </Button>
                  {recipes.length > 0 && (
                    <>
                      <Button 
                        variant="default"
                        onClick={startGroceryListMode}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Create Grocery List
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsSelectionMode(true)}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Select
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">
                    {isGroceryListMode ? "Select recipes for grocery list" : `${selectedRecipes.size} selected`}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={selectAllRecipes}
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
                  {isGroceryListMode ? (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setGroceryListDialogOpen(true)}
                      disabled={selectedRecipes.size === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Create List ({selectedRecipes.size})
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={selectedRecipes.size === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedRecipes.size})
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upload Recipe</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadForm(false)}>
                ×
              </Button>
            </div>
            <div className="p-4">
              <RecipeUploadForm onRecipeUploaded={handleRecipeUploaded} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Recipes Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-40 bg-gray-200 animate-pulse"></div>
                <CardHeader>
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                className={`overflow-hidden relative ${isSelectionMode ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''} ${selectedRecipes.has(recipe.id) ? 'ring-2 ring-blue-500' : ''}`}
                onClick={isSelectionMode ? () => toggleRecipeSelection(recipe.id) : undefined}
              >
                {isSelectionMode && (
                  <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRecipes.has(recipe.id)}
                      onCheckedChange={() => toggleRecipeSelection(recipe.id)}
                      className="bg-white border-2 shadow-lg"
                    />
                  </div>
                )}
                
                {recipe.image_url && (
                    <div className="aspect-video bg-gray-200">
                      <img
                        src={recipe.image_url || "/placeholder.svg"}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                )}
                  <CardHeader>
                  <CardTitle className="line-clamp-2 flex items-start gap-2">
                    <span className={recipe.is_modified ? "text-blue-600" : ""}>
                      {recipe.title}
                    </span>
                    {recipe.is_modified && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0">
                        v{recipe.version_number}
                      </span>
                    )}
                  </CardTitle>
                  {recipe.description && (
                    <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
                  )}
                  {recipe.modification_prompt && (
                    <CardDescription className="text-xs text-blue-600 italic">
                      Modified: {recipe.modification_prompt}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    {recipe.prep_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.prep_time}m prep
                      </div>
                    )}
                    {recipe.cook_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.cook_time}m cook
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {recipe.servings} servings
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{recipe.ingredients.length} ingredients</Badge>
                    {!isSelectionMode && (
                      <div className="flex gap-2">
                        <Dialog
                          open={modifyDialogOpen === recipe.id}
                          onOpenChange={(open) => setModifyDialogOpen(open ? recipe.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Wand2 className="h-3 w-3 mr-1" />
                              Modify
                            </Button>
                          </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modify Recipe with AI</DialogTitle>
                            <DialogDescription>Describe how you'd like to modify "{recipe.title}"</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="e.g., make it vegan, double the servings, add more spice..."
                              value={modifyPrompt}
                              onChange={(e) => setModifyPrompt(e.target.value)}
                              rows={4}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setModifyDialogOpen(null)
                                  setModifyPrompt("")
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleModifyRecipe(recipe.id)}
                                disabled={isModifying || !modifyPrompt.trim()}
                              >
                                {isModifying ? "Modifying..." : "Modify Recipe"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewDialogOpen(recipe.id)}
                      >
                        View Recipe
                      </Button>
                      {!isSelectionMode && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRecipes(new Set([recipe.id]))
                            setDeleteDialogOpen(true)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{searchTerm ? "No recipes found" : "No recipes yet"}</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Upload your first recipe to get started with meal planning"}
            </p>
            {!searchTerm && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setShowUploadForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Your First Recipe
                </Button>
                <TestRecipeButton onRecipeAdded={handleRecipeAdded} />
              </div>
            )}
          </div>
        )}

        {/* Recipe Viewer */}
        <RecipeViewer 
          recipe={recipes.find(r => r.id === viewDialogOpen) || null}
          isOpen={!!viewDialogOpen}
          onClose={() => setViewDialogOpen(null)}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Recipes</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedRecipes.size} recipe{selectedRecipes.size !== 1 ? 's' : ''}? 
                This action cannot be undone.
                {Array.from(selectedRecipes).some(id => {
                  const recipe = recipes.find(r => r.id === id)
                  return recipe && !recipe.is_modified && !recipe.original_recipe_id
                }) && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                    <strong>Warning:</strong> Some selected recipes are originals with modifications. 
                    Deleting them will also delete all their modified versions.
                  </div>
                )}
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
                onClick={handleDeleteRecipes}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : `Delete ${selectedRecipes.size} Recipe${selectedRecipes.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Grocery List Creation Dialog */}
        <Dialog open={groceryListDialogOpen} onOpenChange={setGroceryListDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Grocery List</DialogTitle>
              <DialogDescription>
                Create a grocery list from {selectedRecipes.size} selected recipe{selectedRecipes.size !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="grocery-list-name">List Name</Label>
                <Input
                  id="grocery-list-name"
                  placeholder="e.g., Weekly Meal Prep, Dinner Party Shopping"
                  value={groceryListName}
                  onChange={(e) => setGroceryListName(e.target.value)}
                />
              </div>
              
              {/* Selected Recipes Summary */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Selected Recipes:</h4>
                <div className="space-y-1">
                  {Array.from(selectedRecipes).map(recipeId => {
                    const recipe = recipes.find(r => r.id === recipeId)
                    return recipe ? (
                      <div key={recipeId} className="text-sm text-gray-600 flex items-center gap-2">
                        <span>•</span>
                        <span>{recipe.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {recipe.ingredients.length} ingredients
                        </Badge>
                      </div>
                    ) : null
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGroceryListDialogOpen(false)
                    setGroceryListName("")
                  }}
                  disabled={isCreatingGroceryList}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroceryList}
                  disabled={isCreatingGroceryList || !groceryListName.trim()}
                >
                  {isCreatingGroceryList ? "Creating..." : "Create Grocery List"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
