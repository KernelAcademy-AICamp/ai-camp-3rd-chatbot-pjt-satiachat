-- DietRx Coach Database Schema
-- Run this SQL in Supabase SQL Editor

-- ============================================================
-- 1. User Profiles (extends Supabase Auth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  birth_year INTEGER,
  height_cm NUMERIC(5,2),
  current_weight_kg NUMERIC(5,2),
  goal_weight_kg NUMERIC(5,2),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  target_calories INTEGER,
  chat_persona TEXT CHECK (chat_persona IN ('cold', 'bright', 'strict')) DEFAULT 'bright',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. Meals (meal records)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  total_calories INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Meal Items (individual food items in a meal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  protein_g NUMERIC(6,2),
  carbs_g NUMERIC(6,2),
  fat_g NUMERIC(6,2),
  quantity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. Progress Logs (weight and body composition tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  body_fat_percent NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================
-- 5. Medications (medication information)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'as_needed')),
  time_of_day TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. Medication Logs (tracking when medications are taken)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT CHECK (status IN ('taken', 'skipped', 'delayed')) DEFAULT 'taken',
  notes TEXT
);

-- ============================================================
-- 7. Chat Messages (AI chat history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON public.meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_date ON public.progress_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user ON public.medication_logs(user_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id, created_at);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: Users can only access their own data
-- ============================================================

-- User Profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Meals
CREATE POLICY "Users can CRUD own meals" ON public.meals
  FOR ALL USING (auth.uid() = user_id);

-- Meal Items (through meals relationship)
CREATE POLICY "Users can CRUD own meal items" ON public.meal_items
  FOR ALL USING (
    meal_id IN (SELECT id FROM public.meals WHERE user_id = auth.uid())
  );

-- Progress Logs
CREATE POLICY "Users can CRUD own progress" ON public.progress_logs
  FOR ALL USING (auth.uid() = user_id);

-- Medications
CREATE POLICY "Users can CRUD own medications" ON public.medications
  FOR ALL USING (auth.uid() = user_id);

-- Medication Logs
CREATE POLICY "Users can CRUD own medication logs" ON public.medication_logs
  FOR ALL USING (auth.uid() = user_id);

-- Chat Messages
CREATE POLICY "Users can CRUD own chat messages" ON public.chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_meals_updated_at ON public.meals;
CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_medications_updated_at ON public.medications;
CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. Foods (Korean food nutrition database)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.foods (
  id SERIAL PRIMARY KEY,
  food_code VARCHAR(30) UNIQUE NOT NULL,        -- 식품코드
  food_name VARCHAR(200) NOT NULL,              -- 식품명 (검색용)
  representative_name VARCHAR(200),             -- 대표식품명 (그룹핑용)
  category VARCHAR(100),                        -- 식품대분류명
  calories NUMERIC(10,2),                       -- 에너지(kcal)
  protein NUMERIC(10,2),                        -- 단백질(g)
  fat NUMERIC(10,2),                            -- 지방(g)
  carbs NUMERIC(10,2),                          -- 탄수화물(g)
  sugar NUMERIC(10,2),                          -- 당류(g)
  fiber NUMERIC(10,2),                          -- 식이섬유(g)
  sodium NUMERIC(10,2),                         -- 나트륨(mg)
  serving_size VARCHAR(50),                     -- 영양성분함량기준량
  food_weight VARCHAR(50),                      -- 식품중량
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foods 검색 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_foods_name ON public.foods USING gin(to_tsvector('simple', food_name));
CREATE INDEX IF NOT EXISTS idx_foods_name_like ON public.foods(food_name varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_foods_rep_name ON public.foods(representative_name);
CREATE INDEX IF NOT EXISTS idx_foods_category ON public.foods(category);

-- Foods는 공용 데이터이므로 모든 인증된 사용자가 읽기 가능
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read foods" ON public.foods
  FOR SELECT USING (true);

-- 음식 검색 함수 (한글 검색 최적화)
CREATE OR REPLACE FUNCTION search_foods(search_term TEXT, max_results INT DEFAULT 20)
RETURNS TABLE (
  id INT,
  food_code VARCHAR,
  food_name VARCHAR,
  representative_name VARCHAR,
  category VARCHAR,
  calories NUMERIC,
  protein NUMERIC,
  fat NUMERIC,
  carbs NUMERIC,
  sugar NUMERIC,
  fiber NUMERIC,
  sodium NUMERIC,
  serving_size VARCHAR,
  food_weight VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.food_code,
    f.food_name,
    f.representative_name,
    f.category,
    f.calories,
    f.protein,
    f.fat,
    f.carbs,
    f.sugar,
    f.fiber,
    f.sodium,
    f.serving_size,
    f.food_weight
  FROM public.foods f
  WHERE f.food_name ILIKE '%' || search_term || '%'
     OR f.representative_name ILIKE '%' || search_term || '%'
  ORDER BY
    -- 정확히 일치하는 것 우선
    CASE WHEN f.food_name = search_term THEN 0
         WHEN f.representative_name = search_term THEN 1
         WHEN f.food_name ILIKE search_term || '%' THEN 2
         WHEN f.representative_name ILIKE search_term || '%' THEN 3
         ELSE 4 END,
    -- 그 다음 이름 길이가 짧은 것 우선 (더 일반적인 음식)
    LENGTH(f.food_name),
    f.food_name
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Development Helper: Create test user for development
-- Run this ONLY in development environment
-- ============================================================
-- INSERT INTO auth.users (id, email)
-- VALUES ('dev-user-00000000-0000-0000-0000-000000000001', 'dev@test.com')
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO public.user_profiles (id, email, chat_persona, target_calories)
-- VALUES ('dev-user-00000000-0000-0000-0000-000000000001', 'dev@test.com', 'bright', 1800)
-- ON CONFLICT (id) DO NOTHING;
