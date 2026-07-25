'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface IndustryChartProps {
  data: { name: string; count: number; percentage: number }[];
}

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
];

export default function IndustryChart({ data }: IndustryChartProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">업종 분포 (Top 10)</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">업종 데이터가 없습니다.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#374151' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((count: any, _name: any, props: any) => [
                `${count}개 (${props.payload.percentage}%)`,
                '개수',
              ]) as any}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}