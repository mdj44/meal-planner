-- Create a comprehensive grocery items database
-- This will store common grocery items with their categories for better classification

-- Drop the table if it exists to avoid conflicts
DROP TABLE IF EXISTS grocery_items_database CASCADE;

CREATE TABLE grocery_items_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  common_variations TEXT[], -- Array of common name variations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_grocery_items_database_name ON grocery_items_database(name);
CREATE INDEX IF NOT EXISTS idx_grocery_items_database_category ON grocery_items_database(category);
CREATE INDEX IF NOT EXISTS idx_grocery_items_database_variations ON grocery_items_database USING GIN(common_variations);

-- Enable RLS
ALTER TABLE grocery_items_database ENABLE ROW LEVEL SECURITY;

-- Create policies for the grocery items database
CREATE POLICY "Anyone can read grocery items database" ON grocery_items_database
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert grocery items" ON grocery_items_database
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update grocery items" ON grocery_items_database
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete grocery items" ON grocery_items_database
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add some initial data
INSERT INTO grocery_items_database (name, category, subcategory, common_variations) VALUES
-- Produce
('apple', 'produce', 'fruits', ARRAY['apples', 'red apple', 'green apple', 'gala apple']),
('banana', 'produce', 'fruits', ARRAY['bananas']),
('orange', 'produce', 'fruits', ARRAY['oranges', 'navel orange']),
('tomato', 'produce', 'vegetables', ARRAY['tomatoes', 'cherry tomatoes', 'roma tomatoes', 'beefsteak tomatoes']),
('onion', 'produce', 'vegetables', ARRAY['onions', 'yellow onion', 'white onion', 'red onion']),
('garlic', 'produce', 'vegetables', ARRAY['garlic cloves', 'fresh garlic']),
('lettuce', 'produce', 'vegetables', ARRAY['iceberg lettuce', 'romaine lettuce', 'leaf lettuce']),
('carrot', 'produce', 'vegetables', ARRAY['carrots', 'baby carrots']),
('potato', 'produce', 'vegetables', ARRAY['potatoes', 'russet potatoes', 'red potatoes', 'sweet potatoes']),
('bell pepper', 'produce', 'vegetables', ARRAY['bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper']),
('cucumber', 'produce', 'vegetables', ARRAY['cucumbers', 'english cucumber']),
('spinach', 'produce', 'vegetables', ARRAY['fresh spinach', 'baby spinach']),
('broccoli', 'produce', 'vegetables', ARRAY['broccoli florets']),
('cauliflower', 'produce', 'vegetables', ARRAY['cauliflower florets']),
('celery', 'produce', 'vegetables', ARRAY['celery stalks']),
('lemon', 'produce', 'fruits', ARRAY['lemons', 'fresh lemon']),
('lime', 'produce', 'fruits', ARRAY['limes', 'fresh lime']),
('avocado', 'produce', 'fruits', ARRAY['avocados', 'ripe avocado']),
('mushroom', 'produce', 'vegetables', ARRAY['mushrooms', 'button mushrooms', 'cremini mushrooms']),
('herbs', 'produce', 'herbs', ARRAY['fresh herbs', 'parsley', 'cilantro', 'basil', 'oregano', 'thyme', 'rosemary']),

-- Meat & Seafood
('chicken breast', 'meat', 'poultry', ARRAY['chicken', 'boneless chicken breast', 'skinless chicken breast']),
('ground beef', 'meat', 'beef', ARRAY['beef', 'lean ground beef', 'ground chuck']),
('salmon', 'meat', 'seafood', ARRAY['salmon fillet', 'fresh salmon', 'atlantic salmon']),
('shrimp', 'meat', 'seafood', ARRAY['large shrimp', 'peeled shrimp', 'frozen shrimp']),
('bacon', 'meat', 'pork', ARRAY['thick cut bacon', 'turkey bacon']),
('sausage', 'meat', 'pork', ARRAY['italian sausage', 'breakfast sausage', 'chicken sausage']),
('ham', 'meat', 'pork', ARRAY['deli ham', 'spiral ham']),
('turkey', 'meat', 'poultry', ARRAY['ground turkey', 'turkey breast', 'deli turkey']),
('pork chops', 'meat', 'pork', ARRAY['pork', 'bone-in pork chops']),
('ground turkey', 'meat', 'poultry', ARRAY['turkey', 'lean ground turkey']),

