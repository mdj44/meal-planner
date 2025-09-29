"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MapPin, Plus, StoreIcon } from "lucide-react"
import type { Store } from "@/lib/types"

interface StoreSelectorProps {
  onStoreSelected: (store: Store) => void
  selectedStore?: Store | null
}

export function StoreSelector({ onStoreSelected, selectedStore }: StoreSelectorProps) {
  const [stores, setStores] = useState<Store[]>([])
  const [newStoreName, setNewStoreName] = useState("")
  const [newStoreAddress, setNewStoreAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const response = await fetch("/api/stores")
      const data = await response.json()
      if (response.ok) {
        setStores(data.stores)
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error)
    }
  }

  const createStore = async () => {
    if (!newStoreName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStoreName,
          address: newStoreAddress || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewStoreName("")
        setNewStoreAddress("")
        setIsDialogOpen(false)
        await fetchStores()
        onStoreSelected(data.store)
      }
    } catch (error) {
      console.error("Failed to create store:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5" />
          Select Store
        </CardTitle>
        <CardDescription>Choose a store to view its map and tag item locations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select
            value={selectedStore?.id || ""}
            onValueChange={(value) => {
              const store = stores.find((s) => s.id === value)
              if (store) onStoreSelected(store)
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a store..." />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  <div>
                    <div className="font-medium">{store.name}</div>
                    {store.address && <div className="text-sm text-muted-foreground">{store.address}</div>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Store</DialogTitle>
                <DialogDescription>Add a store to start mapping item locations</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Store Name</label>
                  <Input
                    placeholder="e.g., Whole Foods Market"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address (Optional)</label>
                  <Input
                    placeholder="e.g., 123 Main St, City, State"
                    value={newStoreAddress}
                    onChange={(e) => setNewStoreAddress(e.target.value)}
                  />
                </div>
                <Button onClick={createStore} disabled={isLoading || !newStoreName.trim()} className="w-full">
                  {isLoading ? "Creating..." : "Add Store"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedStore && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{selectedStore.name}</div>
                {selectedStore.address && <div className="text-sm text-muted-foreground">{selectedStore.address}</div>}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
