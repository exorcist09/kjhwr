from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from app.services.elexon_client import ElexonClient
from app.services.aligner import filter_wind_actuals, align_forecasts_and_actuals, ActualRecord, AlignedInterval
from app.services.forecast_selector import select_latest_forecasts, ForecastRecord, parse_utc
from app.services.metrics import calculate_accuracy_metrics, MetricResults

router = APIRouter(prefix="/api")
elexon_client = ElexonClient()

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ActualsResponse(BaseModel):
    start_date: str
    end_date: str
    total_records: int
    actuals: List[ActualRecord]

class ForecastsResponse(BaseModel):
    start_date: str
    end_date: str
    decision_time: Optional[str]
    total_records: int
    forecasts: List[ForecastRecord]

class AccuracyResponse(BaseModel):
    start_date: str
    end_date: str
    decision_time: Optional[str]
    metrics: MetricResults
    intervals: List[AlignedInterval]
    unmatched_forecasts_count: int
    unmatched_actuals_count: int

def is_within_delivery_dates(start_time_iso: str, start_date: str, end_date: str) -> bool:
    try:
        dt = parse_utc(start_time_iso)
        dt_date = dt.date().strftime("%Y-%m-%d")
        return start_date <= dt_date <= end_date
    except Exception:
        return True

@router.get("/health", response_model=HealthResponse)
async def get_health():
    return HealthResponse()

@router.get("/actuals", response_model=ActualsResponse)
async def get_actuals(
    start_date: str = Query("2026-01-01", description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="Delivery end date YYYY-MM-DD")
):
    raw_data = await elexon_client.get_fuelhh_actuals(start_date, end_date)
    actuals_map = filter_wind_actuals(raw_data)
    
    # Filter to requested delivery date bounds and sort
    filtered = [
        rec for rec in actuals_map.values()
        if is_within_delivery_dates(rec.startTime, start_date, end_date)
    ]
    filtered.sort(key=lambda x: x.startTime)
    
    return ActualsResponse(
        start_date=start_date,
        end_date=end_date,
        total_records=len(filtered),
        actuals=filtered
    )

@router.get("/forecasts", response_model=ForecastsResponse)
async def get_forecasts(
    start_date: str = Query("2026-01-01", description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="Delivery end date YYYY-MM-DD"),
    decision_time: Optional[str] = Query(None, description="Decision cutoff (e.g. '12:00' for day-ahead auction or ISO timestamp)")
):
    raw_data = await elexon_client.get_windfor_forecasts(start_date, end_date)
    selected = select_latest_forecasts(raw_data, decision_cutoff=decision_time)
    
    # Filter to delivery date bounds
    filtered = [
        fc for fc in selected
        if is_within_delivery_dates(fc.startTime, start_date, end_date)
    ]
    filtered.sort(key=lambda x: x.startTime)

    return ForecastsResponse(
        start_date=start_date,
        end_date=end_date,
        decision_time=decision_time,
        total_records=len(filtered),
        forecasts=filtered
    )

@router.get("/accuracy", response_model=AccuracyResponse)
async def get_accuracy(
    start_date: str = Query("2026-01-01", description="Delivery start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="Delivery end date YYYY-MM-DD"),
    decision_time: Optional[str] = Query(None, description="Decision cutoff (e.g. '12:00' or ISO timestamp)")
):
    # Fetch raw streams for actuals and forecasts concurrently
    raw_fuelhh = await elexon_client.get_fuelhh_actuals(start_date, end_date)
    raw_windfor = await elexon_client.get_windfor_forecasts(start_date, end_date)
    
    # Process actuals and forecasts
    actuals_map = filter_wind_actuals(raw_fuelhh)
    selected_forecasts = select_latest_forecasts(raw_windfor, decision_cutoff=decision_time)
    
    # Filter both to requested date range
    filtered_forecasts = [
        fc for fc in selected_forecasts
        if is_within_delivery_dates(fc.startTime, start_date, end_date)
    ]
    filtered_actuals = {
        k: v for k, v in actuals_map.items()
        if is_within_delivery_dates(v.startTime, start_date, end_date)
    }

    # Align matching 30-min intervals
    alignment = align_forecasts_and_actuals(filtered_forecasts, filtered_actuals)
    
    # Calculate metrics
    forecast_values = [item.forecast for item in alignment.matched_intervals]
    actual_values = [item.actual for item in alignment.matched_intervals]
    metrics = calculate_accuracy_metrics(forecast_values, actual_values)

    return AccuracyResponse(
        start_date=start_date,
        end_date=end_date,
        decision_time=decision_time,
        metrics=metrics,
        intervals=alignment.matched_intervals,
        unmatched_forecasts_count=alignment.unmatched_forecasts_count,
        unmatched_actuals_count=alignment.unmatched_actuals_count
    )
