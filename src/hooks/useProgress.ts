import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId, getToday, formatDate } from '@/lib/supabase';
import type { ProgressLog, CreateProgressRequest } from '@/types/domain';
import { useProfile } from './useProfile';

// Query keys
export const progressKeys = {
  all: ['progress'] as const,
  lists: () => [...progressKeys.all, 'list'] as const,
  list: (from: string, to: string) => [...progressKeys.lists(), from, to] as const,
  latest: () => [...progressKeys.all, 'latest'] as const,
  weekly: () => [...progressKeys.all, 'weekly'] as const,
};

// Fetch progress logs for a date range
export function useProgressLogs(from: string, to: string) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: progressKeys.list(from, to),
    queryFn: async (): Promise<ProgressLog[]> => {
      const { data, error } = await supabase
        .from('progress_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch the latest progress log
export function useLatestProgress() {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: progressKeys.latest(),
    queryFn: async (): Promise<ProgressLog | null> => {
      const { data, error } = await supabase
        .from('progress_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }
      return data;
    },
  });
}

// Fetch weekly progress (last 7 days)
export function useWeeklyProgress() {
  const userId = getCurrentUserId();
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const from = formatDate(sevenDaysAgo);
  const to = getToday();

  return useQuery({
    queryKey: progressKeys.weekly(),
    queryFn: async (): Promise<ProgressLog[]> => {
      const { data, error } = await supabase
        .from('progress_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Calculate weekly stats
export function useWeeklyStats() {
  const { data: weeklyLogs, isLoading, error } = useWeeklyProgress();

  if (isLoading || error || !weeklyLogs || weeklyLogs.length === 0) {
    return {
      startWeight: null,
      endWeight: null,
      weightChange: null,
      avgWeight: null,
      logs: weeklyLogs || [],
      isLoading,
      error,
    };
  }

  const weights = weeklyLogs.map(log => log.weight_kg);
  const startWeight = weights[0];
  const endWeight = weights[weights.length - 1];
  const weightChange = endWeight - startWeight;
  const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;

  return {
    startWeight,
    endWeight,
    weightChange,
    avgWeight: Math.round(avgWeight * 10) / 10,
    logs: weeklyLogs,
    isLoading,
    error,
  };
}

// Create a new progress log
export function useCreateProgress() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (request: CreateProgressRequest): Promise<ProgressLog> => {
      const { data, error } = await supabase
        .from('progress_logs')
        .insert({
          user_id: userId,
          date: request.date,
          weight_kg: request.weight_kg,
          body_fat_percent: request.body_fat_percent,
          muscle_mass_kg: request.muscle_mass_kg,
          notes: request.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

// Update a progress log
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CreateProgressRequest> & { id: string }): Promise<ProgressLog> => {
      const { data, error } = await supabase
        .from('progress_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

// Delete a progress log
export function useDeleteProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('progress_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

// Upsert progress for today (create or update)
export function useUpsertTodayProgress() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (request: Omit<CreateProgressRequest, 'date'>): Promise<ProgressLog> => {
      const today = getToday();

      const { data, error } = await supabase
        .from('progress_logs')
        .upsert(
          {
            user_id: userId,
            date: today,
            weight_kg: request.weight_kg,
            body_fat_percent: request.body_fat_percent,
            muscle_mass_kg: request.muscle_mass_kg,
            notes: request.notes,
          },
          {
            onConflict: 'user_id,date',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  });
}

// 최근 7일간 칼로리 데이터 조회
export interface DailyCalorieData {
  date: string;
  totalCalories: number;
  targetCalories: number;
  mealCount: number;
}

export function useWeeklyCalories() {
  const userId = getCurrentUserId();
  const { data: profile } = useProfile();
  const targetCalories = profile?.target_calories || 2000;

  return useQuery({
    queryKey: ['calories', 'weekly', userId],
    queryFn: async (): Promise<DailyCalorieData[]> => {
      // 최근 7일 날짜 계산 (로컬 타임존 기준)
      const dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(formatDate(date));
      }

      // 7일간 식단 데이터 조회
      const { data: meals, error } = await supabase
        .from('meals')
        .select('date, total_calories')
        .eq('user_id', userId)
        .gte('date', dates[0])
        .lte('date', dates[dates.length - 1]);

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

      // 결과 배열 생성 (빈 날짜도 포함)
      return dates.map((date) => ({
        date,
        totalCalories: caloriesByDate[date]?.total || 0,
        targetCalories,
        mealCount: caloriesByDate[date]?.count || 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}
