"""
promo_forecast.py
------------------
OPT-IN, additive analysis: quantifies how much a promotion/discount
calendar would improve demand forecasts, using the real `Discount` column
from the raw Global Superstore data -- present in the source dataset but
unused anywhere in the base pipeline.

This is a SEPARATE script, not part of the default `run_all.py` sequence.
It reads the same cleaned sales data the base forecast.py already produced
(sales_fact_clean in the database) and writes its own output files, so
nothing the base pipeline produces is read, modified, or overwritten:

    outputs/forecast_accuracy.csv         <- untouched, from forecast.py
    outputs/promo_forecast_accuracy.csv   <- new, from this script

Run manually, or via `python run_all.py --with-promo`:
    python src/promo_forecast.py
"""

import sqlite3
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.forecasting import forecast_sku_with_promo
from common.logging_utils import get_logger

logger = get_logger("promo_forecast")


def load_daily_demand_and_discount(conn):
    """Daily qty_sold AND average discount per SKU, zero-filled to a
    continuous calendar. Discount comes straight from the raw transactions
    (not stored in sales_fact_clean), aggregated to the same planning grain
    load_real_data.py uses (Sub-Category | Market)."""
    sales = pd.read_sql("SELECT * FROM sales_fact_clean", conn, parse_dates=["date"])
    daily = sales.groupby(["sku_id", "date"])["qty_sold"].sum().reset_index()

    raw_path = config.REAL_DATASET_RAW_FILE
    if not raw_path.exists():
        logger.warning(
            f"{raw_path} not found -- this analysis needs the real dataset's "
            "Discount column. Skipping (synthetic data has no discount field)."
        )
        return None

    raw = pd.read_csv(raw_path, encoding="utf-8", usecols=[
        "Order Date", "Sub-Category", "Market", "Discount",
    ])
    raw["date"] = pd.to_datetime(raw["Order Date"], format="%d-%m-%Y", errors="coerce")
    raw = raw.dropna(subset=["date"])
    raw["sku_id"] = raw["Sub-Category"].str.strip() + " | " + raw["Market"].str.strip()
    daily_discount = raw.groupby(["sku_id", "date"])["Discount"].mean().reset_index()
    daily_discount.columns = ["sku_id", "date", "discount"]

    full_range = pd.date_range(daily["date"].min(), daily["date"].max(), freq="D")
    merged = []
    for sku_id, g in daily.groupby("sku_id"):
        g = g.set_index("date").reindex(full_range).rename_axis("date").reset_index()
        g["sku_id"] = sku_id
        g["qty_sold"] = g["qty_sold"].fillna(0)

        d = daily_discount[daily_discount["sku_id"] == sku_id].set_index("date")
        g = g.set_index("date")
        g["discount"] = d["discount"].reindex(g.index).fillna(0)
        g = g.reset_index()
        merged.append(g)

    return pd.concat(merged, ignore_index=True)


def main():
    conn = sqlite3.connect(config.DB_PATH)
    try:
        data = load_daily_demand_and_discount(conn)
    finally:
        conn.close()

    if data is None:
        return

    results = []
    n_skipped, n_no_discount, n_improved = 0, 0, 0

    for sku_id, g in data.groupby("sku_id"):
        g = g.sort_values("date").reset_index(drop=True)
        series_df = g[["date", "qty_sold"]]
        discount_series = g["discount"]

        res = forecast_sku_with_promo(
            sku_id, series_df, discount_series,
            horizon=config.TEST_DAYS, seasonal_periods=config.SEASONAL_PERIOD,
            intermittent_zero_share=config.INTERMITTENT_ZERO_SHARE,
        )
        if res is None:
            n_skipped += 1
            continue
        res.pop("forecast_vs_actual", None)
        if "promo_regression_known_mae" not in res:
            n_no_discount += 1
        elif res.get("promo_beats_best_model"):
            n_improved += 1
        results.append(res)

    if not results:
        logger.warning("No SKUs had enough history to evaluate. Nothing written.")
        return

    results_df = pd.DataFrame(results)
    results_df.to_csv(config.OUT_DIR / "promo_forecast_accuracy.csv", index=False)

    evaluated = len(results_df) - n_no_discount
    logger.info(f"Evaluated {len(results_df)} SKUs "
                f"({n_no_discount} had no discount activity, {n_skipped} skipped for short history)")
    if evaluated:
        logger.info(
            f"Of {evaluated} SKUs with real discount activity, a promo-aware forecast "
            f"beat the base best model for {n_improved} ({100 * n_improved / evaluated:.0f}%) "
            f"-- IF the discount schedule for the forecast horizon were known in advance."
        )
        avg_uplift = results_df.loc[
            results_df["promo_uplift_per_10pct_discount"] != 0, "promo_uplift_per_10pct_discount"
        ].mean()
        if pd.notna(avg_uplift):
            logger.info(f"Average fitted uplift: {avg_uplift:+.2f} units/day per 10 percentage "
                        f"points of discount, across SKUs where discounting occurs.")
        total_value = results_df["promo_calendar_value_mae"].sum()
        logger.info(f"Total MAE improvement available across the catalogue if a promo calendar "
                    f"were known: {total_value:.1f} units/day (summed across SKUs)")

    logger.info(f"Output: {config.OUT_DIR / 'promo_forecast_accuracy.csv'}")
    logger.info(
        "Read this as: how much forecast accuracy a planned promo calendar would be worth -- "
        "not a claim that today's pipeline already has that calendar. See README."
    )


if __name__ == "__main__":
    main()
