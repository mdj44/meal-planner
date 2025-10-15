import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Test upload recipe request received")
    
    const formData = await request.formData()
    const url = formData.get("url") as string

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    console.log("Processing URL:", url)

    // Fetch and parse the webpage content
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecipeExtractor/1.0)',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Clean HTML content
      const cleanedContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Simple recipe extraction
      const titleMatch = cleanedContent.match(/([A-Z][^.!?]*Chicken[^.!?]*)/i);
      const timeMatch = cleanedContent.match(/(\d+)\s*minutes?/i);
      const servingsMatch = cleanedContent.match(/(\d+)\s*servings?/i);
      
      const recipe = {
        title: titleMatch ? titleMatch[1] : "Recipe from URL",
        prep_time: timeMatch ? parseInt(timeMatch[1]) : null,
        servings: servingsMatch ? parseInt(servingsMatch[1]) : null,
        description: `Recipe extracted from ${url}`,
        ingredients: [],
        instructions: [],
        source_url: url
      }
      
      return NextResponse.json({
        message: "Recipe processed successfully!",
        recipe: recipe,
        contentLength: cleanedContent.length,
        preview: cleanedContent.substring(0, 200) + "..."
      })
      
    } catch (error) {
      console.error("URL processing error:", error);
      return NextResponse.json({ 
        error: `Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Test upload error:", error)
    return NextResponse.json({ 
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