-- Dairy
('milk', 'dairy', 'milk', ARRAY['whole milk', '2% milk', 'skim milk', 'almond milk', 'oat milk']),
('eggs', 'dairy', 'eggs', ARRAY['large eggs', 'free range eggs', 'organic eggs']),
('butter', 'dairy', 'dairy', ARRAY['unsalted butter', 'salted butter', 'european butter']),
('cheese', 'dairy', 'cheese', ARRAY['cheddar cheese', 'mozzarella cheese', 'swiss cheese', 'provolone cheese']),
('feta cheese', 'dairy', 'cheese', ARRAY['feta', 'crumbled feta', 'greek feta']),
('parmesan cheese', 'dairy', 'cheese', ARRAY['parmesan', 'grated parmesan', 'parmigiano reggiano']),
('cream cheese', 'dairy', 'cheese', ARRAY['philadelphia cream cheese', 'low fat cream cheese']),
('yogurt', 'dairy', 'yogurt', ARRAY['greek yogurt', 'plain yogurt', 'vanilla yogurt']),
('sour cream', 'dairy', 'dairy', ARRAY['light sour cream', 'full fat sour cream']),
('heavy cream', 'dairy', 'dairy', ARRAY['whipping cream', 'heavy whipping cream']),

-- Pantry
('olive oil', 'pantry', 'oils', ARRAY['extra virgin olive oil', 'light olive oil']),
('vegetable oil', 'pantry', 'oils', ARRAY['canola oil', 'corn oil', 'sunflower oil']),
('salt', 'pantry', 'seasonings', ARRAY['sea salt', 'kosher salt', 'table salt']),
('black pepper', 'pantry', 'seasonings', ARRAY['pepper', 'ground black pepper', 'peppercorns']),
('white rice', 'pantry', 'grains', ARRAY['rice', 'jasmine rice', 'basmati rice']),
('brown rice', 'pantry', 'grains', ARRAY['long grain brown rice', 'short grain brown rice']),
('pasta', 'pantry', 'grains', ARRAY['spaghetti', 'penne', 'rigatoni', 'linguine', 'fettuccine']),
('bread', 'pantry', 'grains', ARRAY['white bread', 'whole wheat bread', 'sourdough bread']),
('flour', 'pantry', 'baking', ARRAY['all purpose flour', 'bread flour', 'cake flour', 'whole wheat flour']),
('sugar', 'pantry', 'baking', ARRAY['white sugar', 'brown sugar', 'powdered sugar', 'granulated sugar']),
('baking powder', 'pantry', 'baking', ARRAY[]),
('baking soda', 'pantry', 'baking', ARRAY['sodium bicarbonate']),
('vinegar', 'pantry', 'condiments', ARRAY['white vinegar', 'apple cider vinegar', 'balsamic vinegar', 'red wine vinegar']),
('soy sauce', 'pantry', 'condiments', ARRAY['low sodium soy sauce', 'tamari']),
('ketchup', 'pantry', 'condiments', ARRAY[]),
('mustard', 'pantry', 'condiments', ARRAY['dijon mustard', 'yellow mustard', 'whole grain mustard']),
('mayonnaise', 'pantry', 'condiments', ARRAY['light mayonnaise', 'olive oil mayonnaise']),
('canned tomatoes', 'pantry', 'canned goods', ARRAY['diced tomatoes', 'crushed tomatoes', 'tomato paste']),
('beans', 'pantry', 'canned goods', ARRAY['black beans', 'kidney beans', 'pinto beans', 'chickpeas', 'garbanzo beans']),
('broth', 'pantry', 'canned goods', ARRAY['chicken broth', 'beef broth', 'vegetable broth', 'stock']),

