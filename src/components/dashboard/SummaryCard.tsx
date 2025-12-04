import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  progress?: number;
  variant?: "default" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-card border-border",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
  info: "bg-info/5 border-info/20",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  progress,
  variant = "default",
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md animate-slide-up",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", iconVariantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        {progress !== undefined && (
          <span className="text-sm font-semibold text-muted-foreground">
            {progress}%
          </span>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                variant === "default" && "bg-primary",
                variant === "success" && "bg-success",
                variant === "warning" && "bg-warning",
                variant === "info" && "bg-info"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
