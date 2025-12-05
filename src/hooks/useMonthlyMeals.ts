import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { useProfile } from './useProfile';
import { useMeals } from './useMeals';

export interface MonthlyMealData {
  date: string; // YYYY-MM-DD
  totalCalories: number;
  mealCount: number;
  targetCalories: number;
}

// 월간 식단 데이터 조회
export function useMonthlyMeals(year: number, month: number) {
  const userId = getCurrentUserId();
  const { data: profile } = useProfile();
  const targetCalories = profile?.target_calories || 2000;

  return useQuery({
    queryKey: ['meals', 'monthly', userId, year, month],
    queryFn: async (): Promise<MonthlyMealData[]> => {
      // 해당 월의 시작일~말일 계산
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Supabase에서 해당 월의 모든 식단 조회
      const { data: meals, error } = await supabase
        .from('meals')
        .select('date, total_calories')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      // 날짜별로 그룹화
      const caloriesByDate: Record<string, { total: number; count: number }> = {};
      (meals || []).forEach((meal) => {
        if (!caloriesByDate[meal.date]) {
          caloriesByDate[meal.date] = { total: 0, count: 0 };
        }
        caloriesByDate[meal.date].total += meal.total_calories || 0;
        caloriesByDate[meal.date].count += 1;
      });

      // 전체 날짜 배열 생성 (1일~말일)
      const dates: string[] = [];
      for (let day = 1; day <= lastDay; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(date);
      }

      return dates.map((date) => ({
        date,
        totalCalories: caloriesByDate[date]?.total || 0,
        mealCount: caloriesByDate[date]?.count || 0,
        targetCalories,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}

// 특정 날짜의 식단 조회 (기존 useMeals 재사용)
export function useDayMeals(date: string) {
  return useMeals(date);
}
