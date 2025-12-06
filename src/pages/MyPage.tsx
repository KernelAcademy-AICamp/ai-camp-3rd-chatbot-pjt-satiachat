import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  TrendingDown,
  Sparkles,
  Loader2,
  Plus,
  UtensilsCrossed,
  Flame,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { WeightChart } from "@/components/progress/WeightChart";
import { CalorieChart } from "@/components/progress/CalorieChart";
import { WeightLogForm } from "@/components/progress/WeightLogForm";
import { MealForm } from "@/components/meals/MealForm";
import { useLatestProgress, useWeeklyStats } from "@/hooks/useProgress";
import { useProfile } from "@/hooks/useProfile";
import { useTodayCalories, useMeals } from "@/hooks/useMeals";
import type { MealType, MealWithItems } from "@/types/domain";

// Fallback constants
const FALLBACK_GOAL_WEIGHT = 68;
const FALLBACK_START_WEIGHT = 78;

export default function MyPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealWithItems | null>(null);
  const [defaultMealType, setDefaultMealType] = useState<MealType>("breakfast");

  // Data hooks
  const { data: profile } = useProfile();
  const { data: latestProgress, isLoading: isLoadingLatest } = useLatestProgress();
  const { startWeight: weeklyStartWeight, endWeight, weightChange, logs } = useWeeklyStats();
  const { totalCalories: todayCalories } = useTodayCalories();

  // Selected date meals
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: selectedMeals } = useMeals(selectedDateStr);

  // Profile data with fallbacks
  const goalWeight = profile?.goal_weight_kg || FALLBACK_GOAL_WEIGHT;
  const profileStartWeight = profile?.current_weight_kg || FALLBACK_START_WEIGHT;
  const targetCalories = profile?.target_calories || 2000;

  // Calculate stats
  const currentWeight = latestProgress?.weight_kg || endWeight || profileStartWeight;
  const weightFromStart = profileStartWeight - currentWeight;
  const remainingWeight = currentWeight - goalWeight;
  const progressPercent = Math.round(
    ((profileStartWeight - currentWeight) / (profileStartWeight - goalWeight)) * 100
  );

  // Selected date meals total
  const selectedMealsTotal = selectedMeals?.reduce((sum, m) => sum + (m.total_calories || 0), 0) || 0;

  const generateSummary = () => {
    setIsGenerating(true);
    setTimeout(() => {
      if (logs.length === 0) {
        setAiSummary(
          "아직 기록된 체중 데이터가 없습니다.\n\n체중을 기록하시면 AI가 맞춤형 분석과 조언을 제공해드릴게요. '체중 기록' 버튼을 눌러 시작해보세요!"
        );
      } else {
        setAiSummary(
          `지난 7일 동안 ${logs.length}회 체중을 기록하셨습니다. ${
            weightChange
              ? weightChange < 0
                ? `${Math.abs(weightChange).toFixed(1)}kg 감량에 성공하셨어요! 🎉`
                : `${weightChange.toFixed(1)}kg 증가했어요.`
              : ""
          }\n\n**추천 사항:**\n• 매일 같은 시간에 체중을 측정하면 더 정확한 추이를 볼 수 있어요\n• 현재 페이스라면 목표 달성까지 순조롭게 진행 중이에요 💪\n• 체지방률도 함께 기록하면 더 정확한 분석이 가능해요`
        );
      }
      setIsGenerating(false);
    }, 2000);
  };

  const handleAddMeal = (mealType: MealType) => {
    setEditingMeal(null);
    setDefaultMealType(mealType);
    setShowMealForm(true);
  };

  const handleEditMeal = (meal: MealWithItems) => {
    setEditingMeal(meal);
    setShowMealForm(true);
  };

  const getMealTypeLabel = (type: string) => {
    switch (type) {
      case "breakfast": return "아침";
      case "lunch": return "점심";
      case "dinner": return "저녁";
      case "snack": return "간식";
      default: return type;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Page</h1>
            <p className="text-muted-foreground mt-1">나의 건강 기록과 진행 상황</p>
          </div>
          <Button
            onClick={() => setShowMealForm(true)}
            className="gap-2 rounded-xl shadow-glow"
          >
            <Plus className="w-4 h-4" />
            식단 추가
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6 animate-slide-up">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <TrendingDown className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">현재 진행 상황</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {isLoadingLatest ? "..." : currentWeight.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">kg</span>
                    {weightFromStart > 0 && (
                      <span className="text-sm text-success font-medium ml-2">
                        시작 대비 -{weightFromStart.toFixed(1)} kg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">시작 체중</p>
                  <p className="font-semibold text-foreground">{profileStartWeight} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">목표 체중</p>
                  <p className="font-semibold text-foreground">{goalWeight} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">남은 체중</p>
                  <p className="font-semibold text-foreground">
                    {remainingWeight > 0 ? remainingWeight.toFixed(1) : 0} kg
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>목표 달성률</span>
                  <span>{Math.min(100, Math.max(0, progressPercent))}%</span>
                </div>
                <div className="h-3 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Weight Chart */}
            <div
              className="bg-card rounded-2xl border border-border p-6 animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">체중 변화</h3>
                    <p className="text-xs text-muted-foreground">최근 7일</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWeightForm(true)}
                  className="gap-1.5 rounded-xl"
                >
                  <Scale className="w-3.5 h-3.5" />
                  기록
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="h-48">
                <WeightChart targetWeight={goalWeight} />
              </div>
            </div>

            {/* Calories Chart */}
            <div
              className="bg-card rounded-2xl border border-border p-6 animate-slide-up"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">칼로리 섭취</h3>
                  <p className="text-xs text-muted-foreground">목표: {targetCalories} kcal</p>
                </div>
              </div>
              <div className="h-48">
                <CalorieChart targetCalories={targetCalories} />
              </div>
            </div>

            {/* AI Summary */}
            <div
              className="bg-card rounded-2xl border border-border p-6 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">AI 코칭</h3>
                    <p className="text-xs text-muted-foreground">주간 분석 & 피드백</p>
                  </div>
                </div>
                <Button
                  onClick={generateSummary}
                  disabled={isGenerating}
                  variant={aiSummary ? "outline" : "default"}
                  className="gap-2 rounded-xl"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      분석 중...
                    </>
                  ) : aiSummary ? (
                    "새로고침"
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      분석 받기
                    </>
                  )}
                </Button>
              </div>

              {aiSummary ? (
                <div className="bg-muted/50 rounded-xl p-4 whitespace-pre-line text-sm text-foreground leading-relaxed">
                  {aiSummary}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-xl p-8 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    "분석 받기" 버튼을 눌러 AI 코치의 맞춤형 피드백을 받아보세요.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Calendar & Daily Meals */}
          <div className="space-y-6">
            {/* Calendar */}
            <div
              className="bg-card rounded-2xl border border-border p-4 animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ko}
                className="w-full pointer-events-auto"
                classNames={{
                  months: "w-full",
                  month: "w-full",
                  table: "w-full",
                  head_row: "flex w-full",
                  head_cell: "flex-1 text-muted-foreground text-xs font-medium",
                  row: "flex w-full mt-1",
                  cell: "flex-1 text-center text-sm p-0 relative",
                  day: cn(
                    "h-9 w-full rounded-lg font-normal",
                    "hover:bg-primary/10 transition-colors"
                  ),
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                }}
              />
            </div>

            {/* Selected Date Meals */}
            <div
              className="bg-card rounded-2xl border border-border p-5 animate-slide-up"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedMeals && selectedMeals.length > 0
                      ? `총 ${selectedMealsTotal} kcal 섭취`
                      : "기록된 식단이 없습니다"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg gap-1"
                  onClick={() => handleAddMeal("breakfast")}
                >
                  <Plus className="w-4 h-4" />
                  추가
                </Button>
              </div>

              {selectedMeals && selectedMeals.length > 0 ? (
                <div className="space-y-3">
                  {selectedMeals.map((meal, index) => (
                    <button
                      key={meal.id}
                      onClick={() => handleEditMeal(meal)}
                      className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-foreground">
                            {getMealTypeLabel(meal.meal_type)}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {meal.total_calories || 0} kcal
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {meal.meal_items?.map((item) => item.name).join(", ") || "항목 없음"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <UtensilsCrossed className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    이 날짜에 기록된 식단이 없어요
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 rounded-lg"
                    onClick={() => handleAddMeal("breakfast")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    식단 추가하기
                  </Button>
                </div>
              )}

              {/* Calorie Summary for Selected Day */}
              {selectedMeals && selectedMeals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>목표 대비 섭취량</span>
                    <span>
                      {selectedMealsTotal} / {targetCalories} kcal
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        selectedMealsTotal > targetCalories ? "bg-warning" : "bg-primary"
                      )}
                      style={{
                        width: `${Math.min((selectedMealsTotal / targetCalories) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weight Log Form */}
      <WeightLogForm open={showWeightForm} onOpenChange={setShowWeightForm} />

      {/* Meal Form */}
      <MealForm
        open={showMealForm}
        onOpenChange={setShowMealForm}
        editMeal={editingMeal || undefined}
        defaultDate={selectedDateStr}
        defaultMealType={defaultMealType}
      />
    </div>
  );
}
