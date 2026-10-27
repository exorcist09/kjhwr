import React, { useState } from 'react';
import { Wind, Activity, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';
import Dashboard from './pages/Dashboard';

export const App: React.FC = () => {
  const [showDocumentation, setShowDocumentation] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col text-slate-100">
      {/* Top Operations Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-cyan/20 to-brand-emerald/20 border border-brand-cyan/30 text-brand-cyan shadow-sm shadow-cyan-500/20">
              <Wind className="w-5 h-5 text-brand-cyan" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  UK Wind Forecast Analytics
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  Elexon BMRS Stream
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Day-Ahead Electricity Purchasing Decision Support • January 2026 Delivery
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => setShowDocumentation(!showDocumentation)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-brand-cyan" />
              <span className="hidden md:inline">Data Rules & Methodology</span>
            </button>
            <a
              href="https://bmrs.elexon.co.uk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Elexon Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Methodology & Rules Banner Modal/Panel */}
      {showDocumentation && (
        <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-brand-cyan font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Elexon Data Normalization & Decision Cutoff Rules</span>
              </div>
              <button
                onClick={() => setShowDocumentation(false)}
                className="text-slate-400 hover:text-white cursor-pointer px-2 py-1 text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
              <div className="space-y-1.5 bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/50">
                <h4 className="font-semibold text-white">1. Forecast Selection (WINDFOR)</h4>
                <p className="text-slate-400 leading-relaxed">
                  National wind forecasts are filtered so only forecasts published at or before the decision cutoff (e.g. 11:00 or 12:00 UTC D-1) are considered. For each 30-min settlement interval, the latest available published forecast is chosen.
                </p>
              </div>
              <div className="space-y-1.5 bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/50">
                <h4 className="font-semibold text-white">2. Actual Generation (FUELHH)</h4>
                <p className="text-slate-400 leading-relaxed">
                  Half-hourly actuals are filtered strictly to <code className="text-brand-cyan font-mono">fuelType="WIND"</code> and deduplicated by settlement <code className="text-brand-cyan font-mono">startTime</code>. Timestamps are standardized to UTC ISO-8601.
                </p>
              </div>
              <div className="space-y-1.5 bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/50">
                <h4 className="font-semibold text-white">3. Interval Matching & Metrics</h4>
                <p className="text-slate-400 leading-relaxed">
                  Matched by 30-min settlement intervals. MAE, RMSE, and MBE are calculated over all pairs. MAPE is calculated only for intervals where actual &gt; 0 MW to avoid division by zero or infinite skew during lull periods.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Dashboard />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300">UK Wind Forecast Analytics</span>
            <span>•</span>
            <span>Elexon BMRS National Wind Datasets</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Delivery Resolution: 30-Minute Half Hourly (HH) Intervals
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
