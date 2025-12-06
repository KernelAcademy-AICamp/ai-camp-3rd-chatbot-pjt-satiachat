import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useWeeklyProgress } from '@/hooks/useProgress';

interface WeightChartProps {
  targetWeight?: number;
}

export function WeightChart({ targetWeight }: WeightChartProps) {
  const { data: logs, isLoading, error } = useWeeklyProgress();

  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    return logs.map(log => ({
      date: new Date(log.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      weight: log.weight_kg,
      bodyFat: log.body_fat_percent,
      target: targetWeight,
    }));
  }, [logs, targetWeight]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>차트 데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">아직 기록이 없습니다</p>
          <p className="text-sm">체중을 기록하면 여기에 그래프가 표시됩니다</p>
        </div>
      </div>
    );
  }

  // Calculate Y-axis domain with some padding
  const weights = chartData.map(d => d.weight);
  const minWeight = Math.floor(Math.min(...weights, targetWeight || Infinity) - 2);
  const maxWeight = Math.ceil(Math.max(...weights, targetWeight || 0) + 2);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          domain={[minWeight, maxWeight]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          tickFormatter={(value) => `${value}kg`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'weight') return [`${value} kg`, '체중'];
            if (name === 'target') return [`${value} kg`, '목표'];
            return [value, name];
          }}
        />
        {targetWeight && (
          <Area
            type="monotone"
            dataKey="target"
            stroke="hsl(var(--success))"
            strokeDasharray="5 5"
            fill="none"
            strokeWidth={2}
          />
        )}
        <Area
          type="monotone"
          dataKey="weight"
          stroke="hsl(var(--primary))"
          fill="url(#weightGradient)"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
