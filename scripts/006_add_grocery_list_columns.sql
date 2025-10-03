-- Add missing columns to grocery_lists table for enhanced functionality

-- Add store_sections column to store organized shopping sections
ALTER TABLE public.grocery_lists 
ADD COLUMN IF NOT EXISTS store_sections JSONB DEFAULT '[]';

-- Add total_estimated_cost column for cost tracking
ALTER TABLE public.grocery_lists 
ADD COLUMN IF NOT EXISTS total_estimated_cost DECIMAL(10,2) DEFAULT 0.00;

-- Add comments for clarity
COMMENT ON COLUMN public.grocery_lists.store_sections IS 'JSON array of store sections with items organized by aisle/category';
COMMENT ON COLUMN public.grocery_lists.total_estimated_cost IS 'Estimated total cost of the grocery list in dollars';

-- Update existing grocery lists to have empty store_sections if null
UPDATE public.grocery_lists 
SET store_sections = '[]'::jsonb 
WHERE store_sections IS NULL;

-- Update existing grocery lists to have 0 cost if null
UPDATE public.grocery_lists 
SET total_estimated_cost = 0.00 
WHERE total_estimated_cost IS NULL;

-- Also add missing estimated_cost column to grocery_items table
ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(8,2) DEFAULT 0.00;

-- Update existing grocery items to have 0 cost if null
UPDATE public.grocery_items 
SET estimated_cost = 0.00 
WHERE estimated_cost IS NULL;

COMMENT ON COLUMN public.grocery_items.estimated_cost IS 'Estimated cost of this grocery item in dollars';

-- Also add missing notes column to grocery_items table
ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Update existing grocery items to have empty notes if null
UPDATE public.grocery_items 
SET notes = '' 
WHERE notes IS NULL;

COMMENT ON COLUMN public.grocery_items.notes IS 'Additional notes or substitution suggestions for this grocery item';

-- Also add missing sort_order column to grocery_items table
ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing grocery items to have sort_order based on creation time
UPDATE public.grocery_items 
SET sort_order = (
  SELECT ROW_NUMBER() OVER (PARTITION BY grocery_list_id ORDER BY created_at) - 1
  FROM public.grocery_items gi2 
  WHERE gi2.id = public.grocery_items.id
)
WHERE sort_order IS NULL OR sort_order = 0;

COMMENT ON COLUMN public.grocery_items.sort_order IS 'Display order of items in the grocery list (0-based index)';
