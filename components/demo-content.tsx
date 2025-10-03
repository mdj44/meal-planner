"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ChefHat,
  ShoppingCart,
  MapPin,
  Users,
  Upload,
  Smartphone,
  Clock,
  Plus,
  Search,
  Wand2,
  ArrowLeft,
  CheckCircle,
  Circle,
  Loader2,
  Download,
} from "lucide-react"

// Mock data for demo
const mockRecipes = [
  {
    id: "1",
    title: "Classic Spaghetti Carbonara",
    description: "A creamy Italian pasta dish with eggs, cheese, and pancetta",
    prep_time: 15,
    cook_time: 20,
    servings: 4,
    ingredients: [
      "400g spaghetti",
      "200g pancetta",
      "4 large eggs",
      "100g pecorino cheese",
      "2 cloves garlic",
      "Black pepper",
      "Salt"
    ],
    instructions: [
      "Cook spaghetti according to package directions",
      "Fry pancetta until crispy",
      "Beat eggs with cheese and pepper",
      "Combine hot pasta with pancetta",
      "Add egg mixture and toss quickly"
    ],
    image_url: "/placeholder.jpg"
  },
  {
    id: "2", 
    title: "Chicken Tikka Masala",
    description: "Creamy Indian curry with tender chicken",
    prep_time: 30,
    cook_time: 45,
    servings: 6,
    ingredients: [
      "1kg chicken breast",
      "400ml coconut milk",
      "400g diced tomatoes",
      "2 onions",
      "4 cloves garlic",
      "2 tbsp garam masala",
      "1 tbsp turmeric",
      "Fresh cilantro"
    ],
    instructions: [
      "Marinate chicken with spices",
      "Sauté onions and garlic",
      "Add tomatoes and spices",
      "Simmer with coconut milk",
      "Garnish with cilantro"
    ],
    image_url: "/placeholder.jpg"
  }
]

const mockGroceryList = {
  id: "1",
  name: "Weekly Meal Prep",
  items: [
    { id: "1", name: "Spaghetti", category: "Pasta & Grains", is_completed: false, quantity: "400g" },
    { id: "2", name: "Pancetta", category: "Meat & Seafood", is_completed: true, quantity: "200g" },
    { id: "3", name: "Eggs", category: "Dairy & Eggs", is_completed: false, quantity: "1 dozen" },
    { id: "4", name: "Pecorino Cheese", category: "Dairy & Eggs", is_completed: false, quantity: "100g" },
    { id: "5", name: "Chicken Breast", category: "Meat & Seafood", is_completed: true, quantity: "1kg" },
    { id: "6", name: "Coconut Milk", category: "Canned Goods", is_completed: false, quantity: "400ml" },
    { id: "7", name: "Diced Tomatoes", category: "Canned Goods", is_completed: false, quantity: "400g" },
    { id: "8", name: "Onions", category: "Produce", is_completed: false, quantity: "2 large" },
    { id: "9", name: "Garlic", category: "Produce", is_completed: false, quantity: "6 cloves" },
    { id: "10", name: "Garam Masala", category: "Spices & Seasonings", is_completed: false, quantity: "2 tbsp" }
  ]
}

const mockStore = {
  id: "1",
  name: "Fresh Market Downtown",
  address: "123 Main St, Downtown",
  categories: [
    { name: "Produce", items: ["Onions", "Garlic", "Fresh Herbs"] },
    { name: "Dairy & Eggs", items: ["Eggs", "Cheese", "Milk"] },
    { name: "Meat & Seafood", items: ["Chicken", "Pancetta", "Fish"] },
    { name: "Pasta & Grains", items: ["Spaghetti", "Rice", "Bread"] },
    { name: "Canned Goods", items: ["Tomatoes", "Coconut Milk", "Beans"] },
    { name: "Spices & Seasonings", items: ["Garam Masala", "Salt", "Pepper"] }
  ]
}

