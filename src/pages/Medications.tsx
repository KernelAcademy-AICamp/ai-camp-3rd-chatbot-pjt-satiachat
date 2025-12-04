import { useState } from "react";
import { Pill, Plus, Check, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  taken: boolean;
}

const medications: Medication[] = [
  {
    id: "1",
    name: "Wegovy",
    dosage: "0.5mg",
    frequency: "Weekly",
    time: "Sunday AM",
    taken: true,
  },
  {
    id: "2",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Daily",
    time: "With breakfast",
    taken: true,
  },
  {
    id: "3",
    name: "Vitamin D",
    dosage: "2000 IU",
    frequency: "Daily",
    time: "Morning",
    taken: false,
  },
];

export default function Medications() {
  const [meds, setMeds] = useState(medications);

  const toggleTaken = (id: string) => {
    setMeds((prev) =>
      prev.map((med) =>
        med.id === id ? { ...med, taken: !med.taken } : med
      )
    );
  };

  const takenCount = meds.filter((m) => m.taken).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Medications</h1>
          <p className="text-muted-foreground mt-1">Manage your medication schedule</p>
        </div>
        <Button className="gap-2 rounded-xl shadow-glow">
          <Plus className="w-4 h-4" />
          Add Medication
        </Button>
      </div>

      {/* Today's Progress */}
      <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/20 p-5 mb-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
              <Pill className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Medications</p>
              <p className="text-2xl font-bold text-foreground">
                {takenCount} / {meds.length}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-warning">
              {Math.round((takenCount / meds.length) * 100)}%
            </span>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </div>
      </div>

      {/* Medication List */}
      <div className="space-y-3">
        {meds.map((med, index) => (
          <div
            key={med.id}
            className={cn(
              "bg-card rounded-xl border p-4 transition-all duration-200 animate-slide-up",
              med.taken ? "border-success/30 bg-success/5" : "border-border hover:border-primary/30"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleTaken(med.id)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                  med.taken
                    ? "bg-success text-success-foreground"
                    : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary"
                )}
              >
                {med.taken ? <Check className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", med.taken && "text-muted-foreground line-through")}>
                    {med.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {med.dosage}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {med.time}
                  </span>
                  <span>•</span>
                  <span>{med.frequency}</span>
                </div>
              </div>

              {!med.taken && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleTaken(med.id)}
                  className="rounded-lg"
                >
                  Mark as taken
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reminder Note */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-info/5 border border-info/20 rounded-xl animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Medication Reminders</p>
          <p className="text-muted-foreground mt-0.5">
            Enable notifications in Settings to receive timely reminders for your medications.
          </p>
        </div>
      </div>
    </div>
  );
}
