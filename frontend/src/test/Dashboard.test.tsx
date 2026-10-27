import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { AccuracyResponse } from '../types';

const mockAccuracyData: AccuracyResponse = {
  start_date: '2026-01-01',
  end_date: '2026-01-07',
  decision_time: '12:00',
  metrics: {
    mae: 1450.5,
    rmse: 1820.2,
    mbe: 320.1,
    mape: 12.4,
    total_samples: 336,
    mape_valid_samples: 336,
    mape_excluded_samples: 0,
    definitions: {
      MAE: 'Mean Absolute Error across intervals',
      RMSE: 'Root Mean Squared Error',
      MBE: 'Mean Bias Error (forecast - actual)',
      MAPE: 'Mean Absolute Percentage Error'
    },
    limitations: {
      MAPE: 'Undefined when actual is zero'
    }
  },
  intervals: [
    {
      startTime: '2026-01-01T00:00:00Z',
      forecastPublishTime: '2025-12-31T11:30:00Z',
      forecast: 15200,
      actual: 14800,
      error: 400,
      absError: 400,
      pctError: 2.7
    }
  ],
  unmatched_forecasts_count: 0,
  unmatched_actuals_count: 0
};

describe('Dashboard Component States', () => {
  it('renders loading state when fetching data', () => {
    render(<Dashboard initialState={{ loading: true, data: null, error: null }} />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('renders error state on API failure and allows retry', () => {
    const onRetry = vi.fn();
    render(
      <Dashboard 
        initialState={{ loading: false, data: null, error: 'Elexon upstream timeout' }} 
        onRetry={onRetry} 
      />
    );
    expect(screen.getByText(/Elexon upstream timeout/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when no records match filter', () => {
    const emptyData: AccuracyResponse = {
      ...mockAccuracyData,
      intervals: [],
      metrics: {
        ...mockAccuracyData.metrics,
        total_samples: 0,
        mae: null,
        rmse: null,
        mbe: null,
        mape: null
      }
    };
    render(<Dashboard initialState={{ loading: false, data: emptyData, error: null }} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No intervals match/i)).toBeInTheDocument();
  });

  it('renders populated state with metrics and chart elements', () => {
    render(<Dashboard initialState={{ loading: false, data: mockAccuracyData, error: null }} />);
    expect(screen.getByText(/1,450.5/i)).toBeInTheDocument(); // MAE
    expect(screen.getByText(/1,820.2/i)).toBeInTheDocument(); // RMSE
    expect(screen.getByText(/320.1/i)).toBeInTheDocument(); // MBE
    expect(screen.getByText(/12.4%/i)).toBeInTheDocument(); // MAPE
    expect(screen.getByTestId('timeseries-chart')).toBeInTheDocument();
  });
});
