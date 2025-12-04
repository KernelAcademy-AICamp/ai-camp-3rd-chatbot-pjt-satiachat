import { Controller } from 'react-hook-form';
import { StepProps, ACTIVITY_LEVELS } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function GoalsStep({ control, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          목표 설정
        </h2>
        <p className="text-muted-foreground">
          어떤 목표를 향해 나아갈까요?
        </p>
      </div>

      <div className="space-y-4">
        {/* Goal Weight */}
        <div className="space-y-2">
          <Label htmlFor="goalWeightKg">
            목표 체중 (kg) <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="goalWeightKg"
            control={control}
            render={({ field }) => (
              <Input
                id="goalWeightKg"
                type="number"
                step="0.1"
                placeholder="65.0"
                className="rounded-xl"
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? undefined : Number(value));
                }}
                value={field.value ?? ''}
              />
            )}
          />
          {errors.goalWeightKg && (
            <p className="text-sm text-destructive" role="alert">
              {errors.goalWeightKg.message}
            </p>
          )}
        </div>

        {/* Activity Level */}
        <div className="space-y-2">
          <Label htmlFor="activityLevel">
            활동 수준 <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="activityLevel"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="activityLevel" className="rounded-xl">
                  <SelectValue placeholder="활동 수준 선택" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex flex-col">
                        <span>{level.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {level.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.activityLevel && (
            <p className="text-sm text-destructive" role="alert">
              {errors.activityLevel.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
