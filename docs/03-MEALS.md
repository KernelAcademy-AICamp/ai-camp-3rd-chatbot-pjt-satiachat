# 식단 기록 기능

## 개요

사용자가 일일 식사를 기록하고 칼로리/영양소를 추적하는 핵심 기능입니다.

## 데이터 모델

### meals 테이블

```sql
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  total_calories INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### meal_items 테이블

```sql
CREATE TABLE public.meal_items (
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
```

### foods 테이블 (음식 DB)

```sql
CREATE TABLE public.foods (
  id SERIAL PRIMARY KEY,
  food_code VARCHAR(30) UNIQUE NOT NULL,
  food_name VARCHAR(200) NOT NULL,
  representative_name VARCHAR(200),
  category VARCHAR(100),
  calories NUMERIC(10,2),
  protein NUMERIC(10,2),
  fat NUMERIC(10,2),
  carbs NUMERIC(10,2),
  -- ... 추가 영양소
);
```

**총 11,086개 한국 음식 데이터** (식품의약품안전처 제공)

## 기능 상세

### 1. 식사 기록 추가

**UI 컴포넌트**: `src/components/meals/AddMealDialog.tsx`

```typescript
// 1. 음식 검색
const { data } = await supabase.rpc('search_foods', {
  search_term: query,
  max_results: 20
});

// 2. 식사 생성
const { data: meal } = await supabase
  .from('meals')
  .insert({
    user_id: userId,
    date: selectedDate,
    meal_type: mealType,
  })
  .select()
  .single();

// 3. 음식 항목 추가
await supabase.from('meal_items').insert({
  meal_id: meal.id,
  name: food.food_name,
  calories: food.calories,
  protein_g: food.protein,
  carbs_g: food.carbs,
  fat_g: food.fat,
});
```

### 2. 음식 검색 함수

**PostgreSQL 함수**: `supabase/schema.sql`

```sql
CREATE FUNCTION search_foods(search_term TEXT, max_results INT DEFAULT 20)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.foods f
  WHERE f.food_name ILIKE '%' || search_term || '%'
     OR f.representative_name ILIKE '%' || search_term || '%'
  ORDER BY
    CASE WHEN f.food_name = search_term THEN 0
         WHEN f.food_name ILIKE search_term || '%' THEN 2
         ELSE 4 END,
    LENGTH(f.food_name)
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

### 3. 일일 식단 조회

**Hook**: `src/hooks/useMeals.ts`

```typescript
export function useMealsForDate(date: string) {
  return useQuery({
    queryKey: ['meals', date],
    queryFn: async () => {
      const { data } = await supabase
        .from('meals')
        .select(`
          *,
          meal_items (*)
        `)
        .eq('user_id', getCurrentUserId())
        .eq('date', date);
      return data;
    },
  });
}
```

### 4. 영양소 합계 계산

```typescript
const calculateDailyTotals = (meals: Meal[]) => {
  return meals.reduce((acc, meal) => {
    const mealTotals = meal.meal_items.reduce((itemAcc, item) => ({
      calories: itemAcc.calories + (item.calories || 0),
      protein: itemAcc.protein + (item.protein_g || 0),
      carbs: itemAcc.carbs + (item.carbs_g || 0),
      fat: itemAcc.fat + (item.fat_g || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      calories: acc.calories + mealTotals.calories,
      protein: acc.protein + mealTotals.protein,
      carbs: acc.carbs + mealTotals.carbs,
      fat: acc.fat + mealTotals.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
};
```

## UI 구성

### 식단 페이지 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  < 2024년 12월 9일 (월) >     [+ 식사 추가]             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🌅 아침  ──────────────────────── 450 kcal     │    │
│  │   • 현미밥 (200g)              180 kcal        │    │
│  │   • 된장찌개                    120 kcal        │    │
│  │   • 계란후라이                  150 kcal        │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🌞 점심  ──────────────────────── 680 kcal     │    │
│  │   • 비빔밥                      550 kcal        │    │
│  │   • 미역국                      130 kcal        │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🌙 저녁  ──────────────────────── 520 kcal     │    │
│  │   (기록 없음)                                   │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  📊 일일 합계                                           │
│  칼로리: 1,650 / 1,800 kcal (92%)                      │
│  단백질: 65g  |  탄수화물: 180g  |  지방: 45g          │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 구조

```
src/pages/Meals.tsx
├── MealTypeSection (아침/점심/저녁/간식)
│   ├── MealCard
│   │   └── MealItemRow
│   └── AddMealButton
├── DailySummary
└── DatePicker
```

## 관련 파일

| 파일 | 설명 |
|------|------|
| `src/pages/Meals.tsx` | 식단 페이지 |
| `src/hooks/useMeals.ts` | 식단 관련 훅 |
| `src/components/meals/` | 식단 컴포넌트들 |
| `src/types/domain.ts` | Meal, MealItem 타입 |
| `supabase/schema.sql` | DB 스키마 |

## AI 연동

식단 데이터는 AI 챗봇 컨텍스트로 제공됩니다:

```python
# server/services/user_context.py
async def get_today_meals(user_id: str) -> str:
    meals = db.table("meals").select(
        "meal_type, meal_items(name, calories)"
    ).eq("user_id", user_id).eq("date", today).execute()

    # "오늘 아침: 현미밥 180kcal, 된장찌개 120kcal..."
    return format_meals_context(meals.data)
```

챗봇이 "오늘 뭐 먹었어?"라고 물으면 이 컨텍스트를 활용합니다.
