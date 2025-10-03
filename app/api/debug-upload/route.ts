import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== DEBUG UPLOAD START ===")
    
    const supabase = await createClient()
    console.log("Supabase client created")

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    console.log("Auth check:", { user: !!user, authError })
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    console.log("Form data keys:", Array.from(formData.keys()))
    
    const file = formData.get("file") as File
    const url = formData.get("url") as string
    const text = formData.get("text") as string

    console.log("Input data:", { 
      hasFile: !!file, 
      hasUrl: !!url, 
      hasText: !!text,
      textLength: text?.length 
    })

    let content = ""

    if (file) {
      console.log("Processing file:", file.name, file.type, file.size)
      if (file.type.startsWith("image/")) {
        content = `[IMAGE FILE: ${file.name}]`
      } else {
        content = await file.text()
        console.log("File content length:", content.length)
      }
    } else if (url) {
      content = `URL: ${url}`
    } else if (text) {
      content = text
    } else {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    console.log("Content to process:", content.substring(0, 100) + "...")

    // Test OpenAI call
    console.log("Testing OpenAI API...")
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Return a simple JSON: {\"title\": \"Test Recipe\", \"ingredients\": [{\"name\": \"test\", \"quantity\": \"1\", \"unit\": \"cup\"}], \"instructions\": [{\"step\": 1, \"instruction\": \"Test step\"}]}"
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    console.log("OpenAI response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("OpenAI error:", errorText)
      return NextResponse.json({ 
        error: "OpenAI API failed",
        details: `Status: ${response.status}, Error: ${errorText}`
      }, { status: 500 })
    }

    const aiData = await response.json()
    console.log("OpenAI success:", aiData.choices[0]?.message?.content)

    return NextResponse.json({ 
      success: true,
      message: "Debug test completed successfully",
      user_id: user.id,
      content_length: content.length,
      openai_response: aiData.choices[0]?.message?.content
    })

  } catch (error) {
    console.error("=== DEBUG ERROR ===", error)
    return NextResponse.json({ 
      error: "Debug test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

