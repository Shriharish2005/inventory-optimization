"""
forecasting.py
--------------
Per-SKU demand forecasting models, kept as pure functions (series in,
forecast array out) so forecast.py and the tests can all
share the same implementation.

Three candidate models are tried per SKU and the best (lowest MAE on a
backtest holdout) is kept:
  - moving_average : naive baseline, 7-day trailing average
  - holt_winters    : trend + weekly seasonality, best for steady/seasonal SKUs
  - croston         : Croston's method for intermittent demand (many
                       zero-demand days) -- the moving average and Holt-Winters
                       models both struggle here because they either
                       chase noise or flatten to near-zero. This matters a
                       lot for real (as opposed to synthetic) retail data,
                       where most SKUs sell on well under half of all days.
"""

import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

warnings.filterwarnings("ignore")


def moving_average_forecast(train_series, horizon, window=7):
    last_avg = train_series.tail(window).mean()
    return np.full(horizon, max(last_avg, 0.0))


def holt_winters_forecast(train_series, horizon, seasonal_periods=7):
    series = train_series.asfreq("D").fillna(0) + 1e-3  # avoid degenerate all-zero series
    try:
        model = ExponentialSmoothing(
            series, trend="add", seasonal="add",
            seasonal_periods=seasonal_periods, damped_trend=True,
        ).fit(optimized=True)
        fc = model.forecast(horizon)
        return np.clip(fc.values, 0, None)
    except Exception:
        return moving_average_forecast(train_series, horizon)


def croston_forecast(train_series, horizon, alpha=0.2):
    """Croston's method: separately smooths (a) the size of non-zero demand
    events and (b) the interval between them, then forecasts a flat rate =
    average size / average interval. Standard approach for intermittent /
    slow-moving demand where most days are zero."""
    values = train_series.values.astype(float)
    nonzero_idx = np.flatnonzero(values > 0)

    if len(nonzero_idx) == 0:
        return np.zeros(horizon)
    if len(nonzero_idx) == 1:
        rate = values[nonzero_idx[0]] / max(len(values), 1)
        return np.full(horizon, max(rate, 0.0))

    sizes = values[nonzero_idx]
    intervals = np.diff(nonzero_idx, prepend=nonzero_idx[0])
    intervals[0] = nonzero_idx[0] + 1

    z = sizes[0]
    p = intervals[0]
    for i in range(1, len(sizes)):
        z = alpha * sizes[i] + (1 - alpha) * z
        p = alpha * intervals[i] + (1 - alpha) * p

    rate = z / p if p > 0 else 0.0
    return np.full(horizon, max(rate, 0.0))


def mae_mape(actual, forecast):
    actual = np.asarray(actual, dtype=float)
    forecast = np.asarray(forecast, dtype=float)
    mae = float(np.mean(np.abs(actual - forecast)))
    denom = np.where(actual == 0, 1, actual)
    mape = float(np.mean(np.abs(actual - forecast) / denom) * 100)
    return mae, mape


def is_intermittent(train_series, zero_share_threshold=0.4):
    """A SKU counts as intermittent demand if more than `zero_share_threshold`
    of its history has zero sales -- common for long-tail real-world SKUs."""
    if len(train_series) == 0:
        return True
    return (train_series == 0).mean() > zero_share_threshold


def forecast_sku(sku_id, series_df, horizon, seasonal_periods=7,
                  intermittent_zero_share=0.4):
    """Fit all applicable candidate models for one SKU, backtest on the last
    `horizon` days, and return the best model's forecast plus accuracy for
    every model tried. `series_df` must have columns ['date', 'qty_sold']
    covering the FULL history (train + holdout) for this SKU, sorted by date.

    Returns a dict with keys: sku_id, best_model, best_mae, per-model MAE/MAPE,
    and 'forecast_vs_actual' (a DataFrame of date/actual/forecast/model for
    the holdout window) -- or None if there isn't enough history to backtest.
    """
    if len(series_df) <= horizon + 30:
        return None

    train_df, test_df = series_df.iloc[:-horizon], series_df.iloc[-horizon:]
    train_series = train_df.set_index("date")["qty_sold"]

    candidates = {
        "moving_average": moving_average_forecast(train_series, horizon),
    }
    if is_intermittent(train_series, intermittent_zero_share):
        candidates["croston"] = croston_forecast(train_series, horizon)
    else:
        candidates["holt_winters"] = holt_winters_forecast(train_series, horizon, seasonal_periods)

    accuracy = {}
    for name, fc in candidates.items():
        mae, mape = mae_mape(test_df["qty_sold"], fc)
        accuracy[name] = (mae, mape)

    best_model = min(accuracy, key=lambda k: accuracy[k][0])
    best_fc = candidates[best_model]
    best_mae, best_mape = accuracy[best_model]

    fva = pd.DataFrame({
        "sku_id": sku_id,
        "date": test_df["date"].values,
        "actual": test_df["qty_sold"].values,
        "forecast": np.round(best_fc, 2),
        "model": best_model,
    })

    result = {
        "sku_id": sku_id,
        "best_model": best_model,
        "best_mae": round(best_mae, 2),
        "best_mape": round(best_mape, 1),
        "forecast_vs_actual": fva,
    }
    for name, (mae, mape) in accuracy.items():
        result[f"{name}_mae"] = round(mae, 2)
        result[f"{name}_mape"] = round(mape, 1)
    return result


# =====================================================================
# ADDITIVE EXTENSION -- promotion-aware forecasting.
#
# Everything above this line is unchanged: forecast_sku() and the three
# original models keep their exact original behaviour, so forecast.py and
# every existing test and caller are unaffected. This adds a fourth,
# OPT-IN candidate model that uses the real `Discount` column from the raw
# dataset -- present in the source data but previously unused anywhere in
# the pipeline.
# =====================================================================

