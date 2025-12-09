import { useState } from "react";
import { Coffee, Sun, Moon, Cookie, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MealForm } from "@/components/meals/MealForm";
import { useTodayCalories } from "@/hooks/useMeals";
import type { MealType } from "@/types/domain";

const mealConfig: Record<MealType, { icon: typeof Coffee; label: string; time: string }> = {
  breakfast: { icon: Coffee, label: "Breakfast", time: "7:00 - 9:00" },
  lunch: { icon: Sun, label: "Lunch", time: "12:00 - 14:00" },
  dinner: { icon: Moon, label: "Dinner", time: "18:00 - 20:00" },
  snack: { icon: Cookie, label: "Snack", time: "Anytime" },
};

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function TodayMeals() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  const { mealsByType, totalCalories, isLoading, error } = useTodayCalories();

  const handleAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowAddForm(true);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <h3 className="font-semibold text-foreground mb-4">Today's Meals</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <h3 className="font-semibold text-foreground mb-4">Today's Meals</h3>
        <div className="text-center py-4 text-muted-foreground text-sm">
          <p>데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm animate-slide-up" style={{ animationDelay: "0.2s", fontSize: "1.3em" }}>
        <h3 className="font-semibold text-foreground mb-4">Today's Meals</h3>

        <div className="space-y-3">
          {mealTypes.map((mealType) => {
            const config = mealConfig[mealType];
            const Icon = config.icon;
            const meal = mealsByType[mealType];
            const isLogged = !!meal;
            const items = meal?.meal_items || [];
            const calories = meal?.total_calories || 0;

            return (
              <div
                key={mealType}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                  isLogged
                    ? "bg-muted/50 hover:bg-muted"
                    : "bg-muted/20 border border-dashed border-border hover:border-primary/30 cursor-pointer"
                )}
                onClick={() => !isLogged && handleAddMeal(mealType)}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isLogged ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm text-foreground">{config.label}</span>
                    <span className="text-xs text-muted-foreground">{config.time}</span>
                  </div>

                  {isLogged ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {items.map(item => item.name).join(", ") || "음식 항목 없음"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      Tap to log
                    </p>
                  )}
                </div>

                {isLogged && (
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{calories}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">kcal</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Logged</span>
          <div>
            <span className="text-lg font-bold text-foreground">{totalCalories.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground ml-1">kcal</span>
          </div>
        </div>
      </div>

      {/* Add Meal Form */}
      <MealForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        defaultMealType={selectedMealType}
      />
    </>
  );
}
