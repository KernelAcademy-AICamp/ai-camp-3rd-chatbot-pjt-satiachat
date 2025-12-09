import { useState } from 'react';
import { ChevronDown, ChevronRight, Utensils, Coffee, Sun, Moon, Cookie, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTodayMeals } from '@/hooks/useMeals';
import { MealForm } from './MealForm';
import type { MealType, MealWithItems } from '@/types/domain';

const mealConfig: Record<MealType, { icon: typeof Coffee; label: string; color: string }> = {
  breakfast: { icon: Coffee, label: '아침', color: 'text-warning' },
  lunch: { icon: Sun, label: '점심', color: 'text-primary' },
  dinner: { icon: Moon, label: '저녁', color: 'text-info' },
  snack: { icon: Cookie, label: '간식', color: 'text-secondary' },
};

const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealSectionProps {
  mealType: MealType;
  meal?: MealWithItems;
  onEdit: (meal: MealWithItems) => void;
  onAdd: (mealType: MealType) => void;
}

function MealSection({ mealType, meal, onEdit, onAdd }: MealSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = mealConfig[mealType];
  const Icon = config.icon;

  const hasItems = meal && meal.meal_items && meal.meal_items.length > 0;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => hasItems && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors',
          hasItems ? 'cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-muted', config.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">{config.label}</p>
            {hasItems ? (
              <p className="text-xs text-muted-foreground">
                {meal.meal_items.length}개 항목 · {meal.total_calories || 0} kcal
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">기록 없음</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasItems ? (
            <>
              <span className="text-sm font-semibold text-foreground">
                {meal.total_calories || 0} kcal
              </span>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(mealType);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              추가
            </Button>
          )}
        </div>
      </button>

      {isOpen && hasItems && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-2">
          {meal.meal_items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{item.name}</span>
              <span className="text-muted-foreground">{item.calories} kcal</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => onEdit(meal)}
            >
              <Pencil className="w-3 h-3 mr-1" />
              수정하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TodayMealsSummary() {
  const { data: meals, isLoading } = useTodayMeals();
  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealWithItems | null>(null);
  const [defaultMealType, setDefaultMealType] = useState<MealType>('breakfast');

  // 끼니별로 그룹화
  const mealsByType: Record<MealType, MealWithItems | undefined> = {
    breakfast: undefined,
    lunch: undefined,
    dinner: undefined,
    snack: undefined,
  };

  meals?.forEach((meal) => {
    if (!mealsByType[meal.meal_type]) {
      mealsByType[meal.meal_type] = meal;
    }
  });

  const totalCalories = meals?.reduce((sum, m) => sum + (m.total_calories || 0), 0) || 0;

  const handleEdit = (meal: MealWithItems) => {
    setEditingMeal(meal);
    setShowMealForm(true);
  };

  const handleAdd = (mealType: MealType) => {
    setEditingMeal(null);
    setDefaultMealType(mealType);
    setShowMealForm(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {mealOrder.map((type) => (
          <div key={type} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 총 칼로리 요약 */}
      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">오늘 총 섭취</span>
        </div>
        <span className="text-lg font-bold text-primary">{totalCalories} kcal</span>
      </div>

      {/* 끼니별 섹션 */}
      <div className="space-y-2">
        {mealOrder.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            meal={mealsByType[mealType]}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        ))}
      </div>

      {/* MealForm 다이얼로그 */}
      <MealForm
        open={showMealForm}
        onOpenChange={setShowMealForm}
        editMeal={editingMeal || undefined}
        defaultMealType={defaultMealType}
      />
    </div>
  );
}
