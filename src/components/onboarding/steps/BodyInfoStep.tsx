import { Controller } from 'react-hook-form';
import { StepProps } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BodyInfoStep({ control, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          신체 정보
        </h2>
        <p className="text-muted-foreground">
          현재 상태를 알려주세요
        </p>
      </div>

      <div className="space-y-4">
        {/* Height Input */}
        <div className="space-y-2">
          <Label htmlFor="heightCm">
            키 (cm) <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="heightCm"
            control={control}
            render={({ field }) => (
              <Input
                id="heightCm"
                type="number"
                placeholder="175"
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
          {errors.heightCm && (
            <p className="text-sm text-destructive" role="alert">
              {errors.heightCm.message}
            </p>
          )}
        </div>

        {/* Current Weight Input */}
        <div className="space-y-2">
          <Label htmlFor="currentWeightKg">
            현재 체중 (kg) <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="currentWeightKg"
            control={control}
            render={({ field }) => (
              <Input
                id="currentWeightKg"
                type="number"
                step="0.1"
                placeholder="70.5"
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
          {errors.currentWeightKg && (
            <p className="text-sm text-destructive" role="alert">
              {errors.currentWeightKg.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
