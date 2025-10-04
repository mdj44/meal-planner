"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Link, Type, Loader2, Download } from "lucide-react"
import type { Recipe } from "@/lib/types"

// Image compression utility with aggressive compression for OpenAI token limits
function compressImage(file: File, maxWidth: number = 800, quality: number = 0.6): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions - more aggressive resizing
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        } else {
          reject(new Error('Failed to compress image'))
        }
      }, 'image/jpeg', quality)
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Check if compressed image is still too large for OpenAI
function estimateTokenCount(file: File): number {
  // Rough estimate: 1 token ≈ 4 characters, base64 is ~1.33x original size
  // For images, we estimate based on file size
  const estimatedBase64Size = file.size * 1.33
  const estimatedTokens = estimatedBase64Size / 4
  return estimatedTokens
}

interface RecipeUploadFormProps {
  onRecipeUploaded?: (recipe: Recipe) => void
}

export function RecipeUploadForm({ onRecipeUploaded }: RecipeUploadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [jsonExport, setJsonExport] = useState<any>(null)

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
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || "Failed to upload recipe"
        throw new Error(errorMessage)
      }

      setSuccess(data.message || "Recipe uploaded and parsed successfully!")
      setJsonExport(data.json_export)
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
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement
      const files = fileInput.files
      
      if (!files || files.length === 0) {
        setError("Please select at least one image file")
        return
      }

      // Compress images if they're too large
      const compressedFiles: File[] = []
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          let processedFile = file
          
          // First compression if file is large
          if (file.size > 2 * 1024 * 1024) { // 2MB
            setSuccess("Compressing image...")
            processedFile = await compressImage(file, 800, 0.6)
          }
          
          // Check if still too large for OpenAI tokens (rough estimate)
          const estimatedTokens = estimateTokenCount(processedFile)
          if (estimatedTokens > 100000) { // Leave some buffer under 128k limit
            setSuccess("Further compressing for OpenAI compatibility...")
            processedFile = await compressImage(processedFile, 600, 0.5)
          }
          
          compressedFiles.push(processedFile)
        } else {
          compressedFiles.push(file)
        }
      }

      // Add all files (compressed or original)
      compressedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })
      formData.append("file_count", compressedFiles.length.toString())

      // Submit the form data
      const response = await fetch("/api/upload-recipe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || "Failed to upload recipe"
        throw new Error(errorMessage)
      }

      setSuccess(data.message || "Recipe uploaded and parsed successfully!")
      setJsonExport(data.json_export)
      onRecipeUploaded?.(data.recipe)

      const forms = document.querySelectorAll("form")
      forms.forEach((form) => form.reset())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process images")
    } finally {
      setIsLoading(false)
    }
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

  const downloadJSON = () => {
    if (!jsonExport) return

    const dataStr = JSON.stringify(jsonExport, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${jsonExport.id}_${jsonExport.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
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
                <Input id="file" name="file" type="file" accept="image/*" multiple required disabled={isLoading} />
                <p className="text-sm text-muted-foreground">
                  Upload one or more images (JPG, PNG, WebP). Perfect for multi-page recipes!
                  <br />
                  <span className="text-green-600">📱 Mobile Tip:</span> Take photos of each page of your recipe for best results.
                </p>
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
            {jsonExport && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-600">JSON export ready for download</p>
                  <Button
                    onClick={downloadJSON}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download JSON
                  </Button>
                </div>
                <div className="text-xs text-gray-600">
                  Recipe ID: {jsonExport.id} | {jsonExport.ingredients.length} ingredients | {jsonExport.instructions.length} steps
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
