# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_OPENAI_API_KEY=<openai-api-key>
```

## Architecture

DietRx Coach - AI personality-based diet coaching platform. Users record meals, weight, and medications, then receive feedback from an AI coach with a selected persona. Responds in Korean.

### Tech Stack
- **Build**: Vite with SWC for React
- **UI**: shadcn/ui components (Radix primitives) + Tailwind CSS
- **Routing**: react-router-dom v6
- **State**: @tanstack/react-query for server state
- **Forms**: react-hook-form + zod validation
- **Backend**: Supabase (auth, database, realtime)
- **AI**: OpenAI API (gpt-4o-mini) - client-side for dev, should use Edge Function in production

### Project Structure
- `src/pages/` - Route pages (Dashboard, Meals, Medications, Reports, Settings, MyPage, Login, Signup, Onboarding)
- `src/components/layout/` - App shell (`AppLayout`, `AppSidebar`, `MobileNav`)
- `src/components/ui/` - shadcn/ui primitives (avoid direct modifications)
- `src/components/dashboard/` - Dashboard components (`ChatPanel`, `QuickActions`, `SummaryCard`, `TodayMeals`)
- `src/components/onboarding/` - Multi-step onboarding flow with step components
- `src/contexts/AuthContext.tsx` - Supabase auth state management
- `src/hooks/` - Data hooks (`useChat`, `useMeals`, `useMedications`, `useProfile`, `useProgress`)
- `src/lib/supabase.ts` - Supabase client and helper functions
- `src/types/domain.ts` - TypeScript domain models

### Routing
Public routes: `/`, `/login`, `/signup`, `/onboarding`
Protected routes (wrapped in `AppLayout`): `/dashboard`, `/meals`, `/my-page`, `/medications`, `/reports`, `/settings`

### Path Aliases
Use `@/` to reference `src/` directory (e.g., `@/components/ui/button`).

### Styling
- Primary: Teal/Mint Green; Accent: Warm Coral
- Tailwind with CSS variables for theming (dark mode via class strategy)
- Custom colors in `tailwind.config.ts`: `primary`, `secondary`, `success`, `warning`, `info`, `sidebar`, `chat`
- Font: Plus Jakarta Sans

## Domain Models

All types defined in `src/types/domain.ts`:
- **UserProfile**: user_id, gender, birth_year, height_cm, current_weight_kg, goal_weight_kg, activity_level, target_calories, coach_persona
- **Meal/MealItem**: user_id, date, meal_type ('breakfast'|'lunch'|'dinner'|'snack'), total_calories, items with nutrition macros
- **ProgressLog**: user_id, date, weight_kg, body_fat_percent, muscle_mass_kg
- **Medication/MedicationLog**: user_id, name, dosage, frequency, time_of_day, is_active, logs with status
- **ChatMessage**: user_id, role ('user'|'assistant'), content

### AI Coach Personas
- `cold` - Cool & Factual (concise, data-driven, no emojis)
- `bright` - Warm & Supportive (encouraging, uses emojis)
- `strict` - Direct & Focused (firm, accountability-focused)
