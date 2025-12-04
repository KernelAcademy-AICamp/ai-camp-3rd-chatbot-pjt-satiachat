import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentUserId, formatDate } from '@/lib/supabase';

// Query keys
export const reportKeys = {
  all: ['reports'] as const,
  weekly: (startDate: string, endDate: string) => [...reportKeys.all, 'weekly', startDate, endDate] as const,
  stats: () => [...reportKeys.all, 'stats'] as const,
};

interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  startWeight: number | null;
  endWeight: number | null;
  weightChange: number | null;
  avgCalories: number;
  totalMeals: number;
  medicationAdherence: number;
}

interface QuickStats {
  thisWeekChange: number | null;
  thisMonthChange: number | null;
  avgCalories: number;
  medicationAdherence: number;
}

/**
 * Get quick stats for the Reports page header
 */
export function useQuickStats() {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: reportKeys.stats(),
    queryFn: async (): Promise<QuickStats> => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);

      // Get weight data for this week
      const { data: weekWeights } = await supabase
        .from('progress_logs')
        .select('weight_kg, date')
        .eq('user_id', userId)
        .gte('date', formatDate(weekAgo))
        .lte('date', formatDate(today))
        .order('date', { ascending: true });

      // Get weight data for this month
      const { data: monthWeights } = await supabase
        .from('progress_logs')
        .select('weight_kg, date')
        .eq('user_id', userId)
        .gte('date', formatDate(monthAgo))
        .lte('date', formatDate(today))
        .order('date', { ascending: true });

      // Get meals for average calories (this week)
      const { data: meals } = await supabase
        .from('meals')
        .select('total_calories')
        .eq('user_id', userId)
        .gte('date', formatDate(weekAgo))
        .lte('date', formatDate(today));

      // Get medication stats for this week
      const { data: medications } = await supabase
        .from('medications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);

      const { data: medicationLogs } = await supabase
        .from('medication_logs')
        .select('status')
        .eq('user_id', userId)
        .gte('logged_at', weekAgo.toISOString())
        .lte('logged_at', today.toISOString());

      // Calculate week weight change
      let thisWeekChange: number | null = null;
      if (weekWeights && weekWeights.length >= 2) {
        const firstWeight = weekWeights[0].weight_kg;
        const lastWeight = weekWeights[weekWeights.length - 1].weight_kg;
        thisWeekChange = lastWeight - firstWeight;
      }

      // Calculate month weight change
      let thisMonthChange: number | null = null;
      if (monthWeights && monthWeights.length >= 2) {
        const firstWeight = monthWeights[0].weight_kg;
        const lastWeight = monthWeights[monthWeights.length - 1].weight_kg;
        thisMonthChange = lastWeight - firstWeight;
      }

      // Calculate average calories
      const avgCalories = meals && meals.length > 0
        ? Math.round(meals.reduce((sum, m) => sum + (m.total_calories || 0), 0) / meals.length)
        : 0;

      // Calculate medication adherence
      const totalExpectedDoses = (medications?.length || 0) * 7; // Assuming daily medications for a week
      const takenDoses = medicationLogs?.filter(log => log.status === 'taken').length || 0;
      const medicationAdherence = totalExpectedDoses > 0
        ? Math.round((takenDoses / totalExpectedDoses) * 100)
        : 0;

      return {
        thisWeekChange,
        thisMonthChange,
        avgCalories,
        medicationAdherence,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Generate weekly report data
 */
export function useWeeklyReports(weeksBack: number = 4) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: [...reportKeys.all, 'weekly-reports', weeksBack],
    queryFn: async (): Promise<WeeklyStats[]> => {
      const reports: WeeklyStats[] = [];
      const today = new Date();

      for (let i = 0; i < weeksBack; i++) {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        // Get weight data for this week
        const { data: weights } = await supabase
          .from('progress_logs')
          .select('weight_kg, date')
          .eq('user_id', userId)
          .gte('date', formatDate(weekStart))
          .lte('date', formatDate(weekEnd))
          .order('date', { ascending: true });

        // Get meals for this week
        const { data: meals } = await supabase
          .from('meals')
          .select('total_calories')
          .eq('user_id', userId)
          .gte('date', formatDate(weekStart))
          .lte('date', formatDate(weekEnd));

        // Get medication logs for this week
        const { data: medicationLogs } = await supabase
          .from('medication_logs')
          .select('status')
          .eq('user_id', userId)
          .gte('logged_at', weekStart.toISOString())
          .lte('logged_at', weekEnd.toISOString());

        // Get active medications count
        const { data: medications } = await supabase
          .from('medications')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true);

        // Calculate stats
        const startWeight = weights && weights.length > 0 ? weights[0].weight_kg : null;
        const endWeight = weights && weights.length > 0 ? weights[weights.length - 1].weight_kg : null;
        const weightChange = startWeight && endWeight ? endWeight - startWeight : null;

        const avgCalories = meals && meals.length > 0
          ? Math.round(meals.reduce((sum, m) => sum + (m.total_calories || 0), 0) / meals.length)
          : 0;

        const totalExpectedDoses = (medications?.length || 0) * 7;
        const takenDoses = medicationLogs?.filter(log => log.status === 'taken').length || 0;
        const medicationAdherence = totalExpectedDoses > 0
          ? Math.round((takenDoses / totalExpectedDoses) * 100)
          : 0;

        reports.push({
          weekStart: formatDate(weekStart),
          weekEnd: formatDate(weekEnd),
          startWeight,
          endWeight,
          weightChange,
          avgCalories,
          totalMeals: meals?.length || 0,
          medicationAdherence,
        });
      }

      return reports;
    },
    staleTime: 5 * 60 * 1000,
  });
}
