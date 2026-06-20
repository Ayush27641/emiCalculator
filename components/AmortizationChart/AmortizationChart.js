'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          fontSize: '13px',
        }}
      >
        <p style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
          Month {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontWeight: 500, marginBottom: 2 }}>
            {entry.name}: ₹{entry.value.toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AmortizationChart({ schedule }) {
  const chartData = schedule.map((row) => ({
    month: row.month,
    Principal: row.principalPaid,
    Interest: row.interestPaid,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
        barCategoryGap="15%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-secondary)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-primary)' }}
          label={{
            value: 'Month',
            position: 'insideBottomRight',
            offset: -5,
            style: { fontSize: 11, fill: 'var(--text-tertiary)' },
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-primary)' }}
          tickFormatter={(value) => {
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
            return `₹${value}`;
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-tertiary)' }} />
        <Legend
          wrapperStyle={{ fontSize: 12, fontWeight: 500 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar
          dataKey="Principal"
          stackId="a"
          fill="#4f6ef7"
          radius={[0, 0, 0, 0]}
          name="Principal"
        />
        <Bar
          dataKey="Interest"
          stackId="a"
          fill="#f59e0b"
          radius={[4, 4, 0, 0]}
          name="Interest"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
