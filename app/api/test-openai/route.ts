import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not found" }, { status: 500 })
    }

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
            content: "Say 'OpenAI API is working!' in JSON format: {\"message\": \"your response\"}"
          }
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    return NextResponse.json({ 
      success: true,
      openai_response: content,
      api_key_present: !!process.env.OPENAI_API_KEY
    })

  } catch (error) {
    return NextResponse.json({ 
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

