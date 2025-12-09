import { useState, useEffect } from 'react';
import { Pill } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMedication, useUpdateMedication } from '@/hooks/useMedications';
import { cn } from '@/lib/utils';
import type { Medication, DayOfWeek } from '@/types/domain';

interface MedicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMedication?: Medication;
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

export function MedicationForm({
  open,
  onOpenChange,
  editMedication,
}: MedicationFormProps) {
  const createMedication = useCreateMedication();
  const updateMedication = useUpdateMedication();

  // 현재 요일을 기본값으로
  const todayDayOfWeek = new Date().getDay() as DayOfWeek;

  const [name, setName] = useState(editMedication?.name || '');
  const [dosage, setDosage] = useState(editMedication?.dosage || '');
  const [doseDay, setDoseDay] = useState<DayOfWeek>(
    editMedication?.dose_day ?? todayDayOfWeek
  );
  const [timeOfDay, setTimeOfDay] = useState(editMedication?.time_of_day || '');
  const [notes, setNotes] = useState(editMedication?.notes || '');

  // editMedication이 변경되면 폼 값 업데이트
  useEffect(() => {
    if (editMedication) {
      setName(editMedication.name || '');
      setDosage(editMedication.dosage || '');
      setDoseDay(editMedication.dose_day ?? todayDayOfWeek);
      setTimeOfDay(editMedication.time_of_day || '');
      setNotes(editMedication.notes || '');
    }
  }, [editMedication, todayDayOfWeek]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const data = {
        name: name.trim(),
        dosage: dosage.trim() || undefined,
        frequency: 'weekly' as const,
        dose_day: doseDay,
        time_of_day: timeOfDay.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editMedication) {
        await updateMedication.mutateAsync({
          id: editMedication.id,
          ...data,
        });
      } else {
        await createMedication.mutateAsync(data);
      }

      // Reset form and close
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save medication:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDosage('');
    setDoseDay(todayDayOfWeek);
    setTimeOfDay('');
    setNotes('');
  };

  const isLoading = createMedication.isPending || updateMedication.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {editMedication ? '수정' : '추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">종류</Label>
            <Input
              id="name"
              placeholder="예: 위고비, 마운자로"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dosage">용량</Label>
            <Input
              id="dosage"
              placeholder="0.5mg"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
            />
          </div>

          {/* 복용 요일 선택 */}
          <div className="space-y-2">
            <Label>복용 요일 (주 1회)</Label>
            <div className="flex gap-1">
              {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDoseDay(day)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                    doseDay === day
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                    day === 0 && "text-destructive"
                  )}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              위고비/마운자로는 매주 같은 요일에 투여합니다
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeOfDay">복용 시간 (선택)</Label>
            <Input
              id="timeOfDay"
              placeholder="아침, 저녁 8시 등"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              placeholder="주의사항, 부작용 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '저장 중...' : editMedication ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
