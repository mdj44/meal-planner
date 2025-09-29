-- Insert sample stores for testing
INSERT INTO public.stores (id, name, address, layout_data) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Whole Foods Market', '123 Main St, Anytown, USA', '{"width": 800, "height": 600, "aisles": [{"name": "Produce", "x": 50, "y": 50, "width": 200, "height": 100}, {"name": "Dairy", "x": 300, "y": 50, "width": 150, "height": 100}, {"name": "Meat & Seafood", "x": 500, "y": 50, "width": 200, "height": 100}]}'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Safeway', '456 Oak Ave, Anytown, USA', '{"width": 700, "height": 500, "aisles": [{"name": "Produce", "x": 40, "y": 40, "width": 180, "height": 80}, {"name": "Bakery", "x": 250, "y": 40, "width": 120, "height": 80}, {"name": "Frozen Foods", "x": 400, "y": 40, "width": 200, "height": 80}]}'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Trader Joe''s', '789 Pine St, Anytown, USA', '{"width": 600, "height": 400, "aisles": [{"name": "Produce", "x": 30, "y": 30, "width": 150, "height": 70}, {"name": "Pantry", "x": 200, "y": 30, "width": 180, "height": 70}, {"name": "Refrigerated", "x": 400, "y": 30, "width": 150, "height": 70}]}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample item locations for testing
INSERT INTO public.item_locations (store_id, item_name, category, aisle, position_x, position_y, confidence_score) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'bananas', 'produce', 'Produce', 100, 75, 5),
  ('550e8400-e29b-41d4-a716-446655440001', 'milk', 'dairy', 'Dairy', 375, 75, 8),
  ('550e8400-e29b-41d4-a716-446655440001', 'chicken breast', 'meat', 'Meat & Seafood', 600, 75, 6),
  ('550e8400-e29b-41d4-a716-446655440002', 'apples', 'produce', 'Produce', 130, 80, 4),
  ('550e8400-e29b-41d4-a716-446655440002', 'bread', 'bakery', 'Bakery', 310, 80, 7),
  ('550e8400-e29b-41d4-a716-446655440002', 'frozen pizza', 'frozen', 'Frozen Foods', 500, 80, 3)
ON CONFLICT (store_id, item_name) DO NOTHING;
