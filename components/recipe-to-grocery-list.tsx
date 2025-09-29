"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ShoppingCart, Clock, Users } from "lucide-react"
import type { Recipe } from "@/lib/types"

interface RecipeToGroceryListProps {
  recipes: Recipe[]
  onListCreated?: () => void
}

export function RecipeToGroceryList({ recipes, onListCreated }: RecipeToGroceryListProps) {
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])
  const [listName, setListName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const toggleRecipe = (recipeId: string) => {
    setSelectedRecipes((prev) => (prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]))
  }

  const createGroceryList = async () => {
    if (!listName.trim() || selectedRecipes.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/grocery-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: listName,
          recipeIds: selectedRecipes,
        }),
      })

      if (response.ok) {
        setListName("")
        setSelectedRecipes([])
        setIsOpen(false)
        onListCreated?.()
      }
    } catch (error) {
      console.error("Failed to create grocery list:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedRecipeData = recipes.filter((recipe) => selectedRecipes.includes(recipe.id))
  const totalIngredients = selectedRecipeData.reduce((acc, recipe) => acc + recipe.ingredients.length, 0)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Create Grocery List from Recipes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Grocery List from Recipes</DialogTitle>
          <DialogDescription>
            Select recipes to automatically generate a grocery list with all ingredients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* List Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">List Name</label>
            <Input
              placeholder="e.g., Weekly Meal Prep"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
          </div>

          {/* Recipe Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Recipes</label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className={`cursor-pointer transition-colors ${
                    selectedRecipes.includes(recipe.id) ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => toggleRecipe(recipe.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedRecipes.includes(recipe.id)}
                        onChange={() => toggleRecipe(recipe.id)}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{recipe.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {recipe.prep_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.prep_time}m prep
                            </div>
                          )}
                          {recipe.servings && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {recipe.servings} servings
                            </div>
                          )}
                          <Badge variant="outline">{recipe.ingredients.length} ingredients</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedRecipes.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm">
                  <strong>{selectedRecipes.length}</strong> recipes selected •<strong> {totalIngredients}</strong> total
                  ingredients
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Button */}
          <Button
            onClick={createGroceryList}
            disabled={isLoading || !listName.trim() || selectedRecipes.length === 0}
            className="w-full"
          >
            {isLoading ? "Creating..." : "Create Grocery List"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
