import { useState } from 'react';
import { Scale } from 'lucide-react';
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
import { useCreateProgress, useUpsertTodayProgress } from '@/hooks/useProgress';
import { getToday } from '@/lib/supabase';

interface WeightLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLog?: {
    id: string;
    date: string;
    weight_kg: number;
    body_fat_percent?: number;
    muscle_mass_kg?: number;
    notes?: string;
  };
}

export function WeightLogForm({
  open,
  onOpenChange,
  editLog,
}: WeightLogFormProps) {
  const createProgress = useCreateProgress();
  const upsertToday = useUpsertTodayProgress();

  const [date, setDate] = useState(editLog?.date || getToday());
  const [weightKg, setWeightKg] = useState(editLog?.weight_kg?.toString() || '');
  const [bodyFatPercent, setBodyFatPercent] = useState(editLog?.body_fat_percent?.toString() || '');
  const [muscleMassKg, setMuscleMassKg] = useState(editLog?.muscle_mass_kg?.toString() || '');
  const [notes, setNotes] = useState(editLog?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const weight = parseFloat(weightKg);
    if (isNaN(weight) || weight <= 0) {
      return;
    }

    try {
      const data = {
        weight_kg: weight,
        body_fat_percent: bodyFatPercent ? parseFloat(bodyFatPercent) : undefined,
        muscle_mass_kg: muscleMassKg ? parseFloat(muscleMassKg) : undefined,
        notes: notes || undefined,
      };

      if (date === getToday()) {
        // Use upsert for today
        await upsertToday.mutateAsync(data);
      } else {
        // Use create for other dates
        await createProgress.mutateAsync({
          date,
          ...data,
        });
      }

      // Reset form and close
      setWeightKg('');
      setBodyFatPercent('');
      setMuscleMassKg('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const isLoading = createProgress.isPending || upsertToday.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            체중 기록
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">날짜</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={getToday()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">체중 (kg) *</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="72.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bodyFat">체지방률 (%)</Label>
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                placeholder="20.5"
                value={bodyFatPercent}
                onChange={(e) => setBodyFatPercent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscle">근육량 (kg)</Label>
              <Input
                id="muscle"
                type="number"
                step="0.1"
                placeholder="35.0"
                value={muscleMassKg}
                onChange={(e) => setMuscleMassKg(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              placeholder="오늘의 컨디션, 특이사항 등"
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
              {isLoading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
