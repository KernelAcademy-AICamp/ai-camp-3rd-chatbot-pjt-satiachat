/**
 * Backend API client for FastAPI server
 */
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make authenticated API request to backend
 */
async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Chat API (Diet Chatbot)
// ============================================

export interface ChatRequest {
  content: string;
  persona: 'cold' | 'bright' | 'strict';
}

export interface ChatResponse {
  message: string;
  intent: string;
  action_result?: {
    tool_calls?: string[];
  };
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  chat_type: string;
  created_at: string;
}

export const chatApi = {
  sendMessage: (request: ChatRequest) =>
    apiRequest<ChatResponse>('/chat/message', {
      method: 'POST',
      body: request,
    }),

  getHistory: (limit = 50) =>
    apiRequest<{ messages: ChatMessage[]; total: number }>(`/chat/history?limit=${limit}`),

  clearHistory: () =>
    apiRequest<{ success: boolean; message: string }>('/chat/history', {
      method: 'DELETE',
    }),
};

// ============================================
// Medication API (RAG Chatbot)
// ============================================

export interface MedicationQueryRequest {
  query: string;
  include_health_context?: boolean;
  use_rag?: boolean;
  intent?: string;
}

export interface MedicationQueryResponse {
  response: string;
  is_emergency: boolean;
  sources: string[];
}

export const medicationApi = {
  ask: (request: MedicationQueryRequest) =>
    apiRequest<MedicationQueryResponse>('/medication/ask', {
      method: 'POST',
      body: request,
    }),

  getHistory: (limit = 50) =>
    apiRequest<{ messages: ChatMessage[]; total: number }>(`/medication/history?limit=${limit}`),

  clearHistory: () =>
    apiRequest<{ success: boolean; message: string }>('/medication/history', {
      method: 'DELETE',
    }),
};

// ============================================
// Summary API (Data Aggregation)
// ============================================

export interface TodaySummary {
  calories_consumed: number;
  calories_target: number;
  calories_remaining: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meals_logged: number;
  date: string;
}

export interface DailyCalorie {
  date: string;
  calories: number;
  meals_count: number;
}

export interface WeeklySummary {
  daily_calories: DailyCalorie[];
  average_calories: number;
  total_calories: number;
  weight_start: number | null;
  weight_end: number | null;
  weight_change: number | null;
  medication_adherence: number;
  start_date: string;
  end_date: string;
}

export interface MedicationAdherence {
  days: number;
  total_scheduled: number;
  total_taken: number;
  total_skipped: number;
  adherence_rate: number;
  by_medication: {
    medication_id: string;
    name: string;
    expected_doses: number;
    taken: number;
    skipped: number;
    adherence_rate: number;
  }[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_days: number;
  days_logged: number;
  total_calories: number;
  average_daily_calories: number;
  weight_start: number | null;
  weight_end: number | null;
  weight_change: number | null;
  medication_adherence: number;
  weekly_breakdown: {
    week_start: string;
    week_end: string;
    total_calories: number;
    days_logged: number;
    average_daily: number;
  }[];
}

export const summaryApi = {
  getToday: () =>
    apiRequest<TodaySummary>('/summary/today'),

  getWeekly: () =>
    apiRequest<WeeklySummary>('/summary/weekly'),

  getMedicationAdherence: (days = 7) =>
    apiRequest<MedicationAdherence>(`/summary/medication-adherence?days=${days}`),

  getMonthly: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const query = params.toString();
    return apiRequest<MonthlyReport>(`/summary/monthly${query ? `?${query}` : ''}`);
  },
};
