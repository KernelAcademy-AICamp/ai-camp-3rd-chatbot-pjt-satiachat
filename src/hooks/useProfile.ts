import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import type { UserProfile, Gender, ActivityLevel, ChatPersona } from '@/types/domain';

// Query keys
export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string) => [...profileKeys.all, userId] as const,
};

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + s
 * where s is +5 for males and -161 for females
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  birthYear: number,
  gender: Gender
): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === 'male') {
    return baseBMR + 5;
  } else if (gender === 'female') {
    return baseBMR - 161;
  } else {
    // For 'other', use average of male and female
    return baseBMR - 78;
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE) from BMR and activity level
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate target calories based on profile data
 * If goal is weight loss, create 500 kcal deficit (lose ~0.5kg/week)
 * If goal is weight gain, create 300 kcal surplus (gain ~0.3kg/week)
 * If goal is maintenance, return TDEE
 */
export function calculateTargetCalories(
  currentWeightKg: number,
  goalWeightKg: number,
  heightCm: number,
  birthYear: number,
  gender: Gender,
  activityLevel: ActivityLevel
): number {
  const bmr = calculateBMR(currentWeightKg, heightCm, birthYear, gender);
  const tdee = calculateTDEE(bmr, activityLevel);

  if (currentWeightKg > goalWeightKg) {
    // Weight loss: 500 kcal deficit
    return Math.max(1200, tdee - 500); // Minimum 1200 kcal for safety
  } else if (currentWeightKg < goalWeightKg) {
    // Weight gain: 300 kcal surplus
    return tdee + 300;
  } else {
    // Maintenance
    return tdee;
  }
}

/**
 * Fetch user profile from Supabase
 * Returns profile with calculated target calories if not already stored
 */
export function useProfile() {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - user hasn't completed onboarding
          return null;
        }
        throw error;
      }

      // Calculate target calories if not already set and we have required data
      if (
        !data.target_calories &&
        data.current_weight_kg &&
        data.goal_weight_kg &&
        data.height_cm &&
        data.birth_year &&
        data.gender &&
        data.activity_level
      ) {
        const calculatedCalories = calculateTargetCalories(
          data.current_weight_kg,
          data.goal_weight_kg,
          data.height_cm,
          data.birth_year,
          data.gender,
          data.activity_level
        );

        // Update profile with calculated calories
        const { data: updated } = await supabase
          .from('user_profiles')
          .update({ target_calories: calculatedCalories })
          .eq('user_id', userId)
          .select()
          .single();

        return updated || { ...data, target_calories: calculatedCalories };
      }

      return data;
    },
    // Keep profile data cached for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (
      updates: Partial<Omit<UserProfile, 'id' | 'email' | 'created_at' | 'updated_at'>>
    ): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/**
 * Create user profile (for onboarding)
 */
export function useCreateProfile() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (
      profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
    ): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          ...profile,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/**
 * Update coach persona preference
 */
export function useUpdatePersona() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (persona: ChatPersona): Promise<UserProfile> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ coach_persona: persona })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
