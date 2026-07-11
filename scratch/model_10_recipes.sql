-- Supabase Manual SQL Inserts for 10 Healthy Recipes
-- Avoids empty ARRAY[] type inference error by using explicit INTEGER arrays (seasonal_months)

INSERT INTO recipes (
  name,
  description,
  image_url,
  ingredients,
  steps,
  nutrition,
  dietary_tag,
  tags,
  glycemic_index,
  nutrition_summary,
  prep_time_mins,
  servings,
  sugar_g,
  sodium_mg,
  difficulty,
  audience_type,
  cost_to_make,
  regional_names,
  seasonal_months
) VALUES 
-- 1. CLASSIC PANEER TIKKA
(
  'Classic Paneer Tikka',
  'Soft paneer cubes marinated in a spiced yogurt mixture and grilled to perfection. A popular Indian vegetarian appetizer.',
  'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Paneer", "quantity": 200, "unit": "g"},
    {"name": "Thick Yogurt", "quantity": 100, "unit": "g"},
    {"name": "Turmeric Powder", "quantity": 0.5, "unit": "tsp"},
    {"name": "Garam Masala", "quantity": 1, "unit": "tsp"},
    {"name": "Bell Peppers", "quantity": 1, "unit": "pcs"}
  ]'::jsonb,
  ARRAY[
    'Cut paneer and bell peppers into medium sized cubes.',
    'In a bowl mix yogurt, turmeric, chili powder, and salt.',
    'Marinate paneer and vegetables in the yogurt mix for twenty minutes.',
    'Skewer the paneer and vegetables alternately.',
    'Grill in an oven or pan until edges turn golden brown.'
  ],
  '{"calories": 280, "protein_g": 18, "carbs_g": 8, "fat_g": 20, "fiber_g": 2}'::jsonb,
  'vegetarian',
  ARRAY['appetizer', 'high-protein', 'indian'],
  'low',
  'Rich in calcium and protein. Ideal for low-carb vegetarian diets.',
  25,
  2,
  2.0,
  450,
  'medium',
  'adults',
  0,
  '{"Hindi": "Paneer Tikka", "English": "Grilled Cottage Cheese Skewers"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 2. GARLIC ROASTED BROCCOLI
(
  'Garlic Roasted Broccoli',
  'Crispy oven-roasted broccoli florets tossed in olive oil, toasted garlic, and freshly squeezed lemon juice.',
  'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Broccoli Florets", "quantity": 300, "unit": "g"},
    {"name": "Olive Oil", "quantity": 1.5, "unit": "tbsp"},
    {"name": "Minced Garlic", "quantity": 2, "unit": "tsp"},
    {"name": "Lemon Juice", "quantity": 1, "unit": "tbsp"}
  ]'::jsonb,
  ARRAY[
    'Preheat oven to four hundred degrees.',
    'Toss broccoli florets with olive oil, minced garlic, salt, and pepper.',
    'Spread the broccoli in a single layer on a baking sheet.',
    'Roast for fifteen minutes until edges are crispy.',
    'Drizzle with fresh lemon juice before serving.'
  ],
  '{"calories": 110, "protein_g": 4, "carbs_g": 10, "fat_g": 7, "fiber_g": 4}'::jsonb,
  'vegan',
  ARRAY['side-dish', 'low-carb', 'high-fiber', 'quick-cook'],
  'low',
  'Extremely high in Vitamin C and dietary fiber. Boosts immune function.',
  15,
  2,
  1.0,
  190,
  'easy',
  'kids',
  0,
  '{"English": "Garlic Roasted Broccoli", "French": "Brocoli Roti a l''Ail"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 3. HIGH-PROTEIN CHICKPEA SALAD
(
  'High-Protein Chickpea Salad',
  'A refreshing salad loaded with chickpeas, cucumbers, juicy tomatoes, and a light lemon vinaigrette.',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Boiled Chickpeas", "quantity": 1.5, "unit": "cup"},
    {"name": "Cucumber", "quantity": 1, "unit": "pcs"},
    {"name": "Cherry Tomatoes", "quantity": 10, "unit": "pcs"},
    {"name": "Lemon Juice", "quantity": 1.5, "unit": "tbsp"},
    {"name": "Olive Oil", "quantity": 1, "unit": "tbsp"}
  ]'::jsonb,
  ARRAY[
    'Rinse and drain the boiled chickpeas.',
    'Dice cucumber, tomatoes, and chop the fresh cilantro.',
    'Combine chickpeas and vegetables in a large salad bowl.',
    'Drizzle olive oil, lemon juice, and add salt.',
    'Toss the mixture thoroughly and chill before serving.'
  ],
  '{"calories": 240, "protein_g": 12, "carbs_g": 34, "fat_g": 8, "fiber_g": 9}'::jsonb,
  'vegan',
  ARRAY['salad', 'high-fiber', 'high-protein', 'no-cook'],
  'low',
  'High in plant-based protein and soluble fiber to support gut health.',
  10,
  2,
  3.0,
  280,
  'easy',
  'adults',
  0,
  '{"English": "Chickpea Salad", "Spanish": "Ensalada de Garbanzos"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 4. KETO GRILLED CHICKEN BREAST
