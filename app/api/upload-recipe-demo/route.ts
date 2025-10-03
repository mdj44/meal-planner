import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const url = formData.get("url") as string
    const text = formData.get("text") as string

    // For demo purposes, we'll create mock recipe data based on input
    let recipeTitle = "Demo Recipe"
    let ingredients = ["1 cup flour", "1/2 cup sugar", "2 eggs"]
    let instructions = ["Mix ingredients", "Bake at 350°F for 20 minutes", "Let cool"]
    let description = "A delicious demo recipe"
    let prepTime = 15
    let cookTime = 20
    let servings = 4

    // Simple text parsing for demo
    if (text) {
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length > 0) {
        recipeTitle = lines[0].replace(/[:\-]/g, '').trim()
        
        // Look for ingredients (lines with measurements or common ingredient words)
        const ingredientKeywords = ['cup', 'tsp', 'tbsp', 'oz', 'lb', 'g', 'ml', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'cheese', 'meat', 'chicken', 'beef', 'fish', 'vegetable', 'onion', 'garlic', 'tomato', 'carrot', 'potato']
        ingredients = lines.filter(line => 
          ingredientKeywords.some(keyword => line.toLowerCase().includes(keyword))
        ).slice(0, 8) // Limit to 8 ingredients for demo
        
        // Look for instructions (lines with action words)
        const actionKeywords = ['mix', 'bake', 'cook', 'fry', 'boil', 'simmer', 'add', 'stir', 'heat', 'preheat', 'chop', 'slice', 'dice', 'blend', 'whisk', 'beat', 'fold', 'knead', 'roll', 'cut', 'serve']
        instructions = lines.filter(line => 
          actionKeywords.some(keyword => line.toLowerCase().includes(keyword))
        ).slice(0, 6) // Limit to 6 instructions for demo
      }
    } else if (file) {
      recipeTitle = `Uploaded ${file.name.replace(/\.[^/.]+$/, "")}`
      description = `Recipe extracted from ${file.name}`
    } else if (url) {
      recipeTitle = "Recipe from URL"
      description = `Recipe extracted from ${url}`
    }

    // Generate mock recipe data
    const parsedRecipe = {
      title: recipeTitle,
      description: description,
      ingredients: ingredients.map((ing, index) => ({
        name: ing,
        quantity: "1",
        unit: "cup"
      })),
      instructions: instructions.map((inst, index) => ({
        step: index + 1,
        instruction: inst
      })),
      prep_time: prepTime,
      cook_time: cookTime,
      servings: servings
    }

    // Generate JSON export in your preferred format
    const jsonExport = {
      id: `r${String(Date.now()).slice(-3)}`,
      name: parsedRecipe.title,
      ingredients: parsedRecipe.ingredients.map(ing => 
        `${ing.quantity || '1'} ${ing.unit || ''} ${ing.name}`.trim()
      ),
      instructions: parsedRecipe.instructions.map(inst => inst.instruction),
      modifications: {
        "default": "No modifications"
      },
      metadata: {
        prep_time: parsedRecipe.prep_time,
        cook_time: parsedRecipe.cook_time,
        servings: parsedRecipe.servings,
        description: parsedRecipe.description,
        image_url: file ? URL.createObjectURL(file) : null,
        source_url: url || null,
        created_at: new Date().toISOString()
      }
    }

    return NextResponse.json({ 
      recipe: parsedRecipe,
      json_export: jsonExport,
      message: "Recipe uploaded and parsed successfully! (Demo Mode - Data not saved to database)"
    })

  } catch (error) {
    console.error("Recipe upload error:", error)
    return NextResponse.json({ 
      error: "Failed to process recipe",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
