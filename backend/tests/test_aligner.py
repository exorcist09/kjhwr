import pytest
from app.services.aligner import align_forecasts_and_actuals, filter_wind_actuals
from app.services.forecast_selector import ForecastRecord

def test_filter_wind_actuals_ignores_other_fuels():
    raw_fuelhh = [
        {"fuelType": "BIOMASS", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 1500},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 12000},
        {"fuelType": "NUCLEAR", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 4000},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:30:00Z", "publishTime": "2026-01-01T01:00:00Z", "generation": 12500},
    ]
    actuals = filter_wind_actuals(raw_fuelhh)
    assert len(actuals) == 2
    assert actuals["2026-01-01T00:00:00Z"].generation == 12000
    assert actuals["2026-01-01T00:30:00Z"].generation == 12500

def test_align_forecasts_and_actuals_matches_intervals():
    forecasts = [
        ForecastRecord(startTime="2026-01-01T00:00:00Z", publishTime="2025-12-31T12:00:00Z", generation=11500),
        ForecastRecord(startTime="2026-01-01T00:30:00Z", publishTime="2025-12-31T12:00:00Z", generation=13000),
        ForecastRecord(startTime="2026-01-01T01:00:00Z", publishTime="2025-12-31T12:00:00Z", generation=14000), # Unmatched in actuals
    ]
    raw_fuelhh = [
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 11000},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:30:00Z", "publishTime": "2026-01-01T01:00:00Z", "generation": 13000},
        {"fuelType": "WIND", "startTime": "2026-01-01T01:30:00Z", "publishTime": "2026-01-01T02:00:00Z", "generation": 15000}, # Unmatched in forecasts
    ]
    actuals_map = filter_wind_actuals(raw_fuelhh)
    
    alignment = align_forecasts_and_actuals(forecasts, actuals_map)
    
    assert len(alignment.matched_intervals) == 2
    assert alignment.unmatched_forecasts_count == 1
    assert alignment.unmatched_actuals_count == 1
    
    first = alignment.matched_intervals[0]
    assert first.startTime == "2026-01-01T00:00:00Z"
    assert first.forecast == 11500
    assert first.actual == 11000
    assert first.error == 500  # forecast - actual
    assert first.absError == 500
    assert pytest.approx(first.pctError, rel=1e-3) == 4.545 # 500 / 11000 * 100
