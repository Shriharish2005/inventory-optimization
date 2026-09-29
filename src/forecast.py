"""
forecast.py
-----------
Builds per-SKU demand forecasts by backtesting several candidate models and
keeping the best performer for each SKU.

Models (see common/forecasting.py):
  - moving_average : naive 7-day trailing baseline
  - holt_winters    : trend + weekly seasonality, for regular-demand SKUs
  - croston         : Croston's method, automatically selected for
                       intermittent SKUs (many zero-demand days). Real retail
                       data is overwhelmingly intermittent, so this model
                       does most of the work here.

Forecasting runs in parallel across SKUs, which matters once you move from
a 30-SKU synthetic set to a real catalogue.
"""

import sqlite3
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.forecasting import forecast_sku
from common.logging_utils import get_logger

logger = get_logger("forecast")


def load_daily_demand(conn):
    df = pd.read_sql("SELECT * FROM sales_fact_clean", conn, parse_dates=["date"])
    daily = df.groupby(["sku_id", "date"])["qty_sold"].sum().reset_index()

    full_range = pd.date_range(daily["date"].min(), daily["date"].max(), freq="D")
    filled = []
    for sku_id, g in daily.groupby("sku_id"):
        g = g.set_index("date").reindex(full_range).rename_axis("date").reset_index()
        g["sku_id"] = sku_id
        g["qty_sold"] = g["qty_sold"].fillna(0)
        filled.append(g)
    return pd.concat(filled, ignore_index=True)


def _forecast_one(args):
    sku_id, series_df = args
    try:
        return forecast_sku(
            sku_id,
            series_df,
            horizon=config.TEST_DAYS,
            seasonal_periods=config.SEASONAL_PERIOD,
            intermittent_zero_share=config.INTERMITTENT_ZERO_SHARE,
        )
    except Exception as exc:  # a single bad SKU must not kill the whole run
        return {"sku_id": sku_id, "error": str(exc)}


def main():
    conn = sqlite3.connect(config.DB_PATH)
    try:
        daily = load_daily_demand(conn)
    finally:
        conn.close()

    tasks = [
        (sku_id, g.sort_values("date").reset_index(drop=True)[["date", "qty_sold"]])
        for sku_id, g in daily.groupby("sku_id")
    ]
    logger.info(f"Forecasting {len(tasks)} SKUs (backtest holdout: last {config.TEST_DAYS} days, "
                f"{config.MAX_WORKERS} workers)")

    results, forecast_frames, skipped, errored = [], [], [], []

    with ProcessPoolExecutor(max_workers=config.MAX_WORKERS) as pool:
        futures = {pool.submit(_forecast_one, t): t[0] for t in tasks}
        for fut in as_completed(futures):
            res = fut.result()
            sku_id = futures[fut]
            if res is None:
                skipped.append(sku_id)
                continue
            if "error" in res:
                errored.append((sku_id, res["error"]))
                continue
            forecast_frames.append(res.pop("forecast_vs_actual"))
            results.append(res)

    if not results:
        raise RuntimeError(
            "No SKUs could be forecast. Every SKU has less than "
            f"{config.TEST_DAYS + 30} days of history -- lower INVOPT_TEST_DAYS or "
            "loosen the --min-days filter in load_real_data.py."
        )

    results_df = pd.DataFrame(results).sort_values("best_mae")
    forecast_df = pd.concat(forecast_frames, ignore_index=True)

    results_df.to_csv(config.OUT_DIR / "forecast_accuracy.csv", index=False)
    forecast_df.to_csv(config.OUT_DIR / "forecast_vs_actual.csv", index=False)

    if skipped:
        logger.warning(f"{len(skipped)} SKU(s) skipped: insufficient history to backtest")
    if errored:
        logger.warning(f"{len(errored)} SKU(s) failed to forecast; first: {errored[0]}")

    logger.info(f"Forecast complete for {len(results_df)} SKUs")
    logger.info(f"Average MAE: {results_df['best_mae'].mean():.2f} units/day")
    logger.info(f"Model selection: {results_df['best_model'].value_counts().to_dict()}")

    # Report accuracy uplift over the naive baseline -- the number that shows
    # the modelling actually added value.
    if "moving_average_mae" in results_df.columns:
        baseline = results_df["moving_average_mae"].mean()
        best = results_df["best_mae"].mean()
        uplift = 100 * (baseline - best) / baseline if baseline else 0
        logger.info(f"Accuracy uplift vs. moving-average baseline: {uplift:.1f}% lower MAE")


if __name__ == "__main__":
    main()
