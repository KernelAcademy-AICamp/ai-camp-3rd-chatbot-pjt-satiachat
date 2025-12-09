// Domain Types for DietRx Coach

// ============ User & Profile ============
export type ChatPersona = 'cold' | 'bright' | 'strict';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  id: string;
  user_id: string;
  email?: string;
  gender?: Gender;
  birth_year?: number;
  height_cm?: number;
  current_weight_kg?: number;
  goal_weight_kg?: number;
  activity_level?: ActivityLevel;
  target_calories?: number;
  coach_persona?: ChatPersona;
  created_at: string;
  updated_at: string;
}

// ============ Meals ============
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  total_calories: number;
  created_at: string;
  updated_at: string;
  meal_items?: MealItem[];
}

export interface MealItem {
  id: string;
  meal_id: string;
  name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  quantity?: string;
  created_at: string;
}

export interface MealWithItems extends Meal {
  meal_items: MealItem[];
}

// ============ Progress ============
export interface ProgressLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weight_kg: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  notes?: string;
  created_at: string;
}

// ============ Medications ============
export type MedicationFrequency = 'daily' | 'weekly' | 'as_needed';
export type MedicationLogStatus = 'taken' | 'skipped' | 'delayed';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage?: string;
  frequency?: MedicationFrequency;
  day_of_week?: DayOfWeek; // For weekly medications: which day to take (0=Sun, 1=Mon, ..., 6=Sat)
  time_of_day?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  user_id: string;
  taken_at: string;
  status: MedicationLogStatus;
  notes?: string;
}

export interface MedicationWithLogs extends Medication {
  medication_logs?: MedicationLog[];
}

// ============ Chat ============
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

// ============ API Request/Response Types ============
export interface CreateMealRequest {
  date: string;
  meal_type: MealType;
  items: {
    name: string;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    quantity?: string;
  }[];
}

export interface UpdateMealRequest {
  meal_type?: MealType;
  items?: {
    name: string;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    quantity?: string;
  }[];
}

export interface CreateProgressRequest {
  date: string;
  weight_kg: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  notes?: string;
}

export interface CreateMedicationRequest {
  name: string;
  dosage?: string;
  frequency?: MedicationFrequency;
  day_of_week?: DayOfWeek;
  time_of_day?: string;
  notes?: string;
}

export interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  frequency?: MedicationFrequency;
  day_of_week?: DayOfWeek;
  time_of_day?: string;
  notes?: string;
  is_active?: boolean;
}

export interface SendChatMessageRequest {
  message: string;
  persona?: ChatPersona;
}

// ============ Statistics Types ============
export interface DailyCaloriesSummary {
  date: string;
  total_calories: number;
  target_calories: number;
  meals_count: number;
}

export interface WeeklyProgressSummary {
  start_date: string;
  end_date: string;
  start_weight: number;
  end_weight: number;
  weight_change: number;
  avg_calories: number;
  meals_logged: number;
}

export interface MedicationAdherence {
  medication_id: string;
  medication_name: string;
  total_scheduled: number;
  total_taken: number;
  adherence_percent: number;
}
