# 채팅 메시지 UI 미표시 버그 분석

## 버그 요약
- **증상**: 채팅 메시지가 DB에는 저장되지만 화면에 표시되지 않음
- **원인**: React Query queryKey 불일치로 인한 캐시 동기화 실패
- **심각도**: Critical (핵심 기능 동작 불가)
- **영향 범위**: 모든 채팅 인터랙션

---

## 근본 원인 (Root Cause Analysis)

### 문제 1: Query Key Mismatch

#### 데이터 조회 (useChatMessages)
```typescript
// src/hooks/useChat.ts:530
queryKey: [...chatKeys.messages(), limit]
// 실제 키: ['chat', 'messages', 10]
```

#### 캐시 업데이트 (useSendMessage - 수정 전)
```typescript
// src/hooks/useChat.ts:591 (OLD)
queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), ...)
// 실제 키: ['chat', 'messages']  ❌ limit 파라미터 누락!
```

### 결과: 고아 캐시(Orphaned Cache) 생성

```javascript
// React Query 캐시 상태
{
  "['chat', 'messages', 10]": [메시지 1, 2, 3],  // ← UI가 구독하는 캐시
  "['chat', 'messages']": [메시지 1, 2, 3, 4, 5]  // ← 아무도 읽지 않는 고아 캐시
}
```

- UI는 `['chat', 'messages', 10]` 키를 구독
- Mutation은 `['chat', 'messages']` 키에 데이터 저장
- **결과**: 캐시 미스 → 화면에 새 메시지 안 보임

---

## 수정 사항

### 변경 코드: src/hooks/useChat.ts

#### 1. User Message Optimistic Update (라인 590-597)

**Before:**
```typescript
queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
  return old ? [...old, userMsg] : [userMsg];
});
```

**After:**
```typescript
queryClient.setQueriesData<ChatMessage[]>(
  { queryKey: chatKeys.messages() },
  (old) => {
    return old ? [...old, userMsg] : [userMsg];
  }
);
```

**변경 이유**: `setQueriesData`는 prefix matching으로 모든 limit 변형 캐시를 업데이트

#### 2. Assistant Message Optimistic Update (라인 754-760)

**Before:**
```typescript
queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(), (old) => {
  return old ? [...old, assistantMsg] : [assistantMsg];
});
```

**After:**
```typescript
queryClient.setQueriesData<ChatMessage[]>(
  { queryKey: chatKeys.messages() },
  (old) => {
    return old ? [...old, assistantMsg] : [assistantMsg];
  }
);
```

#### 3. onSuccess Handler 제거 (라인 767-769)

**Before:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: chatKeys.messages() });
},
```

**After:**
```typescript
// No onSuccess invalidation needed - cache already updated optimistically via setQueriesData
// Removing invalidateQueries prevents race condition that causes messages to disappear
```

**변경 이유**:
- `setQueriesData`로 이미 캐시 업데이트 완료
- `invalidateQueries`와 `setQueryData`가 경쟁 조건(race condition) 유발
- 불필요한 refetch 방지 (네트워크 오버헤드 감소)

---

## 기술적 세부 사항

### setQueryData vs setQueriesData

| API | 매칭 방식 | 사용 예시 |
|-----|-----------|-----------|
| `setQueryData(key, updater)` | **Exact match** | 정확한 키를 알 때 단일 캐시 업데이트 |
| `setQueriesData(filter, updater)` | **Prefix match** | 여러 캐시를 일괄 업데이트 |

#### setQueriesData 동작 예시

```typescript
// 캐시 상태
{
  ['chat', 'messages', 10]: [메시지 1, 2, 3],
  ['chat', 'messages', 20]: [메시지 1~20],
  ['chat', 'messages', 'count']: 25,
  ['user', 'profile']: { name: '홍길동' }
}

// setQueriesData 호출
queryClient.setQueriesData(
  { queryKey: ['chat', 'messages'] },  // prefix
  (old) => [...old, 새메시지]
);

// 결과: ['chat', 'messages']로 시작하는 모든 캐시 업데이트
{
  ['chat', 'messages', 10]: [메시지 1, 2, 3, 새메시지],    // ✅ 업데이트됨
  ['chat', 'messages', 20]: [메시지 1~20, 새메시지],       // ✅ 업데이트됨
  ['chat', 'messages', 'count']: 26,                     // ⚠️ 타입 불일치로 updater 실행 안됨
  ['user', 'profile']: { name: '홍길동' }                 // ✅ 매칭 안되서 그대로
}
```

### Optimistic Updates의 장점

1. **즉시 피드백**: 네트워크 응답 대기 없이 UI 즉시 업데이트
2. **UX 향상**: 사용자가 느끼는 앱 반응 속도 개선
3. **네트워크 절약**: 불필요한 refetch 방지

### Race Condition 예방

**문제 시나리오 (수정 전)**:
```typescript
// T0: Mutation 시작
mutationFn() → DB 저장 → setQueryData()

