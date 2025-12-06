import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Fallback user ID for development when not authenticated
export const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000001';

// In-memory cache for current user ID (updated by AuthContext)
let cachedUserId: string | null = null;

/**
 * Set the current user ID (called by AuthContext on auth state change)
 */
export const setCurrentUserId = (userId: string | null) => {
  cachedUserId = userId;
};

/**
 * Get current authenticated user ID synchronously.
 * Returns cached user ID if authenticated, otherwise DEV_USER_ID for development.
 */
export const getCurrentUserId = (): string => {
  const userId = cachedUserId ?? DEV_USER_ID;
  console.log('[getCurrentUserId] cachedUserId:', cachedUserId, 'returning:', userId);
  return userId;
};

// Helper to format date as YYYY-MM-DD
export const formatDate = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

// Helper to get today's date as YYYY-MM-DD
export const getToday = (): string => {
  return formatDate(new Date());
};
