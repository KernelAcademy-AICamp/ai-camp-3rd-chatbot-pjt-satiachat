import { Controller } from 'react-hook-form';
import { StepProps, COACH_PERSONAS } from '../types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function CoachSelectionStep({ control, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          코치 선택
        </h2>
        <p className="text-muted-foreground">
          나에게 맞는 코칭 스타일을 골라주세요
        </p>
      </div>

      <Controller
        name="coachPersona"
        control={control}
        render={({ field }) => (
          <div className="space-y-3">
            {COACH_PERSONAS.map((persona) => {
              const isSelected = field.value === persona.id;

              return (
                <Card
                  key={persona.id}
                  className={cn(
                    'relative cursor-pointer transition-all duration-200 hover:shadow-md',
                    isSelected
                      ? 'border-primary border-2 bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  )}
                  onClick={() => field.onChange(persona.id)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      field.onChange(persona.id);
                    }
                  }}
                >
                  <div className="p-5 flex items-start gap-4">
                    {/* Character Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={persona.image}
                        alt={persona.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{persona.icon}</span>
                        <h3 className="font-semibold text-foreground">
                          {persona.name}
                        </h3>
                        <span className="text-xs text-muted-foreground font-medium">
                          {persona.tagline}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {persona.description}
                      </p>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      />

      {errors.coachPersona && (
        <p className="text-sm text-destructive" role="alert">
          {errors.coachPersona.message}
        </p>
      )}
    </div>
  );
}
