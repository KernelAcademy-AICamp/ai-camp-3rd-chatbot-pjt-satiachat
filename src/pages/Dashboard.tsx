import { Flame, Scale, Pill, Target } from "lucide-react";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { TodayMeals } from "@/components/dashboard/TodayMeals";

export default function Dashboard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
            value="1,110"
            subtitle="of 1,800 kcal"
            icon={Flame}
            progress={62}
            variant="default"
          />
          <SummaryCard
            title="Weight"
            value="72.5"
            subtitle="kg • Updated today"
            icon={Scale}
            variant="success"
          />
          <SummaryCard
            title="Medication"
            value="1/2"
            subtitle="doses taken"
            icon={Pill}
            progress={50}
            variant="warning"
          />
          <SummaryCard
            title="Goal"
            value="68 kg"
            subtitle="4.5 kg to go"
            icon={Target}
            progress={75}
            variant="info"
          />
        </div>

        {/* Today's Meals */}
        <TodayMeals />
      </div>

      {/* Chat Panel - Desktop */}
      <div className="hidden lg:block w-96 border-l border-border p-4 bg-muted/20">
        <div className="h-[calc(100vh-2rem)] sticky top-4">
          <ChatPanel />
        </div>
      </div>

      {/* Chat Panel - Mobile (simplified floating button would go here) */}
    </div>
  );
}
