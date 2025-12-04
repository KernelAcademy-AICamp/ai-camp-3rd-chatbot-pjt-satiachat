import { FileText, Calendar, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const reports = [
  {
    id: "1",
    title: "Weekly Report",
    period: "Nov 27 - Dec 3, 2024",
    summary: "Great week! Average calories 1,748 kcal, lost 0.7 kg",
    trend: "down",
  },
  {
    id: "2",
    title: "Weekly Report",
    period: "Nov 20 - Nov 26, 2024",
    summary: "Slightly over target, maintained weight at 73.2 kg",
    trend: "neutral",
  },
  {
    id: "3",
    title: "Monthly Report",
    period: "November 2024",
    summary: "Total loss: 2.1 kg. Medication adherence: 95%",
    trend: "down",
  },
];

export default function Reports() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">View your progress reports</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl">
          <Calendar className="w-4 h-4" />
          Custom Range
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "This Week", value: "-0.7 kg", trend: "down" },
          { label: "This Month", value: "-2.1 kg", trend: "down" },
          { label: "Avg Calories", value: "1,748", trend: "neutral" },
          { label: "Med Adherence", value: "95%", trend: "up" },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-4 animate-slide-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              {stat.trend === "down" && <TrendingDown className="w-4 h-4 text-success" />}
              {stat.trend === "up" && <TrendingUp className="w-4 h-4 text-success" />}
            </div>
          </div>
        ))}
      </div>

      {/* Report List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Past Reports</h3>
        
        {reports.map((report, index) => (
          <div
            key={report.id}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200 animate-slide-up"
            style={{ animationDelay: `${(index + 4) * 0.05}s` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{report.title}</h4>
                  <p className="text-sm text-muted-foreground">{report.period}</p>
                  <p className="text-sm text-foreground mt-2">{report.summary}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-lg">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon Note */}
      <div className="mt-8 text-center text-muted-foreground text-sm">
        <p>More detailed analytics and export options coming soon!</p>
      </div>
    </div>
  );
}
