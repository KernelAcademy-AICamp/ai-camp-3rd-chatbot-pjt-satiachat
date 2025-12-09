import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Food } from '@/types/domain';

// Query keys
export const foodKeys = {
  all: ['foods'] as const,
  search: (term: string) => [...foodKeys.all, 'search', term] as const,
};

// Search foods using the search_foods RPC function
export function useSearchFoods(searchTerm: string, enabled = true) {
  return useQuery({
    queryKey: foodKeys.search(searchTerm),
    queryFn: async (): Promise<Food[]> => {
      if (!searchTerm || searchTerm.trim().length < 1) {
        return [];
      }

      const { data, error } = await supabase
        .rpc('search_foods', {
          search_term: searchTerm.trim(),
          max_results: 20,
        });

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && searchTerm.trim().length >= 1,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

// Direct search without RPC (fallback)
export function useSearchFoodsDirect(searchTerm: string, enabled = true) {
  return useQuery({
    queryKey: [...foodKeys.search(searchTerm), 'direct'],
    queryFn: async (): Promise<Food[]> => {
      if (!searchTerm || searchTerm.trim().length < 1) {
        return [];
      }

      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .or(`food_name.ilike.%${searchTerm}%,representative_name.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && searchTerm.trim().length >= 1,
    staleTime: 1000 * 60 * 5,
  });
}
