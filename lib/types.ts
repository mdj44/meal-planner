export interface Recipe {
  id: string
  user_id: string
  title: string
  description?: string
  ingredients: Array<{
    name: string
    quantity?: string
    unit?: string
  }>
  instructions: Array<{
    step: number
    instruction: string
  }>
  prep_time?: number
  cook_time?: number
  servings?: number
  image_url?: string
  image_urls?: string[]
  source_url?: string
  raw_content?: string
  original_recipe_id?: string
  version_number?: number
  modification_prompt?: string
  is_modified?: boolean
  created_at: string
  updated_at: string
}

export interface GroceryList {
  id: string
  user_id: string
  name: string
  recipe_ids: string[]
  created_at: string
  updated_at: string
}

export interface GroceryItem {
  id: string
  grocery_list_id: string
  name: string
  quantity?: string
  unit?: string
  category?: string
  aisle?: string
  is_completed: boolean
  recipe_id?: string
  created_at: string
  updated_at: string
}

export interface Store {
  id: string
  name: string
  address?: string
  layout_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ItemLocation {
  id: string
  store_id: string
  item_name: string
  category?: string
  aisle?: string
  position_x?: number
  position_y?: number
  confidence_score: number
  created_by?: string
  created_at: string
  updated_at: string
}
