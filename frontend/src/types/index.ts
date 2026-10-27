export interface AlignedInterval {
  startTime: string;
  forecastPublishTime: string;
  forecast: number;
  actual: number;
  error: number;
  absError: number;
  pctError: number | null;
}

export interface MetricResults {
  mae: number | null;
  rmse: number | null;
  mbe: number | null;
  mape: number | null;
  total_samples: number;
  mape_valid_samples: number;
  mape_excluded_samples: number;
  definitions: Record<string, string>;
  limitations: Record<string, string>;
}

export interface AccuracyResponse {
  start_date: string;
  end_date: string;
  decision_time: string | null;
  metrics: MetricResults;
  intervals: AlignedInterval[];
  unmatched_forecasts_count: number;
  unmatched_actuals_count: number;
}
