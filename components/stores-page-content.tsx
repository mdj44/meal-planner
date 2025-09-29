"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { StoreSelector } from "@/components/store-selector"
import { StoreMap } from "@/components/store-map"
import type { Store } from "@/lib/types"

export function StoresPageContent() {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Store Maps</h1>
            <p className="text-gray-600">Navigate stores efficiently with crowdsourced item locations</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        <StoreSelector onStoreSelected={setSelectedStore} selectedStore={selectedStore} />
        {selectedStore && <StoreMap store={selectedStore} />}
      </main>
    </div>
  )
}