export function DemoContent() {
  const [activeTab, setActiveTab] = useState("recipes")
  const [searchTerm, setSearchTerm] = useState("")
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [modifyDialogOpen, setModifyDialogOpen] = useState<string | null>(null)
  const [modifyPrompt, setModifyPrompt] = useState("")
  const [isModifying, setIsModifying] = useState(false)
  const [selectedStore, setSelectedStore] = useState(mockStore)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [jsonExport, setJsonExport] = useState<any>(null)

  const filteredRecipes = mockRecipes.filter((recipe) => 
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleModifyRecipe = async (recipeId: string) => {
    if (!modifyPrompt.trim()) return

    setIsModifying(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsModifying(false)
    setModifyDialogOpen(null)
    setModifyPrompt("")
    alert("Recipe modified successfully! (Demo mode)")
  }

  const toggleGroceryItem = (itemId: string) => {
    // In a real app, this would update the database
    console.log(`Toggled item ${itemId}`)
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

  const handleSubmit = async (formData: FormData) => {
    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const response = await fetch("/api/upload-recipe-demo", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload recipe")
      }

      setUploadSuccess(data.message || "Recipe uploaded and parsed successfully!")
      setJsonExport(data.json_export)

      const forms = document.querySelectorAll("form")
      forms.forEach((form) => form.reset())
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsUploading(false)
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Aisle Demo</h1>
              <p className="text-gray-600">Experience the full meal planning workflow</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Demo Mode
              </Badge>
              <Button asChild>
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: "recipes", label: "Recipes", icon: ChefHat },
              { id: "grocery-lists", label: "Grocery Lists", icon: ShoppingCart },
              { id: "store-maps", label: "Store Maps", icon: MapPin },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Recipes Tab */}
        {activeTab === "recipes" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recipe Collection</h2>
                <p className="text-gray-600">Upload, organize, and modify your recipes with AI</p>
              </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setShowUploadForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Recipe
              </Button>
            </div>
            </div>

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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <Card key={recipe.id} className="overflow-hidden">
                  {recipe.image_url && (
                    <div className="aspect-video bg-gray-200">
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.prep_time}m prep
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.cook_time}m cook
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {recipe.servings} servings
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{recipe.ingredients.length} ingredients</Badge>
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
                        <Button variant="outline" size="sm">
                          View Recipe
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Grocery Lists Tab */}
        {activeTab === "grocery-lists" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Smart Grocery Lists</h2>
              <p className="text-gray-600">AI-generated lists organized by store sections</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {mockGroceryList.name}
                  <Badge variant="secondary">
                    {mockGroceryList.items.filter(item => item.is_completed).length} / {mockGroceryList.items.length} completed
                  </Badge>
                </CardTitle>
                <CardDescription>Generated from your selected recipes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    mockGroceryList.items.reduce((acc, item) => {
                      if (!acc[item.category]) acc[item.category] = []
                      acc[item.category].push(item)
                      return acc
                    }, {} as Record<string, typeof mockGroceryList.items>)
                  ).map(([category, items]) => (
                    <div key={category} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-green-600">{category}</h4>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <button
                              onClick={() => toggleGroceryItem(item.id)}
                              className="flex-shrink-0"
                            >
                              {item.is_completed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            <span className={`flex-1 ${item.is_completed ? 'line-through text-gray-500' : ''}`}>
                              {item.name}
                            </span>
                            <span className="text-sm text-gray-500">{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Store Maps Tab */}
        {activeTab === "store-maps" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Navigation</h2>
              <p className="text-gray-600">Find items quickly with crowdsourced store maps</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Store Layout</CardTitle>
                  <CardDescription>{selectedStore.name} - {selectedStore.address}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedStore.categories.map((category, index) => (
                      <div key={category.name} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{category.name}</h4>
                          <p className="text-sm text-gray-500">
                            {category.items.join(", ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Shopping Route</CardTitle>
                  <CardDescription>Optimized path through the store</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        1
                      </div>
                      <span className="font-medium">Produce</span>
                      <Badge variant="outline">Onions, Garlic</Badge>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        2
                      </div>
                      <span className="font-medium">Dairy & Eggs</span>
                      <Badge variant="outline">Eggs, Cheese</Badge>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        3
                      </div>
                      <span className="font-medium">Meat & Seafood</span>
                      <Badge variant="outline">Chicken, Pancetta</Badge>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        4
                      </div>
                      <span className="font-medium">Canned Goods</span>
                      <Badge variant="outline">Tomatoes, Coconut Milk</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

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
                <div className="space-y-6">
                  {/* File Upload */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Upload Recipe Image</h4>
                    <form onSubmit={handleFileUpload} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="file">Recipe File</Label>
                        <Input 
                          id="file" 
                          name="file" 
                          type="file" 
                          accept="image/*,.pdf,.txt" 
                          required 
                          disabled={isUploading} 
                        />
                        <p className="text-sm text-muted-foreground">Supports images (JPG, PNG), PDFs, and text files</p>
                      </div>
                      <Button type="submit" disabled={isUploading} className="w-full">
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Upload & Parse Recipe"
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* URL Upload */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Or Paste Recipe URL</h4>
                    <form onSubmit={handleUrlUpload} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="url">Recipe URL</Label>
                        <Input
                          id="url"
                          name="url"
                          type="url"
                          placeholder="https://example.com/recipe"
                          disabled={isUploading}
                        />
                        <p className="text-sm text-muted-foreground">Enter a URL to a recipe page</p>
                      </div>
                      <Button type="submit" disabled={isUploading} className="w-full">
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Parse Recipe from URL"
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* Text Upload */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Or Paste Recipe Text</h4>
                    <form onSubmit={handleTextUpload} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="text">Recipe Text</Label>
                        <Textarea
                          id="text"
                          name="text"
                          placeholder="Paste your recipe text here..."
                          rows={4}
                          disabled={isUploading}
                        />
                        <p className="text-sm text-muted-foreground">
                          Paste the full recipe text including ingredients and instructions
                        </p>
                      </div>
                      <Button type="submit" disabled={isUploading} className="w-full">
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Parse Recipe Text"
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* Error Display */}
                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{uploadError}</p>
                    </div>
                  )}

                  {/* Success Display */}
                  {uploadSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700">{uploadSuccess}</p>
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
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
