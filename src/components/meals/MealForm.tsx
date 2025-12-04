import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateMeal, useUpdateMeal } from '@/hooks/useMeals';
import { getToday } from '@/lib/supabase';
import type { MealType, MealWithItems } from '@/types/domain';

interface MealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMeal?: MealWithItems;
  defaultDate?: string;
  defaultMealType?: MealType;
}

interface FoodItem {
  name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  quantity?: string;
}

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export function MealForm({
  open,
  onOpenChange,
  editMeal,
  defaultDate,
  defaultMealType,
}: MealFormProps) {
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();

  const [date, setDate] = useState(defaultDate || editMeal?.date || getToday());
  const [mealType, setMealType] = useState<MealType>(
    defaultMealType || editMeal?.meal_type || 'breakfast'
  );
  const [items, setItems] = useState<FoodItem[]>(
    editMeal?.meal_items?.map(item => ({
      name: item.name,
      calories: item.calories,
      protein_g: item.protein_g ?? undefined,
      carbs_g: item.carbs_g ?? undefined,
      fat_g: item.fat_g ?? undefined,
      quantity: item.quantity ?? undefined,
    })) || [{ name: '', calories: 0 }]
  );

  const handleAddItem = () => {
    setItems([...items, { name: '', calories: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof FoodItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty items
    const validItems = items.filter(item => item.name.trim() !== '');

    if (validItems.length === 0) {
      return;
    }

    try {
      if (editMeal) {
        await updateMeal.mutateAsync({
          mealId: editMeal.id,
          items: validItems,
          mealType,
        });
      } else {
        await createMeal.mutateAsync({
          date,
          meal_type: mealType,
          items: validItems,
        });
      }

      // Reset form and close
      setItems([{ name: '', calories: 0 }]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save meal:', error);
    }
  };

  const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
  const isLoading = createMeal.isPending || updateMeal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMeal ? '식단 수정' : '식단 기록'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">날짜</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!!editMeal}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mealType">식사 종류</Label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(mealTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>음식 항목</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="음식 이름 (예: 계란 2개)"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="칼로리"
                      value={item.calories || ''}
                      onChange={(e) => handleItemChange(index, 'calories', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground self-center">kcal</span>
                  </div>
                </div>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">총 칼로리</span>
              <span className="font-semibold text-lg">{totalCalories} kcal</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '저장 중...' : editMeal ? '수정' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
