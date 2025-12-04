import { useState } from 'react';
import { Coffee, Sun, Moon, Cookie, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MealForm } from './MealForm';
import { useDeleteMeal } from '@/hooks/useMeals';
import type { MealType, MealWithItems } from '@/types/domain';

interface MealCardProps {
  meal: MealWithItems;
}

const mealConfig: Record<MealType, { icon: typeof Coffee; label: string; time: string }> = {
  breakfast: { icon: Coffee, label: '아침', time: '7:00 - 9:00' },
  lunch: { icon: Sun, label: '점심', time: '12:00 - 14:00' },
  dinner: { icon: Moon, label: '저녁', time: '18:00 - 20:00' },
  snack: { icon: Cookie, label: '간식', time: '언제든지' },
};

export function MealCard({ meal }: MealCardProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const deleteMeal = useDeleteMeal();

  const config = mealConfig[meal.meal_type];
  const Icon = config.icon;

  const handleDelete = async () => {
    try {
      await deleteMeal.mutateAsync(meal.id);
      setShowDeleteAlert(false);
    } catch (error) {
      console.error('Failed to delete meal:', error);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{config.label}</h4>
                  <span className="text-xs text-muted-foreground">{config.time}</span>
                </div>
                <div className="space-y-0.5">
                  {meal.meal_items?.map((item, index) => (
                    <p key={item.id || index} className="text-sm text-muted-foreground">
                      {item.name}
                      {item.calories > 0 && (
                        <span className="text-xs ml-1">({item.calories} kcal)</span>
                      )}
                    </p>
                  ))}
                  {(!meal.meal_items || meal.meal_items.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">음식 항목 없음</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">
                {meal.total_calories} kcal
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteAlert(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form Dialog */}
      <MealForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        editMeal={meal}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>식단 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 식단 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMeal.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
