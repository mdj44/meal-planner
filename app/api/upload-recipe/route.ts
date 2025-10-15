import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Simple rate limiting - track last request time
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 2000 // 2 seconds between requests

// Extract recipe data from cleaned text content
function extractRecipeFromText(text: string): any {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let title = 'Recipe from URL';
  let description = '';
  let ingredients: any[] = [];
  let instructions: any[] = [];
  let prep_time: number | null = null;
  let cook_time: number | null = null;
  let servings: number | null = null;
  
  // Extract title (look for common patterns)
  for (const line of lines) {
    if (line.length > 10 && line.length < 100 && 
        !line.toLowerCase().includes('ingredient') && 
        !line.toLowerCase().includes('instruction') &&
        !line.toLowerCase().includes('prep') &&
        !line.toLowerCase().includes('cook')) {
      title = line;
      break;
    }
  }
  
  // Extract ingredients
  let inIngredients = false;
  let inInstructions = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('ingredient') && !inInstructions) {
      inIngredients = true;
      inInstructions = false;
      continue;
    }
    
    if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('step')) {
      inInstructions = true;
      inIngredients = false;
      continue;
    }
    
    if (inIngredients && line.length > 0) {
      // Parse ingredient line
      const match = line.match(/^(\d+(?:\/\d+)?\s*(?:cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|pieces?|slices?)?\s*)?(.+)$/i);
      if (match) {
        const quantity = match[1]?.trim() || '1';
        const name = match[2].trim();
        ingredients.push({
          name: name,
          quantity: quantity,
          unit: ''
        });
      }
    }
    
    if (inInstructions && line.length > 0) {
      // Parse instruction line
      const stepMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (stepMatch) {
        instructions.push({
          step: parseInt(stepMatch[1]),
          instruction: stepMatch[2].trim()
        });
      } else if (line.length > 10) {
        instructions.push({
          step: instructions.length + 1,
          instruction: line
        });
      }
    }
    
    // Extract timing information
    const timeMatch = line.match(/(\d+)\s*(?:min|minutes?|hr|hour|hours?)/i);
    if (timeMatch) {
      const time = parseInt(timeMatch[1]);
      if (lowerLine.includes('prep')) {
        prep_time = time;
      } else if (lowerLine.includes('cook') || lowerLine.includes('bake')) {
        cook_time = time;
      }
    }
    
    // Extract servings
    const servingsMatch = line.match(/(\d+)\s*(?:serving|people|portions?)/i);
    if (servingsMatch) {
      servings = parseInt(servingsMatch[1]);
    }
  }
  
  return {
    title,
    description,
    ingredients,
    instructions,
    prep_time,
    cook_time,
    servings
  };
}

// Check if image is too large and provide helpful error (fallback for non-compressed images)
function checkImageSize(dataUrl: string): { isValid: boolean; message?: string } {
  // Rough estimate: 1MB = ~1.3 million characters in base64
  const sizeInMB = dataUrl.length / (1.3 * 1024 * 1024)
  
  if (sizeInMB > 10) { // Increased limit since client-side compression should handle most cases
    return {
      isValid: false,
      message: `Image is too large (${sizeInMB.toFixed(1)}MB). Please use a smaller image or try again.`
    }
  }
  
  return { isValid: true }
}

