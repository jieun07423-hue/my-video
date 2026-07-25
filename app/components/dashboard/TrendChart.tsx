'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartProps {
  title: string;
  data: { date: string; value: number; label: string }[];
  dataKey?: string;
  color?: string;
  format?: 'number' | 'currency';
  height?: number;
}

function formatValue(val: number, fmt: 'number' | 'currency'): string {
  if (fmt === 'currency') {
    return `₩${new Intl.NumberFormat('ko-KR').format(val)}`;
  }
  return new Intl.NumberFormat('ko-KR').format(val);
}

export default function TrendChart({
  title,
  data,
  dataKey = 'value',
  color = '#6366f1',
  format = 'number',
  height = 250,
}: TrendChartProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatValue(v, format)}
          />
          <Tooltip
            formatter={((value: any, _name: any) => [formatValue(value, format), title]) as any}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            formatter={() => '추세선'}
            wrapperStyle={{ fontSize: 12, color: '#6b7280' }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} opacity={0.7} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}