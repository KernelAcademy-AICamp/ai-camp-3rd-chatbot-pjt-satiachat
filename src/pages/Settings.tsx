import { useState } from "react";
import { User, Bell, Palette, Shield, Snowflake, Sun, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type CoachPersona = "cold" | "bright" | "strict";

const personas: { id: CoachPersona; icon: typeof Snowflake; label: string; description: string }[] = [
  {
    id: "cold",
    icon: Snowflake,
    label: "Cool & Factual",
    description: "Minimal emotions, short & direct responses",
  },
  {
    id: "bright",
    icon: Sun,
    label: "Warm & Supportive",
    description: "Encouraging, positive feedback with emojis",
  },
  {
    id: "strict",
    icon: Flame,
    label: "Direct & Focused",
    description: "No-nonsense, straightforward coaching",
  },
];

export default function Settings() {
  const [selectedPersona, setSelectedPersona] = useState<CoachPersona>("bright");
  const [notifications, setNotifications] = useState({
    meals: true,
    medications: true,
    weight: false,
    insights: true,
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </div>

      {/* Profile Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Profile</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Height (cm)</label>
              <Input defaultValue="175" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Goal Weight (kg)</label>
              <Input defaultValue="68" className="rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Target Calories</label>
            <Input defaultValue="1800" className="rounded-xl" />
          </div>
        </div>
      </section>

      {/* Coach Persona Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Coach Persona</h2>
            <p className="text-xs text-muted-foreground">Choose your coaching style</p>
          </div>
        </div>

        <div className="space-y-3">
          {personas.map((persona) => {
            const Icon = persona.icon;
            const isSelected = selectedPersona === persona.id;

            return (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(persona.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{persona.label}</p>
                  <p className="text-xs text-muted-foreground">{persona.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-info" />
          </div>
          <h2 className="font-semibold text-foreground">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            { key: "meals", label: "Meal reminders", description: "Daily reminders to log meals" },
            { key: "medications", label: "Medication alerts", description: "Never miss a dose" },
            { key: "weight", label: "Weight check-ins", description: "Weekly weight logging reminder" },
            { key: "insights", label: "AI insights", description: "Weekly summary notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={notifications[item.key as keyof typeof notifications]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* Account Section */}
      <section className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="font-semibold text-foreground">Account</h2>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start rounded-xl">
            Change Password
          </Button>
          <Button variant="outline" className="w-full justify-start rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5">
            Delete Account
          </Button>
        </div>
      </section>

      {/* Save Button */}
      <div className="mt-6">
        <Button className="w-full rounded-xl shadow-glow">Save Changes</Button>
      </div>
    </div>
  );
}
