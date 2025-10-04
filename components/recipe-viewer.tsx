"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface Recipe {
  id: string
  title: string
  description?: string
  ingredients: Array<{
    name: string
    quantity?: string
    unit?: string
  }>
  instructions: Array<{
    step: number
    instruction: string
  }>
  prep_time?: number
  cook_time?: number
  servings?: number
  image_url?: string
  image_urls?: string[]
  created_at: string
}

interface RecipeViewerProps {
  recipe: Recipe | null
  isOpen: boolean
  onClose: () => void
}

export function RecipeViewer({ recipe, isOpen, onClose }: RecipeViewerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  if (!recipe) return null

  const images = recipe.image_urls && recipe.image_urls.length > 0 
    ? recipe.image_urls 
    : recipe.image_url 
    ? [recipe.image_url] 
    : []

  // Debug logging
  console.log('RecipeViewer - Recipe:', recipe.title)
  console.log('RecipeViewer - image_url:', recipe.image_url)
  console.log('RecipeViewer - image_urls:', recipe.image_urls)
  console.log('RecipeViewer - images array:', images)

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index)
    setImageViewerOpen(true)
    setZoom(1)
    setRotation(0)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
    setZoom(1)
    setRotation(0)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
    setZoom(1)
    setRotation(0)
  }

  const resetImage = () => {
    setZoom(1)
    setRotation(0)
  }

  return (
    <>
      {/* Main Recipe Dialog */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{recipe.title}</DialogTitle>
            {recipe.description && (
              <DialogDescription className="text-base">{recipe.description}</DialogDescription>
            )}
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recipe Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {recipe.prep_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.prep_time}m prep
                  </div>
                )}
                {recipe.cook_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.cook_time}m cook
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {recipe.servings} servings
                  </div>
                )}
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span>
                        {ingredient.quantity && ingredient.unit 
                          ? `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`
                          : ingredient.quantity 
                          ? `${ingredient.quantity} ${ingredient.name}`
                          : ingredient.name
                        }
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Instructions</h3>
              <ol className="space-y-3">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0 mt-0.5">
                      {instruction.step || index + 1}
                    </span>
                    <span className="text-sm leading-relaxed">
                      {instruction.instruction}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Recipe Images Gallery */}
          {images.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Recipe Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={imageUrl} 
                      alt={`${recipe.title} - Page ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border"
                      onClick={() => handleImageClick(index)}
                      onLoad={() => console.log('Image loaded:', imageUrl)}
                      onError={(e) => console.error('Image failed to load:', imageUrl, e)}
                    />
                    {images.length > 1 && (
                      <Badge 
                        variant="secondary" 
                        className="absolute top-2 right-2 text-xs"
                      >
                        {index + 1}
                      </Badge>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
              {images.length > 1 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Click on any image to view full size. Use arrow keys to navigate between pages.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Recipe Image Viewer</DialogTitle>
          </DialogHeader>
          
          {images.length > 0 && (
            <div className="relative">
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Image Controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="bg-white/90 hover:bg-white"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="bg-white/90 hover:bg-white"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="bg-white/90 hover:bg-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImage}
                  className="bg-white/90 hover:bg-white"
                >
                  Reset
                </Button>
              </div>

              {/* Page Counter */}
              {images.length > 1 && (
                <div className="absolute top-4 left-4 z-10">
                  <Badge variant="secondary" className="bg-white/90">
                    {currentImageIndex + 1} of {images.length}
                  </Badge>
                </div>
              )}

              {/* Main Image */}
              <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 rounded-lg overflow-hidden">
                <img
                  src={images[currentImageIndex]}
                  alt={`${recipe.title} - Page ${currentImageIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    cursor: zoom > 1 ? 'grab' : 'zoom-in'
                  }}
                  onWheel={(e) => {
                    e.preventDefault()
                    const delta = e.deltaY > 0 ? -0.1 : 0.1
                    setZoom(Math.max(0.5, Math.min(3, zoom + delta)))
                  }}
                  onMouseDown={(e) => {
                    if (zoom > 1) {
                      e.currentTarget.style.cursor = 'grabbing'
                    }
                  }}
                  onMouseUp={(e) => {
                    if (zoom > 1) {
                      e.currentTarget.style.cursor = 'grab'
                    }
                  }}
                />
              </div>

              {/* Thumbnail Navigation */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                  {images.map((imageUrl, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index)
                        setZoom(1)
                        setRotation(0)
                      }}
                      className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
