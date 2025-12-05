import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchFoods } from '@/hooks/useFoods';
import type { Food } from '@/types/domain';
import { cn } from '@/lib/utils';

interface FoodSearchProps {
  onSelect: (food: Food) => void;
  placeholder?: string;
  className?: string;
}

export function FoodSearch({ onSelect, placeholder = '음식 검색...', className }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: foods, isLoading } = useSearchFoods(debouncedQuery, debouncedQuery.length >= 1);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (food: Food) => {
    onSelect(food);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && debouncedQuery.length >= 1 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              검색 중...
            </div>
          ) : foods && foods.length > 0 ? (
            <ul className="py-1">
              {foods.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(food)}
                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <div className="font-medium text-sm">{food.food_name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="text-primary font-medium">
                        {food.calories ? Math.round(food.calories) : 0} kcal
                      </span>
                      {food.serving_size && (
                        <span>/ {food.serving_size}</span>
                      )}
                      {food.category && (
                        <span className="text-muted-foreground/70">
                          {food.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {food.protein != null && <span>단백질 {food.protein}g</span>}
                      {food.carbs != null && <span>탄수화물 {food.carbs}g</span>}
                      {food.fat != null && <span>지방 {food.fat}g</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              "{debouncedQuery}"에 대한 검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
