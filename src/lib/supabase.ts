import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

// Custom storage wrapper to ensure proper localStorage access
const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: customStorage,
      storageKey: 'supabase.auth.token',
      flowType: 'pkce',
    },
    // Ensure auth header is always sent
    global: {
      headers: {
        'X-Client-Info': 'dietrx-coach-web',
      },
    },
  }
);

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
 * 프로덕션에서는 인증된 사용자만 허용, 개발 모드에서는 fallback 허용
 */
export const getCurrentUserId = (): string => {
  if (cachedUserId) {
    return cachedUserId;
  }

  // 개발 모드에서만 fallback ID 허용
  if (import.meta.env.DEV) {
    console.warn('[DEV] Using development fallback user ID');
    return 'dev-user-00000000-0000-0000-0000-000000000001';
  }

  // 프로덕션에서 인증되지 않은 경우 빈 문자열 반환 (쿼리 실패하도록)
  console.error('[PROD] No authenticated user - queries will fail');
  return '';
};

// Helper to format date as YYYY-MM-DD (local timezone)
export const formatDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get today's date as YYYY-MM-DD (local timezone)
export const getToday = (): string => {
  return formatDate(new Date());
};
