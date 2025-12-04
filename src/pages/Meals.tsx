import { useState } from "react";
import { Calendar, Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealCard } from "@/components/meals/MealCard";
import { MealForm } from "@/components/meals/MealForm";
import { useMeals } from "@/hooks/useMeals";
import { getToday, formatDate } from "@/lib/supabase";
import type { MealType } from "@/types/domain";

export default function Meals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: meals, isLoading, error } = useMeals(selectedDate);

  // Filter meals by search query
  const filteredMeals = meals?.filter(meal => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      meal.meal_type.toLowerCase().includes(query) ||
      meal.meal_items?.some(item => item.name.toLowerCase().includes(query))
    );
  });

  // Group meals by type for display order
  const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const sortedMeals = filteredMeals?.sort((a, b) => {
    return mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type);
  });

  // Format date for display
  const displayDate = () => {
    const today = getToday();
    const yesterday = formatDate(new Date(Date.now() - 86400000));

    if (selectedDate === today) return 'Today';
    if (selectedDate === yesterday) return 'Yesterday';

    return new Date(selectedDate).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Meals</h1>
          <p className="text-muted-foreground mt-1">Track your daily nutrition</p>
        </div>
        <Button
          className="gap-2 rounded-xl shadow-glow"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4" />
          Add Meal
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="relative">
          <Button variant="outline" className="gap-2 rounded-xl" asChild>
            <label>
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">{displayDate()}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Meal List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">{displayDate()}</h3>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-center">
            <p>식단 데이터를 불러오는데 실패했습니다.</p>
            <p className="text-sm mt-1">Supabase 연결을 확인해주세요.</p>
          </div>
        )}

        {!isLoading && !error && sortedMeals && sortedMeals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">기록된 식단이 없습니다</p>
            <p className="text-sm">위의 "Add Meal" 버튼을 눌러 식단을 기록해보세요!</p>
          </div>
        )}

        {!isLoading && !error && sortedMeals && sortedMeals.length > 0 && (
          <div className="space-y-3">
            {sortedMeals.map((meal, index) => (
              <div
                key={meal.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <MealCard meal={meal} />
              </div>
            ))}
          </div>
        )}

        {/* Daily Summary */}
        {sortedMeals && sortedMeals.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Calories</span>
              <span className="text-xl font-bold text-primary">
                {sortedMeals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0)} kcal
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Add Meal Form */}
      <MealForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        defaultDate={selectedDate}
      />
    </div>
  );
}
