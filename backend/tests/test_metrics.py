import pytest
from app.services.metrics import calculate_accuracy_metrics, MetricResults

def test_metrics_perfect_forecast():
    actuals = [100.0, 200.0, 300.0]
    forecasts = [100.0, 200.0, 300.0]
    result: MetricResults = calculate_accuracy_metrics(forecasts, actuals)
    
    assert result.mae == 0.0
    assert result.rmse == 0.0
    assert result.mbe == 0.0
    assert result.mape == 0.0
    assert result.total_samples == 3
    assert result.mape_valid_samples == 3

def test_metrics_known_errors():
    actuals = [100.0, 200.0, 300.0]
    forecasts = [120.0, 180.0, 330.0] # errors: +20, -20, +30
    result = calculate_accuracy_metrics(forecasts, actuals)
    
    # MAE = (20 + 20 + 30) / 3 = 70 / 3 = 23.3333
    assert pytest.approx(result.mae, rel=1e-3) == 23.333
    # RMSE = sqrt((400 + 400 + 900) / 3) = sqrt(1700 / 3) = sqrt(566.666) = 23.8047
    assert pytest.approx(result.rmse, rel=1e-3) == 23.805
    # MBE = (20 - 20 + 30) / 3 = 10.0
    assert pytest.approx(result.mbe, rel=1e-3) == 10.0
    # MAPE = (20/100 + 20/200 + 30/300) / 3 = (0.2 + 0.1 + 0.1) / 3 = 0.4 / 3 = 13.333%
    assert pytest.approx(result.mape, rel=1e-3) == 13.333
    assert result.total_samples == 3
    assert result.mape_valid_samples == 3

def test_metrics_handles_zero_actual_for_mape():
    actuals = [0.0, 100.0, 200.0]
    forecasts = [10.0, 110.0, 190.0]
    result = calculate_accuracy_metrics(forecasts, actuals)
    
    # MAE: (10 + 10 + 10) / 3 = 10.0
    assert result.mae == 10.0
    # RMSE: sqrt((100 + 100 + 100) / 3) = 10.0
    assert result.rmse == 10.0
    # MBE: (10 + 10 - 10) / 3 = 3.333
    assert pytest.approx(result.mbe, rel=1e-3) == 3.333
    # MAPE should exclude actual == 0.0, valid samples = 2
    # Errors for valid: 10/100 (10%) and 10/200 (5%) -> mean = 7.5%
    assert result.mape_valid_samples == 2
    assert result.mape_excluded_samples == 1
    assert pytest.approx(result.mape, rel=1e-3) == 7.5

def test_metrics_all_zero_actuals():
    actuals = [0.0, 0.0]
    forecasts = [10.0, 20.0]
    result = calculate_accuracy_metrics(forecasts, actuals)
    
    assert result.mae == 15.0
    assert result.mape is None
    assert result.mape_valid_samples == 0
    assert result.mape_excluded_samples == 2

def test_metrics_empty_inputs():
    result = calculate_accuracy_metrics([], [])
    assert result.mae is None
    assert result.rmse is None
    assert result.mbe is None
    assert result.mape is None
    assert result.total_samples == 0

def test_metrics_includes_definitions():
    result = calculate_accuracy_metrics([100], [100])
    assert "Mean Absolute Error" in result.definitions["MAE"]
    assert "Root Mean Squared Error" in result.definitions["RMSE"]
    assert "Mean Bias Error" in result.definitions["MBE"]
    assert "Mean Absolute Percentage Error" in result.definitions["MAPE"]
