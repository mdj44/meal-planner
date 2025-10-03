-- Add position columns to grocery_items table
ALTER TABLE grocery_items
ADD COLUMN IF NOT EXISTS position_x DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS position_y DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_grocery_items_store_id ON grocery_items(store_id);

-- Create a table to store category positions (average positions for each category)
CREATE TABLE IF NOT EXISTS category_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) NOT NULL,
  category TEXT NOT NULL,
  avg_position_x DECIMAL(5,2) NOT NULL,
  avg_position_y DECIMAL(5,2) NOT NULL,
  sample_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, category)
);

-- Create index for category positions
CREATE INDEX IF NOT EXISTS idx_category_positions_store_category ON category_positions(store_id, category);

-- Function to update category average when an item position is saved
CREATE OR REPLACE FUNCTION update_category_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if position is set and category exists
  IF NEW.position_x IS NOT NULL AND NEW.position_y IS NOT NULL AND NEW.category IS NOT NULL AND NEW.store_id IS NOT NULL THEN
    INSERT INTO category_positions (store_id, category, avg_position_x, avg_position_y, sample_count)
    VALUES (NEW.store_id, NEW.category, NEW.position_x, NEW.position_y, 1)
    ON CONFLICT (store_id, category) 
    DO UPDATE SET
      avg_position_x = (category_positions.avg_position_x * category_positions.sample_count + NEW.position_x) / (category_positions.sample_count + 1),
      avg_position_y = (category_positions.avg_position_y * category_positions.sample_count + NEW.position_y) / (category_positions.sample_count + 1),
      sample_count = category_positions.sample_count + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_category_position ON grocery_items;
CREATE TRIGGER trigger_update_category_position
  AFTER INSERT OR UPDATE OF position_x, position_y
  ON grocery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_category_position();

-- Add store_id to grocery_lists table to link lists to stores
ALTER TABLE grocery_lists
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

COMMENT ON COLUMN grocery_items.position_x IS 'X position on store map (percentage 0-100)';
COMMENT ON COLUMN grocery_items.position_y IS 'Y position on store map (percentage 0-100)';
COMMENT ON COLUMN grocery_items.store_id IS 'Store where this item is located';
COMMENT ON TABLE category_positions IS 'Average positions for each category in each store';
