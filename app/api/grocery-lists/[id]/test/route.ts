import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Test route - Received params:', params)
  return NextResponse.json({ 
    message: "Test route working", 
    receivedId: params?.id,
    params: params 
  })
}
