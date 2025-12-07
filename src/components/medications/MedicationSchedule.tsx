import { Clock, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MedicationWithLogs, MedicationFrequency } from "@/types/domain";

interface MedicationScheduleProps {
  medications: MedicationWithLogs[];
}

const timeSlots = [
  { id: "morning", label: "아침", time: "06:00 - 12:00", times: ["아침", "morning", "AM"] },
  { id: "afternoon", label: "점심", time: "12:00 - 18:00", times: ["점심", "afternoon", "식후"] },
  { id: "evening", label: "저녁", time: "18:00 - 22:00", times: ["저녁", "evening", "PM"] },
  { id: "night", label: "취침 전", time: "22:00 - 06:00", times: ["취침", "night", "자기전"] },
];

const days = ["일", "월", "화", "수", "목", "금", "토"];

const frequencyLabels: Record<MedicationFrequency, string> = {
  daily: "매일",
  weekly: "주간",
  as_needed: "필요시",
};

export function MedicationSchedule({ medications }: MedicationScheduleProps) {
  const today = new Date().getDay();

  // 시간대별 약물 분류
  const getMedicationsForSlot = (slot: typeof timeSlots[0]) => {
    return medications.filter((med) => {
      const timeOfDay = med.time_of_day?.toLowerCase() || "";
      return slot.times.some((t) => timeOfDay.includes(t.toLowerCase()));
    });
  };

  return (
    <div className="space-y-6">
      {/* 주간 개요 */}
      <div className="bg-card rounded-3xl border border-border/50 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">주간 복용 일정</h3>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div
              key={day}
              className={cn(
                "flex flex-col items-center p-3 rounded-2xl transition-all",
                index === today
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="text-xs font-medium mb-1">{day}</span>
              <span
                className={cn(
                  "text-lg font-bold",
                  index === today ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {medications.length}
              </span>
              <div className="flex gap-0.5 mt-1">
                {medications.slice(0, 3).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      index === today ? "bg-primary-foreground/60" : "bg-primary"
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 시간대별 복용 일정 */}
      <div className="bg-card rounded-3xl border border-border/50 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">시간대별 복용 일정</h3>

        <div className="space-y-4">
          {timeSlots.map((slot) => {
            const slotMeds = getMedicationsForSlot(slot);

            return (
              <div
                key={slot.id}
                className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl"
              >
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-sm font-semibold text-foreground">{slot.label}</span>
                  <span className="text-xs text-muted-foreground">{slot.time}</span>
                </div>

                <div className="flex-1">
                  {slotMeds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slotMeds.map((med) => (
                        <div
                          key={med.id}
                          className="flex items-center gap-2 px-3 py-2 bg-card rounded-xl border border-border/50"
                        >
                          <Pill className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">{med.name}</span>
                          {med.dosage && (
                            <span className="text-xs text-muted-foreground">{med.dosage}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">복용 예정 약물 없음</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 전체 약물 목록 */}
      <div className="bg-card rounded-3xl border border-border/50 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">전체 약물 목록</h3>

        {medications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>등록된 약물이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Pill className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{med.name}</span>
                    {med.dosage && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {med.dosage}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{med.time_of_day || "시간 미정"}</span>
                    <span>•</span>
                    <span>{frequencyLabels[med.frequency || "daily"]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
