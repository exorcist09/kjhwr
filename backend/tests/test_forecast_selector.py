import pytest
from datetime import datetime, timezone
from app.services.forecast_selector import select_latest_forecasts, ForecastRecord

def test_select_latest_forecast_before_cutoff():
    records = [
        # Target delivery interval: 2026-01-02T10:00:00Z
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T08:00:00Z", "generation": 1000},
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T11:00:00Z", "generation": 1200}, # latest <= 12:00
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T15:00:00Z", "generation": 1500}, # after 12:00 cutoff
        
        # Target delivery interval: 2026-01-02T10:30:00Z
        {"startTime": "2026-01-02T10:30:00Z", "publishTime": "2026-01-01T08:00:00Z", "generation": 1050},
        {"startTime": "2026-01-02T10:30:00Z", "publishTime": "2026-01-01T11:00:00Z", "generation": 1250},
        {"startTime": "2026-01-02T10:30:00Z", "publishTime": "2026-01-01T14:00:00Z", "generation": 1450},
    ]
    
    # Cutoff: 2026-01-01T12:00:00Z
    selected = select_latest_forecasts(records, decision_cutoff="2026-01-01T12:00:00Z")
    
    assert len(selected) == 2
    # For 10:00, latest <= 12:00 is publishTime 11:00 with gen 1200
    f1 = next(f for f in selected if f.startTime == "2026-01-02T10:00:00Z")
    assert f1.generation == 1200
    assert f1.publishTime == "2026-01-01T11:00:00Z"
    
    # For 10:30, latest <= 12:00 is publishTime 11:00 with gen 1250
    f2 = next(f for f in selected if f.startTime == "2026-01-02T10:30:00Z")
    assert f2.generation == 1250

def test_deduplicate_exact_records():
    records = [
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T11:00:00Z", "generation": 1200},
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T11:00:00Z", "generation": 1200}, # duplicate
    ]
    selected = select_latest_forecasts(records, decision_cutoff="2026-01-01T12:00:00Z")
    assert len(selected) == 1
    assert selected[0].generation == 1200

def test_cutoff_excludes_all_if_all_published_after():
    records = [
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T15:00:00Z", "generation": 1500},
    ]
    selected = select_latest_forecasts(records, decision_cutoff="2026-01-01T12:00:00Z")
    assert len(selected) == 0

def test_relative_day_ahead_cutoff():
    # If decision_cutoff is a time-of-day like '12:00' or '11:00',
    # cutoff for delivery on 2026-01-03 is 2026-01-02T12:00:00Z
    records = [
        {"startTime": "2026-01-03T10:00:00Z", "publishTime": "2026-01-02T10:00:00Z", "generation": 2000},
        {"startTime": "2026-01-03T10:00:00Z", "publishTime": "2026-01-02T14:00:00Z", "generation": 2500}, # after 12:00 on D-1
    ]
    selected = select_latest_forecasts(records, decision_cutoff="12:00")
    assert len(selected) == 1
    assert selected[0].generation == 2000
    assert selected[0].publishTime == "2026-01-02T10:00:00Z"
