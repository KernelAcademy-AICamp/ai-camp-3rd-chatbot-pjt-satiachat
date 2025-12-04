import { Control, FieldErrors } from 'react-hook-form';
import { OnboardingFormData } from '@/lib/validations/onboarding';

export interface StepProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

export interface CoachPersona {
  id: 'cold' | 'bright' | 'strict';
  name: string;
  description: string;
  tagline: string;
  icon: string;
}

export const COACH_PERSONAS: CoachPersona[] = [
  {
    id: 'cold',
    name: '차분한 분석가',
    description: '데이터 기반의 팩트 중심 코칭. 감정보다 과학.',
    tagline: '사실에 집중',
    icon: '❄️',
  },
  {
    id: 'bright',
    name: '따뜻한 응원단',
    description: '격려와 응원으로 함께하는 코칭. 작은 성과도 축하해요.',
    tagline: '함께 해낼 수 있어요!',
    icon: '☀️',
  },
  {
    id: 'strict',
    name: '엄격한 트레이너',
    description: '직설적이고 목표 지향적인 코칭. 변명은 NO.',
    tagline: '핑계 금지',
    icon: '🔥',
  },
];

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '비활동적', description: '운동 거의 안함' },
  { value: 'light', label: '가벼운 활동', description: '주 1-3회 운동' },
  { value: 'moderate', label: '보통 활동', description: '주 3-5회 운동' },
  { value: 'active', label: '활발한 활동', description: '주 6-7회 운동' },
  { value: 'very_active', label: '매우 활발', description: '고강도 운동 또는 육체 노동' },
];