// Combine results from multiple pages into a single recipe
function combineMultiPageResults(imageResults: Array<{page: number, result: any}>): any {
  const validResults = imageResults.filter(r => !r.result.error && r.result.title !== "Unable to extract recipe")
  
  if (validResults.length === 0) {
    return {
      title: "Multi-page Recipe - Processing Failed",
      description: "Could not extract recipe information from any page",
      ingredients: [],
      instructions: [],
      prep_time: null,
      cook_time: null,
      servings: null,
      cuisine: "unknown",
      difficulty: "unknown"
    }
  }
  
  // Use the first valid result as the base
  const baseResult = validResults[0].result
  
  // Combine all ingredients (remove duplicates)
  const allIngredients = new Map()
  validResults.forEach(({result}) => {
    if (result.ingredients && Array.isArray(result.ingredients)) {
      result.ingredients.forEach((ingredient: any) => {
        const key = ingredient.name?.toLowerCase() || ingredient
        if (!allIngredients.has(key)) {
          allIngredients.set(key, ingredient)
        }
      })
    }
  })
  
  // Combine all instructions (keep page order)
  const allInstructions: any[] = []
  validResults.forEach(({page, result}) => {
    if (result.instructions && Array.isArray(result.instructions)) {
      result.instructions.forEach((instruction: any, index: number) => {
        allInstructions.push({
          step: allInstructions.length + 1,
          instruction: `Page ${page}, Step ${index + 1}: ${instruction.instruction || instruction}`
        })
      })
    }
  })
  
  return {
    title: baseResult.title || "Multi-page Recipe",
    description: `Combined recipe from ${validResults.length} pages. ${baseResult.description || ""}`,
    ingredients: Array.from(allIngredients.values()),
    instructions: allInstructions,
    prep_time: baseResult.prep_time,
    cook_time: baseResult.cook_time,
    servings: baseResult.servings,
    cuisine: baseResult.cuisine || "unknown",
    difficulty: baseResult.difficulty || "unknown"
  }
}