(
  'Keto Grilled Chicken Breast',
  'Juicy, tender chicken breast seasoned with paprika and oregano. An excellent zero-carb protein option.',
  'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Chicken Breast", "quantity": 180, "unit": "g"},
    {"name": "Olive Oil", "quantity": 1, "unit": "tbsp"},
    {"name": "Paprika", "quantity": 0.5, "unit": "tsp"},
    {"name": "Oregano", "quantity": 0.5, "unit": "tsp"}
  ]'::jsonb,
  ARRAY[
    'Pound the chicken breast to an even thickness.',
    'Rub olive oil, paprika, oregano, garlic powder, and salt on the chicken.',
    'Heat a grill pan over medium high heat.',
    'Grill the chicken for six minutes on each side until cooked through.',
    'Let the chicken rest for five minutes before slicing.'
  ],
  '{"calories": 260, "protein_g": 36, "carbs_g": 0, "fat_g": 12, "fiber_g": 0}'::jsonb,
  'keto',
  ARRAY['dinner', 'high-protein', 'zero-carb'],
  'low',
  'Perfect for ketogenic diets. Promotes muscle building and cellular repair.',
  20,
  1,
  0.0,
  380,
  'easy',
  'adults',
  0,
  '{"English": "Grilled Chicken", "Spanish": "Pollo a la Parrilla"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 5. SPICED RED LENTIL SOUP (MASOOR DAL)
(
  'Spiced Red Lentil Soup (Masoor Dal)',
  'A classic comforting Indian soup made of split red lentils simmered with ginger, tomatoes, and cumin.',
  'https://images.unsplash.com/photo-1547592165-e1d17fed6005?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Red Lentils", "quantity": 1, "unit": "cup"},
    {"name": "Roma Tomatoes", "quantity": 2, "unit": "pcs"},
    {"name": "Cumin Seeds", "quantity": 1, "unit": "tsp"},
    {"name": "Ginger Paste", "quantity": 1, "unit": "tsp"}
  ]'::jsonb,
  ARRAY[
    'Rinse red lentils under running water.',
    'In a pot heat oil and splutter cumin seeds.',
    'Add grated ginger and chopped tomatoes, cooking until soft.',
    'Add lentils, turmeric, salt, and four cups of water.',
    'Simmer on low heat for twenty minutes until lentils are soft.'
  ],
  '{"calories": 180, "protein_g": 11, "carbs_g": 30, "fat_g": 2, "fiber_g": 7}'::jsonb,
  'vegan',
  ARRAY['soup', 'indian', 'high-fiber', 'comfort-food'],
  'low',
  'Very rich in iron and magnesium. Helps maintain healthy oxygen levels.',
  25,
  3,
  1.5,
  310,
  'easy',
  'elderly',
  0,
  '{"Hindi": "Masoor Dal Tadka", "English": "Red Lentil Soup"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 6. JAIN CUMIN RICE (JEERA RICE)
(
  'Jain Cumin Rice (Jeera Rice)',
  'Fluffy basmati rice tempered with aromatic cumin seeds and pure ghee. Free of onion and garlic.',
  'https://images.unsplash.com/photo-1626804475315-7644b977464b?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Basmati Rice", "quantity": 1, "unit": "cup"},
    {"name": "Cumin Seeds", "quantity": 1.5, "unit": "tsp"},
    {"name": "Pure Ghee", "quantity": 1, "unit": "tbsp"}
  ]'::jsonb,
  ARRAY[
    'Wash basmati rice and soak in water for fifteen minutes.',
    'Drain water and keep rice aside.',
    'Heat ghee in a pot and add cumin seeds until they splutter.',
    'Add rice and sauté gently for two minutes.',
    'Add water and salt, cover, and cook on low heat until water is absorbed.'
  ],
  '{"calories": 210, "protein_g": 4, "carbs_g": 44, "fat_g": 3, "fiber_g": 1}'::jsonb,
  'jain',
  ARRAY['lunch', 'dinner', 'indian', 'gluten-free'],
  'medium',
  'Authentic Jain recipe, light on the stomach and easy to digest.',
  20,
  2,
  0.5,
  220,
  'easy',
  'elderly',
  0,
  '{"Hindi": "Jeera Rice", "English": "Cumin Tempered Rice"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 7. VEGAN AVOCADO CHOCOLATE PUDDING
