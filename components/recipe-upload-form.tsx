"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Link, Type, Loader2 } from "lucide-react"

interface Recipe {
  id: string
  title: string
  description: string
  ingredients: Array<{ name: string; quantity?: string; unit?: string }>
  instructions: Array<{ step: number; instruction: string }>
  prep_time?: number
  cook_time?: number
  servings?: number
  image_url?: string
}

interface RecipeUploadFormProps {
  onRecipeUploaded?: (recipe: Recipe) => void
}

export function RecipeUploadForm({ onRecipeUploaded }: RecipeUploadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/upload-recipe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload recipe")
      }

      setSuccess("Recipe uploaded and parsed successfully!")
      onRecipeUploaded?.(data.recipe)

      const forms = document.querySelectorAll("form")
      forms.forEach((form) => form.reset())
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await handleSubmit(formData)
  }

  const handleUrlUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await handleSubmit(formData)
  }

  const handleTextUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await handleSubmit(formData)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Recipe
        </CardTitle>
        <CardDescription>
          Upload a recipe image, PDF, paste a URL, or enter text to automatically parse ingredients and instructions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              File
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Recipe File</Label>
                <Input id="file" name="file" type="file" accept="image/*,.pdf,.txt" required disabled={isLoading} />
                <p className="text-sm text-muted-foreground">Supports images (JPG, PNG), PDFs, and text files</p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upload & Parse Recipe"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <form onSubmit={handleUrlUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Recipe URL</Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder="https://example.com/recipe"
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">Enter a URL to a recipe page</p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Parse Recipe from URL"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <form onSubmit={handleTextUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text">Recipe Text</Label>
                <Textarea
                  id="text"
                  name="text"
                  placeholder="Paste your recipe text here..."
                  rows={8}
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Paste the full recipe text including ingredients and instructions
                </p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Parse Recipe Text"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
            {error.includes("storage bucket") && (
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Make sure you've run the storage setup script from the scripts folder.
              </p>
            )}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
