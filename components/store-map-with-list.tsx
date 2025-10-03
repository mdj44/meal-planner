"use client"

import { useState } from "react"
import { WALMART_MUMFORD_LAYOUT, findItemLocation, type StoreSection } from "@/lib/store-layouts/walmart-mumford"
import Image from "next/image"

interface GroceryItem {
  id: string;
  name: string;
  category: string;
  is_completed?: boolean;
  quantity?: string;
  unit?: string;
}

interface StoreMapWithListProps {
  items: GroceryItem[];
  storeImageUrl?: string;
}

export function StoreMapWithList({ items, storeImageUrl = "/store-maps/walmart-mumford.jpg" }: StoreMapWithListProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Map items to their locations
  const itemsWithLocations = items.map((item, index) => {
    const location = findItemLocation(item.category, item.name);
    return {
      ...item,
      listNumber: index + 1,
      location,
    };
  });

  // Filter items that have locations
  const mappedItems = itemsWithLocations.filter(item => item.location !== null);
  const unmappedItems = itemsWithLocations.filter(item => item.location === null);

  // Calculate optimal shopping path (sort by aisle order)
  const sortedByLocation = [...mappedItems].sort((a, b) => {
    const aY = a.location?.position.y || 0;
    const bY = b.location?.position.y || 0;
    return aY - bY;
  });

  return (
    <div className="space-y-4">
      {/* Store Map */}
      <div className="relative bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="relative w-full" style={{ paddingBottom: "60%" }}>
          {/* Store layout image */}
          <div className="absolute inset-0 bg-gray-100">
            <Image
              src={storeImageUrl}
              alt="Store Layout"
              fill
              className="object-contain"
              onError={(e) => {
                // Fallback to showing the layout map
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Item dots overlaid on map */}
          {mappedItems.map((item) => {
            if (!item.location) return null;
            
            const { x, y } = item.location.position;
            const isHovered = hoveredItem === item.id;
            
            return (
              <div
                key={item.id}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: isHovered ? 20 : 10,
                }}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Numbered dot */}
                <div
                  className={`
                    flex items-center justify-center
                    rounded-full font-bold text-white
                    transition-all duration-200
                    ${isHovered ? "w-10 h-10 text-lg" : "w-8 h-8 text-sm"}
                    ${item.is_completed ? "bg-green-500" : "bg-blue-600"}
                    ${isHovered ? "ring-4 ring-blue-300" : "ring-2 ring-white"}
                    cursor-pointer shadow-lg
                  `}
                >
                  {item.listNumber}
                </div>

                {/* Hover tooltip */}
                {isHovered && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-30 shadow-lg">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-gray-300">{item.location.name}</div>
                    {item.quantity && (
                      <div className="text-gray-400">{item.quantity} {item.unit}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg text-sm">
          <div className="font-semibold mb-2">Legend</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">1</div>
            <span>Pending item</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">2</div>
            <span>Completed item</span>
          </div>
        </div>
      </div>

      {/* Shopping List Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mapped Items - Sorted by optimal path */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span className="text-blue-600">✓</span>
            Items on Map ({mappedItems.length})
          </h3>
          <div className="space-y-2">
            {sortedByLocation.map((item) => (
              <div
                key={item.id}
                className={`
                  flex items-center gap-3 p-2 rounded
                  ${hoveredItem === item.id ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}
                  ${item.is_completed ? "opacity-50" : ""}
                  cursor-pointer transition-all
                `}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                  ${item.is_completed ? "bg-green-500" : "bg-blue-600"}
                `}>
                  {item.listNumber}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${item.is_completed ? "line-through" : ""}`}>
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.location?.name} • {item.quantity} {item.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unmapped Items */}
        {unmappedItems.length > 0 && (
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-yellow-600">⚠</span>
              Items Not Mapped ({unmappedItems.length})
            </h3>
            <div className="space-y-2">
              {unmappedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-sm">
                    {item.listNumber}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      {item.category} • {item.quantity} {item.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-gray-600 italic">
              These items need location data. You can manually tag them to update the map.
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{mappedItems.length}</div>
            <div className="text-sm text-gray-600">Items Mapped</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {mappedItems.filter(i => i.is_completed).length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{unmappedItems.length}</div>
            <div className="text-sm text-gray-600">Unmapped</div>
          </div>
        </div>
      </div>
    </div>
  );
}

