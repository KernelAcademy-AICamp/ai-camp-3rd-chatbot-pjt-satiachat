import { useState } from "react";
import { Flame, Scale, Pill, Target, X } from "lucide-react";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { TodayMeals } from "@/components/dashboard/TodayMeals";
import { FloatingChatButton } from "@/components/ui/FloatingChatButton";
import { Button } from "@/components/ui/button";
import { useTodayCalories } from "@/hooks/useMeals";
import { useLatestProgress } from "@/hooks/useProgress";
import { useTodayMedicationStats } from "@/hooks/useMedications";
import { useProfile } from "@/hooks/useProfile";

// Fallback constants if profile data is not available
const FALLBACK_TARGET_CALORIES = 1800;
const FALLBACK_GOAL_WEIGHT = 68;
const FALLBACK_START_WEIGHT = 78;

export default function Dashboard() {
  const [showMobileChat, setShowMobileChat] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Get user profile data
  const { data: profile, isLoading: isLoadingProfile } = useProfile();

  // Get today's calories from Supabase
  const { totalCalories, isLoading: isLoadingCalories } = useTodayCalories();

  // Get latest weight from Supabase
  const { data: latestProgress, isLoading: isLoadingWeight } = useLatestProgress();

  // Get today's medication stats from Supabase
  const {
    total: medicationsTotal,
    taken: medicationsTaken,
    percentage: medicationPercentage,
    isLoading: isLoadingMeds
  } = useTodayMedicationStats();

  // Extract profile data with fallbacks
  const targetCalories = profile?.target_calories || FALLBACK_TARGET_CALORIES;
  const goalWeight = profile?.goal_weight_kg || FALLBACK_GOAL_WEIGHT;
  const startWeight = profile?.current_weight_kg || FALLBACK_START_WEIGHT;

  // Calculate values
  // Use latest logged weight, or fall back to profile's current weight, or fall back to constant
  const currentWeight = latestProgress?.weight_kg || startWeight;
  const caloriesProgress = Math.min(100, Math.round((totalCalories / targetCalories) * 100));
  const weightProgress = Math.round(((startWeight - currentWeight) / (startWeight - goalWeight)) * 100);
  const remainingWeight = currentWeight - goalWeight;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">{today}</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActions />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Calories"
            value={isLoadingCalories ? "..." : totalCalories.toLocaleString()}
            subtitle={`of ${targetCalories.toLocaleString()} kcal`}
            icon={Flame}
            progress={isLoadingCalories ? 0 : caloriesProgress}
            variant="default"
          />
          <SummaryCard
            title="Weight"
            value={isLoadingWeight ? "..." : currentWeight.toFixed(1)}
            subtitle={latestProgress ? "kg ??Updated" : "kg ??No data"}
            icon={Scale}
            variant="success"
          />
          <SummaryCard
            title="Medication"
            value={isLoadingMeds ? "..." : `${medicationsTaken}/${medicationsTotal}`}
            subtitle="doses taken"
            icon={Pill}
            progress={isLoadingMeds ? 0 : medicationPercentage}
            variant="warning"
          />
          <SummaryCard
            title="Goal"
            value={`${goalWeight} kg`}
            subtitle={remainingWeight > 0 ? `${remainingWeight.toFixed(1)} kg to go` : "Goal reached!"}
            icon={Target}
            progress={Math.min(100, Math.max(0, weightProgress))}
            variant="info"
          />
        </div>

        {/* Today's Meals */}
        <TodayMeals />
      </div>

      {/* Chat Panel - Desktop */}
      <div className="hidden lg:block w-[420px] border-l border-border p-4 bg-muted/20">
        <div className="h-[calc(100vh-2rem)] sticky top-4">
          <ChatPanel />
        </div>
      </div>

      {/* Chat Panel - Mobile */}
      <FloatingChatButton
        isOpen={showMobileChat}
        onClick={() => setShowMobileChat(!showMobileChat)}
      />

      {/* Mobile Chat Modal */}
      {showMobileChat && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileChat(false)}
          />
          {/* Chat Panel */}
          <div className="absolute inset-4 md:inset-8 bg-background rounded-3xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]">
            <div className="relative flex-1 flex flex-col min-h-0">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 rounded-xl"
                onClick={() => setShowMobileChat(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <ChatPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
