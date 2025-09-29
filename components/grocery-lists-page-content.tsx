"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { GroceryListManager } from "@/components/grocery-list-manager"
import { RecipeToGroceryList } from "@/components/recipe-to-grocery-list"
import type { GroceryList, GroceryItem, Recipe } from "@/lib/types"

interface GroceryListsPageContentProps {
  initialLists: (GroceryList & { grocery_items: GroceryItem[] })[]
  recipes: Recipe[]
}

export function GroceryListsPageContent({ initialLists, recipes }: GroceryListsPageContentProps) {
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
              <h1 className="text-3xl font-bold text-gray-900">Grocery Lists</h1>
              <p className="text-gray-600">Manage your shopping lists and organize your grocery trips</p>
            </div>
            <RecipeToGroceryList recipes={recipes} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <GroceryListManager initialLists={initialLists} />
      </main>
    </div>
  )
}