(
  'Vegan Avocado Chocolate Pudding',
  'A rich, decadent chocolate pudding made healthy with ripe avocados and sweetened with pure maple syrup.',
  'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Ripe Avocado", "quantity": 2, "unit": "pcs"},
    {"name": "Cocoa Powder", "quantity": 0.25, "unit": "cup"},
    {"name": "Maple Syrup", "quantity": 3, "unit": "tbsp"},
    {"name": "Almond Milk", "quantity": 0.25, "unit": "cup"}
  ]'::jsonb,
  ARRAY[
    'Cut avocados and scoop the flesh into a blender.',
    'Add cocoa powder, maple syrup, almond milk, and vanilla extract.',
    'Blend on high speed until completely smooth and creamy.',
    'Pour into serving bowls and refrigerate for one hour.',
    'Garnish with berries and serve cold.'
  ],
  '{"calories": 230, "protein_g": 3, "carbs_g": 22, "fat_g": 16, "fiber_g": 6}'::jsonb,
  'vegan',
  ARRAY['dessert', 'snack', 'healthy-fats', 'quick-cook'],
  'low',
  'Provides healthy monounsaturated fats and essential minerals without refined sugars.',
  10,
  2,
  12.0,
  60,
  'easy',
  'kids',
  0,
  '{"English": "Avocado Chocolate Mousse", "French": "Mousse au Chocolat d''Avocat"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 8. VEGETARIAN OATS UPMA
(
  'Vegetarian Oats Upma',
  'A savory breakfast dish made by cooking quick oats with mustard seeds, curry leaves, and colorful vegetables.',
  'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Rolled Oats", "quantity": 1, "unit": "cup"},
    {"name": "Mustard Seeds", "quantity": 1, "unit": "tsp"},
    {"name": "Ginger", "quantity": 1, "unit": "tsp"},
    {"name": "Mixed Vegetables", "quantity": 0.5, "unit": "cup"}
  ]'::jsonb,
  ARRAY[
    'Dry roast rolled oats in a pan for three minutes and set aside.',
    'Heat oil in a pan, add mustard seeds, ginger, and chili.',
    'Add chopped mixed vegetables and sauté for three minutes.',
    'Add two cups of water, turmeric, and salt, then bring to a boil.',
    'Stir in oats, cover, and cook on low heat until water is absorbed.'
  ],
  '{"calories": 190, "protein_g": 6, "carbs_g": 32, "fat_g": 4, "fiber_g": 5}'::jsonb,
  'vegetarian',
  ARRAY['breakfast', 'south-indian', 'quick-cook'],
  'medium',
  'Packed with beta-glucan fibers which are great for heart health.',
  15,
  2,
  1.5,
  290,
  'easy',
  'kids',
  0,
  '{"Hindi": "Oats Upma", "English": "Savory Oatmeal Hash"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 9. LOW-CARB SPINACH OMELETTE
(
  'Low-Carb Spinach Omelette',
  'A simple, high-protein breakfast featuring organic eggs cooked with fresh baby spinach and olive oil.',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Organic Eggs", "quantity": 2, "unit": "pcs"},
    {"name": "Baby Spinach", "quantity": 50, "unit": "g"},
    {"name": "Olive Oil", "quantity": 1, "unit": "tsp"}
  ]'::jsonb,
  ARRAY[
    'Whisk eggs in a bowl with salt and black pepper.',
    'Heat olive oil in a pan and sauté spinach leaves until wilted.',
    'Pour the whisked eggs over the sautéed spinach.',
    'Cook on medium heat until the bottom is set.',
    'Fold the omelette in half and cook for one more minute.'
  ],
  '{"calories": 170, "protein_g": 14, "carbs_g": 1, "fat_g": 12, "fiber_g": 1}'::jsonb,
  'vegetarian',
  ARRAY['breakfast', 'keto', 'low-carb', 'high-protein'],
  'low',
  'Rich in choline, proteins, and iron. Keeps energy levels stable throughout the morning.',
  10,
  1,
  0.2,
  320,
  'easy',
  'adults',
  0,
  '{"English": "Spinach Omelette", "French": "Omelette aux Epinards"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
),

-- 10. HALAL BEEF STIR-FRY
(
  'Halal Beef Stir-Fry',
  'Stir-fried tender beef strips and crunchy broccoli florets in a rich garlic ginger soy sauce.',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
  '[
    {"name": "Halal Beef Strips", "quantity": 150, "unit": "g"},
    {"name": "Broccoli Florets", "quantity": 100, "unit": "g"},
    {"name": "Soy Sauce", "quantity": 1.5, "unit": "tbsp"},
    {"name": "Sesame Oil", "quantity": 1, "unit": "tbsp"}
  ]'::jsonb,
  ARRAY[
    'Marinate beef strips in soy sauce and cornstarch for ten minutes.',
    'Heat sesame oil in a wok or large pan.',
    'Add minced ginger and garlic, sautéing for one minute.',
    'Add beef strips and stir fry on high heat until browned.',
    'Add broccoli florets and cook for three minutes until tender.'
  ],
  '{"calories": 310, "protein_g": 28, "carbs_g": 8, "fat_g": 18, "fiber_g": 2}'::jsonb,
  'omnivore',
  ARRAY['dinner', 'halal', 'high-protein', 'lunch'],
  'low',
  'Halal certified meat source. High in bioavailable zinc and iron.',
  20,
  1,
  1.0,
  550,
  'medium',
  'adults',
  0,
  '{"English": "Beef Broccoli Stir Fry", "Chinese": "Beef Stir Fry"}'::jsonb,
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
);
