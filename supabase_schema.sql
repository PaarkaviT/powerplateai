-- ====================================================================
-- PHASE 2: DATABASE SETUP (Supabase PostgreSQL SQL Schema)
-- ====================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC,
  weight_kg NUMERIC,
  bmi NUMERIC,
  region_cuisine TEXT,
  dietary_preference TEXT CHECK (dietary_preference IN ('omnivore', 'vegetarian', 'vegan', 'keto', 'gluten-free', 'jain', 'halal')),
  health_goals TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  diabetic BOOLEAN DEFAULT FALSE,
  hypertension BOOLEAN DEFAULT FALSE,
  pregnancy BOOLEAN DEFAULT FALSE,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
  daily_calorie_target INTEGER,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2. RECIPES
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  ingredients JSONB, -- [{ name, quantity, unit }]
  steps TEXT[],
  nutrition JSONB, -- { calories, protein_g, carbs_g, fat_g, fiber_g }
  dietary_tag TEXT,
  tags TEXT[] DEFAULT '{}',
  glycemic_index TEXT CHECK (glycemic_index IN ('low', 'medium', 'high')),
  nutrition_summary TEXT,
  prep_time_mins INTEGER,
  servings INTEGER DEFAULT 1,
  sugar_g NUMERIC DEFAULT 0,
  sodium_mg NUMERIC DEFAULT 0,
  difficulty TEXT DEFAULT 'medium',
  audience_type TEXT DEFAULT 'adults',
  cost_to_make NUMERIC DEFAULT 0,
  regional_names JSONB DEFAULT '{}'::jsonb,
  seasonal_months INTEGER[] DEFAULT '{}'::integer[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEAL PLANS
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEAL PLAN ITEMS
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id),
  day_of_week TEXT CHECK (day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  meal_slot TEXT CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack'))
);

-- 5. MEAL LOGS (what the user actually ate)
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id),
  meal_slot TEXT CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings NUMERIC DEFAULT 1,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DAILY NUTRITION LOGS (aggregated per day)
CREATE TABLE IF NOT EXISTS daily_nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calories NUMERIC DEFAULT 0,
  total_protein_g NUMERIC DEFAULT 0,
  total_carbs_g NUMERIC DEFAULT 0,
  total_fat_g NUMERIC DEFAULT 0,
  total_fiber_g NUMERIC DEFAULT 0,
  total_sugar_g NUMERIC DEFAULT 0,
  total_sodium_mg NUMERIC DEFAULT 0,
  UNIQUE(user_id, date)
);

-- 7. AI SUGGESTION CACHE
CREATE TABLE IF NOT EXISTS ai_suggestion_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  suggestions JSONB,
  UNIQUE(user_id, date)
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestion_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read and update their own row
CREATE POLICY "Own profile only" ON profiles FOR ALL USING (auth.uid() = id);

-- Recipes: public read, admin write only
CREATE POLICY "Public recipe read" ON recipes FOR SELECT USING (true);
CREATE POLICY "Admin recipe write" ON recipes FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Meal Plans: users own their plans
CREATE POLICY "Own meal plans" ON meal_plans FOR ALL USING (auth.uid() = user_id);

-- Meal Plan Items: users can access items if they own the parent meal plan
CREATE POLICY "Own plan items" ON meal_plan_items FOR ALL 
USING (plan_id IN (SELECT id FROM meal_plans WHERE user_id = auth.uid()));

-- Meal Logs: users own their logs
CREATE POLICY "Own meal logs" ON meal_logs FOR ALL USING (auth.uid() = user_id);

-- Daily Nutrition Logs: users own their nutrition logs
CREATE POLICY "Own nutrition logs" ON daily_nutrition_logs FOR ALL USING (auth.uid() = user_id);

-- AI Suggestion Cache: users own their cache
CREATE POLICY "Own AI cache" ON ai_suggestion_cache FOR ALL USING (auth.uid() = user_id);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_nutrition_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tag ON recipes(dietary_tag);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan ON meal_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_user_date ON ai_suggestion_cache(user_id, date);

-- ====================================================================
-- STORAGE BUCKETS CONFIGURATION
-- ====================================================================

-- Note: In Supabase, storage buckets are defined in the storage schema.
-- We check and insert the configuration rows directly:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('recipe-images', 'recipe-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('user-avatars', 'user-avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage buckets
-- Avatars: Only the owner can upload/read their own avatar (under their user ID folder name)
CREATE POLICY "Avatar Owner Upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar Owner Update" ON storage.objects FOR UPDATE 
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar Owner Select" ON storage.objects FOR SELECT 
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar Owner Delete" ON storage.objects FOR DELETE 
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Recipe Images: Public read, only service_role (admins) can upload
CREATE POLICY "Public Recipe Image Select" ON storage.objects FOR SELECT 
USING (bucket_id = 'recipe-images');

CREATE POLICY "Admin Recipe Image Insert" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'recipe-images' AND auth.role() = 'service_role');

