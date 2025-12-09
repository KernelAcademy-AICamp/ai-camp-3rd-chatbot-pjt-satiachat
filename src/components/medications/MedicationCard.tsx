import { useState } from 'react';
import { Check, Clock, MoreVertical, Pencil, Trash2, Undo2, Pill, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MedicationForm } from './MedicationForm';
import { useLogMedication, useUnlogMedication, useDeleteMedication } from '@/hooks/useMedications';
import { cn } from '@/lib/utils';
import type { MedicationWithLogs, DayOfWeek } from '@/types/domain';

interface MedicationCardProps {
  medication: MedicationWithLogs;
  animationDelay?: number;
  completed?: boolean;
  isScheduledToday?: boolean; // 오늘이 복용 예정일인지
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export function MedicationCard({
  medication,
  animationDelay = 0,
  completed,
  isScheduledToday = true
}: MedicationCardProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const logMedication = useLogMedication();
  const unlogMedication = useUnlogMedication();
  const deleteMedication = useDeleteMedication();

  const isTaken = medication.medication_logs && medication.medication_logs.length > 0;
  const takenLog = medication.medication_logs?.[0];
  const doseDay = medication.dose_day as DayOfWeek | undefined;

  const handleToggleTaken = async () => {
    try {
      if (isTaken) {
        await unlogMedication.mutateAsync(medication.id);
      } else {
        await logMedication.mutateAsync({ medicationId: medication.id });
      }
    } catch (error) {
      console.error('Failed to toggle medication:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMedication.mutateAsync(medication.id);
      setShowDeleteAlert(false);
    } catch (error) {
      console.error('Failed to delete medication:', error);
    }
  };

  const isLoading = logMedication.isPending || unlogMedication.isPending;

  // 예정된 약물 (오늘이 복용일이 아닌 경우)
  if (!isScheduledToday) {
    return (
      <>
        <div
          className="group relative bg-card rounded-2xl border border-border/30 p-4 transition-all duration-300 animate-slide-up opacity-60"
          style={{ animationDelay: `${animationDelay}s` }}
        >
          <div className="flex items-center gap-4">
            {/* 아이콘 */}
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-muted-foreground" />
            </div>

            {/* 약물 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-muted-foreground">
                  {medication.name}
                </h3>
                {medication.dosage && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                    {medication.dosage}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  매주 {doseDay !== undefined ? DAY_LABELS[doseDay] : '?'}요일
                </span>
                {medication.time_of_day && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{medication.time_of_day}</span>
                  </>
                )}
              </div>

              <p className="text-xs text-info mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                다음 복용 예정
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteAlert(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* 수정 폼 다이얼로그 */}
        <MedicationForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          editMedication={medication}
        />

        {/* 삭제 확인 다이얼로그 */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>약물 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                "{medication.name}"을(를) 삭제하시겠습니까? 복용 기록도 함께 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMedication.isPending ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // 오늘이 복용일인 경우 (기존 로직)
  return (
    <>
      <div
        className={cn(
          "group relative bg-card rounded-2xl border p-4 transition-all duration-300 animate-slide-up hover:shadow-lg",
          isTaken || completed
            ? "border-success/30 bg-gradient-to-r from-success/5 to-transparent"
            : "border-border/50 hover:border-primary/30"
        )}
        style={{ animationDelay: `${animationDelay}s` }}
      >
        <div className="flex items-center gap-4">
          {/* 아이콘 */}
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105",
              isTaken || completed ? "bg-success/10" : "bg-primary/10"
            )}
          >
            {isTaken || completed ? (
              <Check className="w-7 h-7 text-success" />
            ) : (
              <Pill className="w-7 h-7 text-primary" />
            )}
          </div>

          {/* 약물 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className={cn(
                  "font-semibold text-lg",
                  isTaken || completed ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {medication.name}
              </h3>
              {medication.dosage && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    isTaken || completed
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {medication.dosage}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                매주 {doseDay !== undefined ? DAY_LABELS[doseDay] : '?'}요일
              </span>
              {medication.time_of_day && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {medication.time_of_day}
                  </span>
                </>
              )}
            </div>

            {isTaken && takenLog && (
              <p className="text-xs text-success mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {new Date(takenLog.taken_at).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}에 복용 완료
              </p>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            {!isTaken && !completed ? (
              <Button
                onClick={handleToggleTaken}
                disabled={isLoading}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/20 px-5"
              >
                <Check className="w-4 h-4 mr-1.5" />
                복용 완료
              </Button>
            ) : (
              <button
                onClick={handleToggleTaken}
                disabled={isLoading}
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
                {isTaken && (
                  <DropdownMenuItem onClick={handleToggleTaken}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    복용 취소
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setShowDeleteAlert(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 수정 폼 다이얼로그 */}
      <MedicationForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        editMedication={medication}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>약물 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{medication.name}"을(를) 삭제하시겠습니까? 복용 기록도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMedication.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
