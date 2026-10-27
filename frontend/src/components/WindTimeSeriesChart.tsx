import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { AlignedInterval } from '../types';

interface WindTimeSeriesChartProps {
  data: AlignedInterval[];
}

export const WindTimeSeriesChart: React.FC<WindTimeSeriesChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'both' | 'generation' | 'error'>('both');

  const chartData = data.map((d) => {
    // Format timestamp: "01 Jan 14:30"
    const date = new Date(d.startTime);
    const timeLabel = date.toLocaleTimeString('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const dateLabel = date.toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric'
    });
    
    return {
      rawTime: d.startTime,
      label: `${dateLabel} ${timeLabel}`,
      forecast: d.forecast,
      actual: d.actual,
      error: d.error,
      absError: d.absError,
      pctError: d.pctError,
      publishTime: d.forecastPublishTime
    };
  });

  return (
    <div data-testid="timeseries-chart" className="rounded-xl border border-slate-800 bg-card p-5 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">National Wind Generation: Forecast vs Actual</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Half-hourly delivery intervals (MW) matched by settlement startTime (UTC)
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              viewMode === 'both' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Combined View
          </button>
          <button
            onClick={() => setViewMode('generation')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              viewMode === 'generation' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Generation Curves
          </button>
          <button
            onClick={() => setViewMode('error')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              viewMode === 'error' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Error Delta (MW)
          </button>
        </div>
      </div>

      <div className="h-[380px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={45}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11, dx: -2 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono space-y-1.5 min-w-[220px]">
                      <div className="font-sans font-bold text-slate-200 border-b border-slate-800 pb-1">
                        Delivery: {item.label} UTC
                      </div>
                      <div className="flex justify-between items-center text-brand-emerald">
                        <span>Actual:</span>
                        <span className="font-bold">{item.actual.toLocaleString()} MW</span>
                      </div>
                      <div className="flex justify-between items-center text-brand-sky">
                        <span>Forecast:</span>
                        <span className="font-bold">{item.forecast.toLocaleString()} MW</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
                        <span>Error (F - A):</span>
                        <span className={`font-bold ${item.error >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {item.error >= 0 ? `+${item.error.toLocaleString()}` : item.error.toLocaleString()} MW
                        </span>
                      </div>
                      {item.pctError !== null && (
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Pct Error:</span>
                          <span>{item.pctError.toFixed(1)}%</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 pt-1">
                        Published: {new Date(item.publishTime).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            <ReferenceLine y={0} stroke="#334155" />

            {/* Error delta bars */}
            {(viewMode === 'both' || viewMode === 'error') && (
              <Bar
                dataKey="error"
                name="Error Delta (MW)"
                fill="#F59E0B"
                opacity={0.65}
                maxBarSize={8}
              />
            )}

            {/* Actual generation line/area */}
            {(viewMode === 'both' || viewMode === 'generation') && (
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual Wind (MW)"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#actualGradient)"
                dot={false}
              />
            )}

            {/* Forecast generation line/area */}
            {(viewMode === 'both' || viewMode === 'generation') && (
              <Line
                type="monotone"
                dataKey="forecast"
                name="Latest Forecast (MW)"
                stroke="#38BDF8"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
