import { useMemo } from "react";
import { format, isToday, isFuture, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Check, X, Clock, Loader2, Pill, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMedicationLogsForDate,
  useLogMedicationForDate,
  useDeleteMedicationLog,
} from "@/hooks/useMedications";
import type { MedicationWithLogs, DayOfWeek } from "@/types/domain";

interface MedicationDayDetailProps {
  date: string; // YYYY-MM-DD
  medications: MedicationWithLogs[];
}

export function MedicationDayDetail({ date }: MedicationDayDetailProps) {
  const dateObj = parseISO(date);
  const isTodayDate = isToday(dateObj);
  const isFutureDate = isFuture(dateObj);
  const dayOfWeek = dateObj.getDay() as DayOfWeek;

  const { data: dayData, isLoading } = useMedicationLogsForDate(date);

  // 선택한 날짜의 요일에 해당하는 약물만 필터링
  const filteredMedications = useMemo(() => {
    if (!dayData?.medications) return [];
    return dayData.medications.filter((med) => {
      const doseDay = med.dose_day as DayOfWeek | undefined;
      // dose_day가 없으면 모든 요일에 표시, 있으면 해당 요일에만 표시
      return doseDay === undefined || doseDay === dayOfWeek;
    });
  }, [dayData?.medications, dayOfWeek]);
  const logMutation = useLogMedicationForDate();
  const deleteMutation = useDeleteMedicationLog();

  // 복용 완료 처리
  const handleTakeMedication = async (medicationId: string) => {
    await logMutation.mutateAsync({
      medicationId,
      date,
      status: "taken",
    });
  };

  // 복용 취소 (로그 삭제)
  const handleUntakeMedication = async (logId: string) => {
    await deleteMutation.mutateAsync({ logId, date });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">선택한 날짜</p>
        <h3 className="text-xl font-semibold text-foreground">
          {format(dateObj, "M월 d일 EEEE", { locale: ko })}
          {isTodayDate && (
            <span className="ml-2 text-sm font-normal text-primary">(오늘)</span>
          )}
        </h3>
      </div>

      {/* 복용 기록 목록 */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {filteredMedications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>이 날짜에 복용 예정인 약물이 없습니다</p>
          </div>
        ) : (
          filteredMedications.map((med) => {
            const log = med.medication_logs?.[0];
            const hasTaken = log?.status === "taken";
            const hasSkipped = log?.status === "skipped";
            const hasLog = !!log;
            const isProcessing = logMutation.isPending || deleteMutation.isPending;

            return (
              <div
                key={med.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                  hasTaken && "bg-success/10 border-success/30",
                  hasSkipped && "bg-destructive/10 border-destructive/30",
                  !hasLog && "bg-muted/30 border-border/50"
                )}
              >
                {/* 상태 아이콘 */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    hasTaken && "bg-success text-success-foreground",
                    hasSkipped && "bg-destructive text-destructive-foreground",
                    !hasLog && "bg-muted text-muted-foreground"
                  )}
                >
                  {hasTaken && <Check className="w-6 h-6" />}
                  {hasSkipped && <X className="w-6 h-6" />}
                  {!hasLog && <Pill className="w-6 h-6" />}
                </div>

                {/* 약물 정보 */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    hasTaken ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {med.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {med.dosage}
                    {log && (
                      <span className="ml-2">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {format(parseISO(log.taken_at), "HH:mm")}
                      </span>
                    )}
                  </p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex-shrink-0">
                  {isFutureDate ? (
                    <span className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg bg-muted">
                      미래
                    </span>
                  ) : hasLog ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-muted-foreground hover:text-destructive gap-1.5"
                      onClick={() => handleUntakeMedication(log.id)}
                      disabled={isProcessing}
                    >
                      <Undo2 className="w-4 h-4" />
                      취소
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/20 gap-1.5"
                      onClick={() => handleTakeMedication(med.id)}
                      disabled={isProcessing}
                    >
                      <Check className="w-4 h-4" />
                      복용
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 미래 날짜 안내 */}
      {isFutureDate && (
        <div className="mt-4 p-3 bg-muted/50 rounded-xl text-center text-sm text-muted-foreground">
          미래 날짜는 기록할 수 없습니다
        </div>
      )}
    </div>
  );
}
