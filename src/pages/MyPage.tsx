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
  Target,
  CalendarDays,
  Coffee,
  Sun,
  Moon,
  Cookie,
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
import { useAIAnalysis } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import type { MealType, MealWithItems } from "@/types/domain";

// Fallback constants
const FALLBACK_GOAL_WEIGHT = 68;
const FALLBACK_START_WEIGHT = 78;

export default function MyPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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

  // AI Analysis hook
  const aiAnalysis = useAIAnalysis();
  const { toast } = useToast();

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

  // 선택된 날짜에 이미 등록된 식사 유형들
  const existingMealTypes = selectedMeals?.map(m => m.meal_type) || [];

  // 모든 식사 유형이 등록되었는지 확인
  const allMealTypesRegistered = existingMealTypes.length >= 4;

  // 식사 정렬 순서
  const mealTypeOrder: Record<MealType, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
    snack: 3,
  };

  // 정렬된 식단
  const sortedMeals = selectedMeals
    ? [...selectedMeals].sort((a, b) => mealTypeOrder[a.meal_type] - mealTypeOrder[b.meal_type])
    : [];

  const generateSummary = async () => {
    try {
      const result = await aiAnalysis.mutateAsync({ persona: 'bright' });
      setAiSummary(result);
    } catch (error) {
      console.error('AI 분석 오류:', error);
      toast({
        title: "분석 실패",
        description: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    }
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

  const getMealTypeIcon = (type: MealType) => {
    switch (type) {
      case "breakfast": return Coffee;
      case "lunch": return Sun;
      case "dinner": return Moon;
      case "snack": return Cookie;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Page</h1>
          <p className="text-muted-foreground mt-1">나의 건강 기록과 진행 상황</p>
        </div>

        {/* AI Coaching - Top Banner */}
        <div className="p-5 rounded-2xl border shadow-sm bg-card hover:shadow-md transition-all duration-300 mb-6 animate-slide-up">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              {aiSummary ? (
                <p className="text-sm text-foreground line-clamp-1 flex-1 font-medium">
                  {aiSummary.split('\n')[0]}
                </p>
              ) : (
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">AI 코칭</p>
                  <p className="text-sm font-semibold text-foreground">맞춤형 분석을 받아보세요</p>
                </div>
              )}
            </div>
            <Button
              onClick={generateSummary}
              disabled={aiAnalysis.isPending}
              size="sm"
              className="gap-2 rounded-xl"
            >
              {aiAnalysis.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {aiSummary ? "새로고침" : "분석 받기"}
                </>
              )}
            </Button>
          </div>
          {aiSummary && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {aiSummary}
              </p>
            </div>
          )}
        </div>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Current Weight Card */}
          <div className="p-5 rounded-2xl border shadow-sm bg-success/5 border-success/20 hover:shadow-md transition-all duration-300 animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-success/10">
                <Scale className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">현재 체중</p>
            <p className="text-2xl font-bold text-foreground">
              {isLoadingLatest ? "..." : currentWeight.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">kg</p>
          </div>

          {/* Goal Weight Card */}
          <div className="p-5 rounded-2xl border shadow-sm bg-info/5 border-info/20 hover:shadow-md transition-all duration-300 animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-info/10">
                <Target className="w-5 h-5 text-info" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                {Math.min(100, Math.max(0, progressPercent))}%
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">목표 체중</p>
            <p className="text-2xl font-bold text-foreground">{goalWeight}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {remainingWeight > 0 ? `${remainingWeight.toFixed(1)}kg 남음` : "목표 달성!"}
            </p>
            <div className="mt-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-info"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Today Calories Card */}
          <div className="p-5 rounded-2xl border shadow-sm bg-warning/5 border-warning/20 hover:shadow-md transition-all duration-300 animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-warning/10">
                <Flame className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                {Math.min(100, Math.round((todayCalories / targetCalories) * 100))}%
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">오늘 섭취</p>
            <p className="text-2xl font-bold text-foreground">{todayCalories.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">/ {targetCalories} kcal</p>
            <div className="mt-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-warning"
                  style={{ width: `${Math.min(100, (todayCalories / targetCalories) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weight Change Card */}
          <div className="p-5 rounded-2xl border shadow-sm bg-card border-border hover:shadow-md transition-all duration-300 animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">시작 대비</p>
            <p className="text-2xl font-bold text-foreground">
              {weightFromStart > 0 ? `-${weightFromStart.toFixed(1)}` : weightFromStart.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">kg 변화</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Weight Chart */}
            <div className="p-5 rounded-2xl border shadow-sm bg-card hover:shadow-md transition-all duration-300 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-success/10">
                    <Scale className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">체중 변화</p>
                    <p className="font-semibold text-foreground">최근 7일</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWeightForm(true)}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  기록
                </Button>
              </div>
              <div className="h-64">
                <WeightChart targetWeight={goalWeight} />
              </div>
            </div>

            {/* Calories Chart */}
            <div className="p-5 rounded-2xl border shadow-sm bg-card hover:shadow-md transition-all duration-300 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-warning/10">
                    <Flame className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">칼로리 섭취</p>
                    <p className="font-semibold text-foreground">목표: {targetCalories} kcal</p>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <CalorieChart targetCalories={targetCalories} />
              </div>
            </div>
          </div>

          {/* Right Column - Calendar & Daily Meals */}
          <div className="space-y-6">
            {/* Calendar */}
            <div className="p-4 rounded-2xl border shadow-sm bg-card hover:shadow-md transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-3 px-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarDays className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-foreground text-sm">날짜 선택</p>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ko}
                disabled={{ after: new Date() }}
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
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "text-muted-foreground opacity-50",
                }}
              />
            </div>

            {/* Selected Date Meals */}
            <div className="p-5 rounded-2xl border shadow-sm bg-card hover:shadow-md transition-all duration-300 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <UtensilsCrossed className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedMeals && selectedMeals.length > 0
                        ? `${selectedMealsTotal.toLocaleString()} kcal`
                        : "기록 없음"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1"
                  onClick={() => handleAddMeal("breakfast")}
                  disabled={allMealTypesRegistered}
                  title={allMealTypesRegistered ? "모든 식사가 등록되었습니다" : undefined}
                >
                  <Plus className="w-4 h-4" />
                  추가
                </Button>
              </div>

              {sortedMeals.length > 0 ? (
                <div className="space-y-2">
                  {sortedMeals.map((meal) => {
                    const MealIcon = getMealTypeIcon(meal.meal_type);
                    return (
                    <button
                      key={meal.id}
                      onClick={() => handleEditMeal(meal)}
                      className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MealIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-foreground">
                            {getMealTypeLabel(meal.meal_type)}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {meal.total_calories || 0} kcal
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {meal.meal_items?.map((item) => item.name).join(", ") || "항목 없음"}
                        </p>
                      </div>
                    </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    기록된 식단이 없어요
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleAddMeal("breakfast")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    식단 추가하기
                  </Button>
                </div>
              )}

              {/* Calorie Summary for Selected Day */}
              {sortedMeals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>목표 대비</span>
                    <span className="font-medium">
                      {selectedMealsTotal.toLocaleString()} / {targetCalories.toLocaleString()} kcal
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
        existingMealTypes={editingMeal ? [] : existingMealTypes}
      />
    </div>
  );
}