-- Bakery
('pita bread', 'bakery', 'bread', ARRAY['pita', 'whole wheat pita', 'white pita']),
('naan', 'bakery', 'bread', ARRAY['garlic naan', 'plain naan']),
('tortilla', 'bakery', 'bread', ARRAY['flour tortillas', 'corn tortillas', 'whole wheat tortillas']),
('bagels', 'bakery', 'bread', ARRAY['everything bagels', 'plain bagels', 'sesame bagels']),
('croissants', 'bakery', 'pastry', ARRAY['butter croissants', 'chocolate croissants']),
('muffins', 'bakery', 'pastry', ARRAY['blueberry muffins', 'chocolate chip muffins', 'bran muffins']),

-- Frozen
('frozen vegetables', 'frozen', 'vegetables', ARRAY['frozen broccoli', 'frozen peas', 'frozen corn', 'mixed vegetables']),
('frozen fruit', 'frozen', 'fruits', ARRAY['frozen berries', 'frozen mango', 'frozen pineapple']),
('ice cream', 'frozen', 'desserts', ARRAY['vanilla ice cream', 'chocolate ice cream', 'strawberry ice cream']),
('frozen pizza', 'frozen', 'meals', ARRAY['cheese pizza', 'pepperoni pizza', 'vegetarian pizza']),

-- Beverages
('water', 'beverages', 'water', ARRAY['bottled water', 'sparkling water', 'flavored water']),
('juice', 'beverages', 'juice', ARRAY['orange juice', 'apple juice', 'cranberry juice']),
('coffee', 'beverages', 'coffee', ARRAY['ground coffee', 'coffee beans', 'instant coffee']),
('tea', 'beverages', 'tea', ARRAY['black tea', 'green tea', 'herbal tea', 'tea bags']),

-- Snacks
('chips', 'snacks', 'savory', ARRAY['potato chips', 'tortilla chips', 'corn chips']),
('crackers', 'snacks', 'savory', ARRAY['saltine crackers', 'wheat crackers', 'cheese crackers']),
('nuts', 'snacks', 'nuts', ARRAY['almonds', 'walnuts', 'cashews', 'peanuts', 'mixed nuts']),
('cookies', 'snacks', 'sweet', ARRAY['chocolate chip cookies', 'oatmeal cookies', 'sugar cookies']),

-- Spices & Seasonings
('cumin', 'pantry', 'spices', ARRAY['ground cumin', 'cumin seeds']),
('paprika', 'pantry', 'spices', ARRAY['smoked paprika', 'sweet paprika']),
('oregano', 'pantry', 'spices', ARRAY['dried oregano', 'fresh oregano']),
('basil', 'pantry', 'spices', ARRAY['dried basil', 'fresh basil']),
('thyme', 'pantry', 'spices', ARRAY['dried thyme', 'fresh thyme']),
('rosemary', 'pantry', 'spices', ARRAY['dried rosemary', 'fresh rosemary']),
('garlic powder', 'pantry', 'spices', ARRAY[]),
('onion powder', 'pantry', 'spices', ARRAY[]),
('cinnamon', 'pantry', 'spices', ARRAY['ground cinnamon', 'cinnamon sticks']),
('vanilla extract', 'pantry', 'spices', ARRAY['pure vanilla extract', 'vanilla essence']);

-- Create a function to find ingredients by name or variation
CREATE OR REPLACE FUNCTION find_grocery_item(item_name TEXT)
RETURNS TABLE(name TEXT, category TEXT, subcategory TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gid.name,
    gid.category,
    gid.subcategory
  FROM grocery_items_database gid
  WHERE 
    LOWER(gid.name) = LOWER(item_name)
    OR LOWER(item_name) = ANY(SELECT LOWER(unnest(gid.common_variations)))
    OR LOWER(gid.name) LIKE '%' || LOWER(item_name) || '%'
    OR LOWER(item_name) LIKE '%' || LOWER(gid.name) || '%'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE grocery_items_database IS 'Comprehensive database of grocery items with categories for better classification';
COMMENT ON FUNCTION find_grocery_item IS 'Function to find grocery items by name or common variations';