// T1: setQueryData 완료 (캐시에 새 메시지 추가)
Cache: [메시지 1, 2, 3, 새메시지]

// T2: onSuccess 실행
invalidateQueries() → refetch 시작

// T3: refetch 완료 (네트워크 지연 동안 타이밍 이슈)
Cache: [메시지 1, 2, 3]  // ❌ 새메시지 사라짐!
```

**해결 (수정 후)**:
```typescript
// T0: Mutation 시작
mutationFn() → DB 저장 → setQueriesData()

// T1: setQueriesData 완료
Cache: [메시지 1, 2, 3, 새메시지]

// onSuccess 없음 → refetch 안함 → 메시지 유지 ✅
```

---

## 유사 버그 패턴 (다른 시스템 비유)

### 1. Redis Cache Key Mismatch
```python
# ❌ 버그
cache.set("user:123", data)       # 저장
cache.get("user:123:profile")     # 조회 실패 (키가 다름)

# ✅ 수정
cache.set("user:123:profile", data)
cache.get("user:123:profile")     # 조회 성공
```

### 2. Database Index Mismatch
```sql
-- ❌ 버그
CREATE INDEX idx_user_email ON users(email);
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';  -- 인덱스 안 탐

-- ✅ 수정
CREATE INDEX idx_user_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';  -- 인덱스 탐
```

### 3. Message Queue Topic Mismatch
```javascript
// ❌ 버그
producer.send({ topic: 'chat.message', data });    // 발행
consumer.subscribe({ topic: 'chat.messages' });    // 구독 실패 (topic 오타)

// ✅ 수정
producer.send({ topic: 'chat.messages', data });
consumer.subscribe({ topic: 'chat.messages' });    // 구독 성공
```

---

## 테스트 시나리오

### 수동 테스트 체크리스트

- [ ] **기본 메시지 전송**: 메시지 입력 → 전송 → 화면에 즉시 표시
- [ ] **AI 응답**: AI 응답이 화면에 표시됨
- [ ] **페이지네이션**: "이전 대화 불러오기" 클릭 → 기존 메시지 유지 + 과거 메시지 추가
- [ ] **새로고침**: 페이지 새로고침 → 모든 메시지 DB에서 복원
- [ ] **동시 전송**: 빠르게 여러 메시지 연속 전송 → 모두 순서대로 표시
- [ ] **오프라인**: 네트워크 끊김 → 에러 표시 (메시지 사라지지 않음)

### 자동화 테스트 (권장)

```typescript
// src/hooks/useChat.test.ts (Vitest)
describe('useSendMessage', () => {
  it('should update all message caches with different limits', async () => {
    const { result } = renderHook(() => useSendMessage());

    // Setup: 여러 limit 값으로 캐시 생성
    queryClient.setQueryData(['chat', 'messages', 10], [msg1, msg2]);
    queryClient.setQueryData(['chat', 'messages', 20], [msg1, msg2, msg3]);

    // Act: 메시지 전송
    await result.current.mutateAsync({ content: 'test', persona: 'bright' });

    // Assert: 모든 캐시가 업데이트되어야 함
    const cache10 = queryClient.getQueryData(['chat', 'messages', 10]);
    const cache20 = queryClient.getQueryData(['chat', 'messages', 20]);

    expect(cache10).toHaveLength(3);  // msg1, msg2, newMsg
    expect(cache20).toHaveLength(4);  // msg1, msg2, msg3, newMsg
  });
});
```

---

## Production 체크리스트

### ✅ 현재 구현 상태
- [x] Cache coherency (setQueriesData 사용)
- [x] Optimistic updates (즉시 UI 반영)
- [x] Race condition 방지 (불필요한 invalidation 제거)

### ⚠️ 추가 개선 권장사항

#### 1. Error Recovery (Rollback)
**문제**: Mutation 실패 시 optimistic update가 롤백되지 않음

**권장 해결책**:
```typescript
return useMutation({
  mutationFn: async (...) => { ... },
  onMutate: async (variables) => {
    // 이전 캐시 스냅샷 저장
    const previousMessages = queryClient.getQueriesData({
      queryKey: chatKeys.messages()
    });

    // Optimistic update
    queryClient.setQueriesData({ queryKey: chatKeys.messages() }, ...);

    return { previousMessages };  // Rollback 데이터 반환
  },
  onError: (err, variables, context) => {
    // 에러 발생 시 이전 상태로 복구
    context?.previousMessages.forEach(([key, data]) => {
      queryClient.setQueryData(key, data);
    });

    toast.error('메시지 전송 실패');
  },
});
```

#### 2. Concurrency Control (메시지 순서 보장)
**문제**: 동시 메시지 전송 시 순서가 뒤바뀔 수 있음

**권장 해결책**:
```typescript
// 1. Mutation Queue (serial execution)
const sendMessage = useMutation({
  ...,
  mutationKey: ['send-message'],  // 같은 키 사용
  // React Query는 같은 mutationKey를 순차 실행
});

