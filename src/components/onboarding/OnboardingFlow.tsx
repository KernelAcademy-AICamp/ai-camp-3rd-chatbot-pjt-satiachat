import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  onboardingSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  OnboardingFormData,
} from '@/lib/validations/onboarding';
import { StepIndicator } from './StepIndicator';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { BodyInfoStep } from './steps/BodyInfoStep';
import { GoalsStep } from './steps/GoalsStep';
import { CoachSelectionStep } from './steps/CoachSelectionStep';
import { CompletionStep } from './steps/CompletionStep';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SatiaChatLogo } from '@/components/brand/SatiaChatLogo';

const TOTAL_STEPS = 5;
const STORAGE_KEY = 'dietrx_onboarding_data';

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onBlur',
    defaultValues: (() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
      }
      return {};
    })(),
  });

  // Auto-save form data to localStorage
  const formData = watch();
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  // Validate current step before proceeding
  const validateCurrentStep = async (): Promise<boolean> => {
    const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema];

    if (currentStep <= 4) {
      const schema = stepSchemas[currentStep - 1];
      const fields = Object.keys(schema.shape) as (keyof OnboardingFormData)[];
      return await trigger(fields);
    }

    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();

    if (isValid && currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setIsSubmitting(true);

    try {
      // Save to Supabase user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user?.id || 'dev-user-00000000-0000-0000-0000-000000000001',
            gender: data.gender,
            birth_year: data.birthYear,
            height_cm: data.heightCm,
            current_weight_kg: data.currentWeightKg,
            goal_weight_kg: data.goalWeightKg,
            activity_level: data.activityLevel,
            coach_persona: data.coachPersona,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      // Clear localStorage after successful submission
      localStorage.removeItem(STORAGE_KEY);

      // Move to completion step
      setCurrentStep(TOTAL_STEPS);
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepProps = { control, errors };

    switch (currentStep) {
      case 1:
        return <BasicInfoStep {...stepProps} />;
      case 2:
        return <BodyInfoStep {...stepProps} />;
      case 3:
        return <GoalsStep {...stepProps} />;
      case 4:
        return <CoachSelectionStep {...stepProps} />;
      case 5:
        return <CompletionStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <SatiaChatLogo size="lg" animate className="mb-2" />
          <p className="text-muted-foreground mt-1">
            맞춤 코칭 환경을 설정합니다
          </p>
        </div>

        {/* Step Indicator */}
        {currentStep < TOTAL_STEPS && (
          <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS - 1} />
        )}

        {/* Step Content */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        {currentStep < TOTAL_STEPS && (
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              이전
            </Button>

            {currentStep === 4 ? (
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                size="lg"
                className="rounded-xl shadow-glow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '완료'
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} size="lg" className="rounded-xl shadow-glow">
                다음
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
