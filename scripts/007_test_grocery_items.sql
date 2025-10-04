-- Test script to verify grocery_items_database table works
INSERT INTO grocery_items_database (name, category, subcategory, common_variations) VALUES
('apple', 'produce', 'fruits', ARRAY['red apple', 'gala apple', 'granny smith apple']),
('banana', 'produce', 'fruits', ARRAY['fresh banana', 'organic banana']),
('chicken breast', 'meat & seafood', 'poultry', ARRAY['boneless skinless', 'bone-in']),
('milk', 'dairy', 'milk', ARRAY['whole milk', '2% milk', 'skim milk']),
('bread', 'bakery', 'bread', ARRAY['white bread', 'whole wheat bread']);
