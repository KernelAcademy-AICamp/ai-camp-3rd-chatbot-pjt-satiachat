# 약물 관리 기능

## 개요

GLP-1 계열 비만치료제(위고비, 마운자로)의 주 1회 복용 일정을 관리하고, RAG 기반 챗봇으로 약물 관련 질문에 답변합니다.

## 데이터 모델

### medications 테이블

```sql
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'as_needed')),
  dose_day INTEGER CHECK (dose_day >= 0 AND dose_day <= 6),  -- 0=일, 6=토
  time_of_day TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### medication_logs 테이블

```sql
CREATE TABLE public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medications(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT CHECK (status IN ('taken', 'skipped', 'delayed')) DEFAULT 'taken',
  notes TEXT
);
```

## 주요 기능

### 1. 주 1회 복용 스케줄링

GLP-1 약물은 매주 같은 요일에 투여합니다.

```typescript
// 약물 등록 시 복용 요일 선택
interface MedicationFormData {
  name: string;           // "위고비" 또는 "마운자로"
  dosage: string;         // "0.25mg", "0.5mg" 등
  frequency: "weekly";    // 고정
  dose_day: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 복용 요일
}
```

**UI 컴포넌트**: `src/components/medications/MedicationForm.tsx`

### 2. 달력 기반 복용 기록

**코드 위치**: `src/components/medications/MedicationCalendar.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  2024년 12월 복용률: 85% (4/5일 완벽 복용)              │
├─────────────────────────────────────────────────────────┤
│  일   월   화   수   목   금   토                       │
│  1    2    3●   4    5    6    7                        │
│  8    9    10●  11   12   13   14                       │
│  15   16   17●  18   19   20   21                       │
│  22   23   24○  25   26   27   28                       │
│  29   30   31                                           │
│                                                         │
│  ● 복용 완료  ○ 예정  ✗ 미복용                          │
└─────────────────────────────────────────────────────────┘
```

### 3. 복용 기록/취소

```typescript
// 복용 완료 처리
const handleTakeMedication = async (medicationId: string, date: string) => {
  await supabase.from('medication_logs').insert({
    medication_id: medicationId,
    user_id: getCurrentUserId(),
    taken_at: new Date().toISOString(),
    status: 'taken',
  });
};

// 복용 취소
const handleUntakeMedication = async (logId: string) => {
  await supabase.from('medication_logs').delete().eq('id', logId);
};
```

**UI 컴포넌트**: `src/components/medications/MedicationDayDetail.tsx`

### 4. 요일별 필터링

달력에서 날짜 선택 시 해당 요일에 복용 예정인 약물만 표시:

```typescript
const filteredMedications = useMemo(() => {
  if (!dayData?.medications) return [];
  return dayData.medications.filter((med) => {
    const doseDay = med.dose_day as DayOfWeek | undefined;
    // dose_day가 없으면 모든 요일, 있으면 해당 요일만
    return doseDay === undefined || doseDay === dayOfWeek;
  });
}, [dayData?.medications, dayOfWeek]);
```

## RAG 챗봇 연동

### 질문 예시

| 질문 | RAG 검색 결과 |
|------|--------------|
| "위고비 부작용이 뭐야?" | 위고비_주의사항.txt에서 검색 |
| "마운자로 주사 방법 알려줘" | 마운자로_용법용량.txt에서 검색 |
| "GLP-1 약물 효과가 뭐야?" | 위고비_효능효과.txt에서 검색 |

### API 엔드포인트

```
POST /api/v1/medication/ask
```

**요청**:
```json
{
  "query": "위고비 부작용이 뭐야?",
  "include_health_context": true,
  "use_rag": true
}
```

**응답**:
```json
{
  "response": "위고비(세마글루타이드)의 주요 부작용은...",
  "is_emergency": false,
  "sources": ["위고비_주의사항.txt"]
}
```

## UI 구성

### 약물 탭 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  💊 내 약물                                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  [내 약물]  [기록]  [AI 상담]                      │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 위고비 0.5mg                                    │    │
│  │ 매주 화요일 | 다음 복용: 12월 10일              │    │
│  │ [복용 완료] [수정] [삭제]                       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [+ 약물 추가]                                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 컴포넌트 구조

```
src/pages/Medications.tsx
├── Tabs
│   ├── "내 약물" Tab
│   │   ├── MedicationCard
│   │   └── AddMedicationDialog
│   ├── "기록" Tab
│   │   └── MedicationCalendar
│   │       └── MedicationDayDetail
│   └── "AI 상담" Tab
│       └── MedicationChatPanel
└── MedicationForm (Dialog 내부)
```

## 관련 파일

| 파일 | 설명 |
|------|------|
| `src/pages/Medications.tsx` | 약물 관리 페이지 |
| `src/hooks/useMedications.ts` | 약물 관련 훅 |
| `src/components/medications/` | 약물 컴포넌트들 |
| `server/api/v1/medication.py` | RAG API 엔드포인트 |
| `medication-rag/` | RAG 파이프라인 |

## 복용 통계

```typescript
// 월별 복용률 계산
const monthStats = useMemo(() => {
  let scheduledDays = 0;
  let fullComplianceDays = 0;

  days.forEach(date => {
    if (isFuture(date) || !isScheduledDate(date)) return;
    scheduledDays++;

    const dayData = monthData.dailySummary.get(dateStr);
    if (dayData?.status === "full") {
      fullComplianceDays++;
    }
  });

  return {
    scheduledDays,
    fullComplianceDays,
    averageRate: Math.round((fullComplianceDays / scheduledDays) * 100),
  };
}, [monthData]);
```

## 주의사항

### 응급 상황 감지

RAG 챗봇은 응급 상황 키워드를 감지하여 경고 메시지를 표시합니다:

```python
EMERGENCY_KEYWORDS = [
    "과다복용", "응급", "심한 구토", "의식 저하",
    "호흡 곤란", "알레르기 반응", "아나필락시스"
]

if any(kw in query for kw in EMERGENCY_KEYWORDS):
    return {
        "response": "⚠️ 응급 상황이 의심됩니다. 즉시 119에 전화하거나 가까운 응급실을 방문하세요.",
        "is_emergency": True
    }
```
