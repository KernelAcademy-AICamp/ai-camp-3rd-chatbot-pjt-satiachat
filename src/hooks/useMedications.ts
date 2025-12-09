import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId, getToday } from '@/lib/supabase';
import type {
  Medication,
  MedicationLog,
  MedicationWithLogs,
  CreateMedicationRequest,
  UpdateMedicationRequest,
} from '@/types/domain';

// Query keys
export const medicationKeys = {
  all: ['medications'] as const,
  lists: () => [...medicationKeys.all, 'list'] as const,
  active: () => [...medicationKeys.lists(), 'active'] as const,
  detail: (id: string) => [...medicationKeys.all, 'detail', id] as const,
  logs: () => [...medicationKeys.all, 'logs'] as const,
  todayLogs: () => [...medicationKeys.logs(), 'today'] as const,
  monthLogs: (year: number, month: number) => [...medicationKeys.logs(), 'month', year, month] as const,
};

// Fetch active medications
export function useMedications() {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: medicationKeys.active(),
    queryFn: async (): Promise<Medication[]> => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch medications with today's logs
export function useMedicationsWithTodayLogs() {
  const userId = getCurrentUserId();
  const today = getToday();

  return useQuery({
    queryKey: [...medicationKeys.active(), 'withLogs', today],
    queryFn: async (): Promise<MedicationWithLogs[]> => {
      // First get medications
      const { data: medications, error: medError } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('time_of_day', { ascending: true });

      if (medError) throw medError;

      if (!medications || medications.length === 0) {
        return [];
      }

      // Then get today's logs
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;

      const { data: logs, error: logError } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('taken_at', todayStart)
        .lte('taken_at', todayEnd);

      if (logError) throw logError;

      // Combine medications with their logs
      return medications.map(med => ({
        ...med,
        medication_logs: logs?.filter(log => log.medication_id === med.id) || [],
      }));
    },
  });
}

// Get today's medication stats
export function useTodayMedicationStats() {
  const { data: medications, isLoading, error } = useMedicationsWithTodayLogs();

  if (!medications) {
    return {
      total: 0,
      taken: 0,
      percentage: 0,
      medications: [],
      isLoading,
      error,
    };
  }

  const total = medications.length;
  const taken = medications.filter(med =>
    med.medication_logs && med.medication_logs.length > 0
  ).length;
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

  return {
    total,
    taken,
    percentage,
    medications,
    isLoading,
    error,
  };
}

// Create a new medication
export function useCreateMedication() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (request: CreateMedicationRequest): Promise<Medication> => {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: userId,
          name: request.name,
          dosage: request.dosage,
          frequency: request.frequency,
          time_of_day: request.time_of_day,
          notes: request.notes,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}

// Update a medication
export function useUpdateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: UpdateMedicationRequest & { id: string }): Promise<Medication> => {
      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}

// Delete (deactivate) a medication
export function useDeleteMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('medications')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}

// Log medication as taken
export function useLogMedication() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async ({
      medicationId,
      status = 'taken',
      notes,
    }: {
      medicationId: string;
      status?: 'taken' | 'skipped' | 'delayed';
      notes?: string;
    }): Promise<MedicationLog> => {
      const { data, error } = await supabase
        .from('medication_logs')
        .insert({
          medication_id: medicationId,
          user_id: userId,
          status,
          notes,
          taken_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}

// Remove today's log for a medication
export function useUnlogMedication() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (medicationId: string): Promise<void> => {
      const today = getToday();
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;

      const { error } = await supabase
        .from('medication_logs')
        .delete()
        .eq('medication_id', medicationId)
        .eq('user_id', userId)
        .gte('taken_at', todayStart)
        .lte('taken_at', todayEnd);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.all });
    },
  });
}

// 월별 로그 데이터 타입
export interface DayLogSummary {
  date: string; // YYYY-MM-DD
  totalMeds: number;
  takenCount: number;
  skippedCount: number;
  status: 'full' | 'partial' | 'missed' | 'none'; // 전체복용/일부/미복용/기록없음
}

export interface MonthlyLogsData {
  logs: MedicationLog[];
  dailySummary: Map<string, DayLogSummary>;
  monthStats: {
    totalDays: number;
    recordedDays: number;
    countableDays: number;    // 계산 대상 일수 (오늘까지)
    fullComplianceDays: number;
    averageRate: number;
  };
}

