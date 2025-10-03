-- Complete fix for all missing grocery list and grocery items columns
-- Run this single script to fix all database issues at once

-- Fix grocery_lists table
ALTER TABLE public.grocery_lists 
ADD COLUMN IF NOT EXISTS store_sections JSONB DEFAULT '[]';

ALTER TABLE public.grocery_lists 
ADD COLUMN IF NOT EXISTS total_estimated_cost DECIMAL(10,2) DEFAULT 0.00;

-- Fix grocery_items table - add all missing columns
ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(8,2) DEFAULT 0.00;

ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing records with default values
UPDATE public.grocery_lists 
SET store_sections = '[]'::jsonb 
WHERE store_sections IS NULL;

UPDATE public.grocery_lists 
SET total_estimated_cost = 0.00 
WHERE total_estimated_cost IS NULL;

UPDATE public.grocery_items 
SET estimated_cost = 0.00 
WHERE estimated_cost IS NULL;

UPDATE public.grocery_items 
SET notes = '' 
WHERE notes IS NULL;

-- Set sort_order for existing items based on creation time
WITH ordered_items AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY grocery_list_id ORDER BY created_at) - 1 as new_sort_order
  FROM public.grocery_items
  WHERE sort_order IS NULL OR sort_order = 0
)
UPDATE public.grocery_items 
SET sort_order = ordered_items.new_sort_order
FROM ordered_items
WHERE public.grocery_items.id = ordered_items.id;

-- Add helpful comments
COMMENT ON COLUMN public.grocery_lists.store_sections IS 'JSON array of store sections with items organized by aisle/category';
COMMENT ON COLUMN public.grocery_lists.total_estimated_cost IS 'Estimated total cost of the grocery list in dollars';
COMMENT ON COLUMN public.grocery_items.estimated_cost IS 'Estimated cost of this grocery item in dollars';
COMMENT ON COLUMN public.grocery_items.notes IS 'Additional notes or substitution suggestions for this grocery item';
COMMENT ON COLUMN public.grocery_items.sort_order IS 'Display order of items in the grocery list (0-based index)';

-- Verify the changes
SELECT 
  'grocery_lists' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'grocery_lists' 
  AND table_schema = 'public'
  AND column_name IN ('store_sections', 'total_estimated_cost')

UNION ALL

SELECT 
  'grocery_items' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'grocery_items' 
  AND table_schema = 'public'
  AND column_name IN ('estimated_cost', 'notes', 'sort_order')
ORDER BY table_name, column_name;

