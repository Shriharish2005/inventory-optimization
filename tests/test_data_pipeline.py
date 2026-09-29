"""
Tests for the data validation and forecasting modules.

Run with:
    python -m pytest tests/ -v
"""

# pyright: reportMissingImports=false

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

try:
    from common.validation import (  # type: ignore
        validate_sku_dim, validate_sales_fact, validate_inventory_snapshot,
        DataValidationError,
    )
    from common.forecasting import (  # type: ignore
        croston_forecast, moving_average_forecast, is_intermittent, mae_mape, forecast_sku,
        promo_regression_forecast, discount_uplift_per_10pct, forecast_sku_with_promo,
    )
except ImportError:
    from src.common.validation import (  # type: ignore
        validate_sku_dim, validate_sales_fact, validate_inventory_snapshot,
        DataValidationError,
    )
    from src.common.forecasting import (  # type: ignore
        croston_forecast, moving_average_forecast, is_intermittent, mae_mape, forecast_sku,
        promo_regression_forecast, discount_uplift_per_10pct, forecast_sku_with_promo,
    )


def _good_sku_dim():
    return pd.DataFrame({
        "sku_id": ["A", "B"],
        "category": ["Cat1", "Cat2"],
        "unit_cost": [10.0, 20.0],
        "unit_price": [15.0, 30.0],
        "lead_time_days": [7, 5],
        "order_cost": [50.0, 40.0],
        "holding_cost_pct": [0.2, 0.25],
    })


def _good_sales():
    return pd.DataFrame({
        "date": pd.to_datetime(["2024-01-01", "2024-01-02"]),
        "sku_id": ["A", "B"],
        "qty_sold": [5, 3],
        "revenue": [75.0, 90.0],
    })


# ---------------- validation ----------------

def test_valid_sku_dim_passes():
    assert validate_sku_dim(_good_sku_dim()).ok


def test_missing_column_is_an_error():
    df = _good_sku_dim().drop(columns=["unit_cost"])
    report = validate_sku_dim(df)
    assert not report.ok
    assert any("unit_cost" in e for e in report.errors)


def test_duplicate_sku_id_is_an_error():
    df = _good_sku_dim()
    df.loc[1, "sku_id"] = "A"
    assert not validate_sku_dim(df).ok


def test_negative_margin_is_a_warning_not_an_error():
    """A loss-making SKU is worth flagging but shouldn't halt the pipeline."""
    df = _good_sku_dim()
    df.loc[0, "unit_price"] = 5.0  # below unit_cost of 10
    report = validate_sku_dim(df)
    assert report.ok
    assert len(report.warnings) > 0


def test_raise_if_invalid_raises():
    df = _good_sku_dim().drop(columns=["unit_cost"])
    with pytest.raises(DataValidationError):
        validate_sku_dim(df).raise_if_invalid("sku_dim")


def test_empty_sales_is_an_error():
    empty = pd.DataFrame({col: [] for col in ["date", "sku_id", "qty_sold", "revenue"]})
    assert not validate_sales_fact(empty).ok


def test_orphan_sku_ids_are_warned():
    sales = _good_sales()
    report = validate_sales_fact(sales, sku_ids=["A"])  # "B" is an orphan
    assert report.ok
    assert any("no matching row" in w for w in report.warnings)


def test_negative_qty_is_warned_not_fatal():
    sales = _good_sales()
    sales.loc[0, "qty_sold"] = -5
    report = validate_sales_fact(sales)
    assert report.ok
    assert any("negative" in w for w in report.warnings)


def test_inventory_snapshot_validation():
    inv = pd.DataFrame({
        "date": pd.to_datetime(["2024-01-01"]),
        "sku_id": ["A"],
        "stock_on_hand": [100],
    })
    assert validate_inventory_snapshot(inv).ok


# ---------------- forecasting ----------------

def test_croston_on_intermittent_series_beats_zero():
    """Croston should produce a positive rate for a sparse but non-empty series."""
    values = np.zeros(100)
    values[::10] = 20  # a sale of 20 units every 10 days
    series = pd.Series(values)
    fc = croston_forecast(series, horizon=10)
    assert fc[0] > 0
    # Expected rate is roughly 20 units / 10 days = 2 per day
    assert 0.5 < fc[0] < 5


def test_croston_on_all_zero_series_returns_zero():
    fc = croston_forecast(pd.Series(np.zeros(50)), horizon=5)
    assert np.all(fc == 0)


def test_croston_never_negative():
    rng = np.random.default_rng(1)
    values = rng.choice([0, 0, 0, 5, 12], size=200).astype(float)
    fc = croston_forecast(pd.Series(values), horizon=20)
    assert np.all(fc >= 0)


def test_is_intermittent_detects_sparse_demand():
    sparse = pd.Series([0] * 80 + [5] * 20)
    dense = pd.Series([5] * 90 + [0] * 10)
    assert is_intermittent(sparse)
    assert not is_intermittent(dense)


def test_moving_average_is_non_negative():
    fc = moving_average_forecast(pd.Series([0, 0, 0, 0]), horizon=5)
    assert np.all(fc >= 0)