// 2. 또는 Optimistic Lock
const sendMessage = useMutation({
  mutationFn: async ({ content, optimisticId }) => {
    // 클라이언트 생성 임시 ID로 중복 방지
    await supabase.from('chat_messages').insert({
      id: optimisticId,  // UUID
      content,
    });
  },
});
```

#### 3. Cache Invalidation Strategy
**문제**: staleTime/cacheTime 미설정으로 캐시가 영원히 유지됨

**권장 해결책**:
```typescript
export function useChatMessages(limit: number = 10) {
  return useQuery({
    queryKey: [...chatKeys.messages(), limit],
    queryFn: ...,
    staleTime: 5 * 60 * 1000,    // 5분간 fresh
    cacheTime: 30 * 60 * 1000,   // 30분간 메모리 유지
    refetchOnWindowFocus: true,  // 탭 전환 시 최신 데이터 확인
  });
}
```

#### 4. Message Deduplication
**문제**: 네트워크 재시도로 중복 메시지 저장 가능

**권장 해결책**:
```typescript
// Supabase: unique constraint 추가
ALTER TABLE chat_messages ADD CONSTRAINT unique_message_id UNIQUE (id);

// Client: Idempotency key 사용
const { data, error } = await supabase
  .from('chat_messages')
  .insert({
    id: uuidv4(),  // 클라이언트 생성 UUID
    content,
  })
  .select()
  .single();
```

#### 5. Rate Limiting
**문제**: 사용자가 무한 메시지 전송 가능 (AI 비용 폭주)

**권장 해결책**:
```typescript
// 1. Client-side throttle
import { useMutation } from '@tanstack/react-query';
import { throttle } from 'lodash';

const sendMessageThrottled = throttle(
  (content) => sendMessage.mutateAsync(content),
  3000  // 3초에 1번만 허용
);

// 2. Backend rate limit (Supabase Edge Function)
import { RateLimiter } from '@supabase/rate-limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute',
});

export default async function handler(req: Request) {
  const remaining = await limiter.removeTokens(userId, 1);
  if (remaining < 0) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  // ...
}
```

---

## 참고 자료

### React Query Patterns
- [Official Docs: Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Query Key Factories](https://tkdodo.eu/blog/effective-react-query-keys)
- [setQueryData vs setQueriesData](https://tanstack.com/query/latest/docs/react/reference/QueryClient#queryclientsetqueriesdata)

### 유사 이슈 (GitHub)
- [tanstack/query#4123](https://github.com/TanStack/query/issues/4123) - queryKey mismatch
- [tanstack/query#3476](https://github.com/TanStack/query/issues/3476) - optimistic update rollback

---

## 결론

이 버그는 **캐시 키 불일치**로 인한 전형적인 클라이언트 상태 관리 버그였습니다.

### 교훈
1. **Query Key는 계약**: Query와 Mutation이 같은 캐시를 바라보도록 키를 일치시켜야 함
2. **Prefix Matching 활용**: 동적 파라미터가 있는 경우 `setQueriesData` 사용
3. **Optimistic Update**: UX 향상에는 좋지만 에러 처리(rollback)를 반드시 구현
4. **Race Condition**: 불필요한 invalidation은 타이밍 버그의 원인

### 최종 수정 사항
- `setQueryData` → `setQueriesData` (prefix matching)
- `onSuccess` invalidation 제거 (race condition 방지)
- 코멘트 추가 (미래 개발자를 위한 컨텍스트)

**Status**: ✅ RESOLVED
