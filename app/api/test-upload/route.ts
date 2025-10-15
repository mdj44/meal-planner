import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const url = formData.get("url") as string

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    console.log("Testing URL fetch:", url)

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
      
      return NextResponse.json({
        message: "URL fetched successfully",
        contentLength: cleanedContent.length,
        preview: cleanedContent.substring(0, 500) + "...",
        url: url
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
