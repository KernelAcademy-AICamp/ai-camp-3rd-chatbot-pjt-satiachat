import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Pill, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WeightLogForm } from "@/components/progress/WeightLogForm";
import { MealForm } from "@/components/meals/MealForm";

export function QuickActions() {
  const navigate = useNavigate();
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);

  const actions = [
    {
      label: "Log Meal",
      icon: UtensilsCrossed,
      onClick: () => setShowMealForm(true),
      variant: "default" as const,
    },
    {
      label: "Record Weight",
      icon: Scale,
      onClick: () => setShowWeightForm(true),
      variant: "outline" as const,
    },
    {
      label: "Take Medication",
      icon: Pill,
      onClick: () => navigate("/medications"),
      variant: "outline" as const,
    },
  ];

  return (
    <>
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

      {/* Weight Log Form Modal */}
      <WeightLogForm
        open={showWeightForm}
        onOpenChange={setShowWeightForm}
      />

      {/* Meal Form Modal */}
      <MealForm
        open={showMealForm}
        onOpenChange={setShowMealForm}
      />
    </>
  );
}
