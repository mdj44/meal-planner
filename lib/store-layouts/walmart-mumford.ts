/**
 * Walmart Mumford Road Store Layout
 * Mapped from store layout image
 */

export interface StoreSection {
  id: string;
  name: string;
  categories: string[];
  // Coordinates are percentages of the image dimensions (0-100)
  position: {
    x: number; // horizontal position (0 = left, 100 = right)
    y: number; // vertical position (0 = top, 100 = bottom)
  };
}

export const WALMART_MUMFORD_LAYOUT: StoreSection[] = [
  // Right side aisles (Dairy/Frozen section)
  {
    id: "frozen-food",
    name: "Frozen Food",
    categories: ["frozen", "frozen vegetables", "frozen pizza", "frozen meat"],
    position: { x: 85, y: 20 }
  },
  {
    id: "aisle-14",
    name: "Aisle 14",
    categories: ["cheese", "cream", "butter", "margarine", "yogurt"],
    position: { x: 85, y: 12 }
  },
  {
    id: "aisle-13",
    name: "Aisle 13",
    categories: ["frozen vegetables", "frozen pizza", "frozen meat"],
    position: { x: 85, y: 18 }
  },
  {
    id: "aisle-12",
    name: "Aisle 12",
    categories: ["laundry detergent", "fabric softener"],
    position: { x: 85, y: 32 }
  },
  {
    id: "aisle-11",
    name: "Aisle 11",
    categories: ["bathroom tissue", "paper towels", "napkins", "air fresheners"],
    position: { x: 85, y: 42 }
  },
  {
    id: "aisle-10",
    name: "Aisle 10",
    categories: ["dog food", "cat food", "pet treats"],
    position: { x: 85, y: 55 }
  },
  {
    id: "pets",
    name: "Pets",
    categories: ["pet food", "pet accessories", "pet snacks"],
    position: { x: 85, y: 58 }
  },
  {
    id: "aisle-09",
    name: "Aisle 09",
    categories: ["cat food", "pet accessories", "pet snacks"],
    position: { x: 85, y: 65 }
  },
  {
    id: "aisle-08",
    name: "Aisle 08",
    categories: ["juice", "bottled water", "flavored water", "non-alcoholic beverages"],
    position: { x: 85, y: 73 }
  },
  {
    id: "aisle-07",
    name: "Aisle 07",
    categories: ["cookies", "chips", "popcorn", "rice cakes", "nuts", "snack nuts"],
    position: { x: 85, y: 80 }
  },
  {
    id: "drinks-snacks",
    name: "Drinks & Snacks",
    categories: ["beverages", "snacks"],
    position: { x: 85, y: 82 }
  },
  
  // Center aisles
  {
    id: "aisle-06",
    name: "Aisle 06",
    categories: ["flour", "baking ingredients", "fruit cups", "applesauce", "chocolate", "candy"],
    position: { x: 60, y: 87 }
  },
  {
    id: "aisle-05",
    name: "Aisle 05",
    categories: ["condiments", "oil", "vinegar", "rice", "side dishes"],
    position: { x: 60, y: 78 }
  },
  {
    id: "grocery",
    name: "Grocery",
    categories: ["pantry", "dry goods"],
    position: { x: 60, y: 75 }
  },
  {
    id: "aisle-04",
    name: "Aisle 04",
    categories: ["crackers", "chips", "vegetables", "canned fish", "meat", "soups", "noodles"],
    position: { x: 60, y: 68 }
  },
  {
    id: "aisle-03",
    name: "Aisle 03",
    categories: ["cereal", "hot cereal", "snacks", "syrup", "pancake mix"],
    position: { x: 60, y: 58 }
  },
  {
    id: "dry-grocery",
    name: "Dry Grocery",
    categories: ["pasta", "rice", "grains", "cereal"],
    position: { x: 60, y: 55 }
  },
  {
    id: "aisle-02",
    name: "Aisle 02",
    categories: ["coffee", "tea", "jam", "international foods", "peanut butter", "spreads"],
    position: { x: 60, y: 48 }
  },
  {
    id: "aisle-01",
    name: "Aisle 01",
    categories: ["south asian", "seasonal snacks", "international sauces", "east asian"],
    position: { x: 60, y: 38 }
  },
  
  // Left side sections
  {
    id: "produce",
    name: "Produce",
    categories: ["fruits", "vegetables", "fresh produce", "herbs"],
    position: { x: 70, y: 10 }
  },
  {
    id: "bakery",
    name: "Bakery",
    categories: ["bread", "buns", "pastries", "cakes"],
    position: { x: 80, y: 95 }
  },
  {
    id: "meat",
    name: "Meat",
    categories: ["beef", "pork", "chicken", "deli meats", "fresh meat"],
    position: { x: 65, y: 95 }
  },
  {
    id: "deli",
    name: "Deli",
    categories: ["deli meat", "cheese", "prepared foods"],
    position: { x: 50, y: 95 }
  },
  {
    id: "bread",
    name: "Bread",
    categories: ["bread", "buns", "tortillas", "pita"],
    position: { x: 75, y: 92 }
  },
];

/**
 * Map a grocery item category to store sections
 */
export function findItemLocation(category: string, itemName: string): StoreSection | null {
  const normalizedCategory = category.toLowerCase();
  const normalizedName = itemName.toLowerCase();
  
  // Try exact category match first
  for (const section of WALMART_MUMFORD_LAYOUT) {
    if (section.categories.some(cat => normalizedCategory.includes(cat) || cat.includes(normalizedCategory))) {
      return section;
    }
  }
  
  // Try item name match
  for (const section of WALMART_MUMFORD_LAYOUT) {
    if (section.categories.some(cat => normalizedName.includes(cat) || cat.includes(normalizedName))) {
      return section;
    }
  }
  
  // Fallback mapping
  const categoryMap: Record<string, string> = {
    "produce": "produce",
    "fruits": "produce",
    "vegetables": "produce",
    "dairy": "aisle-14",
    "cheese": "aisle-14",
    "milk": "aisle-14",
    "yogurt": "aisle-14",
    "meat": "meat",
    "beef": "meat",
    "pork": "meat",
    "chicken": "meat",
    "seafood": "meat",
    "fish": "meat",
    "bakery": "bakery",
    "bread": "bread",
    "frozen": "frozen-food",
    "pantry": "grocery",
    "snacks": "aisle-07",
    "beverages": "aisle-08",
    "drinks": "aisle-08",
    "cereal": "aisle-03",
    "pasta": "dry-grocery",
    "canned": "aisle-04",
    "condiments": "aisle-05",
    "oil": "aisle-05",
    "vinegar": "aisle-05",
    "baking": "aisle-06",
    "flour": "aisle-06",
    "sugar": "aisle-06",
    "candy": "aisle-06",
    "coffee": "aisle-02",
    "tea": "aisle-02",
  };
  
  for (const [key, sectionId] of Object.entries(categoryMap)) {
    if (normalizedCategory.includes(key) || normalizedName.includes(key)) {
      return WALMART_MUMFORD_LAYOUT.find(s => s.id === sectionId) || null;
    }
  }
  
  return null;
}