def test_mae_is_zero_for_perfect_forecast():
    mae, mape = mae_mape([10, 20, 30], [10, 20, 30])
    assert mae == 0


def test_forecast_sku_returns_none_for_short_history():
    """Too little history to backtest should return None, not crash."""
    df = pd.DataFrame({
        "date": pd.date_range("2024-01-01", periods=20, freq="D"),
        "qty_sold": np.arange(20, dtype=float),
    })
    assert forecast_sku("A", df, horizon=60) is None


def test_forecast_sku_picks_a_model_and_returns_holdout():
    rng = np.random.default_rng(2)
    n = 400
    df = pd.DataFrame({
        "date": pd.date_range("2023-01-01", periods=n, freq="D"),
        "qty_sold": rng.poisson(8, size=n).astype(float),
    })
    res = forecast_sku("A", df, horizon=60)
    assert res is not None
    assert res["best_model"] in {"moving_average", "holt_winters", "croston"}
    assert len(res["forecast_vs_actual"]) == 60
    assert res["best_mae"] >= 0


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))


# ---------------- promo_regression_forecast (additive) ----------------

def test_promo_regression_recovers_known_uplift():
    """With a clear synthetic discount->demand relationship, the fitted
    coefficient should recover the true uplift closely."""
    rng = np.random.default_rng(1)
    n = 300
    dates = pd.date_range("2023-01-01", periods=n, freq="D")
    discount = rng.choice([0, 0.1, 0.2], size=n)
    true_uplift = 50.0  # units per 1.0 discount
    values = np.clip(20 + true_uplift * discount + rng.normal(0, 1, n), 0, None)

    fc, coeffs = promo_regression_forecast(dates, values, discount, horizon=30,
                                           future_discount=np.full(30, 0.2))
    assert abs(coeffs[1] - true_uplift) < 10  # recovers roughly the right slope
    assert len(fc) == 30
    assert np.all(fc >= 0)


def test_promo_regression_defaults_future_discount_to_zero():
    rng = np.random.default_rng(2)
    n = 200
    dates = pd.date_range("2023-01-01", periods=n, freq="D")
    discount = rng.choice([0, 0.3], size=n)
    values = np.clip(10 + 40 * discount + rng.normal(0, 1, n), 0, None)

    fc_default, _ = promo_regression_forecast(dates, values, discount, horizon=20)
    fc_explicit_zero, _ = promo_regression_forecast(
        dates, values, discount, horizon=20, future_discount=np.zeros(20))
    np.testing.assert_allclose(fc_default, fc_explicit_zero)


def test_promo_regression_mismatched_future_discount_length_raises():
    dates = pd.date_range("2023-01-01", periods=100, freq="D")
    values = np.ones(100)
    discount = np.zeros(100)
    with pytest.raises(ValueError):
        promo_regression_forecast(dates, values, discount, horizon=10,
                                  future_discount=np.zeros(5))


def test_promo_regression_handles_empty_training_data():
    fc, coeffs = promo_regression_forecast([], [], [], horizon=5)
    assert len(fc) == 5
    assert np.all(fc == 0)


def test_discount_uplift_per_10pct_scales_coefficient():
    coeffs = np.array([10.0, 60.0, 0, 0, 0, 0, 0, 0])
    assert discount_uplift_per_10pct(coeffs) == 6.0


# ---------------- forecast_sku_with_promo (additive) ----------------

def test_forecast_sku_with_promo_beats_baseline_when_discount_matters():
    rng = np.random.default_rng(3)
    n = 400
    dates = pd.date_range("2023-01-01", periods=n, freq="D")
    discount = rng.choice([0, 0, 0, 0.2, 0.3], size=n)
    values = np.clip(20 + 70 * discount + rng.normal(0, 2, n), 0, None)
    df = pd.DataFrame({"date": dates, "qty_sold": values})

    res = forecast_sku_with_promo("A", df, pd.Series(discount), horizon=60)
    assert res is not None
    assert res["promo_regression_known_mae"] < res["best_mae"]
    assert res["promo_beats_best_model"] is True


def test_forecast_sku_with_promo_falls_back_cleanly_with_no_discount_activity():
    rng = np.random.default_rng(4)
    n = 300
    dates = pd.date_range("2023-01-01", periods=n, freq="D")
    values = np.clip(15 + rng.normal(0, 2, n), 0, None)
    df = pd.DataFrame({"date": dates, "qty_sold": values})

    res = forecast_sku_with_promo("B", df, pd.Series(np.zeros(n)), horizon=60)
    assert res is not None
    assert "promo_regression_known_mae" not in res
    assert res["promo_uplift_per_10pct_discount"] == 0.0


def test_forecast_sku_with_promo_returns_none_for_short_history():
    dates = pd.date_range("2024-01-01", periods=20, freq="D")
    df = pd.DataFrame({"date": dates, "qty_sold": np.arange(20, dtype=float)})
    res = forecast_sku_with_promo("C", df, pd.Series(np.zeros(20)), horizon=60)
    assert res is None
