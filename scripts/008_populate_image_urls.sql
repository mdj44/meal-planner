-- Populate image_urls field for existing recipes
-- This migration fixes recipes that were uploaded before image_urls support was added

-- Update recipes that have image_url but empty image_urls array
UPDATE public.recipes 
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL 
  AND image_url != ''
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Verify the update
SELECT 
  id,
  title,
  image_url,
  image_urls,
  array_length(image_urls, 1) as image_count
FROM public.recipes 
WHERE image_url IS NOT NULL 
ORDER BY created_at DESC
LIMIT 10;
