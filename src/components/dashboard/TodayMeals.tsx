import { Coffee, Sun, Moon, Cookie } from "lucide-react";
import { cn } from "@/lib/utils";

interface Meal {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  items: string[];
  calories: number;
  logged: boolean;
}

const mealConfig = {
  breakfast: { icon: Coffee, label: "Breakfast", time: "7:00 - 9:00" },
  lunch: { icon: Sun, label: "Lunch", time: "12:00 - 14:00" },
  dinner: { icon: Moon, label: "Dinner", time: "18:00 - 20:00" },
  snack: { icon: Cookie, label: "Snack", time: "Anytime" },
};

const todayMeals: Meal[] = [
  { type: "breakfast", items: ["계란 2개", "토스트 1장", "우유 200ml"], calories: 420, logged: true },
  { type: "lunch", items: ["제육볶음", "공기밥", "김치"], calories: 680, logged: true },
  { type: "dinner", items: [], calories: 0, logged: false },
  { type: "snack", items: ["아메리카노"], calories: 10, logged: true },
];

export function TodayMeals() {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <h3 className="font-semibold text-foreground mb-4">Today's Meals</h3>
      
      <div className="space-y-3">
        {todayMeals.map((meal) => {
          const config = mealConfig[meal.type];
          const Icon = config.icon;
          
          return (
            <div
              key={meal.type}
              className={cn(
                "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                meal.logged
                  ? "bg-muted/50 hover:bg-muted"
                  : "bg-muted/20 border border-dashed border-border hover:border-primary/30"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  meal.logged ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-sm text-foreground">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{config.time}</span>
                </div>
                
                {meal.logged ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {meal.items.join(", ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not logged yet</p>
                )}
              </div>
              
              {meal.logged && (
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">{meal.calories}</span>
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
          <span className="text-lg font-bold text-foreground">1,110</span>
          <span className="text-sm text-muted-foreground ml-1">kcal</span>
        </div>
      </div>
    </div>
  );
}
