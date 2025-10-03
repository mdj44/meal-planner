-- Add recipe versioning support
-- This allows storing modified versions of recipes instead of overwriting originals

-- Add versioning columns to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS original_recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS modification_prompt TEXT,
ADD COLUMN IF NOT EXISTS is_modified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'; -- Support multiple images

-- Create index for better performance on version queries
CREATE INDEX IF NOT EXISTS idx_recipes_original_id ON public.recipes(original_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_version ON public.recipes(original_recipe_id, version_number);

-- Update existing recipes to have version_number = 1 and is_modified = false
UPDATE public.recipes 
SET version_number = 1, is_modified = FALSE 
WHERE version_number IS NULL;

-- Add constraint to ensure version numbers are positive
ALTER TABLE public.recipes 
ADD CONSTRAINT recipes_version_number_positive CHECK (version_number > 0);

COMMENT ON COLUMN public.recipes.original_recipe_id IS 'Points to the original recipe if this is a modified version';
COMMENT ON COLUMN public.recipes.version_number IS 'Version number for this recipe (1 = original, 2+ = modifications)';
COMMENT ON COLUMN public.recipes.modification_prompt IS 'The prompt used to create this modification';
COMMENT ON COLUMN public.recipes.is_modified IS 'True if this recipe is a modification of another recipe';
COMMENT ON COLUMN public.recipes.image_urls IS 'Array of image URLs for multi-image recipes';

