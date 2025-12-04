import { useState } from "react";
import { TrendingDown, Plus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeightChart } from "@/components/progress/WeightChart";
import { WeightLogForm } from "@/components/progress/WeightLogForm";
import { useLatestProgress, useWeeklyStats } from "@/hooks/useProgress";

// Temporary constants until connected to user profile
const GOAL_WEIGHT = 68;
const START_WEIGHT = 78;

export default function MyPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [showWeightForm, setShowWeightForm] = useState(false);

  const { data: latestProgress, isLoading: isLoadingLatest } = useLatestProgress();
  const { startWeight, endWeight, weightChange, logs, isLoading: isLoadingWeekly } = useWeeklyStats();

  // Use latest weight or fallback
  const currentWeight = latestProgress?.weight_kg || endWeight || START_WEIGHT;
  const weightFromStart = START_WEIGHT - currentWeight;
  const remainingWeight = currentWeight - GOAL_WEIGHT;
  const progressPercent = Math.round(((START_WEIGHT - currentWeight) / (START_WEIGHT - GOAL_WEIGHT)) * 100);

  const generateSummary = () => {
    setIsGenerating(true);
    // Simulate AI response (will be connected to Claude API in Phase 5)
    setTimeout(() => {
      if (logs.length === 0) {
        setAiSummary(
          "아직 기록된 체중 데이터가 없습니다.\n\n체중을 기록하시면 AI가 맞춤형 분석과 조언을 제공해드릴게요. 오른쪽 상단의 '체중 기록' 버튼을 눌러 시작해보세요!"
        );
      } else {
        setAiSummary(
          `지난 7일 동안 ${logs.length}회 체중을 기록하셨습니다. ${weightChange ? (weightChange < 0 ? `${Math.abs(weightChange).toFixed(1)}kg 감량에 성공하셨어요! 🎉` : `${weightChange.toFixed(1)}kg 증가했어요.`) : ''}\n\n**추천 사항:**\n• 매일 같은 시간에 체중을 측정하면 더 정확한 추이를 볼 수 있어요\n• 현재 페이스라면 목표 달성까지 순조롭게 진행 중이에요 💪\n• 체지방률도 함께 기록하면 더 정확한 분석이 가능해요`
        );
      }
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Page</h1>
          <p className="text-muted-foreground mt-1">Track your progress</p>
        </div>
        <Button
          className="gap-2 rounded-xl"
          onClick={() => setShowWeightForm(true)}
        >
          <Plus className="w-4 h-4" />
          체중 기록
        </Button>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6 mb-6 animate-slide-up">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <TrendingDown className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Progress</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {isLoadingLatest ? "..." : currentWeight.toFixed(1)}
              </span>
              <span className="text-muted-foreground">kg</span>
              {weightFromStart > 0 && (
                <span className="text-sm text-success font-medium ml-2">
                  -{weightFromStart.toFixed(1)} kg from start
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Start</p>
            <p className="font-semibold text-foreground">{START_WEIGHT} kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Goal</p>
            <p className="font-semibold text-foreground">{GOAL_WEIGHT} kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className="font-semibold text-foreground">
              {remainingWeight > 0 ? remainingWeight.toFixed(1) : 0} kg
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
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
      <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <h3 className="font-semibold text-foreground mb-4">Weight Trend (Last 7 Days)</h3>
        <WeightChart targetWeight={GOAL_WEIGHT} />
      </div>

      {/* AI Summary */}
      <div className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Insights</h3>
              <p className="text-xs text-muted-foreground">Weekly summary & recommendations</p>
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
                Analyzing...
              </>
            ) : aiSummary ? (
              "Refresh"
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Summary
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
              Click "Generate Summary" to get personalized insights based on your weekly data.
            </p>
          </div>
        )}
      </div>

      {/* Weight Log Form */}
      <WeightLogForm
        open={showWeightForm}
        onOpenChange={setShowWeightForm}
      />
    </div>
  );
}
