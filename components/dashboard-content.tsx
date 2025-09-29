"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChefHat,
  ShoppingCart,
  MapPin,
  Plus,
  User,
  Settings,
  LogOut,
  Clock,
  Users,
  Upload,
  List,
  Store,
} from "lucide-react"
import { RecipeUploadForm } from "@/components/recipe-upload-form"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Recipe, GroceryList } from "@/lib/types"

interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
}

interface DashboardContentProps {
  user: SupabaseUser
  profile: Profile | null
  initialRecipes: Recipe[]
  initialGroceryLists: (GroceryList & { grocery_items: any[] })[]
}

export function DashboardContent({ user, profile, initialRecipes, initialGroceryLists }: DashboardContentProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [showUploadForm, setShowUploadForm] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const handleRecipeUploaded = (newRecipe: Recipe) => {
    setRecipes((prev) => [newRecipe, ...prev])
    setShowUploadForm(false)
  }

  const userName = profile?.full_name || user.email?.split("@")[0] || "User"
  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Aisle</h1>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/recipes" className="text-gray-700 hover:text-gray-900">
                Recipes
              </Link>
              <Link href="/grocery-lists" className="text-gray-700 hover:text-gray-900">
                Grocery Lists
              </Link>
              <Link href="/stores" className="text-gray-700 hover:text-gray-900">
                Store Maps
              </Link>
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{userName}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {userName}!</h2>
          <p className="text-gray-600">Here's what's happening with your meals and grocery planning.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button
            onClick={() => setShowUploadForm(true)}
            className="h-20 flex flex-col items-center justify-center gap-2"
          >
            <Upload className="h-6 w-6" />
            Upload Recipe
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-20 flex flex-col items-center justify-center gap-2 bg-transparent"
          >
            <Link href="/grocery-lists">
              <List className="h-6 w-6" />
              Create List
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-20 flex flex-col items-center justify-center gap-2 bg-transparent"
          >
            <Link href="/stores">
              <Store className="h-6 w-6" />
              Browse Stores
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-20 flex flex-col items-center justify-center gap-2 bg-transparent"
          >
            <Link href="/recipes">
              <ChefHat className="h-6 w-6" />
              View Recipes
            </Link>
          </Button>
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

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recipes.length}</div>
              <p className="text-xs text-muted-foreground">recipes in your collection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grocery Lists</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{initialGroceryLists.length}</div>
              <p className="text-xs text-muted-foreground">active grocery lists</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Tagged</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">store locations contributed</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Recipes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Recent Recipes
              </CardTitle>
              <CardDescription>Your latest uploaded recipes</CardDescription>
            </CardHeader>
            <CardContent>
              {recipes.length > 0 ? (
                <div className="space-y-4">
                  {recipes.slice(0, 3).map((recipe) => (
                    <div key={recipe.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{recipe.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {recipe.prep_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {recipe.prep_time}m
                            </div>
                          )}
                          {recipe.servings && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {recipe.servings}
                            </div>
                          )}
                          <Badge variant="outline">{recipe.ingredients.length} ingredients</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" asChild className="w-full bg-transparent">
                    <Link href="/recipes">View All Recipes</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No recipes yet</p>
                  <Button onClick={() => setShowUploadForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Your First Recipe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Grocery Lists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Grocery Lists
              </CardTitle>
              <CardDescription>Your latest grocery lists</CardDescription>
            </CardHeader>
            <CardContent>
              {initialGroceryLists.length > 0 ? (
                <div className="space-y-4">
                  {initialGroceryLists.slice(0, 3).map((list) => (
                    <div key={list.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{list.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {list.grocery_items.length} items •{" "}
                          {list.grocery_items.filter((item) => item.is_completed).length} completed
                        </p>
                      </div>
                      <Badge variant={list.grocery_items.every((item) => item.is_completed) ? "default" : "secondary"}>
                        {list.grocery_items.every((item) => item.is_completed) ? "Complete" : "Active"}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" asChild className="w-full bg-transparent">
                    <Link href="/grocery-lists">View All Lists</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No grocery lists yet</p>
                  <Button asChild>
                    <Link href="/grocery-lists">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First List
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
