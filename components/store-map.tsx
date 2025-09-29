"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MapPin, Plus, Users } from "lucide-react"
import type { Store, ItemLocation } from "@/lib/types"

interface StoreMapProps {
  store: Store
  groceryItems?: Array<{ name: string; category?: string }>
}

export function StoreMap({ store, groceryItems = [] }: StoreMapProps) {
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([])
  const [selectedItem, setSelectedItem] = useState<string>("")
  const [isTagging, setIsTagging] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchItemLocations()
  }, [store.id])

  const fetchItemLocations = async () => {
    try {
      const response = await fetch(`/api/stores/${store.id}/items`)
      const data = await response.json()
      if (response.ok) {
        setItemLocations(data.itemLocations)
      }
    } catch (error) {
      console.error("Failed to fetch item locations:", error)
    }
  }

  const handleMapClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isTagging || !selectedItem) return

    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    try {
      const response = await fetch("/api/tag-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          itemName: selectedItem,
          positionX: x,
          positionY: y,
        }),
      })

      if (response.ok) {
        await fetchItemLocations()
        setIsTagging(false)
        setSelectedItem("")
      }
    } catch (error) {
      console.error("Failed to tag location:", error)
    }
  }

  const filteredLocations = itemLocations.filter((location) =>
    location.item_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const availableItems = groceryItems.filter(
    (item) => !itemLocations.some((loc) => loc.item_name.toLowerCase() === item.name.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {store.name} Store Map
          </CardTitle>
          <CardDescription>
            {store.address && <span>{store.address} • </span>}
            Click on the map to tag item locations and help other shoppers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Tag Item Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tag Item Location</DialogTitle>
                  <DialogDescription>
                    Select an item from your grocery list to tag its location on the store map
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item to tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableItems.map((item) => (
                        <SelectItem key={item.name} value={item.name}>
                          {item.name}
                          {item.category && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setIsTagging(true)
                    }}
                    disabled={!selectedItem}
                    className="w-full"
                  >
                    Start Tagging - Click on Map
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Store Map */}
          <div
            ref={mapRef}
            className={`relative w-full h-96 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden ${
              isTagging ? "cursor-crosshair" : "cursor-default"
            }`}
            onClick={handleMapClick}
          >
            {/* Store Layout Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
              {/* Simulated store aisles */}
              <div className="absolute top-4 left-4 right-4 h-8 bg-gray-200 rounded opacity-50"></div>
              <div className="absolute top-16 left-4 right-4 h-8 bg-gray-200 rounded opacity-50"></div>
              <div className="absolute top-28 left-4 right-4 h-8 bg-gray-200 rounded opacity-50"></div>
              <div className="absolute top-40 left-4 right-4 h-8 bg-gray-200 rounded opacity-50"></div>
              <div className="absolute bottom-16 left-4 right-4 h-8 bg-gray-200 rounded opacity-50"></div>
              <div className="absolute bottom-4 left-4 right-4 h-8 bg-gray-200 rounded opacity-50"></div>
            </div>

            {/* Item Location Pins */}
            {filteredLocations.map((location) => (
              <div
                key={location.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: `${location.position_x}%`,
                  top: `${location.position_y}%`,
                }}
              >
                <div className="relative group">
                  <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-white" />
                  </div>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {location.item_name}
                    {location.confidence_score > 1 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="h-2 w-2" />
                        <span>{location.confidence_score}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Tagging Instructions */}
            {isTagging && (
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                <div className="bg-white p-4 rounded-lg shadow-lg text-center">
                  <h3 className="font-medium mb-2">Tagging: {selectedItem}</h3>
                  <p className="text-sm text-muted-foreground">Click anywhere on the map to tag this item's location</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsTagging(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Item Locations List */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Tagged Items ({filteredLocations.length})</h4>
            <div className="grid gap-2 max-h-32 overflow-y-auto">
              {filteredLocations.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{location.item_name}</span>
                    {location.category && (
                      <Badge variant="outline" className="text-xs">
                        {location.category}
                      </Badge>
                    )}
                    {location.aisle && (
                      <Badge variant="secondary" className="text-xs">
                        {location.aisle}
                      </Badge>
                    )}
                  </div>
                  {location.confidence_score > 1 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{location.confidence_score}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
