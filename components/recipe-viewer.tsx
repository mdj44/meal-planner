"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Users, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, ShoppingCart, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

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

interface GroceryList {
  id: string
  name: string
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
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([])
  const [selectedGroceryList, setSelectedGroceryList] = useState<string>("")
  const [addingToGroceryList, setAddingToGroceryList] = useState(false)
  const [newGroceryListName, setNewGroceryListName] = useState("")
  const [showCreateNewList, setShowCreateNewList] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch grocery lists when dialog opens
  useEffect(() => {
    if (isOpen && recipe) {
      fetchGroceryLists()
    }
  }, [isOpen, recipe])

  const fetchGroceryLists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: lists, error } = await supabase
        .from('grocery_lists')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching grocery lists:', error)
        return
      }

      setGroceryLists(lists || [])
    } catch (error) {
      console.error('Error fetching grocery lists:', error)
    }
  }

  const createNewGroceryList = async () => {
    if (!newGroceryListName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: newList, error } = await supabase
        .from('grocery_lists')
        .insert({
          name: newGroceryListName.trim(),
          user_id: user.id,
          recipe_ids: []
        })
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create grocery list",
          variant: "destructive"
        })
        return
      }

      setGroceryLists(prev => [newList, ...prev])
      setSelectedGroceryList(newList.id)
      setNewGroceryListName("")
      setShowCreateNewList(false)
      
      toast({
        title: "Success",
        description: `Created grocery list "${newList.name}"`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create grocery list",
        variant: "destructive"
      })
    }
  }

  const addRecipeToGroceryList = async () => {
    if (!recipe || !selectedGroceryList) return

    setAddingToGroceryList(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to add ingredients to a grocery list",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`/api/grocery-lists/${selectedGroceryList}/add-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipeId: recipe.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.existingCount) {
          toast({
            title: "Already Added",
            description: `This recipe's ingredients are already in the selected grocery list`,
            variant: "destructive"
          })
        } else {
          throw new Error(result.error || 'Failed to add ingredients to grocery list')
        }
        return
      }

      toast({
        title: "Success!",
        description: result.message
      })
      
      setSelectedGroceryList("")
    } catch (error) {
      console.error('Error adding recipe to grocery list:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add ingredients to grocery list',
        variant: "destructive"
      })
    } finally {
      setAddingToGroceryList(false)
    }
  }

  if (!recipe) return null

  const images = recipe.image_urls && recipe.image_urls.length > 0 
    ? recipe.image_urls 
    : recipe.image_url 
    ? [recipe.image_url] 
    : []


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

              {/* Add to Grocery List */}
              <div className="bg-muted/50 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Add to Grocery List
                </h3>
                
                {groceryLists.length > 0 ? (
                  <div className="space-y-3">
                    <Select value={selectedGroceryList} onValueChange={setSelectedGroceryList}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a grocery list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {groceryLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new" onSelect={() => setShowCreateNewList(true)}>
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create new list
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {showCreateNewList && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="New grocery list name..."
                          value={newGroceryListName}
                          onChange={(e) => setNewGroceryListName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              createNewGroceryList()
                            } else if (e.key === 'Escape') {
                              setShowCreateNewList(false)
                              setNewGroceryListName("")
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={createNewGroceryList} disabled={!newGroceryListName.trim()}>
                            Create
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setShowCreateNewList(false)
                            setNewGroceryListName("")
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={addRecipeToGroceryList}
                      disabled={!selectedGroceryList || addingToGroceryList}
                      className="w-full"
                    >
                      {addingToGroceryList ? (
                        "Adding..."
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add {recipe.ingredients.length} ingredients
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Create your first grocery list to add recipe ingredients
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Grocery list name..."
                        value={newGroceryListName}
                        onChange={(e) => setNewGroceryListName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            createNewGroceryList()
                          }
                        }}
                      />
                      <Button size="sm" onClick={createNewGroceryList} disabled={!newGroceryListName.trim()} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Create List
                      </Button>
                    </div>
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
                      className="w-full h-32 rounded-lg cursor-pointer hover:opacity-90 transition-opacity border"
                      onClick={() => handleImageClick(index)}
                      style={{ objectFit: 'contain' }}
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
