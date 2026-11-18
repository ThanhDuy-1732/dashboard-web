'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { day: string; count: number };

function label(day: string) {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

export function ClickChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="clicks-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f6b4f" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2f6b4f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#cfd9cd" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={label}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#13201999', fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#13201999', fontSize: 11 }}
            width={40}
          />
          <Tooltip
            labelFormatter={(value) => `Ngày ${label(String(value))}`}
            formatter={(value) => [`${value} lượt`, 'Lượt bấm']}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #cfd9cd',
              background: '#fbfcf8',
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2f6b4f"
            strokeWidth={2}
            fill="url(#clicks-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
