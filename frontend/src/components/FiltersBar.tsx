import React from 'react';
import { Calendar, Clock, RefreshCw, Zap } from 'lucide-react';

interface FiltersBarProps {
  startDate: string;
  endDate: string;
  decisionTime: string;
  loading: boolean;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onDecisionTimeChange: (val: string) => void;
  onApply: () => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  startDate,
  endDate,
  decisionTime,
  loading,
  onStartDateChange,
  onEndDateChange,
  onDecisionTimeChange,
  onApply,
}) => {
  const setPreset = (start: string, end: string) => {
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-card p-4 space-y-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Preset Range Shortcuts */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Presets:</span>
          </span>
          <button
            onClick={() => setPreset('2026-01-01', '2026-01-07')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              startDate === '2026-01-01' && endDate === '2026-01-07'
                ? 'bg-brand-cyan text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Jan 1 - 7 (Week 1)
          </button>
          <button
            onClick={() => setPreset('2026-01-08', '2026-01-14')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              startDate === '2026-01-08' && endDate === '2026-01-14'
                ? 'bg-brand-cyan text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Jan 8 - 14 (Week 2)
          </button>
          <button
            onClick={() => setPreset('2026-01-01', '2026-01-31')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              startDate === '2026-01-01' && endDate === '2026-01-31'
                ? 'bg-brand-cyan text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Full Jan 2026 (Month)
          </button>
        </div>

        {/* Refresh Action */}
        <button
          onClick={onApply}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-500/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Evaluating...' : 'Apply Filters'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80">
        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Delivery Start Date</span>
          </label>
          <input
            type="date"
            value={startDate}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-cyan"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Delivery End Date</span>
          </label>
          <input
            type="date"
            value={endDate}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-cyan"
          />
        </div>

        {/* Decision Cutoff */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Day-Ahead Decision Cutoff</span>
          </label>
          <select
            value={decisionTime}
            onChange={(e) => onDecisionTimeChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-cyan cursor-pointer"
          >
            <option value="11:00">11:00 UTC D-1 (EPEX Auction Gate)</option>
            <option value="12:00">12:00 UTC D-1 (Nord Pool Gate)</option>
            <option value="17:00">17:00 UTC D-1 (Evening Position Lock)</option>
            <option value="">Latest Available Prior to Delivery</option>
          </select>
        </div>
      </div>
    </div>
  );
};
