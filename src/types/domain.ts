// Domain Types for DietRx Coach

// ============ User & Profile ============
export type ChatPersona = 'cold' | 'bright' | 'strict';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  id: string;
  user_id: string;
  email?: string;
  nickname?: string;
  avatar_url?: string;
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

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage?: string;
  frequency?: MedicationFrequency;
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
  time_of_day?: string;
  notes?: string;
}

export interface UpdateMedicationRequest {
  name?: string;
  dosage?: string;
  frequency?: MedicationFrequency;
  time_of_day?: string;
  notes?: string;
  is_active?: boolean;
}

export interface SendChatMessageRequest {
  message: string;
  persona?: ChatPersona;
}

// ============ Foods (Nutrition Database) ============
export interface Food {
  id: number;
  food_code: string;
  food_name: string;
  representative_name: string | null;
  category: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  sugar: number | null;
  fiber: number | null;
  sodium: number | null;
  serving_size: string | null;
  food_weight: string | null;
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

// ============ Board (Community) ============
export type PostTab = 'qna' | 'free' | 'info';
export type ReactionType = 'like' | 'dislike';

export interface Post {
  id: string;
  user_id: string;
  tab: PostTab;
  title: string;
  content: string;
  views: number;
  likes: number;
  dislikes: number;
  comment_count: number;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: PostAuthor;
  user_reaction?: ReactionType | null;
  comments?: PostComment[];
}

export interface PostAuthor {
  nickname: string | null;
  avatar_url?: string | null;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: PostAuthor;
  is_mine?: boolean;
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

// Board API Request Types
export interface CreatePostRequest {
  tab: PostTab;
  title: string;
  content: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
}

export interface CreateCommentRequest {
  post_id: string;
  content: string;
}