-- ====================================================================
-- SEED SAMPLE RECIPES DATA
-- ====================================================================
INSERT INTO recipes (id, name, description, image_url, ingredients, steps, nutrition, dietary_tag, tags, glycemic_index, nutrition_summary, prep_time_mins, servings)
VALUES
  (
    'a8f9c0b2-3d4e-5f6a-7b8c-9d0e1f2a3b4c', 
    'Creamy Avocado Toast', 
    'Crispy sourdough toast topped with mashed avocado, cherry tomatoes, and microgreens.', 
    'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=60', 
    '[{"name": "Sourdough Bread", "quantity": 2, "unit": "slices"}, {"name": "Avocado", "quantity": 1, "unit": "whole"}, {"name": "Cherry Tomatoes", "quantity": 5, "unit": "pieces"}, {"name": "Olive Oil", "quantity": 1, "unit": "tsp"}]'::jsonb, 
    ARRAY['Toast the sourdough slices to your liking.', 'Mash the avocado with a pinch of salt and pepper.', 'Spread the mashed avocado onto the toast.', 'Top with halved cherry tomatoes and microgreens.'], 
    '{"calories": 320, "protein_g": 8, "carbs_g": 38, "fat_g": 16, "fiber_g": 7}'::jsonb, 
    'vegetarian', 
    ARRAY['vegetarian', 'low-calorie'], 
    'low', 
    'Rich in healthy monounsaturated fats and fiber, which helps keep glycemic response low.', 
    10, 
    1
  ),
  (
    'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 
    'Zesty Quinoa Salad', 
    'A refreshing bowl of quinoa tossed with cucumber, bell peppers, fresh parsley, and lemon dressing.', 
    'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=600&auto=format&fit=crop&q=60', 
    '[{"name": "Quinoa", "quantity": 1, "unit": "cup"}, {"name": "Cucumber", "quantity": 0.5, "unit": "whole"}, {"name": "Bell Pepper", "quantity": 1, "unit": "whole"}, {"name": "Lemon Juice", "quantity": 2, "unit": "tbsp"}]'::jsonb, 
    ARRAY['Cook the quinoa according to package instructions.', 'Chop cucumber and bell peppers into small cubes.', 'Combine quinoa, veggies, and parsley in a large bowl.', 'Drizzle lemon juice and olive oil, and toss to combine.'], 
    '{"calories": 380, "protein_g": 12, "carbs_g": 52, "fat_g": 10, "fiber_g": 9}'::jsonb, 
    'vegan', 
    ARRAY['vegan', 'high-fiber'], 
    'medium', 
    'High in complex carbohydrates and plant proteins, offering a slow and steady release of energy.', 
    15, 
    2
  ),
  (
    'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 
    'Garlic Butter Salmon', 
    'Pan-seared salmon fillet basted with rich garlic butter, served with steamed asparagus.', 
    'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&auto=format&fit=crop&q=60', 
    '[{"name": "Salmon Fillet", "quantity": 200, "unit": "g"}, {"name": "Butter", "quantity": 2, "unit": "tbsp"}, {"name": "Garlic Cloves", "quantity": 3, "unit": "pieces"}, {"name": "Asparagus", "quantity": 100, "unit": "g"}]'::jsonb, 
    ARRAY['Season the salmon fillet with salt, pepper, and lemon.', 'Melt butter in a pan over medium heat and add minced garlic.', 'Sear the salmon skin-side down for 4-5 minutes.', 'Flip and baste with butter until cooked through. Serve with steamed asparagus.'], 
    '{"calories": 550, "protein_g": 42, "carbs_g": 4, "fat_g": 38, "fiber_g": 3}'::jsonb, 
    'keto', 
    ARRAY['keto', 'high-protein'], 
    'low', 
    'Extremely low carb and rich in omega-3 fatty acids, resulting in a negligible glycemic index.', 
    20, 
    1
  )
ON CONFLICT (id) DO NOTHING;


-- ====================================================================
-- FAMILY PROFILES (MODULE 9)
-- ====================================================================
CREATE TABLE IF NOT EXISTS family_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dietary_preference TEXT CHECK (dietary_preference IN ('omnivore', 'vegetarian', 'vegan', 'keto', 'gluten-free', 'jain', 'halal')),
  diabetic BOOLEAN DEFAULT FALSE,
  hypertension BOOLEAN DEFAULT FALSE,
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;

-- Own family profiles RLS Policy
CREATE POLICY "Own family profiles" ON family_profiles FOR ALL USING (auth.uid() = parent_id);

