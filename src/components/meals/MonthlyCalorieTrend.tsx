import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import type { MonthlyMealData } from '@/hooks/useMonthlyMeals';

interface MonthlyCalorieTrendProps {
  dailyData: MonthlyMealData[];
  isLoading?: boolean;
}

export function MonthlyCalorieTrend({ dailyData, isLoading }: MonthlyCalorieTrendProps) {
  const chartData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];

    return dailyData.map((day) => ({
      date: parseInt(day.date.split('-')[2], 10), // 일자만 추출
      fullDate: day.date,
      calories: day.totalCalories,
      target: day.targetCalories,
      mealCount: day.mealCount,
    }));
  }, [dailyData]);

  const targetCalories = dailyData?.[0]?.targetCalories || 2000;

  // 최대값 계산 (차트 Y축 범위용)
  const maxCalories = useMemo(() => {
    if (chartData.length === 0) return targetCalories * 1.2;
    const max = Math.max(...chartData.map((d) => d.calories), targetCalories);
    return Math.ceil(max * 1.1);
  }, [chartData, targetCalories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chartData.length === 0 || chartData.every((d) => d.calories === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">아직 기록이 없습니다</p>
          <p className="text-sm">식단을 기록하면 여기에 그래프가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          tickFormatter={(value) => `${value}일`}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, maxCalories]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'calories') return [`${value} kcal`, '섭취 칼로리'];
            return [value, name];
          }}
          labelFormatter={(label) => `${label}일`}
        />
        <ReferenceLine
          y={targetCalories}
          stroke="hsl(var(--success))"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: `목표: ${targetCalories}`,
            position: 'right',
            fill: 'hsl(var(--success))',
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="calories"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          fill="url(#calorieGradient)"
          dot={{ r: 3, fill: 'hsl(var(--primary))' }}
          activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
