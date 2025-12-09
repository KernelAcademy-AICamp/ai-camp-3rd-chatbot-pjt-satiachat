import { useState } from 'react';
import { X, Plus, Utensils, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealCard } from './MealCard';
import { MealForm } from './MealForm';
import { getToday } from '@/lib/supabase';
import type { MealWithItems } from '@/types/domain';

interface DayDetailPanelProps {
  date: string;
  meals: MealWithItems[] | undefined;
  isLoading: boolean;
  onClose: () => void;
}

export function DayDetailPanel({ date, meals, isLoading, onClose }: DayDetailPanelProps) {
  const [showMealForm, setShowMealForm] = useState(false);

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  // 총 칼로리 계산
  const totalCalories = meals?.reduce((sum, meal) => sum + (meal.total_calories || 0), 0) || 0;

  // 오늘인지 확인
  const isToday = date === getToday();

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 animate-slide-up">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Utensils className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {formatDate(date)}
              {isToday && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  오늘
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {meals?.length || 0}개 식사 | {totalCalories} kcal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 rounded-xl"
            onClick={() => setShowMealForm(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">식단 추가</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 내용 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : meals && meals.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Utensils className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">기록된 식단이 없습니다</p>
          <p className="text-xs mt-1">위의 버튼을 눌러 식단을 추가해보세요</p>
        </div>
      )}

      {/* 일일 합계 */}
      {meals && meals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <span className="text-muted-foreground">일일 총 섭취</span>
          <span className="text-lg font-bold text-primary">{totalCalories} kcal</span>
        </div>
      )}

      {/* MealForm 다이얼로그 */}
      <MealForm
        open={showMealForm}
        onOpenChange={setShowMealForm}
        defaultDate={date}
      />
    </div>
  );
}
