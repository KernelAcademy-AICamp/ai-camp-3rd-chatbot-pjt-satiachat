import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export function CompletionStep() {
  const navigate = useNavigate();

  return (
    <div className="text-center py-8 space-y-6">
      <div className="flex justify-center">
        <CheckCircle className="w-20 h-20 text-success" />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          설정 완료!
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          맞춤형 코칭 환경이 준비되었습니다. 건강한 목표를 향해 함께 시작해볼까요?
        </p>
      </div>

      <Button
        size="lg"
        onClick={() => navigate('/dashboard')}
        className="mt-4 rounded-xl shadow-glow"
      >
        대시보드로 이동
      </Button>
    </div>
  );
}
