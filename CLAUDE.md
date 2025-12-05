# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Architecture

DietRx Coach - AI personality-based diet coaching platform. Users record meals, weight, and medications, then receive feedback from an AI coach with a selected persona.

### Tech Stack
- **Build**: Vite with SWC for React
- **UI**: shadcn/ui components (Radix primitives) + Tailwind CSS
- **Routing**: react-router-dom v6
- **State**: @tanstack/react-query for server state
- **Forms**: react-hook-form + zod validation
- **Backend**: Express API (planned in `server/` directory)
- **Database**: Supabase/Postgres (planned)

### Project Structure
- `src/pages/` - Route pages (Dashboard, Meals, Medications, Reports, Settings, MyPage)
- `src/components/layout/` - App shell (`AppLayout`, `AppSidebar`, `MobileNav`)
- `src/components/ui/` - shadcn/ui primitives (avoid direct modifications)
- `src/components/dashboard/` - Dashboard components (`ChatPanel`, `QuickActions`, `SummaryCard`, `TodayMeals`)
- `src/hooks/` - Custom hooks (`use-toast`, `use-mobile`)
- `src/lib/utils.ts` - Utility functions including `cn()`
- `src/types/` - TypeScript domain models (planned)

### Routing
- `/` - Landing/redirect to dashboard
- `/onboarding` - Multi-step onboarding flow (planned)
- `/dashboard`, `/meals`, `/my-page`, `/medications`, `/reports`, `/settings` - Main app routes (wrapped in `AppLayout`)

### Path Aliases
Use `@/` to reference `src/` directory (e.g., `@/components/ui/button`).

### Styling
- Primary: Teal/Mint Green (health, balance)
- Accent: Warm Coral (coaching warmth, emphasis)
- Tailwind with CSS variables for theming (dark mode via class strategy)
- Custom colors in `tailwind.config.ts`: `primary`, `secondary`, `success`, `warning`, `info`, `sidebar`, `chat`
- Font: Plus Jakarta Sans

## Domain Models

### Core Types
- **User/UserProfile**: id, email, gender, birthYear, heightCm, currentWeightKg, goalWeightKg, activityLevel, targetCalories, chatPersona ('cold'|'bright'|'strict')
- **Meal/MealItem**: userId, date, mealType ('breakfast'|'lunch'|'dinner'|'snack'), totalCalories, items with nutrition
- **ProgressLog**: userId, date, weightKg, bodyFatPercent, muscleMassKg
- **Medication/MedicationLog**: userId, name, dosage, frequency, timeOfDay, status, logs for tracking taken doses

### AI Coach Personas
- `cold` - Cool & Factual (Snowflake icon)
- `bright` - Warm & Supportive (Sun icon)
- `strict` - Direct & Focused (Flame icon)

## API Endpoints (Planned)

```
POST /api/auth/signup, /api/auth/login
GET  /api/me, PUT /api/me/profile
GET  /api/meals?date=YYYY-MM-DD, POST/PUT/DELETE /api/meals
GET  /api/progress?from=&to=, POST /api/progress
GET  /api/medications, POST /api/medications, POST /api/medications/:id/logs
POST /api/chat/message - AI chat with persona, can trigger meal logging
GET  /api/insights/summary?range=7d - AI-generated weekly summary
```

---

## Project Status (Updated: 2024-12-05)

### ✅ Completed Features (98%)

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (Login/Signup) | ✅ Done | Supabase Auth, email confirmation disabled |
| Onboarding (5 steps) | ✅ Done | localStorage + Supabase user_profiles |
| Dashboard | ✅ Done | Calories, weight, medication summary |
| Meals CRUD | ✅ Done | Supabase meals, meal_items tables |
| Food Search | ✅ Done | 11,086 Korean foods database |
| Medications CRUD | ✅ Done | Medication logs tracking |
| Weight Tracking | ✅ Done | Chart, weekly stats |
| AI Chat Coach | ✅ Done | Supabase Edge Function, 3 personas |
| AI Context | ✅ Done | Meals/weight/profile data included |
| Protected Routes | ✅ Done | ProtectedRoute component |
| QuickActions | ✅ Done | Meal/Weight forms, Medication navigation |
| Settings Save | ✅ Done | Profile updates saved to Supabase |
| Reports | ✅ Done | Dynamic weekly reports from DB |
| Profile Data | ✅ Done | Dashboard/MyPage use user profile data |

### ⚠️ Remaining TODO (Low Priority)

| Item | File | Issue |
|------|------|-------|
| **AI Summary** | `src/pages/MyPage.tsx:34-41` | `setTimeout` simulation, not real API call |

### ✅ Security Issue - RESOLVED

OpenAI API 호출이 Supabase Edge Function으로 이전됨:
- 파일: `supabase/functions/chat/index.ts`
- 클라이언트: `src/hooks/useChat.ts` (Edge Function 호출)
- API 키가 더 이상 브라우저에 노출되지 않음

### Remaining Tasks (Low Priority)

1. **LOW**: Connect MyPage AI summary to real Claude/OpenAI API

### Supabase Configuration

- **Project URL**: `https://fsdvksqflxfgirhvgybn.supabase.co`
- **Email Confirmation**: Disabled (for MVP)
- **Tables**: users, user_profiles, meals, meal_items, medications, medication_logs, progress_logs, chat_messages

### Key Files Reference

- **Router**: `src/App.tsx`
- **Auth Context**: `src/contexts/AuthContext.tsx`
- **Supabase Client**: `src/lib/supabase.ts`
- **Type Definitions**: `src/types/domain.ts`
- **Validation Schemas**: `src/lib/validations/onboarding.ts`
- **Hooks**: `src/hooks/` (useMeals, useProfile, useProgress, useMedications, useChat)
- **Edge Functions**: `supabase/functions/chat/` (AI 챗봇)

---

## Supabase Edge Function 배포 가이드

### 1. Supabase CLI 설치

```bash
npm install -g supabase
```

### 2. 프로젝트 연결

```bash
cd mini_project_test/ai-coach-companion
supabase login
supabase link --project-ref fsdvksqflxfgirhvgybn
```

### 3. 환경 변수 설정 (Supabase Dashboard)

Supabase Dashboard > Project Settings > Edge Functions > Secrets:

```
OPENAI_API_KEY=sk-your-openai-api-key
```

### 4. Edge Function 배포

```bash
supabase functions deploy chat
```

### 5. 테스트

```bash
curl -X POST 'https://fsdvksqflxfgirhvgybn.supabase.co/functions/v1/chat' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"content": "안녕", "persona": "bright", "userId": "test-user-id"}'
```

### AI 챗봇 컨텍스트

챗봇은 다음 사용자 데이터를 자동으로 포함합니다:
- **프로필**: 현재 체중, 목표 체중, 일일 목표 칼로리
- **오늘의 식사**: 각 끼니별 음식, 칼로리, 영양소 합계
- **체중 기록**: 최근 7일간 체중 변화
