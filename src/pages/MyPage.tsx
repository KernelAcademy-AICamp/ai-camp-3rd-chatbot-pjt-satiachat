import { useState } from "react";
import { TrendingDown, Target, Award, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const stats = {
  currentWeight: 72.5,
  goalWeight: 68,
  startWeight: 78,
  progress: 55,
};

const weeklyData = [
  { day: "Mon", calories: 1650, weight: 73.2 },
  { day: "Tue", calories: 1780, weight: 72.9 },
  { day: "Wed", calories: 1520, weight: 72.8 },
  { day: "Thu", calories: 1890, weight: 72.6 },
  { day: "Fri", calories: 1700, weight: 72.5 },
  { day: "Sat", calories: 2100, weight: 72.7 },
  { day: "Sun", calories: 1600, weight: 72.5 },
];

export default function MyPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const generateSummary = () => {
    setIsGenerating(true);
    // Simulate AI response
    setTimeout(() => {
      setAiSummary(
        "지난 7일 동안 평균 섭취 칼로리는 목표의 88%였습니다. 평일에는 목표를 잘 지키고 있지만, 주말에 칼로리 초과가 반복되고 있어요. 특히 토요일에 2,100 kcal를 섭취하셨네요.\n\n**추천 사항:**\n• 다음 주 주말 저녁은 탄수화물을 줄여보세요\n• 체중은 꾸준히 감소 중이에요 - 잘하고 계십니다! 💪\n• 단백질 섭취를 조금 더 늘리면 포만감이 오래 갈 거예요"
      );
      setIsGenerating(false);
    }, 2000);
  };

  const maxCalories = Math.max(...weeklyData.map((d) => d.calories));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Page</h1>
        <p className="text-muted-foreground mt-1">Track your progress</p>
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
              <span className="text-3xl font-bold text-foreground">{stats.currentWeight}</span>
              <span className="text-muted-foreground">kg</span>
              <span className="text-sm text-success font-medium ml-2">
                -5.5 kg from start
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Start</p>
            <p className="font-semibold text-foreground">{stats.startWeight} kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Goal</p>
            <p className="font-semibold text-foreground">{stats.goalWeight} kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className="font-semibold text-foreground">{stats.currentWeight - stats.goalWeight} kg</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{stats.progress}%</span>
          </div>
          <div className="h-3 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-700"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <h3 className="font-semibold text-foreground mb-4">This Week's Calories</h3>
        
        <div className="flex items-end justify-between gap-2 h-40">
          {weeklyData.map((data, index) => (
            <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center">
                <span className="text-xs text-muted-foreground mb-1">{data.calories}</span>
                <div
                  className={cn(
                    "w-full rounded-t-lg transition-all duration-500",
                    data.calories > 1800 ? "bg-warning" : "bg-primary"
                  )}
                  style={{
                    height: `${(data.calories / maxCalories) * 100}px`,
                    animationDelay: `${index * 0.1}s`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{data.day}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Within goal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-warning" />
            <span className="text-muted-foreground">Over goal</span>
          </div>
        </div>
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
    </div>
  );
}
