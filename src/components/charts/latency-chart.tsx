'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { day: string; avgMs: number | null };

function label(day: string) {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

export function LatencyChart({ data }: { data: Point[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#cfd9cd" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={label}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#13201999', fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#13201999', fontSize: 11 }}
            width={44}
          />
          <Tooltip
            labelFormatter={(value) => `Ngày ${label(String(value))}`}
            formatter={(value) => [`${value} ms`, 'Độ trễ TB']}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #cfd9cd',
              background: '#fbfcf8',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="avgMs"
            stroke="#2f6b4f"
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
