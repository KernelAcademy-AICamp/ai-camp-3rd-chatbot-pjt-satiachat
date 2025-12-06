import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { signupSchema, SignupFormData } from '@/lib/validations/onboarding';
import { useCheckNickname } from '@/hooks/useCheckNickname';
import { cn } from '@/lib/utils';

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { status: nicknameStatus, message: nicknameMessage, checkNickname } = useCheckNickname();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  // Watch nickname field for duplicate check
  const nicknameValue = watch('nickname');

  useEffect(() => {
    if (nicknameValue) {
      checkNickname(nicknameValue);
    }
  }, [nicknameValue, checkNickname]);

  const isNicknameValid = nicknameStatus === 'available';

  const onSubmit = async (data: SignupFormData) => {
    // Check nickname availability before submit
    if (nicknameStatus === 'taken') {
      setError('이미 사용 중인 닉네임입니다.');
      return;
    }
    if (nicknameStatus === 'invalid') {
      setError(nicknameMessage);
      return;
    }
    if (nicknameStatus === 'checking') {
      setError('닉네임 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error } = await signUp(data.email, data.password, data.nickname);

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setError('이미 등록된 이메일입니다');
      } else if (error.message.includes('Invalid email')) {
        setError('유효하지 않은 이메일 형식입니다');
      } else if (error.message.includes('Password')) {
        setError('비밀번호가 요구사항을 충족하지 않습니다');
      } else {
        setError(`회원가입 중 오류가 발생했습니다: ${error.message}`);
      }
      setIsLoading(false);
    } else {
      // Navigate to onboarding after signup
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">DietRx Coach</h1>
          <p className="text-muted-foreground mt-2">새 계정 만들기</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className="rounded-xl"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <div className="relative">
                <Input
                  id="nickname"
                  type="text"
                  placeholder="홍길동"
                  {...register('nickname')}
                  className={cn(
                    'rounded-xl pr-10',
                    nicknameStatus === 'available' && 'border-green-500 focus-visible:ring-green-500',
                    (nicknameStatus === 'taken' || nicknameStatus === 'invalid') && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nicknameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {nicknameStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {nicknameStatus === 'taken' && (
                    <X className="w-4 h-4 text-destructive" />
                  )}
                  {nicknameStatus === 'invalid' && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              {errors.nickname && (
                <p className="text-sm text-destructive">{errors.nickname.message}</p>
              )}
              {!errors.nickname && nicknameMessage && (
                <p className={cn(
                  'text-sm',
                  nicknameStatus === 'available' ? 'text-green-600' : 'text-destructive'
                )}>
                  {nicknameMessage}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="6자 이상"
                {...register('password')}
                className="rounded-xl"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호 재입력"
                {...register('confirmPassword')}
                className="rounded-xl"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl shadow-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
