import { FileText, Calendar, Download, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickStats, useWeeklyReports } from "@/hooks/useReports";

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('en-US', options);
  const endStr = endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' });

  return `${startStr} - ${endStr}`;
}

function generateSummary(report: {
  weightChange: number | null;
  avgCalories: number;
  medicationAdherence: number;
}): string {
  const parts: string[] = [];

  if (report.weightChange !== null) {
    if (report.weightChange < 0) {
      parts.push(`Lost ${Math.abs(report.weightChange).toFixed(1)} kg`);
    } else if (report.weightChange > 0) {
      parts.push(`Gained ${report.weightChange.toFixed(1)} kg`);
    } else {
      parts.push(`Maintained weight`);
    }
  }

  if (report.avgCalories > 0) {
    parts.push(`Avg ${report.avgCalories.toLocaleString()} kcal/day`);
  }

  if (report.medicationAdherence > 0) {
    parts.push(`${report.medicationAdherence}% medication adherence`);
  }

  return parts.length > 0 ? parts.join('. ') : 'No data recorded this week';
}

export default function Reports() {
  const { data: quickStats, isLoading: isLoadingStats } = useQuickStats();
  const { data: weeklyReports, isLoading: isLoadingReports } = useWeeklyReports(4);

  const stats = [
    {
      label: "This Week",
      value: quickStats?.thisWeekChange != null
        ? `${quickStats.thisWeekChange > 0 ? '+' : ''}${quickStats.thisWeekChange.toFixed(1)} kg`
        : "No data",
      trend: quickStats?.thisWeekChange != null
        ? quickStats.thisWeekChange < 0 ? "down" : quickStats.thisWeekChange > 0 ? "up" : "neutral"
        : "neutral",
    },
    {
      label: "This Month",
      value: quickStats?.thisMonthChange != null
        ? `${quickStats.thisMonthChange > 0 ? '+' : ''}${quickStats.thisMonthChange.toFixed(1)} kg`
        : "No data",
      trend: quickStats?.thisMonthChange != null
        ? quickStats.thisMonthChange < 0 ? "down" : quickStats.thisMonthChange > 0 ? "up" : "neutral"
        : "neutral",
    },
    {
      label: "Avg Calories",
      value: quickStats?.avgCalories
        ? quickStats.avgCalories.toLocaleString()
        : "0",
      trend: "neutral",
    },
    {
      label: "Med Adherence",
      value: quickStats?.medicationAdherence != null
        ? `${quickStats.medicationAdherence}%`
        : "0%",
      trend: quickStats?.medicationAdherence && quickStats.medicationAdherence >= 80 ? "up" : "neutral",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">View your progress reports</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl" disabled>
          <Calendar className="w-4 h-4" />
          Custom Range
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-4 animate-slide-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <div className="flex items-center gap-2">
              {isLoadingStats ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <span className="text-xl font-bold text-foreground">{stat.value}</span>
                  {stat.trend === "down" && <TrendingDown className="w-4 h-4 text-success" />}
                  {stat.trend === "up" && stat.label.includes("Adherence") && <TrendingUp className="w-4 h-4 text-success" />}
                  {stat.trend === "up" && !stat.label.includes("Adherence") && <TrendingUp className="w-4 h-4 text-warning" />}
                  {stat.trend === "neutral" && <Minus className="w-4 h-4 text-muted-foreground" />}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Report List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Weekly Reports</h3>

        {isLoadingReports ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : weeklyReports && weeklyReports.length > 0 ? (
          weeklyReports.map((report, index) => (
            <div
              key={`${report.weekStart}-${report.weekEnd}`}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${(index + 4) * 0.05}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Weekly Report</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateRange(report.weekStart, report.weekEnd)}
                    </p>
                    <p className="text-sm text-foreground mt-2">
                      {generateSummary(report)}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-lg" disabled>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No reports yet. Start logging your meals, weight, and medications to see weekly reports!
            </p>
          </div>
        )}
      </div>

      {/* Coming Soon Note */}
      <div className="mt-8 text-center text-muted-foreground text-sm">
        <p>More detailed analytics and export options coming soon!</p>
      </div>
    </div>
  );
}
