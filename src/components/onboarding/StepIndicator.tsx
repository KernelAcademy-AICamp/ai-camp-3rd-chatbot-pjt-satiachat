interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`h-2 rounded-full transition-all duration-300 ${
            step === currentStep
              ? 'w-8 bg-primary'
              : step < currentStep
              ? 'w-2 bg-primary'
              : 'w-2 bg-muted'
          }`}
          aria-label={`Step ${step}${step === currentStep ? ' (current)' : ''}`}
        />
      ))}
    </div>
  );
}
