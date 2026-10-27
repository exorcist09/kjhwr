import pytest
import httpx
from fastapi import HTTPException
from unittest.mock import AsyncMock, patch
from app.services.elexon_client import ElexonClient

@pytest.mark.asyncio
async def test_fetch_stream_success(tmp_path):
    client = ElexonClient(cache_dir=tmp_path)
    mock_data = [
        {"dataset": "FUELHH", "startTime": "2026-01-01T00:00:00Z", "fuelType": "WIND", "generation": 10000}
    ]
    
    with patch.object(client, "_query_stream_endpoint", new_callable=AsyncMock) as mock_query:
        mock_query.return_value = mock_data
        result = await client.get_fuelhh_actuals("2026-01-01", "2026-01-02")
        assert len(result) == 1
        assert result[0]["fuelType"] == "WIND"

@pytest.mark.asyncio
async def test_fetch_upstream_error_raises_exception(tmp_path):
    client = ElexonClient(cache_dir=tmp_path)
    with patch.object(client, "_query_stream_endpoint", new_callable=AsyncMock) as mock_query:
        mock_query.side_effect = HTTPException(status_code=502, detail="Elexon upstream error (FUELHH): 500")
        with pytest.raises(HTTPException) as exc_info:
            await client.get_fuelhh_actuals("2026-01-01", "2026-01-02")
        assert "Elexon upstream error" in str(exc_info.value)
