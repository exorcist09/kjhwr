import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data

@patch("app.api.routes.elexon_client.get_fuelhh_actuals", new_callable=AsyncMock)
def test_get_actuals_endpoint(mock_get_actuals):
    mock_get_actuals.return_value = [
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 12000},
        {"fuelType": "BIOMASS", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 2000},
    ]
    response = client.get("/api/actuals?start_date=2026-01-01&end_date=2026-01-02")
    assert response.status_code == 200
    data = response.json()
    assert len(data["actuals"]) == 1
    assert data["actuals"][0]["generation"] == 12000
    assert data["total_records"] == 1

@patch("app.api.routes.elexon_client.get_windfor_forecasts", new_callable=AsyncMock)
def test_get_forecasts_endpoint(mock_get_forecasts):
    mock_get_forecasts.return_value = [
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T08:00:00Z", "generation": 1000},
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T11:00:00Z", "generation": 1200},
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T15:00:00Z", "generation": 1500},
    ]
    response = client.get("/api/forecasts?start_date=2026-01-01&end_date=2026-01-03&decision_time=2026-01-01T12:00:00Z")
    assert response.status_code == 200
    data = response.json()
    assert len(data["forecasts"]) == 1
    assert data["forecasts"][0]["generation"] == 1200
    assert data["forecasts"][0]["publishTime"] == "2026-01-01T11:00:00Z"

@patch("app.api.routes.elexon_client.get_fuelhh_actuals", new_callable=AsyncMock)
@patch("app.api.routes.elexon_client.get_windfor_forecasts", new_callable=AsyncMock)
def test_get_accuracy_endpoint(mock_get_forecasts, mock_get_actuals):
    mock_get_actuals.return_value = [
        {"fuelType": "WIND", "startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-02T10:30:00Z", "generation": 1000},
        {"fuelType": "WIND", "startTime": "2026-01-02T10:30:00Z", "publishTime": "2026-01-02T11:00:00Z", "generation": 2000},
    ]
    mock_get_forecasts.return_value = [
        {"startTime": "2026-01-02T10:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 1100},
        {"startTime": "2026-01-02T10:30:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 1900},
    ]
    response = client.get("/api/accuracy?start_date=2026-01-01&end_date=2026-01-03&decision_time=12:00")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert data["metrics"]["mae"] == 100.0
    assert data["metrics"]["total_samples"] == 2
    assert len(data["intervals"]) == 2
    assert "definitions" in data["metrics"]
