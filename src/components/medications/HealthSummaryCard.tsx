import { Scale, Utensils, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useWeeklyStats, useWeeklyCalories } from "@/hooks/useProgress";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

export function HealthSummaryCard() {
  const { data: profile } = useProfile();
  const { endWeight, weightChange, isLoading: weightLoading } = useWeeklyStats();
  const { data: calorieData, isLoading: calorieLoading } = useWeeklyCalories();

  // 이번 주 평균 칼로리 계산
  const avgCalories = calorieData
    ? Math.round(
        calorieData.reduce((sum, d) => sum + d.totalCalories, 0) /
        calorieData.filter(d => d.totalCalories > 0).length || 0
      )
    : 0;

  const targetCalories = profile?.target_calories || 2000;
  const caloriePercent = Math.round((avgCalories / targetCalories) * 100);

  // 체중 변화 방향
  const weightTrend = weightChange === null
    ? "neutral"
    : weightChange < 0
      ? "down"
      : weightChange > 0
        ? "up"
        : "neutral";

  const isLoading = weightLoading || calorieLoading;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 체중 변화 카드 */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">체중 변화</span>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-20 mb-1" />
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {endWeight ? `${endWeight}` : "--"}
              </span>
              <span className="text-sm text-muted-foreground">kg</span>
            </div>

            {weightChange !== null && (
              <div className={cn(
                "flex items-center gap-1 mt-1 text-sm font-medium",
                weightTrend === "down" && "text-success",
                weightTrend === "up" && "text-warning",
                weightTrend === "neutral" && "text-muted-foreground"
              )}>
                {weightTrend === "down" && <TrendingDown className="w-3.5 h-3.5" />}
                {weightTrend === "up" && <TrendingUp className="w-3.5 h-3.5" />}
                {weightTrend === "neutral" && <Minus className="w-3.5 h-3.5" />}
                <span>
                  {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)}kg 이번주
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 칼로리 섭취 카드 */}
      <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
            <Utensils className="w-4 h-4 text-warning" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">평균 칼로리</span>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-24 mb-1" />
            <div className="h-4 bg-muted rounded w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {avgCalories > 0 ? avgCalories.toLocaleString() : "--"}
              </span>
              <span className="text-sm text-muted-foreground">kcal</span>
            </div>

            <div className={cn(
              "text-sm font-medium mt-1",
              caloriePercent > 100 ? "text-warning" : "text-success"
            )}>
              목표 대비 {caloriePercent || 0}%
            </div>
          </>
        )}
      </div>
    </div>
  );
}
