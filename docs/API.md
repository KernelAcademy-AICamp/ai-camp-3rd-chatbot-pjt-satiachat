# API 문서

## 개요

DietRx Coach API는 FastAPI로 구현되어 있으며, AI 챗봇 기능을 제공합니다.

- **Base URL**: `http://localhost:8000`
- **API Prefix**: `/api/v1`
- **인증**: Supabase JWT Bearer Token

## 인증

모든 API 요청에는 `Authorization` 헤더가 필요합니다:

```
Authorization: Bearer <supabase_jwt_token>
```

토큰은 Supabase Auth 로그인 시 발급됩니다.

---

## 식단 챗봇 API

### POST /api/v1/chat/message

AI 코치에게 메시지를 보내고 응답을 받습니다.

**Request Body**:
```json
{
  "content": "점심에 비빔밥 먹었어",
  "persona": "bright"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| content | string | ✓ | 사용자 메시지 |
| persona | string | - | AI 페르소나 (`cold`, `bright`, `strict`) |

**Response** (200 OK):
```json
{
  "message": "점심 기록 완료! 비빔밥 550kcal 드셨네요 😊",
  "intent": "log",
  "action_result": {
    "meal_type": "lunch",
    "foods_logged": ["비빔밥"],
    "total_calories": 550
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| message | string | AI 응답 메시지 |
| intent | string | 분류된 의도 (`log`, `query`, `stats`, `modify`, `analyze`, `chat`) |
| action_result | object | 수행된 액션 결과 (optional) |

---

### GET /api/v1/chat/history

채팅 기록을 조회합니다.

**Query Parameters**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| limit | int | 50 | 최대 메시지 수 |

**Response** (200 OK):
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "점심에 비빔밥 먹었어",
      "created_at": "2024-12-09T12:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "점심 기록 완료!",
      "created_at": "2024-12-09T12:00:01Z"
    }
  ],
  "total": 2
}
```

---

### DELETE /api/v1/chat/history

채팅 기록을 삭제합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Chat history cleared"
}
```

---

## 약물 RAG 챗봇 API

### POST /api/v1/medication/ask

약물 관련 질문을 RAG 시스템으로 처리합니다.

**Request Body**:
```json
{
  "query": "위고비 부작용이 뭐야?",
  "include_health_context": true,
  "use_rag": true,
  "intent": "medication_info"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| query | string | ✓ | 질문 내용 |
| include_health_context | bool | - | 건강 정보 포함 여부 (기본: true) |
| use_rag | bool | - | RAG 검색 사용 여부 (기본: true) |
| intent | string | - | 의도 힌트 |

**Response** (200 OK):
```json
{
  "response": "위고비(세마글루타이드)의 주요 부작용은 오심(구역질), 구토, 설사, 변비, 복통 등 위장관계 이상반응입니다...",
  "is_emergency": false,
  "sources": ["wegovy_주의사항.txt"]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| response | string | AI 응답 |
| is_emergency | bool | 응급 상황 여부 |
| sources | string[] | 참조한 문서 목록 |

---

### GET /api/v1/medication/history

약물 챗봇 대화 기록을 조회합니다.

**Query Parameters**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| limit | int | 50 | 최대 메시지 수 |

**Response** (200 OK):
```json
{
  "messages": [...],
  "total": 10
}
```

---

### DELETE /api/v1/medication/history

약물 챗봇 대화 기록을 삭제합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Medication chat history cleared"
}
```

---

## 공통 엔드포인트

### GET /health

서버 상태를 확인합니다. (인증 불필요)

**Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "DietRx Coach API",
  "version": "1.0.0"
}
```

---

### GET /

루트 엔드포인트 (인증 불필요)

**Response** (200 OK):
```json
{
  "message": "Welcome to DietRx Coach API",
  "docs": "/docs",
  "health": "/health"
}
```

---

## 에러 응답

### 표준 에러 형식

```json
{
  "success": false,
  "error": "에러 메시지",
  "error_code": "ERROR_CODE",
  "details": [...],
  "timestamp": "2024-12-09T12:00:00Z"
}
```

### HTTP 상태 코드

| 코드 | 설명 | error_code |
|------|------|------------|
| 400 | 잘못된 요청 | BAD_REQUEST |
| 401 | 인증 실패 | UNAUTHORIZED |
| 403 | 권한 없음 | FORBIDDEN |
| 404 | 리소스 없음 | NOT_FOUND |
| 422 | 유효성 검사 실패 | VALIDATION_ERROR |
| 500 | 서버 에러 | INTERNAL_ERROR |
| 503 | 서비스 불가 | SERVICE_UNAVAILABLE |

### 유효성 검사 에러 예시

```json
{
  "success": false,
  "error": "Request validation failed",
  "error_code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "body.content",
      "message": "field required"
    }
  ],
  "timestamp": "2024-12-09T12:00:00Z"
}
```

---

## Swagger UI

개발 환경에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

> 프로덕션 환경에서는 비활성화됩니다.

---

## 프론트엔드 연동 예시

### React Query 훅

```typescript
// src/hooks/useChat.ts
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, persona }: ChatRequest) => {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ content, persona }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
  });
}
```

### 환경 변수

```env
# .env.local
VITE_API_URL=http://localhost:8000/api/v1
```
