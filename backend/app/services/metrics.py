import math
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class MetricResults(BaseModel):
    mae: Optional[float] = Field(None, description="Mean Absolute Error in MW")
    rmse: Optional[float] = Field(None, description="Root Mean Squared Error in MW")
    mbe: Optional[float] = Field(None, description="Mean Bias Error in MW (forecast - actual)")
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error (%)")
    total_samples: int = Field(0, description="Total matched interval count")
    mape_valid_samples: int = Field(0, description="Samples where actual > 0 used for MAPE")
    mape_excluded_samples: int = Field(0, description="Samples where actual <= 0 excluded from MAPE")
    definitions: Dict[str, str] = Field(default_factory=dict, description="Metric formulas and explanations")
    limitations: Dict[str, str] = Field(default_factory=dict, description="Statistical caveats and edge cases")

METRIC_DEFINITIONS = {
    "MAE": "Mean Absolute Error: mean of |forecast - actual| across delivery intervals. Measures average magnitude of error regardless of direction.",
    "RMSE": "Root Mean Squared Error: square root of the mean squared error sqrt(mean((forecast - actual)^2)). Penalizes larger errors more heavily.",
    "MBE": "Mean Bias Error: mean of (forecast - actual). Positive value indicates systematic over-forecasting; negative indicates under-forecasting.",
    "MAPE": "Mean Absolute Percentage Error: mean of (|forecast - actual| / actual) * 100%. Expresses relative error scale."
}

METRIC_LIMITATIONS = {
    "MAPE": "Undefined or infinite when actual generation is zero or near zero. Low wind periods artificially skew percentage error; zero actuals are safely excluded with sample count reported.",
    "MBE": "Positive and negative errors offset each other; a near-zero MBE can mask large offsetting errors (consult MAE alongside MBE).",
    "RMSE": "Highly sensitive to occasional extreme forecast deviations during sudden storm ramp-downs or unforecasted gusts."
}

def calculate_accuracy_metrics(forecasts: List[float], actuals: List[float]) -> MetricResults:
    """
    Computes MAE, RMSE, MBE, and MAPE for paired forecast and actual values.
    Handles edge cases: empty lists, zero actuals, missing values.
    """
    if not forecasts or not actuals or len(forecasts) != len(actuals) or len(forecasts) == 0:
        return MetricResults(
            mae=None,
            rmse=None,
            mbe=None,
            mape=None,
            total_samples=0,
            mape_valid_samples=0,
            mape_excluded_samples=0,
            definitions=METRIC_DEFINITIONS,
            limitations=METRIC_LIMITATIONS
        )

    n = len(forecasts)
    abs_errors = []
    sq_errors = []
    diffs = []
    pct_errors = []
    mape_excluded = 0

    for f, a in zip(forecasts, actuals):
        diff = f - a
        abs_err = abs(diff)
        diffs.append(diff)
        abs_errors.append(abs_err)
        sq_errors.append(diff * diff)

        # MAPE requires positive non-zero actual
        if a > 0.0:
            pct_errors.append((abs_err / a) * 100.0)
        else:
            mape_excluded += 1

    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(sq_errors) / n)
    mbe = sum(diffs) / n
    mape = (sum(pct_errors) / len(pct_errors)) if pct_errors else None

    return MetricResults(
        mae=round(mae, 3),
        rmse=round(rmse, 3),
        mbe=round(mbe, 3),
        mape=round(mape, 3) if mape is not None else None,
        total_samples=n,
        mape_valid_samples=len(pct_errors),
        mape_excluded_samples=mape_excluded,
        definitions=METRIC_DEFINITIONS,
        limitations=METRIC_LIMITATIONS
    )
