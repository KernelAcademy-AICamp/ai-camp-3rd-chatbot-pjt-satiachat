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
  image: string;
}

export const COACH_PERSONAS: CoachPersona[] = [
  {
    id: 'cold',
    name: '냥이 코치',
    description: '도도하고 팩트 중심. 필요한 말만 딱딱 해주는 고양이.',
    tagline: '냉정한 분석',
    icon: '🐱',
    image: '/coaches/cat.png',
  },
  {
    id: 'bright',
    name: '댕댕이 코치',
    description: '언제나 열정 가득! 꼬리 흔들며 응원하는 강아지.',
    tagline: '멍멍! 잘하고 있어!',
    icon: '🐕',
    image: '/coaches/dog.png',
  },
  {
    id: 'strict',
    name: '꿀꿀이 코치',
    description: '먹는 것에 진심인 돼지. 칼로리엔 엄격해요.',
    tagline: '꿀꿀! 핑계 금지!',
    icon: '🐷',
    image: '/coaches/pig.png',
  },
];

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '비활동적', description: '운동 거의 안함' },
  { value: 'light', label: '가벼운 활동', description: '주 1-3회 운동' },
  { value: 'moderate', label: '보통 활동', description: '주 3-5회 운동' },
  { value: 'active', label: '활발한 활동', description: '주 6-7회 운동' },
  { value: 'very_active', label: '매우 활발', description: '고강도 운동 또는 육체 노동' },
];
