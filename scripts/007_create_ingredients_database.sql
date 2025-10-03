-- Create ingredients classification database for efficient AI caching and store mapping

-- Create ingredients table for AI classification caching
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- normalized ingredient name (lowercase, trimmed)
  display_name TEXT NOT NULL, -- original/display name
  ai_category TEXT, -- AI-determined category (produce, dairy, meat, etc.)
  ai_aisle TEXT, -- AI-suggested aisle
  ai_confidence DECIMAL(3,2) DEFAULT 0.00, -- AI confidence score (0.00-1.00)
  ai_classified_at TIMESTAMP WITH TIME ZONE, -- when AI classification was done
  usage_count INTEGER DEFAULT 1, -- how many times this ingredient has been used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON public.ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON public.ingredients(ai_category);

-- Enable RLS on ingredients (global read, authenticated write)
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Ingredients policies - anyone can read, authenticated users can insert/update
CREATE POLICY "ingredients_select_all" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_insert_auth" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ingredients_update_auth" ON public.ingredients FOR UPDATE TO authenticated USING (true);

-- Create store_ingredient_locations table for store-specific mappings
CREATE TABLE IF NOT EXISTS public.store_ingredient_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  user_category TEXT, -- user-override category if different from AI
  user_aisle TEXT, -- user-determined aisle
  map_x INTEGER, -- pixel X coordinate on store map
  map_y INTEGER, -- pixel Y coordinate on store map
  confidence_score DECIMAL(3,2) DEFAULT 1.00, -- confidence in this location (crowd-sourced)
  created_by UUID REFERENCES auth.users(id), -- user who created this mapping
  verified_count INTEGER DEFAULT 1, -- how many users verified this location
  last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, ingredient_id) -- one location per ingredient per store
);

-- Create indexes for store mappings
CREATE INDEX IF NOT EXISTS idx_store_locations_store ON public.store_ingredient_locations(store_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_ingredient ON public.store_ingredient_locations(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_confidence ON public.store_ingredient_locations(confidence_score DESC);

-- Enable RLS on store locations
ALTER TABLE public.store_ingredient_locations ENABLE ROW LEVEL SECURITY;

-- Store location policies - users can read all, but only modify their own or contribute new
CREATE POLICY "store_locations_select_all" ON public.store_ingredient_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "store_locations_insert_auth" ON public.store_ingredient_locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "store_locations_update_own" ON public.store_ingredient_locations FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Create function to normalize ingredient names
CREATE OR REPLACE FUNCTION normalize_ingredient_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, trim whitespace, remove extra spaces
  RETURN TRIM(REGEXP_REPLACE(LOWER(input_name), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get or create ingredient with AI classification
CREATE OR REPLACE FUNCTION get_or_create_ingredient(
  p_display_name TEXT,
  p_ai_category TEXT DEFAULT NULL,
  p_ai_aisle TEXT DEFAULT NULL,
  p_ai_confidence DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_normalized_name TEXT;
  v_ingredient_id UUID;
BEGIN
  -- Normalize the ingredient name
  v_normalized_name := normalize_ingredient_name(p_display_name);
  
  -- Try to find existing ingredient
  SELECT id INTO v_ingredient_id 
  FROM public.ingredients 
  WHERE name = v_normalized_name;
  
  IF v_ingredient_id IS NULL THEN
    -- Create new ingredient
    INSERT INTO public.ingredients (
      name, 
      display_name, 
      ai_category, 
      ai_aisle, 
      ai_confidence,
      ai_classified_at,
      usage_count
    ) VALUES (
      v_normalized_name,
      p_display_name,
      p_ai_category,
      p_ai_aisle,
      p_ai_confidence,
      CASE WHEN p_ai_category IS NOT NULL THEN NOW() ELSE NULL END,
      1
    ) RETURNING id INTO v_ingredient_id;
  ELSE
    -- Update usage count and AI data if provided
    UPDATE public.ingredients 
    SET 
      usage_count = usage_count + 1,
      ai_category = COALESCE(p_ai_category, ai_category),
      ai_aisle = COALESCE(p_ai_aisle, ai_aisle),
      ai_confidence = COALESCE(p_ai_confidence, ai_confidence),
      ai_classified_at = CASE WHEN p_ai_category IS NOT NULL THEN NOW() ELSE ai_classified_at END,
      updated_at = NOW()
    WHERE id = v_ingredient_id;
  END IF;
  
  RETURN v_ingredient_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.ingredients IS 'Global ingredients database with AI classification caching';
COMMENT ON TABLE public.store_ingredient_locations IS 'Store-specific ingredient locations for mapping and crowd-sourcing';
COMMENT ON FUNCTION normalize_ingredient_name(TEXT) IS 'Normalizes ingredient names for consistent database storage';
COMMENT ON FUNCTION get_or_create_ingredient(TEXT, TEXT, TEXT, DECIMAL) IS 'Gets existing ingredient or creates new one with optional AI classification';

