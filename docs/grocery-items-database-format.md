# Grocery Items Database Format for ChatGPT

## Database Structure

The grocery items database uses the following format for each item:

```sql
INSERT INTO grocery_items_database (name, category, subcategory, common_variations) VALUES
('item_name', 'category', 'subcategory', ARRAY['variation1', 'variation2', 'variation3']);
```

## Categories and Subcategories

### Produce
- **Fruits**: apple, banana, orange, lemon, lime, avocado, berries, etc.
- **Vegetables**: tomato, onion, garlic, lettuce, carrot, potato, bell pepper, etc.
- **Herbs**: parsley, cilantro, basil, oregano, thyme, rosemary, etc.

### Meat & Seafood
- **Poultry**: chicken, turkey, duck
- **Beef**: ground beef, steak, roast
- **Pork**: bacon, sausage, ham, pork chops
- **Seafood**: salmon, shrimp, tuna, cod, etc.

### Dairy
- **Milk**: whole milk, 2% milk, skim milk, almond milk, oat milk
- **Cheese**: cheddar, mozzarella, feta, parmesan, cream cheese
- **Eggs**: large eggs, free range eggs, organic eggs
- **Other**: butter, yogurt, sour cream, heavy cream

### Pantry
- **Oils**: olive oil, vegetable oil, canola oil, coconut oil
- **Grains**: rice, pasta, quinoa, oats, barley
- **Baking**: flour, sugar, baking powder, baking soda, yeast
- **Canned Goods**: tomatoes, beans, broth, soup
- **Condiments**: ketchup, mustard, mayonnaise, soy sauce
- **Seasonings**: salt, pepper, spices, herbs (dried)

### Bakery
- **Bread**: white bread, whole wheat bread, sourdough, pita, naan
- **Pastry**: croissants, muffins, bagels, rolls

### Frozen
- **Vegetables**: frozen broccoli, peas, corn, mixed vegetables
- **Fruits**: frozen berries, mango, pineapple
- **Meals**: frozen pizza, frozen dinners
- **Desserts**: ice cream, frozen yogurt

### Beverages
- **Water**: bottled water, sparkling water
- **Juice**: orange juice, apple juice, cranberry juice
- **Coffee & Tea**: ground coffee, coffee beans, tea bags
- **Soda**: cola, lemon-lime, root beer

### Snacks
- **Savory**: chips, crackers, pretzels, popcorn
- **Sweet**: cookies, candy, chocolate
- **Nuts**: almonds, walnuts, cashews, peanuts

## Instructions for ChatGPT

Please generate a comprehensive list of grocery items following this format. For each item:

1. **Name**: Use the most common name (e.g., "chicken breast" not "boneless skinless chicken breast")
2. **Category**: Choose from the categories above
3. **Subcategory**: Choose appropriate subcategory
4. **Common Variations**: Include 2-5 common variations people might use

### Example Output Format:

```sql
-- Produce - Fruits
('apple', 'produce', 'fruits', ARRAY['apples', 'red apple', 'gala apple']),
('banana', 'produce', 'fruits', ARRAY['bananas']),
('strawberry', 'produce', 'fruits', ARRAY['strawberries', 'fresh strawberries']),

-- Produce - Vegetables  
('broccoli', 'produce', 'vegetables', ARRAY['broccoli florets', 'fresh broccoli']),
('asparagus', 'produce', 'vegetables', ARRAY['fresh asparagus', 'asparagus spears']),

-- Meat - Poultry
('chicken thighs', 'meat', 'poultry', ARRAY['chicken', 'bone-in chicken thighs']),
('ground chicken', 'meat', 'poultry', ARRAY['chicken', 'lean ground chicken']),

-- Dairy - Cheese
('swiss cheese', 'dairy', 'cheese', ARRAY['swiss', 'sliced swiss cheese']),
('goat cheese', 'dairy', 'cheese', ARRAY['chevre', 'soft goat cheese']),
```

## Target Numbers

Please generate approximately:
- **200+ produce items** (fruits, vegetables, herbs)
- **100+ meat/seafood items** (all types)
- **150+ dairy items** (milk, cheese, eggs, etc.)
- **300+ pantry items** (oils, grains, baking, canned, condiments, spices)
- **50+ bakery items** (bread, pastry)
- **100+ frozen items** (vegetables, fruits, meals, desserts)
- **100+ beverages** (water, juice, coffee, tea, soda)
- **150+ snacks** (savory, sweet, nuts)

**Total Target: 1,000+ grocery items**

## Special Considerations

1. **Include organic versions** where common (e.g., "organic milk")
2. **Include size variations** where relevant (e.g., "large eggs", "baby carrots")
3. **Include preparation variations** (e.g., "diced tomatoes", "minced garlic")
4. **Include brand variations** for very common items (e.g., "Philadelphia cream cheese")
5. **Think about what people actually search for** in grocery stores
6. **Include international items** (e.g., "naan", "tortillas", "soy sauce")

This database will be used to automatically classify ingredients from recipes, so accuracy and comprehensiveness are key!
