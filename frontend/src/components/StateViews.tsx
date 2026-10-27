import React from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

export const LoadingState: React.FC = () => {
  return (
    <div data-testid="loading-state" className="flex flex-col items-center justify-center p-16 space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700/50"></div>
        <div className="absolute inset-0 rounded-full border-4 border-brand-cyan border-t-transparent animate-spin"></div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-200">Retrieving Elexon Generation Data...</p>
        <p className="text-xs text-slate-400 mt-1">Aligning 30-min settlement intervals & computing accuracy metrics</p>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6 my-6">
      <div className="flex items-start space-x-4">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400 mt-0.5">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-200">Data Retrieval Error</h3>
          <p className="text-sm text-red-300/80 mt-1 font-mono">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC = () => {
  return (
    <div data-testid="empty-state" className="rounded-xl border border-slate-800 bg-card/60 p-12 text-center my-6">
      <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-400 mb-4">
        <Database className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-200">No intervals match your filter</h3>
      <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
        No matched delivery intervals found for the selected delivery dates and decision cutoff. Try extending the date range or choosing a later cutoff time.
      </p>
    </div>
  );
};
