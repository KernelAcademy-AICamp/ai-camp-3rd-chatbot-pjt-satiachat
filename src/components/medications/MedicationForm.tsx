import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateMedication, useUpdateMedication } from '@/hooks/useMedications';
import type { Medication, MedicationFrequency, DayOfWeek } from '@/types/domain';

interface MedicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMedication?: Medication;
}

const frequencyLabels: Record<MedicationFrequency, string> = {
  daily: '매일',
  weekly: '매주',
  as_needed: '필요시',
};

const dayOfWeekLabels: Record<DayOfWeek, string> = {
  0: '일요일',
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
  6: '토요일',
};

export function MedicationForm({
  open,
  onOpenChange,
  editMedication,
}: MedicationFormProps) {
  const createMedication = useCreateMedication();
  const updateMedication = useUpdateMedication();

  const [name, setName] = useState(editMedication?.name || '');
  const [dosage, setDosage] = useState(editMedication?.dosage || '');
  const [frequency, setFrequency] = useState<MedicationFrequency>(
    editMedication?.frequency || 'daily'
  );
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(
    editMedication?.day_of_week ?? (new Date().getDay() as DayOfWeek)
  );
  const [timeOfDay, setTimeOfDay] = useState(editMedication?.time_of_day || '');
  const [notes, setNotes] = useState(editMedication?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const data = {
        name: name.trim(),
        dosage: dosage.trim() || undefined,
        frequency,
        day_of_week: frequency === 'weekly' ? dayOfWeek : undefined,
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
    setFrequency('daily');
    setDayOfWeek(new Date().getDay() as DayOfWeek);
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
            {editMedication ? '약물 수정' : '약물 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">약물명 *</Label>
            <Input
              id="name"
              placeholder="예: 위고비, 메트포르민"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">용량</Label>
              <Input
                id="dosage"
                placeholder="0.5mg"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">복용 주기</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as MedicationFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">복용 요일</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v) as DayOfWeek)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(dayOfWeekLabels) as [string, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="timeOfDay">복용 시간</Label>
            <Input
              id="timeOfDay"
              placeholder="아침 식후, 저녁 8시"
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
