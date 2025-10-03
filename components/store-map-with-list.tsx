"use client"

import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import type { GroceryItem } from "@/lib/types"

interface ItemPosition {
  x: number;  // Percentage (0-100)
  y: number;  // Percentage (0-100)
}

interface Landmark {
  id: string;
  label: string;
  x: number; // Percentage
  y: number; // Percentage
  color: string;
}

interface StoreMapWithListProps {
  items: (GroceryItem & { position_x?: number | null; position_y?: number | null })[];
  storeImageUrl?: string;
  listId?: string;
  storeId?: string;
  onItemToggle?: (itemId: string, completed: boolean) => Promise<void>;
}

export function StoreMapWithList({ 
  items, 
  storeImageUrl = "/store-maps/walmart-mumford.jpg",
  listId,
  storeId,
  onItemToggle
}: StoreMapWithListProps) {
  const [itemPositions, setItemPositions] = useState<Record<string, ItemPosition>>({});
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedLandmark, setDraggedLandmark] = useState<string | null>(null);
  const [draggedForReorder, setDraggedForReorder] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [itemOrder, setItemOrder] = useState<string[]>([]);
  const [landmarkPositions, setLandmarkPositions] = useState<Record<string, ItemPosition>>({});
  const [scale, setScale] = useState(1.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showPath, setShowPath] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Store landmarks (entrance, checkout) - default positions
  const defaultLandmarks: Landmark[] = [
    {
      id: 'entrance',
      label: 'ENT',
      x: 50, // Center bottom
      y: 95,
      color: 'bg-purple-600'
    },
    {
      id: 'checkout',
      label: 'C/O',
      x: 30, // Left side
      y: 85,
      color: 'bg-orange-600'
    }
  ];

  // Load landmark positions from localStorage
  useEffect(() => {
    if (storeId) {
      const saved = localStorage.getItem(`store-${storeId}-landmarks`);
      if (saved) {
        try {
          setLandmarkPositions(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load landmark positions", e);
        }
      }
    }
  }, [storeId]);

  // Get current landmark positions (saved or default)
  const landmarks = defaultLandmarks.map(landmark => ({
    ...landmark,
    x: landmarkPositions[landmark.id]?.x ?? landmark.x,
    y: landmarkPositions[landmark.id]?.y ?? landmark.y
  }));

  // Initialize item order and completed status from items array
  useEffect(() => {
    if (items.length > 0 && itemOrder.length === 0) {
      setItemOrder(items.map(item => item.id));
    }
    
    // Initialize completed items
    const completed = new Set<string>();
    items.forEach(item => {
      if (item.is_completed) {
        completed.add(item.id);
      }
    });
    setCompletedItems(completed);
  }, [items]);

  // Load positions from database (via items) on mount
  useEffect(() => {
    const positions: Record<string, ItemPosition> = {};
    items.forEach(item => {
      if (item.position_x !== null && item.position_x !== undefined && 
          item.position_y !== null && item.position_y !== undefined) {
        positions[item.id] = { 
          x: Number(item.position_x), 
          y: Number(item.position_y) 
        };
      }
    });
    setItemPositions(positions);
  }, [items]);

  // Handle checkbox toggle
  const handleToggleComplete = async (itemId: string, completed: boolean) => {
    // Update local state immediately for responsive UI
    const newCompletedSet = new Set(completedItems);
    if (completed) {
      newCompletedSet.add(itemId);
    } else {
      newCompletedSet.delete(itemId);
    }
    setCompletedItems(newCompletedSet);
    
    // Mark that we have unsaved changes
    setHasUnsavedChanges(true);
    
    // Save to localStorage for offline support
    if (listId) {
      const storageKey = `grocery-list-${listId}-completed`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newCompletedSet)));
    }
    
    // Call server action in background (don't await - fire and forget)
    if (onItemToggle) {
      onItemToggle(itemId, completed).catch(err => {
        console.error("Failed to save completion status:", err);
      });
    }
  };

  // Save position to database
  const savePositionToDatabase = async (itemId: string, position: ItemPosition) => {
    if (!storeId) return;
    
    try {
      await fetch(`/api/grocery-items/${itemId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_x: position.x,
          position_y: position.y,
          store_id: storeId
        })
      });
    } catch (error) {
      console.error("Failed to save position:", error);
    }
  };

  // Update item position (local only, no immediate database save)
  const updatePosition = (itemId: string, position: ItemPosition) => {
    setItemPositions(prev => ({
      ...prev,
      [itemId]: position
    }));
    
    // Save to localStorage for offline support
    if (listId) {
      const storageKey = `grocery-list-${listId}-positions`;
      const positions = { ...itemPositions, [itemId]: position };
      localStorage.setItem(storageKey, JSON.stringify(positions));
    }
    
    // Mark that we have unsaved changes
    setHasUnsavedChanges(true);
  };

  // Handle drag start for map placement (from sidebar to map)
  const handleMapDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag start for landmarks
  const handleLandmarkDragStart = (e: React.DragEvent, landmarkId: string) => {
    e.dataTransfer.setData('text/plain', landmarkId);
    setDraggedLandmark(landmarkId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Update landmark position
  const updateLandmarkPosition = (landmarkId: string, position: ItemPosition) => {
    const newPositions = {
      ...landmarkPositions,
      [landmarkId]: position
    };
    setLandmarkPositions(newPositions);
    
    // Save to localStorage
    if (storeId) {
      localStorage.setItem(`store-${storeId}-landmarks`, JSON.stringify(newPositions));
    }
  };

  // Handle drag start for reordering (within sidebar)
  const handleReorderDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', 'reorder');
    setDraggedForReorder(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };

  // Handle drag over for reordering
  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedForReorder) {
      setDragOverIndex(index);
    }
  };

  // Handle drop for reordering
  const handleReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedForReorder) return;

    const dragIndex = itemOrder.indexOf(draggedForReorder);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggedForReorder(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...itemOrder];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggedForReorder);
    
    setItemOrder(newOrder);
    setDraggedForReorder(null);
    setDragOverIndex(null);
  };

  // Handle drop on map (for items and landmarks)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - offset.x) / scale / rect.width) * 100;
    const y = ((e.clientY - rect.top - offset.y) / scale / rect.height) * 100;

    const position = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };

    // Handle landmark drop
    if (draggedLandmark) {
      updateLandmarkPosition(draggedLandmark, position);
      setDraggedLandmark(null);
      return;
    }

    // Handle item drop
    if (draggedItem) {
      updatePosition(draggedItem, position);
      setDraggedItem(null);
      return;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Zoom and pan handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(10, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleReset = () => {
    setScale(1.5);
    setOffset({ x: 0, y: 0 });
  };

  // Save all changes to database (batch operation)
  const handleSaveToDatabase = async () => {
    if (!storeId) {
      alert("No store selected. Cannot save positions.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Save all positions
      const savePromises = Object.entries(itemPositions).map(([itemId, position]) => 
        fetch(`/api/grocery-items/${itemId}/position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position_x: position.x,
            position_y: position.y,
            store_id: storeId
          })
        })
      );
      
      // Save all completion statuses
      const completionPromises = Array.from(completedItems).map(itemId =>
        onItemToggle ? onItemToggle(itemId, true) : Promise.resolve()
      );
      
      await Promise.all([...savePromises, ...completionPromises]);
      
      // Clear localStorage after successful save
      if (listId) {
        localStorage.removeItem(`grocery-list-${listId}-positions`);
        localStorage.removeItem(`grocery-list-${listId}-completed`);
      }
      
      setHasUnsavedChanges(false);
      alert("✅ All changes saved successfully!");
    } catch (error) {
      console.error("Failed to save to database:", error);
      alert("❌ Failed to save some changes. Please try again when you have internet connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPositions = async () => {
    if (!confirm("Clear all item positions? This will remove all items from the map.")) return;
    
    // Clear from database by setting positions to null
    for (const item of items) {
      try {
        await fetch(`/api/grocery-items/${item.id}/position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position_x: null,
            position_y: null,
            store_id: storeId
          })
        });
      } catch (error) {
        console.error("Failed to clear position:", error);
      }
    }
    
    // Clear local state
    setItemPositions({});
    
    // Reload the page to get fresh data
    window.location.reload();
  };

  // Get color for dots
  const getDotColor = (itemId: string, isPositioned: boolean) => {
    if (!isPositioned) return "bg-gray-400";
    if (completedItems.has(itemId)) return "bg-green-500";
    return "bg-blue-500";
  };

  // Create numbered items array based on custom order
  const orderedItems = itemOrder.length > 0 
    ? itemOrder.map(id => items.find(item => item.id === id)).filter(Boolean as any)
    : items;

  const numberedItems = orderedItems.map((item, index) => ({
    ...item,
    number: index + 1,
    position: itemPositions[item.id]
  }));

  const positionedItems = numberedItems.filter(item => item.position);
  const unpositionedItems = numberedItems.filter(item => !item.position);

  // Path generation: Entrance → Items (in order) → Checkout
  const generatePath = () => {
    if (!showPath) return null;

    const pathCommands: string[] = [];
    
    // Find entrance and checkout landmarks
    const entrance = landmarks.find(l => l.id === 'entrance');
    const checkout = landmarks.find(l => l.id === 'checkout');
    
    // Start at entrance if it exists
    if (entrance) {
      pathCommands.push(`M ${entrance.x} ${entrance.y}`);
    } else if (positionedItems.length > 0 && positionedItems[0].position) {
      // Fallback to first item if no entrance
      pathCommands.push(`M ${positionedItems[0].position.x} ${positionedItems[0].position.y}`);
    }
    
    // Connect through all positioned items in order
    positionedItems.forEach((item, index) => {
      if (!item.position) return;
      
      const x = item.position.x;
      const y = item.position.y;
      
      if (index === 0 && !entrance) {
        pathCommands.push(`M ${x} ${y}`);
      } else {
        pathCommands.push(`L ${x} ${y}`);
      }
    });
    
    // End at checkout if it exists
    if (checkout && positionedItems.length > 0) {
      pathCommands.push(`L ${checkout.x} ${checkout.y}`);
    }

    return pathCommands.length > 0 ? pathCommands.join(' ') : null;
  };

  const pathD = generatePath();

  return (
    <div className="flex gap-4 h-full p-6">
      {/* Map Section */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-gray-600">
            {hasUnsavedChanges ? (
              <span className="text-orange-600 font-medium">⚠️ You have unsaved changes</span>
            ) : (
              "Drag items onto the map. Scroll to zoom, drag to pan."
            )}
          </div>
          <div className="flex gap-2">
            {hasUnsavedChanges && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? "Saving..." : "💾 Save to Database"}
              </Button>
            )}
            <Button 
              variant={showPath ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowPath(!showPath)}
            >
              {showPath ? "Hide" : "Show"} Path
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset View
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearPositions}>
              Clear All
            </Button>
          </div>
        </div>
        
        <div 
          ref={mapContainerRef}
          className="flex-1 relative overflow-hidden bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            cursor: isPanning ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        >
          <div
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          >
            {/* Store Map Image */}
            <img 
              src={storeImageUrl} 
              alt="Store Map"
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
            
            {/* SVG Overlay for Path */}
            <svg
              ref={svgRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible' }}
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {pathD && (
                <path
                  d={pathD}
                  stroke="#ec4899"
                  strokeWidth="0.4"
                  fill="none"
                  strokeDasharray="1.5,1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              )}
            </svg>

            {/* Item Dots */}
            {positionedItems.map(item => (
              <div
                key={item.id}
                className="absolute"
                style={{
                  left: `${item.position!.x}%`,
                  top: `${item.position!.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative group">
                  <div 
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center
                      text-white font-bold text-xs shadow-lg border-2 border-white
                      ${getDotColor(item.id, true)}
                      cursor-move hover:scale-125 transition-transform
                    `}
                    draggable
                    onDragStart={(e) => handleMapDragStart(e, item.id)}
                  >
                    {item.number}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                    <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {item.number}. {item.name}
                      {item.quantity && ` (${item.quantity}${item.unit || ''})`}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Landmarks (Entrance, Checkout) */}
            {landmarks.map(landmark => (
              <div
                key={landmark.id}
                className="absolute"
                style={{
                  left: `${landmark.x}%`,
                  top: `${landmark.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative group">
                  <div 
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      text-white font-bold text-[10px] shadow-lg border-2 border-white
                      ${landmark.color}
                      cursor-move hover:scale-110 transition-transform
                    `}
                    draggable
                    onDragStart={(e) => handleLandmarkDragStart(e, landmark.id)}
                  >
                    {landmark.label}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                    <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {landmark.id === 'entrance' ? '🚪 Store Entrance (drag to move)' : '🛒 Checkout (drag to move)'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded shadow text-sm">
            Zoom: {(scale * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Grocery List Sidebar */}
      <div className="w-80 flex flex-col">
        <h3 className="text-lg font-semibold mb-3">Grocery List</h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {positionedItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                On Map ({positionedItems.length})
              </div>
              {positionedItems.map((item, index) => (
                <div
                  key={item.id}
                  onDragOver={(e) => handleReorderDragOver(e, itemOrder.indexOf(item.id))}
                  onDrop={(e) => handleReorderDrop(e, itemOrder.indexOf(item.id))}
                  className={`flex items-start gap-3 p-3 bg-white rounded border transition-all ${
                    dragOverIndex === itemOrder.indexOf(item.id) ? 'border-blue-500 border-2' : 'border-gray-200'
                  }`}
                >
                  <Checkbox
                    checked={completedItems.has(item.id)}
                    onCheckedChange={(checked) => handleToggleComplete(item.id, checked as boolean)}
                    className="mt-1"
                  />
                  {/* Drag handle for reordering */}
                  <div 
                    className="flex-shrink-0 w-4 cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleReorderDragStart(e, item.id)}
                    title="Drag to reorder"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="4" cy="4" r="1.5"/>
                      <circle cx="4" cy="8" r="1.5"/>
                      <circle cx="4" cy="12" r="1.5"/>
                      <circle cx="12" cy="4" r="1.5"/>
                      <circle cx="12" cy="8" r="1.5"/>
                      <circle cx="12" cy="12" r="1.5"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold cursor-move hover:scale-110 transition-transform"
                        draggable
                        onDragStart={(e) => handleMapDragStart(e, item.id)}
                        title="Drag to map"
                      >
                        {item.number}
                      </span>
                      <span className={`font-medium ${completedItems.has(item.id) ? 'line-through text-gray-400' : ''}`}>
                        {item.name}
                      </span>
                    </div>
                    {item.quantity && (
                      <div className="text-sm text-gray-500 ml-8">
                        {item.quantity} {item.unit || ''}
                      </div>
                    )}
                    {item.category && (
                      <Badge variant="outline" className="text-xs ml-8 mt-1">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {unpositionedItems.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                Not Placed ({unpositionedItems.length})
              </div>
              {unpositionedItems.map((item, index) => (
                <div
                  key={item.id}
                  onDragOver={(e) => handleReorderDragOver(e, itemOrder.indexOf(item.id))}
                  onDrop={(e) => handleReorderDrop(e, itemOrder.indexOf(item.id))}
                  className={`flex items-start gap-3 p-3 bg-gray-50 rounded border transition-all ${
                    dragOverIndex === itemOrder.indexOf(item.id) ? 'border-blue-500 border-2' : 'border-gray-200'
                  }`}
                >
                  <Checkbox
                    checked={completedItems.has(item.id)}
                    onCheckedChange={(checked) => handleToggleComplete(item.id, checked as boolean)}
                    className="mt-1"
                  />
                  {/* Drag handle for reordering */}
                  <div 
                    className="flex-shrink-0 w-4 cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleReorderDragStart(e, item.id)}
                    title="Drag to reorder"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="4" cy="4" r="1.5"/>
                      <circle cx="4" cy="8" r="1.5"/>
                      <circle cx="4" cy="12" r="1.5"/>
                      <circle cx="12" cy="4" r="1.5"/>
                      <circle cx="12" cy="8" r="1.5"/>
                      <circle cx="12" cy="12" r="1.5"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold cursor-move hover:scale-110 transition-transform"
                        draggable
                        onDragStart={(e) => handleMapDragStart(e, item.id)}
                        title="Drag to map"
                      >
                        {item.number}
                      </span>
                      <span className={`font-medium ${completedItems.has(item.id) ? 'line-through text-gray-400' : ''}`}>
                        {item.name}
                      </span>
                    </div>
                    {item.quantity && (
                      <div className="text-sm text-gray-500 ml-8">
                        {item.quantity} {item.unit || ''}
                      </div>
                    )}
                    {item.category && (
                      <Badge variant="outline" className="text-xs ml-8 mt-1">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded space-y-2 text-xs">
          <div className="font-semibold">Legend:</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Pending item</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Completed item</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            <span>Not placed</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-0.5 bg-pink-500" style={{ backgroundImage: 'repeating-linear-gradient(to right, #ec4899 0, #ec4899 4px, transparent 4px, transparent 8px)' }}></div>
            <span>Shopping path</span>
          </div>
          <div className="border-t pt-2 mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-[8px] font-bold">ENT</div>
              <span>Entrance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-600 rounded flex items-center justify-center text-white text-[8px] font-bold">C/O</div>
              <span>Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