// Simple function to call OpenAI directly
async function extractRecipeWithOpenAI(content: string, isImage: boolean = false) {
  try {
    // Rate limiting - wait if we made a request too recently
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    lastRequestTime = Date.now()
    let messages: any[] = []

    if (isImage) {
      // For images, we need to use vision capabilities
      messages = [
        {
          role: "system",
          content: "You are a recipe extraction assistant. Analyze the image and extract recipe information. Return ONLY valid JSON with this structure: {\"title\": \"Recipe Name\", \"description\": \"Brief description\", \"ingredients\": [{\"name\": \"ingredient\", \"quantity\": \"amount\", \"unit\": \"unit\"}], \"instructions\": [{\"step\": 1, \"instruction\": \"Step description\"}], \"prep_time\": 15, \"cook_time\": 30, \"servings\": 4, \"cuisine\": \"type\", \"difficulty\": \"easy/medium/hard\"}. If you cannot read the recipe clearly, return: {\"title\": \"Unable to extract recipe\", \"ingredients\": [], \"instructions\": []}"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract the recipe information from this image and return it as JSON:"
            },
            {
              type: "image_url",
              image_url: {
                url: content // content should be a data URL for images
              }
            }
          ]
        }
      ]
    } else {
      // For text content
      messages = [
        {
          role: "system",
          content: "You are a recipe extraction assistant. Extract recipe information and return ONLY valid JSON with the following structure: {\"title\": \"Recipe Name\", \"description\": \"Brief description\", \"ingredients\": [{\"name\": \"ingredient\", \"quantity\": \"amount\", \"unit\": \"unit\"}], \"instructions\": [{\"step\": 1, \"instruction\": \"Step description\"}], \"prep_time\": 15, \"cook_time\": 30, \"servings\": 4, \"cuisine\": \"type\", \"difficulty\": \"easy/medium/hard\"}"
        },
        {
          role: "user",
          content: `Extract recipe information from this content: ${content}`
        }
      ]
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isImage ? "gpt-4o-mini" : "gpt-4o-mini",
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again, or check your OpenAI API usage limits.")
      } else if (response.status === 401) {
        throw new Error("Invalid OpenAI API key. Please check your API key configuration.")
      } else if (response.status === 400) {
        throw new Error(`Invalid request to OpenAI: ${errorData.error?.message || 'Bad request'}`)
      } else {
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`)
      }
    }

    const data = await response.json()
    let content_text = data.choices[0]?.message?.content
    
    if (!content_text) {
      throw new Error("No content returned from OpenAI")
    }

    // Clean up the response - remove markdown code blocks if present
    content_text = content_text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Try to parse as JSON
    try {
      return JSON.parse(content_text)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Raw content:", content_text)
      
      // If JSON parsing fails, return a fallback response
      return {
        title: "Unable to extract recipe",
        description: "The AI could not extract recipe information from this content",
        ingredients: [],
        instructions: [],
        prep_time: null,
        cook_time: null,
        servings: null,
        error_details: content_text
      }
    }
    } catch (error) {
      console.error("OpenAI extraction error:", error)
      
      // If it's a token limit error, provide a helpful message
      if (error instanceof Error && error.message.includes("maximum context length")) {
        throw new Error("Image is too large for processing. Please try a smaller image or use text input instead.")
      }
      
      throw error
    }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Upload recipe request received")
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    console.log("Authorization header:", authHeader ? "Present" : "Missing")
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No valid authorization header found")
      return NextResponse.json({ error: "No authorization token provided" }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log("Token received:", token.substring(0, 20) + "...")

    // Create a Supabase client with the JWT token for database operations
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )
    
    // Verify the JWT token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    
    console.log("Auth check - User:", user ? "Found" : "Not found", "Error:", authError?.message || "None")
    
    if (authError || !user) {
      console.log("Authentication failed:", authError?.message)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const url = formData.get("url") as string
    const text = formData.get("text") as string
    const fileCount = parseInt(formData.get("file_count") as string || "0")

    let content = ""
    let imageUrl = ""
    let imageUrls: string[] = []

    // Handle different input types
    // Check for multiple files first
    if (fileCount > 0) {
      const files: File[] = []
      for (let i = 0; i < fileCount; i++) {
        const multiFile = formData.get(`file_${i}`) as File
        if (multiFile) files.push(multiFile)
      }

      if (files.length === 0) {
        return NextResponse.json({ error: "No valid files found" }, { status: 400 })
      }

      // Process multiple files
      const fileContents: string[] = []
      for (const [index, currentFile] of files.entries()) {
        if (!currentFile.type.startsWith("image/")) {
          return NextResponse.json({ error: `File ${index + 1} must be an image` }, { status: 400 })
        }

        // Upload file to Supabase storage
        const fileExt = currentFile.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}_${index}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("recipe-uploads")
          .upload(fileName, currentFile)

        if (uploadError) {
          console.error("Storage upload error:", uploadError)
          return NextResponse.json(
            {
              error: `Failed to upload file ${index + 1}. Please make sure the storage bucket is properly configured.`,
            },
            { status: 500 },
          )
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("recipe-uploads").getPublicUrl(fileName)

        imageUrls.push(publicUrl)

        // Convert to base64 for OpenAI
        const bytes = await currentFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')
        const dataUrl = `data:${currentFile.type};base64,${base64Image}`
        
        // Check image size
        const sizeCheck = checkImageSize(dataUrl)
        if (!sizeCheck.isValid) {
          return NextResponse.json({ error: sizeCheck.message }, { status: 400 })
        }
        
        fileContents.push(dataUrl)
      }

      // For multiple images, process them all and combine results
      if (fileContents.length > 1) {
        console.log(`Processing ${fileContents.length} images for multi-page recipe...`)
        
        // Process each image separately
        const imageResults = []
        for (let i = 0; i < fileContents.length; i++) {
          console.log(`Processing image ${i + 1} of ${fileContents.length}...`)
          try {
            const result = await extractRecipeWithOpenAI(fileContents[i], true)
            imageResults.push({
              page: i + 1,
              result: result
            })
          } catch (error) {
            console.error(`Error processing image ${i + 1}:`, error)
            imageResults.push({
              page: i + 1,
              result: {
                title: `Page ${i + 1} - Processing Error`,
                description: "Could not extract recipe from this page",
                ingredients: [],
                instructions: [],
                error: error instanceof Error ? error.message : "Unknown error"
              }
            })
          }
        }
        
        // Combine all results into a single recipe
        const combinedRecipe = combineMultiPageResults(imageResults)
        
        // Save the combined recipe
        const { data: recipe, error: recipeError } = await supabase
          .from("recipes")
          .insert({
            user_id: user.id,
            title: combinedRecipe.title,
            description: combinedRecipe.description,
            ingredients: combinedRecipe.ingredients,
            instructions: combinedRecipe.instructions,
            prep_time: combinedRecipe.prep_time,
            cook_time: combinedRecipe.cook_time,
            servings: combinedRecipe.servings,
            image_url: imageUrls[0], // Use first image as primary
            image_urls: imageUrls, // Store all image URLs
            source_url: null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (recipeError) {
          console.error("Recipe save error:", recipeError)
          return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 })
        }

        return NextResponse.json({
          message: `Successfully processed ${fileContents.length}-page recipe!`,
          recipe: recipe,
          json_export: combinedRecipe,
          pages_processed: fileContents.length
        })
      } else {
        // Single image - use existing logic
        content = fileContents[0]
        imageUrl = imageUrls[0]
      }
    } else if (file) {
      // Upload file to Supabase storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("recipe-uploads")
        .upload(fileName, file)

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        return NextResponse.json(
          {
            error: "Failed to upload file. Please make sure the storage bucket is properly configured.",
          },
          { status: 500 },
        )
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-uploads").getPublicUrl(fileName)

      imageUrl = publicUrl

      // For images, convert to base64 for vision model
      if (file.type.startsWith("image/")) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')
        const dataUrl = `data:${file.type};base64,${base64Image}`
        
        // Check image size
        const sizeCheck = checkImageSize(dataUrl)
        if (!sizeCheck.isValid) {
          return NextResponse.json({ error: sizeCheck.message }, { status: 400 })
        }
        
        content = dataUrl
      } else {
        // For other text files, convert to text first
        content = await file.text()
      }
    } else if (url) {
      // Fetch and parse the webpage content
      try {
        console.log("Fetching URL:", url);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RecipeExtractor/1.0)',
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        
        console.log("Response status:", response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log("HTML length:", html.length);
        
        // For Mealime, look for embedded JSON data in script tags
        let recipeJsonData = null;
        
        // Look for common patterns where recipe data might be embedded
        const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
        console.log(`Found ${scriptMatches.length} script tags`);
        
        // Enhanced search for Mealime-specific patterns
        for (const script of scriptMatches) {
          // Look for various JSON patterns that might contain recipe data
          const patterns = [
            // Standard recipe patterns
            /\{[\s\S]*"ingredients"[\s\S]*\}/gi,
            /\{[\s\S]*"instructions"[\s\S]*\}/gi,
            /\{[\s\S]*"recipe"[\s\S]*\}/gi,
            // Mealime-specific patterns
            /\{[\s\S]*"steps"[\s\S]*\}/gi,
            /\{[\s\S]*"ingredient_list"[\s\S]*\}/gi,
            /\{[\s\S]*"instruction_list"[\s\S]*\}/gi,
            // Look for any large JSON objects that might contain recipe data
            /\{[\s\S]{100,}[\s\S]*\}/gi
          ];
          
          for (const pattern of patterns) {
            const jsonMatches = script.match(pattern);
            if (jsonMatches) {
              for (const jsonMatch of jsonMatches) {
                try {
                  const parsed = JSON.parse(jsonMatch);
                  console.log("Found JSON with keys:", Object.keys(parsed));
                  
                  // Check if this looks like recipe data
                  if (parsed.ingredients || parsed.instructions || parsed.recipe || 
                      parsed.steps || parsed.ingredient_list || parsed.instruction_list ||
                      (parsed.name && (parsed.description || parsed.ingredients))) {
                    recipeJsonData = parsed;
                    console.log("Using this JSON as recipe data:", recipeJsonData);
                    break;
                  }
                } catch (e) {
                  // Not valid JSON, continue
                }
              }
              if (recipeJsonData) break;
            }
          }
          if (recipeJsonData) break;
        }
        
        // Also look for data attributes or other embedded data
        const dataMatches = html.match(/data-[^=]*="[^"]*recipe[^"]*"/gi) || [];
        console.log(`Found ${dataMatches.length} data attributes with 'recipe'`);
        
        // Look for Next.js __NEXT_DATA__ script tag
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (nextDataMatch) {
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            console.log("Found Next.js data with keys:", Object.keys(nextData));
            
            // Navigate to the recipe data
            if (nextData.props?.pageProps?.publishedRecipe) {
              recipeJsonData = nextData.props.pageProps.publishedRecipe;
              console.log("Using Next.js recipe data:", recipeJsonData);
            }
          } catch (e) {
            console.log("Could not parse Next.js data:", e.message);
          }
        }
        
        // Look for window.__INITIAL_STATE__ or similar patterns
        const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
        if (initialStateMatch && !recipeJsonData) {
          try {
            const initialState = JSON.parse(initialStateMatch[1]);
            console.log("Found initial state with keys:", Object.keys(initialState));
            if (initialState.recipe || initialState.recipes) {
              recipeJsonData = initialState.recipe || initialState.recipes[0];
              console.log("Using initial state as recipe data:", recipeJsonData);
            }
          } catch (e) {
            console.log("Could not parse initial state");
          }
        }
        
        // Clean HTML content for fallback
        const cleanedContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log("Cleaned content length:", cleanedContent.length);
        console.log("Cleaned content preview:", cleanedContent.substring(0, 200) + "...");
        
        let recipeData;
        
        if (recipeJsonData) {
          console.log("Using embedded JSON data for recipe extraction");
          
          // Helper function to parse ingredients from various formats
          const parseIngredients = (ingredients) => {
            if (!ingredients) return [];
            if (Array.isArray(ingredients)) {
              return ingredients.map(ing => {
                if (typeof ing === 'string') {
                  // Parse string ingredient like "2 cups flour"
                  const match = ing.match(/^(\d+(?:\/\d+)?\s*(?:cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|pieces?|slices?)?\s*)?(.+)$/i);
                  return {
                    name: match ? match[2].trim() : ing,
                    quantity: match ? match[1]?.trim() || '1' : '1',
                    unit: ''
                  };
                }
                // Handle Mealime line_items format
                if (ing.ingredient_name && ing.quantity) {
                  return {
                    name: ing.ingredient_name,
                    quantity: ing.quantity,
                    unit: ''
                  };
                }
                return {
                  name: ing.name || ing.ingredient || ing.ingredient_name || ing,
                  quantity: ing.quantity || ing.amount || '1',
                  unit: ing.unit || ''
                };
              });
            }
            return [];
          };
          
          // Helper function to parse instructions from various formats
          const parseInstructions = (instructions) => {
            if (!instructions) return [];
            if (Array.isArray(instructions)) {
              return instructions.map((inst, index) => {
                if (typeof inst === 'string') {
                  return {
                    step: index + 1,
                    instruction: inst
                  };
                }
                // Handle Mealime instruction format
                if (inst.primary_message) {
                  return {
                    step: index + 1,
                    instruction: inst.primary_message + (inst.secondary_message ? ` (${inst.secondary_message})` : '')
                  };
                }
                return {
                  step: inst.step || inst.id || index + 1,
                  instruction: inst.instruction || inst.step_text || inst.text || inst.primary_message || inst
                };
              });
            }
            return [];
          };
          
          // Parse the JSON data into our recipe format
          recipeData = {
            title: recipeJsonData.title || recipeJsonData.name || recipeJsonData.recipe_name || 'Recipe from URL',
            description: recipeJsonData.description || recipeJsonData.summary || `Recipe extracted from ${url}`,
            ingredients: parseIngredients(recipeJsonData.ingredients || recipeJsonData.ingredient_list || recipeJsonData.ingredientList || recipeJsonData.line_items),
            instructions: parseInstructions(recipeJsonData.instructions || recipeJsonData.steps || recipeJsonData.instruction_list || recipeJsonData.instructionList),
            prep_time: recipeJsonData.prep_time || recipeJsonData.prepTime || recipeJsonData.prep_time_minutes || null,
            cook_time: recipeJsonData.cook_time || recipeJsonData.cookTime || recipeJsonData.cook_time_minutes || recipeJsonData.cooking_minutes || null,
            servings: recipeJsonData.servings || recipeJsonData.serving_size || recipeJsonData.serves || recipeJsonData.serving_count || null,
            image_url: recipeJsonData.thumbnail_image_url || recipeJsonData.presentation_image_url || recipeJsonData.image_url || recipeJsonData.image || null,
          };
          console.log("JSON extracted recipe data:", recipeData);
        } else {
          console.log("No JSON data found, using AI to extract recipe from HTML content...");
          recipeData = await extractRecipeWithOpenAI(cleanedContent, false);
          console.log("AI extracted recipe data:", recipeData);
        }
        
        // Save recipe directly to database
        const recipeToInsert = {
          user_id: user.id,
          title: recipeData.title || 'Recipe from URL',
          description: recipeData.description || `Recipe extracted from ${url}`,
          ingredients: recipeData.ingredients || [],
          instructions: recipeData.instructions || [],
          prep_time: recipeData.prep_time,
          cook_time: recipeData.cook_time,
          servings: recipeData.servings,
          image_url: recipeData.image_url || null,
          source_url: url,
          raw_content: cleanedContent.substring(0, 10000), // Store first 10k chars of HTML
        };
        
        console.log("Inserting recipe:", JSON.stringify(recipeToInsert, null, 2));
        console.log("User ID being used:", user.id);
        
        // Try inserting with explicit user ID to bypass RLS issues
        const { data: recipe, error: dbError } = await supabase
          .from("recipes")
          .insert({
            ...recipeToInsert,
            user_id: user.id // Ensure we're using the verified user ID
          })
          .select()
          .single()

        if (dbError) {
          console.error("Database error details:", {
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            code: dbError.code
          })
          return NextResponse.json({ 
            error: "Failed to save recipe",
            details: dbError.message,
            code: dbError.code,
            hint: dbError.hint,
            debug: {
              user_id: user.id,
              recipe_data: recipeToInsert
            }
          }, { status: 500 })
        }

        return NextResponse.json({
          message: "Recipe URL processed successfully!",
          recipe: recipe,
        })
        
      } catch (error) {
        console.error("URL processing error:", error);
        return NextResponse.json({ 
          error: `Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
      }
    } else if (text) {
      content = text
    } else {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    // Parse recipe using OpenAI
    const isImage = file && file.type.startsWith("image/")
    const parsedRecipe = await extractRecipeWithOpenAI(content, isImage)

    // Save recipe to database
    const { data: recipe, error: dbError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        title: parsedRecipe.title,
        description: parsedRecipe.description || "",
        ingredients: parsedRecipe.ingredients,
        instructions: parsedRecipe.instructions,
        prep_time: parsedRecipe.prep_time,
        cook_time: parsedRecipe.cook_time,
        servings: parsedRecipe.servings,
        image_url: imageUrl,
        source_url: url || null,
        raw_content: content
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 })
    }

    // Generate JSON export in your preferred format
    const jsonExport = {
      id: `r${String(recipe.id).padStart(3, '0')}`,
      name: recipe.title,
      ingredients: recipe.ingredients.map((ing: any) => 
        `${ing.quantity || '1'} ${ing.unit || ''} ${ing.name}`.trim()
      ),
      instructions: recipe.instructions.map((inst: any) => inst.instruction),
      modifications: {
        // Placeholder for future modifications
        "default": "No modifications"
      },
      metadata: {
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
        description: recipe.description,
        image_url: recipe.image_url,
        source_url: recipe.source_url,
        created_at: new Date().toISOString()
      }
    }

    return NextResponse.json({ 
      recipe,
      json_export: jsonExport,
      message: "Recipe uploaded and parsed successfully! JSON export available."
    })
  } catch (error) {
    console.error("Recipe upload error:", error)
    return NextResponse.json({ 
      error: "Failed to process recipe",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
