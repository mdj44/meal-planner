"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Clock, Users, Search, Plus, ArrowLeft } from "lucide-react"
import { RecipeUploadForm } from "@/components/recipe-upload-form"
import { RecipeToGroceryList } from "@/components/recipe-to-grocery-list"
import { TestRecipeButton } from "@/components/test-recipe-button"
import type { Recipe } from "@/lib/types"

interface RecipesPageContentProps {
  initialRecipes: Recipe[]
}

export function RecipesPageContent({ initialRecipes }: RecipesPageContentProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [searchTerm, setSearchTerm] = useState("")
  const [showUploadForm, setShowUploadForm] = useState(false)

  const handleRecipeUploaded = (newRecipe: Recipe) => {
    setRecipes((prev) => [newRecipe, ...prev])
    setShowUploadForm(false)
  }

  const handleRecipeAdded = () => {
    // Refresh the page to show the new recipe
    window.location.reload()
  }

  const filteredRecipes = recipes.filter((recipe) => recipe.title.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Recipes</h1>
              <p className="text-gray-600">Manage your recipe collection</p>
            </div>
            <div className="flex items-center gap-4">
              <RecipeToGroceryList recipes={recipes} />
              <TestRecipeButton onRecipeAdded={handleRecipeAdded} />
              <Button onClick={() => setShowUploadForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Recipe
              </Button>
            </div>
          </div>
        </div>
      </header>

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
        {filteredRecipes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden">
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
                  <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
                  {recipe.description && (
                    <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
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
                    <Button variant="outline" size="sm">
                      View Recipe
                    </Button>
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
      </main>
    </div>
  )
}
