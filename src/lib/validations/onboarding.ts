import { z } from 'zod';

export const onboardingSchema = z.object({
  // Step 1: Basic Info
  gender: z.enum(['male', 'female'], {
    required_error: '성별을 선택해주세요',
  }),
  birthYear: z
    .number({
      required_error: '출생연도를 선택해주세요',
      invalid_type_error: '출생연도를 선택해주세요',
    })
    .min(1924, '1924년 이후여야 합니다')
    .max(new Date().getFullYear() - 18, '만 18세 이상이어야 합니다'),

  // Step 2: Body Info
  heightCm: z
    .number({
      required_error: '키를 입력해주세요',
      invalid_type_error: '키는 숫자여야 합니다',
    })
    .min(120, '키는 120cm 이상이어야 합니다')
    .max(250, '키는 250cm 이하여야 합니다'),
  currentWeightKg: z
    .number({
      required_error: '현재 체중을 입력해주세요',
      invalid_type_error: '체중은 숫자여야 합니다',
    })
    .min(30, '체중은 30kg 이상이어야 합니다')
    .max(300, '체중은 300kg 이하여야 합니다'),

  // Step 3: Goals
  goalWeightKg: z
    .number({
      required_error: '목표 체중을 입력해주세요',
      invalid_type_error: '목표 체중은 숫자여야 합니다',
    })
    .min(30, '목표 체중은 30kg 이상이어야 합니다')
    .max(300, '목표 체중은 300kg 이하여야 합니다'),
  activityLevel: z.enum(
    ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    {
      required_error: '활동 수준을 선택해주세요',
    }
  ),

  // Step 4: Coach Selection
  coachPersona: z.enum(['cold', 'bright', 'strict'], {
    required_error: '코치 스타일을 선택해주세요',
  }),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Step-specific schemas for progressive validation
export const step1Schema = onboardingSchema.pick({ gender: true, birthYear: true });
export const step2Schema = onboardingSchema.pick({ heightCm: true, currentWeightKg: true });
export const step3Schema = onboardingSchema.pick({ goalWeightKg: true, activityLevel: true });
export const step4Schema = onboardingSchema.pick({ coachPersona: true });

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
});

export const signupSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  nickname: z.string()
    .min(2, '닉네임은 2자 이상이어야 합니다')
    .max(20, '닉네임은 20자 이하여야 합니다')
    .regex(/^[가-힣a-zA-Z0-9_]+$/, '닉네임은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
