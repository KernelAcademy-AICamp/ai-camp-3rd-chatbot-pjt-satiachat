# 인증 시스템

## 개요

DietRx Coach는 **Supabase Auth**를 사용하여 이메일/비밀번호 기반 인증을 제공합니다.

## 인증 흐름

### 1. 회원가입 (Sign Up)

```
User → SignupPage → Supabase Auth → PostgreSQL
         │              │              │
         │   signUp()   │              │
         ├─────────────►│              │
         │              │  auth.users  │
         │              ├─────────────►│
         │              │              │
         │   JWT Token  │              │
         │◄─────────────┤              │
         │              │              │
         ▼              │              │
    Onboarding Flow     │              │
         │              │              │
         │  user_profiles 생성         │
         ├─────────────────────────────►
```

**코드 위치**: `src/pages/auth/Signup.tsx`

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

### 2. 로그인 (Sign In)

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

**코드 위치**: `src/pages/auth/Login.tsx`

### 3. 세션 관리

**AuthContext**: `src/contexts/AuthContext.tsx`

```typescript
// 세션 상태 구독
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      setUser(session?.user ?? null);
      setCurrentUserId(session?.user?.id ?? null);
    }
  );
  return () => subscription.unsubscribe();
}, []);
```

### 4. 로그아웃

```typescript
await supabase.auth.signOut();
// AuthContext가 자동으로 상태 업데이트
```

## JWT 토큰 구조

Supabase JWT에는 다음 정보가 포함됩니다:

```json
{
  "aud": "authenticated",
  "exp": 1702123456,
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {},
  "user_metadata": {}
}
```

## FastAPI 인증

### JWT 검증

**코드 위치**: `server/core/security.py`

```python
async def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    token = credentials.credentials

    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated"
    )

    return TokenData(
        user_id=payload.get("sub"),
        email=payload.get("email"),
    )
```

### API 엔드포인트 보호

```python
@router.post("/message")
async def send_message(
    request: ChatRequest,
    user: TokenData = Depends(get_current_user)
):
    # user.user_id로 인증된 사용자 ID 사용
    pass
```

## Row Level Security (RLS)

### 정책 예시

```sql
-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can CRUD own meals" ON public.meals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own medications" ON public.medications
  FOR ALL USING (auth.uid() = user_id);
```

### 작동 원리

```
┌──────────────────────────────────────────────────────────┐
│                     Supabase Client                       │
│   Authorization: Bearer <JWT>                             │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                      PostgreSQL                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  auth.uid() = JWT에서 추출한 user_id               │  │
│  │                                                    │  │
│  │  SELECT * FROM meals WHERE user_id = auth.uid()   │  │
│  │  → 자동으로 현재 사용자의 데이터만 반환            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 온보딩 플로우

회원가입 후 5단계 온보딩:

| 단계 | 수집 정보 | 필드 |
|------|----------|------|
| 1 | 환영 | - |
| 2 | 신체 정보 | gender, birth_year, height_cm |
| 3 | 체중 목표 | current_weight_kg, goal_weight_kg |
| 4 | 활동량 | activity_level |
| 5 | AI 코치 선택 | chat_persona |

**코드 위치**: `src/pages/Onboarding.tsx`

```typescript
// 온보딩 완료 시 user_profiles 생성
const { error } = await supabase.from('user_profiles').upsert({
  id: user.id,
  email: user.email,
  ...onboardingData,
});
```

## 보호된 라우트

**코드 위치**: `src/components/auth/ProtectedRoute.tsx`

```typescript
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

**라우터 설정**: `src/App.tsx`

```typescript
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/meals" element={<Meals />} />
  {/* ... */}
</Route>
```

## 보안 고려사항

### 1. 토큰 저장
- localStorage에 저장 (Supabase 기본)
- XSS 공격 주의 필요

### 2. JWT Secret
- 환경 변수로 관리 (`.env`)
- 절대 클라이언트에 노출하지 않음

### 3. CORS 설정
```python
# server/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
)
```

### 4. 이메일 확인
- 현재: 비활성화 (MVP)
- 프로덕션: 활성화 권장
