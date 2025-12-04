import { useState } from "react";
import { Calendar, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const mealHistory = [
  {
    date: "Today",
    meals: [
      { type: "breakfast", items: "계란 2개, 토스트, 우유", calories: 420 },
      { type: "lunch", items: "제육볶음, 공기밥, 김치", calories: 680 },
      { type: "snack", items: "아메리카노", calories: 10 },
    ],
  },
  {
    date: "Yesterday",
    meals: [
      { type: "breakfast", items: "오트밀, 바나나", calories: 350 },
      { type: "lunch", items: "비빔밥, 된장국", calories: 620 },
      { type: "dinner", items: "닭가슴살 샐러드", calories: 380 },
    ],
  },
];

export default function Meals() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Meals</h1>
          <p className="text-muted-foreground mt-1">Track your daily nutrition</p>
        </div>
        <Button className="gap-2 rounded-xl shadow-glow">
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
        <Button variant="outline" className="gap-2 rounded-xl">
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Select Date</span>
        </Button>
      </div>

      {/* Meal History */}
      <div className="space-y-6">
        {mealHistory.map((day, dayIndex) => (
          <div key={day.date} className="animate-slide-up" style={{ animationDelay: `${dayIndex * 0.1}s` }}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{day.date}</h3>
            <div className="space-y-3">
              {day.meals.map((meal, mealIndex) => (
                <div
                  key={`${day.date}-${meal.type}`}
                  className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground capitalize">{meal.type}</span>
                        <span className="text-sm font-semibold text-foreground">
                          {meal.calories} <span className="text-muted-foreground font-normal">kcal</span>
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{meal.items}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
