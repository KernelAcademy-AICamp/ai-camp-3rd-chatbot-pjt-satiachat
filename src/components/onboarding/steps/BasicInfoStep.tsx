import { Controller } from 'react-hook-form';
import { StepProps } from '../types';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const birthYears = Array.from(
  { length: 84 },
  (_, i) => currentYear - 18 - i
);

export function BasicInfoStep({ control, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          기본 정보
        </h2>
        <p className="text-muted-foreground">
          나에 대해 알려주세요
        </p>
      </div>

      <div className="space-y-4">
        {/* Gender Radio Group */}
        <div className="space-y-3">
          <Label>
            성별 <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="font-normal cursor-pointer">
                    남성
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="font-normal cursor-pointer">
                    여성
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
          {errors.gender && (
            <p className="text-sm text-destructive" role="alert">
              {errors.gender.message}
            </p>
          )}
        </div>

        {/* Birth Year Select */}
        <div className="space-y-2">
          <Label htmlFor="birthYear">
            출생연도 <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="birthYear"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString()}
              >
                <SelectTrigger id="birthYear" className="rounded-xl">
                  <SelectValue placeholder="출생연도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {birthYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.birthYear && (
            <p className="text-sm text-destructive" role="alert">
              {errors.birthYear.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
