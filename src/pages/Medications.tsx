import { useState } from "react";
import { Pill, Plus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { MedicationForm } from "@/components/medications/MedicationForm";
import { useTodayMedicationStats } from "@/hooks/useMedications";

export default function Medications() {
  const [showAddForm, setShowAddForm] = useState(false);

  const { total, taken, percentage, medications, isLoading, error } = useTodayMedicationStats();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Medications</h1>
          <p className="text-muted-foreground mt-1">Manage your medication schedule</p>
        </div>
        <Button
          className="gap-2 rounded-xl shadow-glow"
          onClick={() => setShowAddForm(true)}
        >
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
                {isLoading ? "..." : `${taken} / ${total}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-warning">
              {isLoading ? "..." : `${percentage}%`}
            </span>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-center">
          <p>약물 데이터를 불러오는데 실패했습니다.</p>
          <p className="text-sm mt-1">Supabase 연결을 확인해주세요.</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && medications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">등록된 약물이 없습니다</p>
          <p className="text-sm">위의 "Add Medication" 버튼을 눌러 약물을 추가해보세요!</p>
        </div>
      )}

      {/* Medication List */}
      {!isLoading && !error && medications.length > 0 && (
        <div className="space-y-3">
          {medications.map((medication, index) => (
            <div
              key={medication.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <MedicationCard medication={medication} />
            </div>
          ))}
        </div>
      )}

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

      {/* Add Medication Form */}
      <MedicationForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
      />
    </div>
  );
}
