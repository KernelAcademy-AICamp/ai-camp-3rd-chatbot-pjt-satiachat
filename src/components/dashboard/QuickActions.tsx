import { Plus, Scale, Pill, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline";
}

const actions: QuickAction[] = [
  {
    label: "Log Meal",
    icon: UtensilsCrossed,
    onClick: () => console.log("Log meal"),
    variant: "default",
  },
  {
    label: "Record Weight",
    icon: Scale,
    onClick: () => console.log("Record weight"),
    variant: "outline",
  },
  {
    label: "Take Medication",
    icon: Pill,
    onClick: () => console.log("Take medication"),
    variant: "outline",
  },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: "0.1s" }}>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          onClick={action.onClick}
          className={cn(
            "gap-2 rounded-xl transition-all duration-200",
            action.variant === "default" && "shadow-glow hover:shadow-lg"
          )}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
