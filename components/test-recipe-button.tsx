"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TestTube, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TestRecipeButtonProps {
  onRecipeAdded?: () => void
}

export function TestRecipeButton({ onRecipeAdded }: TestRecipeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleAddTestRecipe = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/test-recipe", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add test recipe")
      }

      toast({
        title: "Test recipe added!",
        description: "A sample Spaghetti Carbonara recipe has been added to your collection.",
      })

      onRecipeAdded?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add test recipe",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleAddTestRecipe}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 bg-transparent"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
      Add Test Recipe
    </Button>
  )
}
