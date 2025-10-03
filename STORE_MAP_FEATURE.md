# 🗺️ Store Map Feature - Walmart Mumford Road

## Overview

The Store Map feature allows you to visualize your grocery list items on an interactive store layout map with numbered dots corresponding to each item's position in your list.

## ✨ Features

### 1. **Visual Grocery List Mapping**
- Each grocery item is shown as a numbered dot on the store map
- Numbers correspond to the order items appear in your list
- Hover over dots to see item details (name, aisle, quantity)

### 2. **Smart Item Location Matching**
- Automatically maps items to store aisles based on their category
- Uses intelligent fallback matching for unmapped items
- Displays aisle names and categories from the Walmart Mumford Road layout

### 3. **Optimal Shopping Path**
- Items are sorted by their physical location in the store
- Shop efficiently by following the suggested order
- Start from produce (top of map) and work your way through

### 4. **Item Status Tracking**
- Blue dots = Pending items
- Green dots = Completed items
- Gray numbers = Unmapped items (need location data)

## 📍 Walmart Mumford Road Layout

The map includes detailed aisle-by-aisle mapping:

### Right Side (Dairy/Frozen/Household)
- **Frozen Food Section**: Frozen vegetables, pizza, meat
- **Aisle 14**: Cheese, cream, butter, margarine, yogurt
- **Aisle 13**: Frozen vegetables, pizza, meat
- **Aisle 12**: Laundry detergent, fabric softener
- **Aisle 11**: Bathroom tissue, paper towels, napkins, air fresheners
- **Aisle 10-09**: Pet food, accessories, treats
- **Aisle 08**: Juice, bottled water, beverages
- **Aisle 07**: Cookies, chips, popcorn, nuts, snacks

### Center Aisles (Grocery)
- **Aisle 06**: Baking ingredients, flour, candy, chocolate
- **Aisle 05**: Condiments, oil, vinegar, rice, side dishes
- **Aisle 04**: Crackers, canned goods, soups, noodles
- **Aisle 03**: Cereal, hot cereal, syrup, pancake mix
- **Aisle 02**: Coffee, tea, jam, peanut butter
- **Aisle 01**: International foods (South Asian, East Asian)

### Perimeter Sections
- **Produce**: Fresh fruits, vegetables, herbs
- **Bakery**: Bread, buns, pastries, cakes
- **Meat/Deli**: Fresh meat, deli items, cheese
- **Bread Section**: Specialty breads, pita, tortillas

## 🎯 How to Use

### Access the Store Map:
1. Go to **Grocery Lists** page
2. Find the list you want to shop
3. Click the **"Map"** button next to "Shop" and "Edit"
4. The store map will open with your items plotted

### Interactive Features:
- **Hover** over numbered dots to see item details
- **Click** items in the sorted list to highlight on map
- View **statistics** showing mapped vs. unmapped items
- See **optimal shopping path** in the left panel

### Example Grocery List with Map:

```
1. Cucumbers → Produce (top of store)
2. Pita Bread → Bread Section (near bakery)
3. Milk → Aisle 14 (dairy)
4. Chicken → Meat Section
5. Cereal → Aisle 03 (center)
```

## 🛠️ Technical Details

### Files Structure:
```
/lib/store-layouts/
  └── walmart-mumford.ts          # Store layout configuration
/components/
  └── store-map-with-list.tsx     # Interactive map component
/public/store-maps/
  └── walmart-mumford.jpg         # Store layout image (add your image here)
```

### Store Layout Configuration:

Each section is defined with:
- **ID**: Unique identifier (e.g., "aisle-03")
- **Name**: Display name (e.g., "Aisle 03")
- **Categories**: Array of product categories found there
- **Position**: X/Y coordinates as percentages (0-100)

Example:
```typescript
{
  id: "produce",
  name: "Produce",
  categories: ["fruits", "vegetables", "fresh produce", "herbs"],
  position: { x: 70, y: 10 } // Top center of the map
}
```

### Category Matching Logic:

1. **Exact match**: Item category matches a section's categories
2. **Name match**: Item name contains category keywords
3. **Fallback mapping**: Use predefined category → aisle mapping
4. **Unmapped**: Show in separate "Items Not Mapped" panel

## 📥 Adding the Store Map Image

**To enable the visual map overlay:**

1. Save the Walmart Mumford Road store layout image to:
   ```
   /public/store-maps/walmart-mumford.jpg
   ```

2. The map component will automatically overlay numbered dots on the image

3. If the image is missing, the map will still work with just the dot coordinates

## 🚀 Future Enhancements

### Planned Features:
- [ ] Multiple store support (add other stores)
- [ ] Live phone tracking during shopping
- [ ] Crowd-sourced item locations
- [ ] User-contributed location corrections
- [ ] Offline-first mobile app support
- [ ] Custom store layout editor
- [ ] Store-specific item location database
- [ ] Navigation arrows showing optimal path
- [ ] Voice-guided shopping assistant

## 🧪 Testing

To test the feature:
1. Create a grocery list with items like:
   - Cucumbers (produce)
   - Cereal (aisle 03)
   - Milk (aisle 14)
   - Bread (bakery)
2. Click the "Map" button
3. Verify items appear as numbered dots
4. Check the sorted list shows optimal shopping order

## 📝 Notes

- **Coordinates are percentage-based** (0-100) for responsive layouts
- **Fallback handling** ensures items always show somewhere
- **Hover tooltips** provide context without cluttering the map
- **Color coding** helps distinguish completed vs. pending items

## 🤝 Contributing

To add a new store:
1. Create a new layout file in `/lib/store-layouts/`
2. Map all aisles and sections with coordinates
3. Add category mappings for item matching
4. Add the store layout image to `/public/store-maps/`
5. Update the store selector to include the new location

---

**Enjoy efficient, map-guided grocery shopping! 🛒🗺️**

