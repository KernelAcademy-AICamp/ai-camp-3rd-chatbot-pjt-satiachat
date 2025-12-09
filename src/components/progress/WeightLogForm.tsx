import { useState, useEffect } from 'react';
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
import { useUpsertProgress, useProgressByDate } from '@/hooks/useProgress';
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
  const upsertProgress = useUpsertProgress();

  const [date, setDate] = useState(getToday());
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [muscleMassKg, setMuscleMassKg] = useState('');
  const [notes, setNotes] = useState('');

  // 선택된 날짜의 기존 기록 조회
  const { data: existingLog } = useProgressByDate(open ? date : '');

  // 다이얼로그가 열릴 때마다 오늘 날짜로 초기화
  useEffect(() => {
    if (open) {
      setDate(editLog?.date || getToday());
      setWeightKg(editLog?.weight_kg?.toString() || '');
      setBodyFatPercent(editLog?.body_fat_percent?.toString() || '');
      setMuscleMassKg(editLog?.muscle_mass_kg?.toString() || '');
      setNotes(editLog?.notes || '');
    }
  }, [open, editLog]);

  // 날짜 변경 시 기존 기록 로드
  useEffect(() => {
    if (open && existingLog && !editLog) {
      setWeightKg(existingLog.weight_kg?.toString() || '');
      setBodyFatPercent(existingLog.body_fat_percent?.toString() || '');
      setMuscleMassKg(existingLog.muscle_mass_kg?.toString() || '');
      setNotes(existingLog.notes || '');
    } else if (open && !existingLog && !editLog) {
      // 해당 날짜에 기록이 없으면 폼 초기화
      setWeightKg('');
      setBodyFatPercent('');
      setMuscleMassKg('');
      setNotes('');
    }
  }, [existingLog, open, editLog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const weight = parseFloat(weightKg);
    if (isNaN(weight) || weight <= 0) {
      return;
    }

    try {
      await upsertProgress.mutateAsync({
        date,
        weight_kg: weight,
        body_fat_percent: bodyFatPercent ? parseFloat(bodyFatPercent) : undefined,
        muscle_mass_kg: muscleMassKg ? parseFloat(muscleMassKg) : undefined,
        notes: notes || undefined,
      });

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

  const isLoading = upsertProgress.isPending;

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
