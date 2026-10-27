from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services.forecast_selector import ForecastRecord, parse_utc, format_utc

class ActualRecord(BaseModel):
    startTime: str = Field(..., description="Delivery interval start time (ISO 8601 UTC)")
    publishTime: Optional[str] = Field(None, description="Actuals publication time (ISO 8601 UTC)")
    generation: float = Field(..., description="Actual wind generation in MW")
    fuelType: str = Field("WIND", description="Fuel type")

class AlignedInterval(BaseModel):
    startTime: str = Field(..., description="Delivery interval start time (ISO 8601 UTC)")
    forecastPublishTime: str = Field(..., description="Publication time of selected forecast")
    forecast: float = Field(..., description="Forecasted generation in MW")
    actual: float = Field(..., description="Actual generation in MW")
    error: float = Field(..., description="Forecast minus actual in MW")
    absError: float = Field(..., description="Absolute error in MW")
    pctError: Optional[float] = Field(None, description="Percentage error (%) if actual > 0")

class AlignmentResult(BaseModel):
    matched_intervals: List[AlignedInterval] = Field(default_factory=list)
    unmatched_forecasts_count: int = 0
    unmatched_actuals_count: int = 0

def filter_wind_actuals(raw_fuelhh_records: List[Dict[str, Any]]) -> Dict[str, ActualRecord]:
    """
    Filters FUELHH records to fuelType == 'WIND', deduplicates by startTime (keeping latest publishTime),
    and standardizes ISO timestamps.
    Returns map of startTime -> ActualRecord.
    """
    wind_map: Dict[str, Dict[str, Any]] = {}
    
    for r in raw_fuelhh_records:
        fuel = str(r.get("fuelType", "")).upper()
        if fuel != "WIND":
            continue

        st_raw = r.get("startTime")
        gen_raw = r.get("generation")
        pt_raw = r.get("publishTime")

        if st_raw is None or gen_raw is None:
            continue

        try:
            st_dt = parse_utc(str(st_raw))
            st_key = format_utc(st_dt)
            gen = float(gen_raw)
            pt_dt = parse_utc(str(pt_raw)) if pt_raw else None
        except (ValueError, TypeError):
            continue

        # If duplicate startTime, prefer the record with later publishTime
        if st_key in wind_map:
            existing_pt = wind_map[st_key]["pt_dt"]
            if pt_dt and existing_pt and pt_dt > existing_pt:
                wind_map[st_key] = {"record": r, "gen": gen, "pt_dt": pt_dt}
        else:
            wind_map[st_key] = {"record": r, "gen": gen, "pt_dt": pt_dt}

    results: Dict[str, ActualRecord] = {}
    for st_key, entry in wind_map.items():
        results[st_key] = ActualRecord(
            startTime=st_key,
            publishTime=format_utc(entry["pt_dt"]) if entry["pt_dt"] else None,
            generation=entry["gen"],
            fuelType="WIND"
        )
    return results

def align_forecasts_and_actuals(
    forecasts: List[ForecastRecord], 
    actuals_map: Dict[str, ActualRecord]
) -> AlignmentResult:
    """
    Performs inner join on 30-minute delivery interval startTime.
    Calculates interval-level error values and counts missing/unmatched intervals.
    """
    matched: List[AlignedInterval] = []
    forecast_keys = set()
    
    for fc in forecasts:
        forecast_keys.add(fc.startTime)
        if fc.startTime in actuals_map:
            act = actuals_map[fc.startTime]
            diff = fc.generation - act.generation
            abs_err = abs(diff)
            pct_err = (abs_err / act.generation * 100.0) if act.generation > 0 else None

            matched.append(AlignedInterval(
                startTime=fc.startTime,
                forecastPublishTime=fc.publishTime,
                forecast=round(fc.generation, 2),
                actual=round(act.generation, 2),
                error=round(diff, 2),
                absError=round(abs_err, 2),
                pctError=round(pct_err, 3) if pct_err is not None else None
            ))

    # Sort chronologically by startTime
    matched.sort(key=lambda x: x.startTime)

    actual_keys = set(actuals_map.keys())
    unmatched_forecasts = len(forecast_keys - actual_keys)
    unmatched_actuals = len(actual_keys - forecast_keys)

    return AlignmentResult(
        matched_intervals=matched,
        unmatched_forecasts_count=unmatched_forecasts,
        unmatched_actuals_count=unmatched_actuals
    )
