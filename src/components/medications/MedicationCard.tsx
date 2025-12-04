import { useState } from 'react';
import { Check, Clock, MoreVertical, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import type { MedicationWithLogs, MedicationFrequency } from '@/types/domain';

interface MedicationCardProps {
  medication: MedicationWithLogs;
}

const frequencyLabels: Record<MedicationFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  as_needed: 'As needed',
};

export function MedicationCard({ medication }: MedicationCardProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const logMedication = useLogMedication();
  const unlogMedication = useUnlogMedication();
  const deleteMedication = useDeleteMedication();

  const isTaken = medication.medication_logs && medication.medication_logs.length > 0;
  const takenLog = medication.medication_logs?.[0];

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

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all",
        isTaken && "bg-success/5 border-success/20"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Button
                variant={isTaken ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full shrink-0",
                  isTaken && "bg-success hover:bg-success/90"
                )}
                onClick={handleToggleTaken}
                disabled={isLoading}
              >
                {isTaken ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </Button>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "font-medium",
                    isTaken && "text-success"
                  )}>
                    {medication.name}
                  </h4>
                  {medication.dosage && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {medication.dosage}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{frequencyLabels[medication.frequency || 'daily']}</span>
                  {medication.time_of_day && (
                    <>
                      <span>•</span>
                      <span>{medication.time_of_day}</span>
                    </>
                  )}
                </div>
                {isTaken && takenLog && (
                  <p className="text-xs text-success">
                    Taken at {new Date(takenLog.taken_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>

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
        </CardContent>
      </Card>

      {/* Edit Form Dialog */}
      <MedicationForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        editMedication={medication}
      />

      {/* Delete Confirmation Dialog */}
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
