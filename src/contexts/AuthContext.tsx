import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, setCurrentUserId } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, nickname: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setCurrentUserId(session?.user?.id ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const previousUserId = user?.id;
        const newUserId = session?.user?.id;

        setSession(session);
        setUser(session?.user ?? null);
        setCurrentUserId(session?.user?.id ?? null);
        setIsLoading(false);

        // Invalidate all queries when user changes (login/logout/switch account)
        if (previousUserId !== newUserId) {
          queryClient.invalidateQueries();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient, user?.id]);

  const signUp = async (email: string, password: string, nickname: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
        },
      },
    });

    // If signup succeeded, save nickname to user_profiles
    if (!error && data.user) {
      // Use upsert to create or update the profile with nickname
      setTimeout(async () => {
        const userId = data.user!.id;

        // Upsert profile with nickname
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(
            { user_id: userId, nickname },
            { onConflict: 'user_id' }
          );

        if (upsertError) {
          console.error('Failed to save nickname to profile:', upsertError);
        }
      }, 500);
    }

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