// 월별 복용 로그 조회
export function useMedicationLogsForMonth(year: number, month: number) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: medicationKeys.monthLogs(year, month),
    queryFn: async (): Promise<MonthlyLogsData> => {
      // 해당 월의 시작일과 마지막일 계산
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // 해당 월의 마지막 날

      const startStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T23:59:59`;

      // 1. 활성 약물 ID 먼저 조회
      const { data: medications, error: medError } = await supabase
        .from('medications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (medError) throw medError;

      const activeMedIds = medications?.map(m => m.id) || [];
      const totalMeds = activeMedIds.length;

      // 2. 활성 약물의 로그만 조회 (삭제된 약물의 로그 제외)
      let logs: any[] = [];
      if (activeMedIds.length > 0) {
        const { data: logsData, error: logError } = await supabase
          .from('medication_logs')
          .select('*')
          .eq('user_id', userId)
          .in('medication_id', activeMedIds)
          .gte('taken_at', startStr)
          .lte('taken_at', endStr)
          .order('taken_at', { ascending: true });

        if (logError) throw logError;
        logs = logsData || [];
      }

      // 3. 일별 요약 계산
      const dailySummary = new Map<string, DayLogSummary>();

      // 해당 월의 모든 날짜에 대해 초기화
      const daysInMonth = endDate.getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dailySummary.set(dateStr, {
          date: dateStr,
          totalMeds,
          takenCount: 0,
          skippedCount: 0,
          status: 'none',
        });
      }

      // 로그 데이터로 일별 요약 업데이트
      logs.forEach(log => {
        const dateStr = log.taken_at.split('T')[0];
        const summary = dailySummary.get(dateStr);
        if (summary) {
          if (log.status === 'taken') {
            summary.takenCount++;
          } else if (log.status === 'skipped') {
            summary.skippedCount++;
          }
        }
      });

      // 상태 결정 (오늘까지의 날짜만 계산)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      let recordedDays = 0;      // 로그가 있는 날
      let countableDays = 0;     // 계산 대상 날 (오늘까지)
      let fullComplianceDays = 0;
      let totalRateSum = 0;

      dailySummary.forEach((summary) => {
        // 미래 날짜는 계산에서 제외
        if (summary.date > todayStr) return;

        const totalLogged = summary.takenCount + summary.skippedCount;

        // 약물이 등록되어 있고 오늘 이전 날짜면 계산 대상
        if (totalMeds > 0) {
          countableDays++;

          if (totalLogged > 0) {
            recordedDays++;
            if (summary.takenCount >= totalMeds) {
              summary.status = 'full';
              fullComplianceDays++;
            } else if (summary.takenCount > 0) {
              summary.status = 'partial';
            } else {
              summary.status = 'missed';
            }
            // 해당 날의 복용률
            totalRateSum += (summary.takenCount / totalMeds) * 100;
          } else {
            // 로그가 없는 날은 0%로 계산
            summary.status = 'none';
            totalRateSum += 0;
          }
        }
      });

      // 계산 대상 날짜 기준 평균 복용률
      const averageRate = countableDays > 0 ? Math.round(totalRateSum / countableDays) : 0;

      return {
        logs: logs || [],
        dailySummary,
        monthStats: {
          totalDays: daysInMonth,
          recordedDays,
          countableDays,    // 계산 대상 일수 (오늘까지)
          fullComplianceDays,
          averageRate,
        },
      };
    },
  });
}

// 특정 날짜의 복용 로그 조회
export function useMedicationLogsForDate(date: string) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: [...medicationKeys.logs(), 'date', date],
    queryFn: async (): Promise<{ medications: MedicationWithLogs[] }> => {
      const dateStart = `${date}T00:00:00`;
      const dateEnd = `${date}T23:59:59`;

      // 활성 약물 조회
      const { data: medications, error: medError } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('time_of_day', { ascending: true });

      if (medError) throw medError;

      // 해당 날짜의 로그 조회
      const { data: logs, error: logError } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('taken_at', dateStart)
        .lte('taken_at', dateEnd);

      if (logError) throw logError;

      // 약물과 로그 결합
      const medicationsWithLogs: MedicationWithLogs[] = (medications || []).map(med => ({
        ...med,
        medication_logs: (logs || []).filter(log => log.medication_id === med.id),
      }));

      return { medications: medicationsWithLogs };
    },
    enabled: !!date,
  });
}

// 특정 날짜에 복용 기록 추가 (과거 날짜 지원)
export function useLogMedicationForDate() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async ({
      medicationId,
      date,
      time,
      status = 'taken',
      notes,
    }: {
      medicationId: string;
      date: string; // YYYY-MM-DD
      time?: string; // HH:mm (선택사항)
      status?: 'taken' | 'skipped' | 'delayed';
      notes?: string;
    }): Promise<MedicationLog> => {
      const takenAt = time
        ? `${date}T${time}:00`
        : `${date}T${new Date().toTimeString().slice(0, 5)}:00`;

      const { data, error } = await supabase
        .from('medication_logs')
        .insert({
          medication_id: medicationId,
          user_id: userId,
          status,
          notes,
          taken_at: takenAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // 해당 날짜와 월의 캐시 무효화
      const [year, month] = variables.date.split('-').map(Number);
      queryClient.invalidateQueries({ queryKey: medicationKeys.all });
      queryClient.invalidateQueries({ queryKey: medicationKeys.monthLogs(year, month) });
    },
  });
}

// 특정 날짜의 특정 약물 로그 삭제
export function useDeleteMedicationLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logId,
      date,
    }: {
      logId: string;
      date: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('medication_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const [year, month] = variables.date.split('-').map(Number);
      queryClient.invalidateQueries({ queryKey: medicationKeys.all });
      queryClient.invalidateQueries({ queryKey: medicationKeys.monthLogs(year, month) });
    },
  });
}
