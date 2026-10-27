import os
import json
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

ELEXON_BASE_URL = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data_cache"

class ElexonClient:
    def __init__(self, base_url: str = ELEXON_BASE_URL, cache_dir: Path = CACHE_DIR):
        self.base_url = base_url.rstrip("/")
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._memory_cache: Dict[str, Any] = {}

    def _get_cache_key(self, dataset: str, from_dt: str, to_dt: str) -> str:
        safe_from = from_dt.replace(":", "-")
        safe_to = to_dt.replace(":", "-")
        return f"{dataset}_{safe_from}_{safe_to}.json"

    def _read_cache(self, key: str) -> Optional[List[Dict[str, Any]]]:
        if key in self._memory_cache:
            return self._memory_cache[key]
        cache_file = self.cache_dir / key
        if cache_file.exists():
            try:
                data = json.loads(cache_file.read_text(encoding="utf-8"))
                self._memory_cache[key] = data
                return data
            except Exception as e:
                logger.warning(f"Failed to read cache file {cache_file}: {e}")
        return None

    def _write_cache(self, key: str, data: List[Dict[str, Any]]):
        self._memory_cache[key] = data
        cache_file = self.cache_dir / key
        try:
            cache_file.write_text(json.dumps(data), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Failed to write cache file {cache_file}: {e}")

    async def _query_stream_endpoint(self, dataset: str, from_dt: str, to_dt: str) -> List[Dict[str, Any]]:
        """Makes an asynchronous GET request to Elexon stream dataset endpoint."""
        url = f"{self.base_url}/datasets/{dataset}/stream"
        params = {
            "publishDateTimeFrom": from_dt,
            "publishDateTimeTo": to_dt
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, params=params, headers={"Accept": "application/json"})
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "data" in data:
                    return data["data"]
                return []
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=502, 
                    detail=f"Elexon upstream error ({dataset}): {e.response.status_code} - {e.response.text[:200]}"
                )
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=504, 
                    detail=f"Elexon upstream network error ({dataset}): {str(e)}"
                )

    async def get_fuelhh_actuals(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Fetches FUELHH actuals stream.
        Given delivery start_date (YYYY-MM-DD) and end_date (YYYY-MM-DD),
        requests publish timestamps from start_date 00:00:00Z to end_date + 1 day 02:00:00Z
        to cover all half-hourly delivery settlement publications.
        """
        dt_start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        dt_end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1, hours=2)
        
        # Window into 7-day chunks if range > 7 days
        all_records: List[Dict[str, Any]] = []
        current = dt_start
        
        while current < dt_end:
            chunk_end = min(current + timedelta(days=7), dt_end)
            from_iso = current.strftime("%Y-%m-%dT%H:%M:%SZ")
            to_iso = chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ")
            cache_key = self._get_cache_key("FUELHH", from_iso, to_iso)
            
            cached = self._read_cache(cache_key)
            if cached is not None:
                all_records.extend(cached)
            else:
                chunk_data = await self._query_stream_endpoint("FUELHH", from_iso, to_iso)
                self._write_cache(cache_key, chunk_data)
                all_records.extend(chunk_data)
            
            current = chunk_end

        return all_records

    async def get_windfor_forecasts(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Fetches WINDFOR forecast stream.
        Forecasts for delivery start_date can be published up to 2-3 days before start_date (day-ahead and week-ahead),
        so we query publications from start_date - 2 days through end_date 23:59:59Z.
        """
        dt_start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) - timedelta(days=2)
        dt_end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
        
        all_records: List[Dict[str, Any]] = []
        current = dt_start
        
        while current < dt_end:
            chunk_end = min(current + timedelta(days=7), dt_end)
            from_iso = current.strftime("%Y-%m-%dT%H:%M:%SZ")
            to_iso = chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ")
            cache_key = self._get_cache_key("WINDFOR", from_iso, to_iso)
            
            cached = self._read_cache(cache_key)
            if cached is not None:
                all_records.extend(cached)
            else:
                chunk_data = await self._query_stream_endpoint("WINDFOR", from_iso, to_iso)
                self._write_cache(cache_key, chunk_data)
                all_records.extend(chunk_data)
                
            current = chunk_end

        return all_records
