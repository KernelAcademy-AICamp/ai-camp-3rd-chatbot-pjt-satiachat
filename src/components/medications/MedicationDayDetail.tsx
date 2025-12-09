import { useState } from "react";
import { format, isToday, isFuture, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Check, X, Plus, Clock, Loader2, Pill, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useMedicationLogsForDate,
  useLogMedicationForDate,
  useDeleteMedicationLog,
  useMedications,
} from "@/hooks/useMedications";
import type { MedicationWithLogs, Medication } from "@/types/domain";

interface MedicationDayDetailProps {
  date: string; // YYYY-MM-DD
  medications: MedicationWithLogs[];
}

export function MedicationDayDetail({ date }: MedicationDayDetailProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<"taken" | "skipped">("taken");

  const dateObj = parseISO(date);
  const isTodayDate = isToday(dateObj);
  const isFutureDate = isFuture(dateObj);

  const { data: dayData, isLoading } = useMedicationLogsForDate(date);
  const { data: allMedications } = useMedications();
  const logMutation = useLogMedicationForDate();
  const deleteMutation = useDeleteMedicationLog();

  const handleAddLog = async () => {
    if (!selectedMedId) return;

    await logMutation.mutateAsync({
      medicationId: selectedMedId,
      date,
      time: selectedTime || undefined,
      status: selectedStatus,
    });

    setShowAddDialog(false);
    setSelectedMedId("");
    setSelectedTime("");
    setSelectedStatus("taken");
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteMutation.mutateAsync({ logId, date });
  };

  // 아직 기록되지 않은 약물 목록
  const unloggedMedications = allMedications?.filter(
    (med) => !dayData?.medications.some(
      (m) => m.id === med.id && m.medication_logs && m.medication_logs.length > 0
    )
  ) || [];

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">선택한 날짜</p>
          <h3 className="text-xl font-semibold text-foreground">
            {format(dateObj, "M월 d일 EEEE", { locale: ko })}
            {isTodayDate && (
              <span className="ml-2 text-sm font-normal text-primary">(오늘)</span>
            )}
          </h3>
        </div>
        {!isFutureDate && (
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-2 rounded-xl"
            disabled={unloggedMedications.length === 0}
          >
            <Plus className="w-4 h-4" />
            기록 추가
          </Button>
        )}
      </div>

      {/* 복용 기록 목록 */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {dayData?.medications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>등록된 약물이 없습니다</p>
          </div>
        ) : (
          dayData?.medications.map((med) => {
            const log = med.medication_logs?.[0];
            const hasTaken = log?.status === "taken";
            const hasSkipped = log?.status === "skipped";
            const hasLog = !!log;

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
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    hasTaken && "bg-success text-success-foreground",
                    hasSkipped && "bg-destructive text-destructive-foreground",
                    !hasLog && "bg-muted text-muted-foreground"
                  )}
                >
                  {hasTaken && <Check className="w-5 h-5" />}
                  {hasSkipped && <X className="w-5 h-5" />}
                  {!hasLog && <Pill className="w-5 h-5" />}
                </div>

                {/* 약물 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
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

                {/* 상태 표시 및 삭제 버튼 */}
                <div className="flex items-center gap-2">
                  {hasLog && (
                    <>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-lg",
                          hasTaken && "bg-success/20 text-success",
                          hasSkipped && "bg-destructive/20 text-destructive"
                        )}
                      >
                        {hasTaken ? "복용 완료" : "건너뜀"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteLog(log.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {!hasLog && !isFutureDate && (
                    <span className="text-xs text-muted-foreground">미기록</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 기록 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>복용 기록 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                약물 선택
              </label>
              <Select value={selectedMedId} onValueChange={setSelectedMedId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="약물을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {unloggedMedications.map((med) => (
                    <SelectItem key={med.id} value={med.id}>
                      {med.name} ({med.dosage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                복용 시간 (선택)
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                상태
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedStatus === "taken" ? "default" : "outline"}
                  className={cn(
                    "flex-1 rounded-xl gap-2",
                    selectedStatus === "taken" && "bg-success hover:bg-success/90"
                  )}
                  onClick={() => setSelectedStatus("taken")}
                >
                  <Check className="w-4 h-4" />
                  복용 완료
                </Button>
                <Button
                  type="button"
                  variant={selectedStatus === "skipped" ? "default" : "outline"}
                  className={cn(
                    "flex-1 rounded-xl gap-2",
                    selectedStatus === "skipped" && "bg-destructive hover:bg-destructive/90"
                  )}
                  onClick={() => setSelectedStatus("skipped")}
                >
                  <X className="w-4 h-4" />
                  건너뜀
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAddLog}
              disabled={!selectedMedId || logMutation.isPending}
              className="w-full rounded-xl"
            >
              {logMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              기록 추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
