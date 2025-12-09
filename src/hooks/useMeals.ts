import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId, getToday } from '@/lib/supabase';
import type { Meal, MealItem, MealWithItems, MealType, CreateMealRequest } from '@/types/domain';

// Query keys
export const mealKeys = {
  all: ['meals'] as const,
  lists: () => [...mealKeys.all, 'list'] as const,
  list: (date: string) => [...mealKeys.lists(), date] as const,
  today: () => [...mealKeys.lists(), 'today'] as const,
  detail: (id: string) => [...mealKeys.all, 'detail', id] as const,
};

// Fetch meals for a specific date
export function useMeals(date: string) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: mealKeys.list(date),
    queryFn: async (): Promise<MealWithItems[]> => {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          meal_items (*)
        `)
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch today's meals (for Dashboard)
export function useTodayMeals() {
  const today = getToday();
  return useMeals(today);
}

// Fetch total calories for today
export function useTodayCalories() {
  const { data: meals, isLoading, error } = useTodayMeals();

  const totalCalories = meals?.reduce((sum, meal) => sum + (meal.total_calories || 0), 0) || 0;
  // 방어적 처리: 같은 meal_type이 여러 개 있을 경우 첫 번째 것 사용
  const mealsByType = meals?.reduce((acc, meal) => {
    if (!acc[meal.meal_type]) {
      acc[meal.meal_type] = meal;
    }
    return acc;
  }, {} as Record<MealType, MealWithItems>) || {};

  return {
    totalCalories,
    mealsByType,
    meals,
    isLoading,
    error,
  };
}

// Create a new meal with items
export function useCreateMeal() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (request: CreateMealRequest): Promise<MealWithItems> => {
      // Calculate total calories from items
      const totalCalories = request.items.reduce((sum, item) => sum + item.calories, 0);

      // Create meal
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: userId,
          date: request.date,
          meal_type: request.meal_type,
          total_calories: totalCalories,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // Create meal items
      if (request.items.length > 0) {
        const mealItems = request.items.map(item => ({
          meal_id: meal.id,
          ...item,
        }));

        const { data: items, error: itemsError } = await supabase
          .from('meal_items')
          .insert(mealItems)
          .select();

        if (itemsError) throw itemsError;

        return { ...meal, meal_items: items || [] };
      }

      return { ...meal, meal_items: [] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealKeys.list(data.date) });
      queryClient.invalidateQueries({ queryKey: mealKeys.today() });
      // Also invalidate calorie chart data
      queryClient.invalidateQueries({ queryKey: ['calories', 'weekly'] });
      queryClient.invalidateQueries({ queryKey: ['calories', 'range'] });
      // Invalidate monthly data
      queryClient.invalidateQueries({ queryKey: ['meals', 'monthly'] });
    },
  });
}

// Update a meal (replace all items)
export function useUpdateMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mealId,
      items,
      mealType
    }: {
      mealId: string;
      items?: CreateMealRequest['items'];
      mealType?: MealType;
    }): Promise<MealWithItems> => {
      // Get existing meal to know the date
      const { data: existingMeal, error: fetchError } = await supabase
        .from('meals')
        .select('*')
        .eq('id', mealId)
        .single();

      if (fetchError) throw fetchError;

      // Delete existing items if new items provided
      if (items) {
        await supabase
          .from('meal_items')
          .delete()
          .eq('meal_id', mealId);

        // Calculate new total calories
        const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);

        // Update meal
        const { data: meal, error: updateError } = await supabase
          .from('meals')
          .update({
            total_calories: totalCalories,
            ...(mealType && { meal_type: mealType }),
          })
          .eq('id', mealId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Insert new items
        if (items.length > 0) {
          const mealItems = items.map(item => ({
            meal_id: mealId,
            ...item,
          }));

          const { data: newItems, error: itemsError } = await supabase
            .from('meal_items')
            .insert(mealItems)
            .select();

          if (itemsError) throw itemsError;

          return { ...meal, meal_items: newItems || [] };
        }

        return { ...meal, meal_items: [] };
      }

      // Just update meal type if no items provided
      if (mealType) {
        const { data: meal, error: updateError } = await supabase
          .from('meals')
          .update({ meal_type: mealType })
          .eq('id', mealId)
          .select(`*, meal_items (*)`)
          .single();

        if (updateError) throw updateError;
        return meal;
      }

      // Return existing meal with items
      const { data: meal, error } = await supabase
        .from('meals')
        .select(`*, meal_items (*)`)
        .eq('id', mealId)
        .single();

      if (error) throw error;
      return meal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealKeys.list(data.date) });
      queryClient.invalidateQueries({ queryKey: mealKeys.today() });
      // Also invalidate calorie chart data
      queryClient.invalidateQueries({ queryKey: ['calories', 'weekly'] });
      queryClient.invalidateQueries({ queryKey: ['calories', 'range'] });
      // Invalidate monthly data
      queryClient.invalidateQueries({ queryKey: ['meals', 'monthly'] });
    },
  });
}

// Delete a meal
export function useDeleteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealId: string): Promise<{ date: string }> => {
      // Get meal to know the date before deleting
      const { data: meal, error: fetchError } = await supabase
        .from('meals')
        .select('date')
        .eq('id', mealId)
        .single();

      if (fetchError) throw fetchError;

      // Delete meal (cascade will delete items)
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      // Return the date for cache invalidation
      return { date: meal.date };
    },
    onSuccess: (data) => {
      // Invalidate specific date and all meal lists
      queryClient.invalidateQueries({ queryKey: mealKeys.list(data.date) });
      queryClient.invalidateQueries({ queryKey: mealKeys.lists() });
      // Also invalidate calorie chart data
      queryClient.invalidateQueries({ queryKey: ['calories', 'weekly'] });
      queryClient.invalidateQueries({ queryKey: ['calories', 'range'] });
      // Invalidate monthly data
      queryClient.invalidateQueries({ queryKey: ['meals', 'monthly'] });
    },
  });
}

// Add item to existing meal
export function useAddMealItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mealId,
      item
    }: {
      mealId: string;
      item: Omit<MealItem, 'id' | 'meal_id' | 'created_at'>
    }): Promise<MealItem> => {
      // Insert new item
      const { data: newItem, error: itemError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          ...item,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Update meal total calories
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .select('total_calories')
        .eq('id', mealId)
        .single();

      if (mealError) throw mealError;

      await supabase
        .from('meals')
        .update({ total_calories: (meal.total_calories || 0) + item.calories })
        .eq('id', mealId);

      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealKeys.lists() });
      // Also invalidate calorie chart data
      queryClient.invalidateQueries({ queryKey: ['calories', 'weekly'] });
      queryClient.invalidateQueries({ queryKey: ['calories', 'range'] });
      // Invalidate monthly data
      queryClient.invalidateQueries({ queryKey: ['meals', 'monthly'] });
    },
  });
}

// Remove item from meal
export function useRemoveMealItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      mealId,
      calories
    }: {
      itemId: string;
      mealId: string;
      calories: number;
    }): Promise<void> => {
      // Delete item
      const { error: deleteError } = await supabase
        .from('meal_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      // Update meal total calories
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .select('total_calories')
        .eq('id', mealId)
        .single();

      if (mealError) throw mealError;

      await supabase
        .from('meals')
        .update({ total_calories: Math.max(0, (meal.total_calories || 0) - calories) })
        .eq('id', mealId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealKeys.lists() });
      // Also invalidate calorie chart data
      queryClient.invalidateQueries({ queryKey: ['calories', 'weekly'] });
      queryClient.invalidateQueries({ queryKey: ['calories', 'range'] });
      // Invalidate monthly data
      queryClient.invalidateQueries({ queryKey: ['meals', 'monthly'] });
    },
  });
}
