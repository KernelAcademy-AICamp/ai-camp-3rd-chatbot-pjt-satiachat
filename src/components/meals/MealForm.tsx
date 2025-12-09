import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, UtensilsCrossed, Flame, Beef, Wheat, Droplets } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useCreateMeal, useUpdateMeal, useDeleteMeal } from '@/hooks/useMeals';
import { getToday } from '@/lib/supabase';
import type { MealType, MealWithItems, Food } from '@/types/domain';
import { FoodSearch } from './FoodSearch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMeal?: MealWithItems;
  defaultDate?: string;
  defaultMealType?: MealType;
  existingMealTypes?: MealType[]; // 이미 등록된 식사 유형들
}

interface FoodItem {
  name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  quantity?: string;
}

const mealTypeConfig: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: '아침', emoji: '🌅' },
  lunch: { label: '점심', emoji: '☀️' },
  dinner: { label: '저녁', emoji: '🌙' },
  snack: { label: '간식', emoji: '🍪' },
};

export function MealForm({
  open,
  onOpenChange,
  editMeal,
  defaultDate,
  defaultMealType,
  existingMealTypes = [],
}: MealFormProps) {
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const deleteMeal = useDeleteMeal();
  const { toast } = useToast();

  const [date, setDate] = useState(getToday());
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [items, setItems] = useState<FoodItem[]>([]);

  // 사용 가능한 (아직 등록되지 않은) meal type 찾기
  const getAvailableMealType = (): MealType => {
    const allTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    // defaultMealType이 사용 가능하면 그것 사용
    if (defaultMealType && !existingMealTypes.includes(defaultMealType)) {
      return defaultMealType;
    }
    // 아니면 첫 번째 사용 가능한 것
    const available = allTypes.find(t => !existingMealTypes.includes(t));
    return available || 'breakfast';
  };

  // 폼 초기화는 open 상태가 true로 변경될 때만 실행
  // editMeal?.id가 변경되거나 existingMealTypes가 변경되어도 초기화하지 않음
  useEffect(() => {
    if (open) {
      if (editMeal) {
        setDate(editMeal.date);
        setMealType(editMeal.meal_type);
        setItems(
          editMeal.meal_items && editMeal.meal_items.length > 0
            ? editMeal.meal_items.map(item => ({
                name: item.name,
                calories: item.calories,
                protein_g: item.protein_g ?? undefined,
                carbs_g: item.carbs_g ?? undefined,
                fat_g: item.fat_g ?? undefined,
                quantity: item.quantity ?? undefined,
              }))
            : []
        );
      } else {
        setDate(defaultDate || getToday());
        setMealType(getAvailableMealType());
        setItems([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAddItem = () => {
    setItems([...items, { name: '', calories: 0 }]);
  };

  const handleFoodSelect = (food: Food) => {
    const newItem: FoodItem = {
      name: food.food_name,
      calories: food.calories ? Math.round(food.calories) : 0,
      protein_g: food.protein ?? undefined,
      carbs_g: food.carbs ?? undefined,
      fat_g: food.fat ?? undefined,
      quantity: food.serving_size ?? undefined,
    };
    setItems([...items.filter(item => item.name.trim() !== ''), newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FoodItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(item => item.name.trim() !== '');

    // 새 식단 추가 시에는 최소 1개 필요
    if (!editMeal && validItems.length === 0) {
      toast({
        title: '음식을 추가해주세요',
        description: '최소 1개 이상의 음식을 추가해야 합니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editMeal) {
        // 수정 모드에서 모든 항목을 삭제하면 식단 자체를 삭제
        if (validItems.length === 0) {
          await deleteMeal.mutateAsync(editMeal.id);
          toast({ title: '식단 삭제 완료', description: '식단이 삭제되었습니다.' });
        } else {
          await updateMeal.mutateAsync({
            mealId: editMeal.id,
            items: validItems,
            mealType,
          });
          toast({ title: '식단 수정 완료', description: '식단이 성공적으로 수정되었습니다.' });
        }
      } else {
        await createMeal.mutateAsync({
          date,
          meal_type: mealType,
          items: validItems,
        });
        toast({ title: '식단 저장 완료', description: '식단이 성공적으로 저장되었습니다.' });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '식단 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalProtein = items.reduce((sum, item) => sum + (item.protein_g || 0), 0);
  const totalCarbs = items.reduce((sum, item) => sum + (item.carbs_g || 0), 0);
  const totalFat = items.reduce((sum, item) => sum + (item.fat_g || 0), 0);
  const isLoading = createMeal.isPending || updateMeal.isPending || deleteMeal.isPending;
  const validItemCount = items.filter(i => i.name.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">{mealTypeConfig[mealType].emoji}</span>
              {editMeal ? '식단 수정' : '식단 기록'}
            </DialogTitle>
          </DialogHeader>

          {/* Date & Meal Type Selector */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <Label className="text-xs font-medium mb-1.5 block text-muted-foreground">날짜</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={getToday()}
                disabled={!!editMeal}
              />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block text-muted-foreground">식사</Label>
              <Select
                value={mealType}
                onValueChange={(v) => setMealType(v as MealType)}
                disabled={!!editMeal}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(mealTypeConfig).map(([value, config]) => {
                    const isDisabled = !editMeal && existingMealTypes.includes(value as MealType);
                    return (
                      <SelectItem
                        key={value}
                        value={value}
                        disabled={isDisabled}
                        className={isDisabled ? "opacity-50" : ""}
                      >
                        <span className="flex items-center gap-2">
                          <span>{config.emoji}</span>
                          <span>{config.label}</span>
                          {isDisabled && <span className="text-xs text-muted-foreground ml-1">(등록됨)</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
            {/* Food Search */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                음식 검색
              </Label>
              <FoodSearch
                onSelect={handleFoodSelect}
                placeholder="음식 이름으로 검색..."
              />
            </div>

            {/* Added Foods Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">
                  추가된 음식 {validItemCount > 0 && (
                    <span className="ml-1.5 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {validItemCount}
                    </span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddItem}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  직접 입력
                </Button>
              </div>

              {validItemCount === 0 && items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                      <UtensilsCrossed className="h-6 w-6 text-primary/60" />
                    </div>
                    <p className="font-medium text-muted-foreground text-sm">음식을 검색하여 추가해주세요</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      검색하면 칼로리와 영양정보가 자동으로 입력됩니다
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...items].reverse().map((item, reversedIndex) => {
                    const index = items.length - 1 - reversedIndex;
                    return (
                    <div
                      key={index}
                      className={cn(
                        "group relative rounded-lg border p-3 transition-all duration-200",
                        item.name.trim()
                          ? "bg-card hover:border-primary/30"
                          : "border-dashed bg-muted/20"
                      )}
                    >
                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(index);
                        }}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full text-muted-foreground opacity-60 hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                      {/* Food Name */}
                      <Input
                        placeholder="음식 이름을 입력하세요"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 placeholder:text-muted-foreground/50"
                      />

                      {/* Nutrition Grid */}
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <NutritionInput
                          icon={<Flame className="h-3.5 w-3.5" />}
                          label="칼로리"
                          value={item.calories}
                          unit="kcal"
                          onChange={(v) => handleItemChange(index, 'calories', v)}
                        />
                        <NutritionInput
                          icon={<Beef className="h-3.5 w-3.5" />}
                          label="단백질"
                          value={item.protein_g}
                          unit="g"
                          onChange={(v) => handleItemChange(index, 'protein_g', v)}
                          step={0.1}
                        />
                        <NutritionInput
                          icon={<Wheat className="h-3.5 w-3.5" />}
                          label="탄수화물"
                          value={item.carbs_g}
                          unit="g"
                          onChange={(v) => handleItemChange(index, 'carbs_g', v)}
                          step={0.1}
                        />
                        <NutritionInput
                          icon={<Droplets className="h-3.5 w-3.5" />}
                          label="지방"
                          value={item.fat_g}
                          unit="g"
                          onChange={(v) => handleItemChange(index, 'fat_g', v)}
                          step={0.1}
                        />
                      </div>

                      {/* Serving Size Badge */}
                      {item.quantity && (
                        <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                          <span className="font-medium">기준:</span>
                          <span>{item.quantity}</span>
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              )}
            </div>
          </div>

          {/* Footer with Summary */}
          <div className="border-t bg-muted/30 px-6 py-4 flex-shrink-0">
            {/* Nutrition Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <SummaryBadge
                label="칼로리"
                value={totalCalories}
                unit="kcal"
                primary
              />
              <SummaryBadge label="단백질" value={totalProtein} unit="g" />
              <SummaryBadge label="탄수화물" value={totalCarbs} unit="g" />
              <SummaryBadge label="지방" value={totalFat} unit="g" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isLoading || (!editMeal && validItemCount === 0)}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  editMeal ? '수정하기' : '저장하기'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Nutrition Input Component
function NutritionInput({
  icon,
  label,
  value,
  unit,
  onChange,
  step = 1,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  unit: string;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="relative">
        <Input
          type="number"
          min="0"
          step={step}
          placeholder="0"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 text-sm pr-8"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

// Summary Badge Component
function SummaryBadge({
  label,
  value,
  unit,
  primary = false,
}: {
  label: string;
  value: number;
  unit: string;
  primary?: boolean;
}) {
  return (
    <div className={cn(
      "text-center py-2 px-1 rounded-lg",
      primary ? "bg-primary/10" : "bg-muted/50"
    )}>
      <div className={cn(
        "text-lg font-bold",
        primary ? "text-primary" : "text-foreground"
      )}>
        {Math.round(value).toLocaleString()}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
