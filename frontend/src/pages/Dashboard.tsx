import React, { useState, useEffect, useCallback } from 'react';
import { AccuracyResponse } from '../types';
import { fetchAccuracyData } from '../services/api';
import { FiltersBar } from '../components/FiltersBar';
import { MetricCard } from '../components/MetricCard';
import { WindTimeSeriesChart } from '../components/WindTimeSeriesChart';
import { ErrorDistributionChart } from '../components/ErrorDistributionChart';
import { IntervalTable } from '../components/IntervalTable';
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews';

interface DashboardProps {
  initialState?: {
    loading?: boolean;
    data?: AccuracyResponse | null;
    error?: string | null;
  };
  onRetry?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ initialState, onRetry }) => {
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-07');
  const [decisionTime, setDecisionTime] = useState<string>('12:00');

  const [loading, setLoading] = useState<boolean>(initialState?.loading ?? false);
  const [data, setData] = useState<AccuracyResponse | null>(initialState?.data ?? null);
  const [error, setError] = useState<string | null>(initialState?.error ?? null);

  const loadData = useCallback(async () => {
    if (initialState) return; // Controlled for testing
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAccuracyData(startDate, endDate, decisionTime);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown data error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, decisionTime, initialState]);

  useEffect(() => {
    if (!initialState) {
      loadData();
    }
  }, [loadData, initialState]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      loadData();
    }
  };

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <FiltersBar
        startDate={startDate}
        endDate={endDate}
        decisionTime={decisionTime}
        loading={loading}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onDecisionTimeChange={setDecisionTime}
        onApply={loadData}
      />

      {/* Main Content Area based on states */}
      {loading && <LoadingState />}

      {error && !loading && (
        <ErrorState message={error} onRetry={handleRetry} />
      )}

      {!loading && !error && data && data.intervals.length === 0 && (
        <EmptyState />
      )}

      {!loading && !error && data && data.intervals.length > 0 && (
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Mean Absolute Error"
              code="MAE"
              value={metrics?.mae ?? null}
              unit="MW"
              definition={metrics?.definitions?.MAE || 'Mean of absolute forecast error magnitudes.'}
              limitation={metrics?.limitations?.MAE}
              sampleCount={metrics?.total_samples}
              highlightColor="cyan"
            />
            <MetricCard
              title="Root Mean Squared Error"
              code="RMSE"
              value={metrics?.rmse ?? null}
              unit="MW"
              definition={metrics?.definitions?.RMSE || 'Square root of mean squared errors; penalizes large ramp misses.'}
              limitation={metrics?.limitations?.RMSE}
              sampleCount={metrics?.total_samples}
              highlightColor="sky"
            />
            <MetricCard
              title="Mean Bias Error"
              code="MBE"
              value={metrics?.mbe ?? null}
              unit="MW"
              definition={metrics?.definitions?.MBE || 'Mean of (forecast - actual). Positive = over-forecast, Negative = under-forecast.'}
              limitation={metrics?.limitations?.MBE}
              sampleCount={metrics?.total_samples}
              highlightColor={metrics?.mbe !== null && metrics?.mbe !== undefined && metrics.mbe >= 0 ? 'amber' : 'rose'}
            />
            <MetricCard
              title="Mean Abs Pct Error"
              code="MAPE"
              value={metrics?.mape ?? null}
              unit="%"
              definition={metrics?.definitions?.MAPE || 'Mean absolute percentage error relative to actual generation.'}
              limitation={metrics?.limitations?.MAPE}
              sampleCount={metrics?.mape_valid_samples}
              excludedCount={metrics?.mape_excluded_samples}
              highlightColor="emerald"
            />
          </div>

          {/* Time Series Visualization */}
          <WindTimeSeriesChart data={data.intervals} />

          {/* Distribution and Ledger Grid */}
          <div className="grid grid-cols-1 gap-6">
            <ErrorDistributionChart data={data.intervals} />
            <IntervalTable intervals={data.intervals} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
