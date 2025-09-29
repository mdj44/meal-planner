-- Create users profile table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Create recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  servings INTEGER,
  image_url TEXT,
  source_url TEXT,
  raw_content TEXT, -- original uploaded content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Recipes policies
CREATE POLICY "recipes_select_own" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recipes_insert_own" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_update_own" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipes_delete_own" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- Create grocery_lists table
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  recipe_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on grocery_lists
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

-- Grocery lists policies
CREATE POLICY "grocery_lists_select_own" ON public.grocery_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "grocery_lists_insert_own" ON public.grocery_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "grocery_lists_update_own" ON public.grocery_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "grocery_lists_delete_own" ON public.grocery_lists FOR DELETE USING (auth.uid() = user_id);

-- Create grocery_items table
CREATE TABLE IF NOT EXISTS public.grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grocery_list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  category TEXT, -- produce, dairy, meat, etc.
  aisle TEXT, -- store aisle/zone
  is_completed BOOLEAN DEFAULT FALSE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on grocery_items
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

-- Grocery items policies (access through grocery list ownership)
CREATE POLICY "grocery_items_select_via_list" ON public.grocery_items FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.grocery_lists gl 
    WHERE gl.id = grocery_list_id AND gl.user_id = auth.uid()
  ));

CREATE POLICY "grocery_items_insert_via_list" ON public.grocery_items FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.grocery_lists gl 
    WHERE gl.id = grocery_list_id AND gl.user_id = auth.uid()
  ));

CREATE POLICY "grocery_items_update_via_list" ON public.grocery_items FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.grocery_lists gl 
    WHERE gl.id = grocery_list_id AND gl.user_id = auth.uid()
  ));

CREATE POLICY "grocery_items_delete_via_list" ON public.grocery_items FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.grocery_lists gl 
    WHERE gl.id = grocery_list_id AND gl.user_id = auth.uid()
  ));

-- Create stores table for crowdsourced mapping
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  layout_data JSONB DEFAULT '{}', -- store layout information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on stores (public read, authenticated write)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Stores policies
CREATE POLICY "stores_select_all" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "stores_insert_authenticated" ON public.stores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stores_update_authenticated" ON public.stores FOR UPDATE TO authenticated USING (true);

-- Create item_locations table for crowdsourced item placement
CREATE TABLE IF NOT EXISTS public.item_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  aisle TEXT,
  position_x FLOAT, -- x coordinate on store map
  position_y FLOAT, -- y coordinate on store map
  confidence_score INTEGER DEFAULT 1, -- how many users confirmed this location
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, item_name)
);

-- Enable RLS on item_locations
ALTER TABLE public.item_locations ENABLE ROW LEVEL SECURITY;

-- Item locations policies (public read, authenticated write)
CREATE POLICY "item_locations_select_all" ON public.item_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "item_locations_insert_authenticated" ON public.item_locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "item_locations_update_authenticated" ON public.item_locations FOR UPDATE TO authenticated USING (true);
