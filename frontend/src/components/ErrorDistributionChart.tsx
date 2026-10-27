import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { AlignedInterval } from '../types';

interface ErrorDistributionProps {
  data: AlignedInterval[];
}

export const ErrorDistributionChart: React.FC<ErrorDistributionProps> = ({ data }) => {
  if (!data.length) return null;

  // Bucket errors into 500 MW bins (e.g. -2000 to -1500, -1500 to -1000, etc.)
  const binSize = 500;
  const buckets: Record<string, { label: string; count: number; binCenter: number }> = {};

  data.forEach((d) => {
    const binIndex = Math.floor(d.error / binSize);
    const low = binIndex * binSize;
    const high = low + binSize;
    const key = `${low}_${high}`;
    if (!buckets[key]) {
      buckets[key] = {
        label: `${low >= 0 ? '+' : ''}${low} to ${high >= 0 ? '+' : ''}${high}`,
        count: 0,
        binCenter: low + binSize / 2
      };
    }
    buckets[key].count += 1;
  });

  const chartData = Object.values(buckets).sort((a, b) => a.binCenter - b.binCenter);

  return (
    <div className="rounded-xl border border-slate-800 bg-card p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Forecast Error Distribution (MW)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Frequency distribution of error deltas (Forecast − Actual in 500 MW intervals)
          </p>
        </div>
      </div>

      <div className="h-[240px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Interval Count', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11, dx: -2 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl text-xs font-mono">
                      <div className="text-slate-300 font-bold">{item.label} MW</div>
                      <div className="text-brand-cyan mt-1">Count: {item.count} intervals</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" name="Frequency" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => {
                const isOverForecast = entry.binCenter >= 0;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isOverForecast ? '#F59E0B' : '#38BDF8'}
                    opacity={0.8}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
