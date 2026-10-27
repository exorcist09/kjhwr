from datetime import datetime, time, timedelta, timezone
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
import dateutil.parser

class ForecastRecord(BaseModel):
    startTime: str = Field(..., description="Target delivery interval start time (ISO 8601 UTC)")
    publishTime: str = Field(..., description="Forecast publication time (ISO 8601 UTC)")
    generation: float = Field(..., description="Forecasted wind generation in MW")

def parse_utc(dt_str: str) -> datetime:
    """Parses date string and ensures UTC timezone."""
    dt = dateutil.parser.isoparse(dt_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt

def format_utc(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def resolve_cutoff_for_delivery(delivery_dt: datetime, cutoff_spec: Optional[str]) -> Optional[datetime]:
    """
    Resolves the decision cutoff datetime for a specific delivery timestamp.
    - If None: no global cutoff; forecast must be published on or before delivery interval start (publishTime <= startTime).
    - If time string (e.g. '12:00' or '11:00'): interprets as Day-Ahead (D-1) auction cutoff at that hour.
    - If full ISO datetime: absolute cutoff across all delivery intervals.
    """
    if not cutoff_spec:
        return delivery_dt

    cutoff_str = cutoff_spec.strip()
    
    # Check if cutoff is a HH:MM or HH:MM:SS time-of-day (e.g. "12:00", "11:00")
    if ":" in cutoff_str and len(cutoff_str) <= 8 and not any(sep in cutoff_str for sep in ["-", "/"]):
        parts = cutoff_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        second = int(parts[2]) if len(parts) > 2 else 0
        
        # Day D-1 cutoff
        delivery_date = delivery_dt.date()
        cutoff_date = delivery_date - timedelta(days=1)
        return datetime(cutoff_date.year, cutoff_date.month, cutoff_date.day, hour, minute, second, tzinfo=timezone.utc)

    # Otherwise parse as ISO datetime
    try:
        return parse_utc(cutoff_str)
    except Exception:
        # Fallback to delivery time if unparseable
        return delivery_dt

def select_latest_forecasts(
    raw_records: List[Dict[str, Any]], 
    decision_cutoff: Optional[str] = None
) -> List[ForecastRecord]:
    """
    Deduplicates raw forecast stream items and selects the latest forecast
    (highest publishTime <= decision_cutoff) for each unique delivery interval startTime.
    """
    if not raw_records:
        return []

    # 1. Deduplicate by (startTime, publishTime)
    deduped: Dict[tuple, Dict[str, Any]] = {}
    for r in raw_records:
        st_raw = r.get("startTime")
        pt_raw = r.get("publishTime")
        gen_raw = r.get("generation")

        if st_raw is None or pt_raw is None or gen_raw is None:
            continue

        try:
            st_dt = parse_utc(str(st_raw))
            pt_dt = parse_utc(str(pt_raw))
            gen = float(gen_raw)
        except (ValueError, TypeError):
            continue

        key = (st_dt, pt_dt)
        # Store standardized record
        deduped[key] = {
            "start_dt": st_dt,
            "publish_dt": pt_dt,
            "generation": gen
        }

    # 2. Group by delivery interval st_dt and apply cutoff filter
    grouped_candidates: Dict[datetime, List[Dict[str, Any]]] = {}
    for (st_dt, pt_dt), item in deduped.items():
        cutoff_dt = resolve_cutoff_for_delivery(st_dt, decision_cutoff)
        
        # Must be published at or before the cutoff
        if cutoff_dt is not None and pt_dt > cutoff_dt:
            continue

        if st_dt not in grouped_candidates:
            grouped_candidates[st_dt] = []
        grouped_candidates[st_dt].append(item)

    # 3. For each startTime, pick the one with the maximum publish_dt
    results: List[ForecastRecord] = []
    for st_dt in sorted(grouped_candidates.keys()):
        candidates = grouped_candidates[st_dt]
        # Sort by publish_dt descending
        best = max(candidates, key=lambda c: c["publish_dt"])
        results.append(ForecastRecord(
            startTime=format_utc(st_dt),
            publishTime=format_utc(best["publish_dt"]),
            generation=best["generation"]
        ))

    return results