PROMO_REGRESSION_FEATURES = 8  # intercept + discount + 6 day-of-week dummies


def promo_regression_forecast(train_dates, train_values, train_discount, horizon,
                              future_discount=None, future_dates=None):
    """Ordinary-least-squares regression: demand ~ intercept + discount level
    + day-of-week, fit with plain numpy (no new dependency). Returns
    (forecast_array, fitted_coefficients).

    Important honesty note: this requires knowing the discount level for the
    forecast horizon -- e.g. a retailer's own planned promo calendar -- not
    just observed history. If `future_discount` isn't supplied it defaults
    to 0 for every future day (assumes no promotion), which is a conservative,
    EXPLICIT assumption rather than a silently guessed one. Backtesting this
    model against real historical discount data (which IS known after the
    fact) measures how much explanatory power discounting has on demand --
    a business insight in its own right -- separately from whether that
    information is available at forecast time in production.
    """
    train_dates = pd.to_datetime(pd.Series(train_dates)).reset_index(drop=True)
    train_values = np.asarray(train_values, dtype=float)
    train_discount = np.asarray(train_discount, dtype=float)
    n = len(train_values)
    if n == 0:
        return np.zeros(horizon), np.zeros(PROMO_REGRESSION_FEATURES)

    def _design_matrix(dates, discount):
        dow = np.asarray(pd.to_datetime(pd.Series(dates)).dt.dayofweek.values)
        X = np.zeros((len(dates), PROMO_REGRESSION_FEATURES))
        X[:, 0] = 1.0
        X[:, 1] = discount
        for d in range(1, 7):  # Monday (0) is the baseline, absorbed into the intercept
            X[:, 1 + d] = np.where(dow == d, 1.0, 0.0)
        return X

    X = _design_matrix(train_dates, train_discount)
    coeffs, *_ = np.linalg.lstsq(X, train_values, rcond=None)

    if future_discount is None:
        future_discount = np.zeros(horizon)
    else:
        future_discount = np.asarray(future_discount, dtype=float)
        if len(future_discount) != horizon:
            raise ValueError(
                f"future_discount has length {len(future_discount)}, expected {horizon}"
            )

    if future_dates is None:
        start = train_dates.max() + pd.Timedelta(days=1)
        future_dates = pd.date_range(start, periods=horizon, freq="D")

    Xf = _design_matrix(future_dates, future_discount)
    forecast = np.clip(Xf @ coeffs, 0, None)
    return forecast, coeffs


def discount_uplift_per_10pct(coeffs):
    """Business-readable summary of the fitted discount coefficient: the
    change in daily demand (units) associated with a 10-percentage-point
    increase in discount, holding day-of-week constant."""
    return round(float(coeffs[1]) * 0.10, 3)


def forecast_sku_with_promo(sku_id, series_df, discount_series, horizon,
                            seasonal_periods=7, intermittent_zero_share=0.4):
    """Same contract as forecast_sku(), plus a `promo_regression` candidate
    evaluated two ways:
      - 'promo_regression'        : backtest using the REAL historical
                                     discount during the holdout window (the
                                     "if the promo calendar were known" case)
      - 'promo_regression_no_info': same model, but assuming zero discount
                                     for the whole horizon (the realistic
                                     "no promo calendar available" case)
    Comparing the two quantifies exactly how much a promo calendar would be
    worth, rather than asserting it.

    `discount_series` must be a Series of average daily discount aligned to
    the same date index as series_df, covering the same full history.
    Falls back to forecast_sku() untouched if discount data is unusable.
    """
    base = forecast_sku(sku_id, series_df, horizon, seasonal_periods, intermittent_zero_share)
    if base is None:
        return None

    train_df, test_df = series_df.iloc[:-horizon], series_df.iloc[-horizon:]
    train_discount = discount_series.iloc[:-horizon].values
    test_discount = discount_series.iloc[-horizon:].values

    if np.allclose(train_discount, 0) and np.allclose(test_discount, 0):
        # No real discount activity for this SKU -- nothing for the model to
        # learn from; report the base result unchanged rather than fitting
        # a meaningless regression.
        base["promo_uplift_per_10pct_discount"] = 0.0
        return base

    fc_known, coeffs = promo_regression_forecast(
        train_df["date"], train_df["qty_sold"], train_discount, horizon,
        future_discount=test_discount, future_dates=test_df["date"],
    )
    fc_noinfo, _ = promo_regression_forecast(
        train_df["date"], train_df["qty_sold"], train_discount, horizon,
        future_discount=None, future_dates=test_df["date"],
    )

    mae_known, mape_known = mae_mape(test_df["qty_sold"], fc_known)
    mae_noinfo, mape_noinfo = mae_mape(test_df["qty_sold"], fc_noinfo)

    base["promo_regression_known_mae"] = round(mae_known, 2)
    base["promo_regression_known_mape"] = round(mape_known, 1)
    base["promo_regression_noinfo_mae"] = round(mae_noinfo, 2)
    base["promo_regression_noinfo_mape"] = round(mape_noinfo, 1)
    base["promo_uplift_per_10pct_discount"] = discount_uplift_per_10pct(coeffs)

    if mae_known < base["best_mae"]:
        base["promo_beats_best_model"] = True
        base["promo_calendar_value_mae"] = round(base["best_mae"] - mae_known, 2)
    else:
        base["promo_beats_best_model"] = False
        base["promo_calendar_value_mae"] = 0.0

    return base
