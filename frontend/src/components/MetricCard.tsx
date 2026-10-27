import React, { useState } from 'react';
import { Info, HelpCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  code: 'MAE' | 'RMSE' | 'MBE' | 'MAPE';
  value: number | null;
  unit: string;
  definition: string;
  limitation?: string;
  sampleCount?: number;
  excludedCount?: number;
  highlightColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'sky';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  code,
  value,
  unit,
  definition,
  limitation,
  sampleCount,
  excludedCount,
  highlightColor = 'cyan'
}) => {
  const [showInfo, setShowInfo] = useState(false);

  const formattedValue = value !== null && value !== undefined 
    ? (code === 'MAPE' ? `${value.toFixed(1)}%` : value.toLocaleString('en-GB', { maximumFractionDigits: 1 }))
    : '—';

  const colorStyles = {
    cyan: 'border-brand-cyan/20 text-brand-cyan bg-brand-cyan/10',
    emerald: 'border-brand-emerald/20 text-brand-emerald bg-brand-emerald/10',
    amber: 'border-brand-amber/20 text-brand-amber bg-brand-amber/10',
    rose: 'border-brand-rose/20 text-brand-rose bg-brand-rose/10',
    sky: 'border-brand-sky/20 text-brand-sky bg-brand-sky/10',
  }[highlightColor];

  return (
    <div className="relative rounded-xl border border-slate-800 bg-card p-5 shadow-lg transition-all duration-200 hover:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${colorStyles}`}>
            {code}
          </span>
          <h4 className="text-sm font-medium text-slate-300">{title}</h4>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          aria-label={`Show definition of ${code}`}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-800 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-baseline space-x-2">
        <span className="text-2xl font-mono font-bold tracking-tight text-white">
          {formattedValue}
        </span>
        {value !== null && code !== 'MAPE' && (
          <span className="text-xs text-slate-400 font-mono">{unit}</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{sampleCount !== undefined ? `${sampleCount} intervals` : ''}</span>
        {excludedCount !== undefined && excludedCount > 0 && (
          <span className="text-amber-400/90 font-mono text-[11px]">
            ({excludedCount} zero-actuals excluded)
          </span>
        )}
      </div>

      {showInfo && (
        <div className="absolute inset-x-0 bottom-full mb-2 z-30 p-4 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl text-xs space-y-2">
          <div className="flex items-start justify-between">
            <span className="font-semibold text-slate-200 flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-brand-cyan" />
              <span>{title} ({code})</span>
            </span>
            <button 
              onClick={() => setShowInfo(false)} 
              className="text-slate-400 hover:text-white cursor-pointer px-1 text-sm leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed">{definition}</p>
          {limitation && (
            <div className="pt-2 border-t border-slate-800 text-amber-300/90">
              <span className="font-semibold">Caveat / Limit: </span>
              {limitation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
