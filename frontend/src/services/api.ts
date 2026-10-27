import { AccuracyResponse } from '../types';

const API_BASE = '/api';

export async function fetchAccuracyData(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-07',
  decisionTime: string = '12:00'
): Promise<AccuracyResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (decisionTime && decisionTime.trim() !== '') {
    params.append('decision_time', decisionTime.trim());
  }

  const response = await fetch(`${API_BASE}/accuracy?${params.toString()}`);
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}
