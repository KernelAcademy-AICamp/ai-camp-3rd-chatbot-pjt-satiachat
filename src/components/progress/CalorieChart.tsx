import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useWeeklyCalories } from '@/hooks/useProgress';

interface CalorieChartProps {
  targetCalories?: number;
}

export function CalorieChart({ targetCalories: propTargetCalories }: CalorieChartProps) {
  const { data: calorieData, isLoading, error } = useWeeklyCalories();

  const chartData = useMemo(() => {
    if (!calorieData || calorieData.length === 0) return [];

    return calorieData.map((day) => ({
      date: new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      calories: day.totalCalories,
      target: propTargetCalories || day.targetCalories,
      mealCount: day.mealCount,
      // 목표 대비 비율 계산
      ratio: day.totalCalories / (propTargetCalories || day.targetCalories),
    }));
  }, [calorieData, propTargetCalories]);

  // 바 색상 결정 함수
  const getBarColor = (ratio: number) => {
    if (ratio === 0) return 'hsl(var(--muted))'; // 기록 없음
    if (ratio <= 0.85) return 'hsl(var(--success))'; // 목표 미달 (초록)
    if (ratio <= 1.1) return 'hsl(var(--primary))'; // 적정 (teal)
    return 'hsl(var(--warning))'; // 초과 (주황)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>차트 데이터를 불러올 수 없습니다</p>
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

  const targetLine = propTargetCalories || calorieData?.[0]?.targetCalories || 2000;
  const maxCalories = Math.max(...chartData.map((d) => d.calories), targetLine);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          domain={[0, Math.ceil(maxCalories * 1.1)]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          tickFormatter={(value) => `${value}`}
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
          labelFormatter={(label) => `${label}`}
        />
        <ReferenceLine
          y={targetLine}
          stroke="hsl(var(--success))"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: `목표: ${targetLine}`,
            position: 'right',
            fill: 'hsl(var(--success))',
            fontSize: 11,
          }}
        />
        <Bar dataKey="calories" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.ratio)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
