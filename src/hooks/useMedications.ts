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
  const todayDayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday

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

      // Filter medications based on frequency
      // - daily: show every day
      // - weekly: only show on the scheduled day_of_week
      // - as_needed: show every day
      const filteredMedications = medications.filter(med => {
        if (med.frequency === 'weekly') {
          // Only show weekly medications on their scheduled day
          return med.day_of_week === todayDayOfWeek;
        }
        // Show daily and as_needed medications every day
        return true;
      });

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
      return filteredMedications.map(med => ({
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
          day_of_week: request.day_of_week,
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
