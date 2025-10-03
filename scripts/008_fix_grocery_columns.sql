-- Fix missing columns in grocery_lists and grocery_items tables

-- Add missing columns to grocery_lists table
ALTER TABLE grocery_lists 
ADD COLUMN IF NOT EXISTS total_estimated_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS store_sections JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to grocery_items table  
ALTER TABLE grocery_items
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for better sort performance
CREATE INDEX IF NOT EXISTS idx_grocery_items_sort_order ON grocery_items(grocery_list_id, sort_order);

-- Create ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- normalized name (lowercase, no punctuation)
  display_name TEXT NOT NULL, -- original display name
  ai_category TEXT,
  ai_aisle TEXT,
  ai_confidence DECIMAL(3,2) DEFAULT 0.00,
  ai_classified_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create store_ingredient_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_ingredient_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  user_category TEXT,
  user_aisle TEXT,
  confidence_score INTEGER DEFAULT 1, -- 1-10 scale
  pixel_x INTEGER,
  pixel_y INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, ingredient_id, created_by)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_usage_count ON ingredients(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_store_ingredient_locations_store ON store_ingredient_locations(store_id);
CREATE INDEX IF NOT EXISTS idx_store_ingredient_locations_ingredient ON store_ingredient_locations(ingredient_id);

-- Enable RLS on new tables
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_ingredient_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for ingredients (global read, authenticated write)
CREATE POLICY "Anyone can read ingredients" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ingredients" ON ingredients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update ingredients" ON ingredients FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS policies for store_ingredient_locations (users can only see/modify their own mappings)
CREATE POLICY "Users can read their own store locations" ON store_ingredient_locations FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can insert their own store locations" ON store_ingredient_locations FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update their own store locations" ON store_ingredient_locations FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete their own store locations" ON store_ingredient_locations FOR DELETE USING (created_by = auth.uid());

-- Add some common ingredients to bootstrap the system
INSERT INTO ingredients (name, display_name, ai_category, ai_aisle, ai_confidence, usage_count) VALUES
('pita bread', 'Pita Bread', 'bakery', 'Bakery Section', 0.95, 1),
('white rice', 'White Rice', 'pantry', 'Aisle 5 - Grains', 0.98, 1),
('brown rice', 'Brown Rice', 'pantry', 'Aisle 5 - Grains', 0.98, 1),
('olive oil', 'Olive Oil', 'pantry', 'Aisle 7 - Oils & Vinegars', 0.99, 1),
('salt', 'Salt', 'pantry', 'Aisle 8 - Spices', 0.99, 1),
('black pepper', 'Black Pepper', 'pantry', 'Aisle 8 - Spices', 0.99, 1),
('garlic', 'Garlic', 'produce', 'Produce Section', 0.99, 1),
('onion', 'Onion', 'produce', 'Produce Section', 0.99, 1),
('tomato', 'Tomato', 'produce', 'Produce Section', 0.99, 1),
('chicken breast', 'Chicken Breast', 'meat', 'Meat Department', 0.99, 1),
('ground beef', 'Ground Beef', 'meat', 'Meat Department', 0.99, 1),
('milk', 'Milk', 'dairy', 'Dairy Section', 0.99, 1),
('eggs', 'Eggs', 'dairy', 'Dairy Section', 0.99, 1),
('butter', 'Butter', 'dairy', 'Dairy Section', 0.99, 1),
('cheese', 'Cheese', 'dairy', 'Dairy Section', 0.98, 1)
ON CONFLICT (name) DO NOTHING;

-- Update existing grocery_items to have proper sort_order
UPDATE grocery_items 
SET sort_order = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY grocery_list_id ORDER BY created_at) as row_number
  FROM grocery_items
) AS subquery
WHERE grocery_items.id = subquery.id
AND grocery_items.sort_order IS NULL;

