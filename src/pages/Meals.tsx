import { useState } from "react";
import { Calendar, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyMealsView } from "@/components/meals/WeeklyMealsView";
import { MonthlyMealsView } from "@/components/meals/MonthlyMealsView";

export default function Meals() {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("monthly");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Meals</h1>
        <p className="text-muted-foreground mt-1">Track your daily nutrition</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "daily" | "monthly")}>
        <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6">
          <TabsTrigger value="monthly" className="gap-2">
            <Calendar className="w-4 h-4" />
            월간 뷰
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-2">
            <List className="w-4 h-4" />
            일간 뷰
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-0">
          <MonthlyMealsView />
        </TabsContent>

        <TabsContent value="daily" className="mt-0">
          <WeeklyMealsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
