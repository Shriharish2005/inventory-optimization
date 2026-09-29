"""
backorder_analysis.py
----------------------
OPT-IN, additive analysis: replaces the base pipeline's flat lost-sale
assumption (LOST_SALE_FRACTION, a single number applied uniformly to every
stockout day) with an explicit day-by-day backorder simulation via
run_sQ_simulation_with_backorders() in common/policy.py -- tracking which
units are actually backordered and recovered versus genuinely lost.

This is a SEPARATE script, not part of the default `run_all.py` sequence.
It reads the same cleaned data and policy the base pipeline already
produced and writes its own output files:

    outputs/simulation_results.csv           <- untouched, from simulate.py
    outputs/simulation_summary.csv           <- untouched, from simulate.py
    outputs/backorder_simulation_results.csv <- new, from this script
    outputs/backorder_simulation_summary.csv <- new, from this script

Run manually, or via `python run_all.py --with-backorders`:
    python src/backorder_analysis.py
"""

import sqlite3
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger
from common.policy import run_sQ_simulation_with_backorders

logger = get_logger("backorder_analysis")


def main():
    policy_path = config.OUT_DIR / "inventory_policy.csv"
    if not policy_path.exists():
        raise FileNotFoundError(f"{policy_path} not found -- run `python src/optimize.py` first")
    policy = pd.read_csv(policy_path)

    conn = sqlite3.connect(config.DB_PATH)
    try:
        sales = pd.read_sql("SELECT * FROM sales_fact_clean", conn, parse_dates=["date"])
        sku_dim = pd.read_sql("SELECT * FROM sku_dim", conn)
    finally:
        conn.close()

    daily_sales = sales.groupby(["sku_id", "date"])["qty_sold"].sum().reset_index()
    sku_lookup = sku_dim.set_index("sku_id")
    policy_lookup = policy.set_index("sku_id")

    rng = np.random.default_rng(42)  # fixed seed: reproducible across runs
    results = []

    for sku_id, g in daily_sales.groupby("sku_id"):
        if sku_id not in policy_lookup.index:
            continue
        demand = g.sort_values("date")["qty_sold"].values
        sku_row = sku_lookup.loc[sku_id]
        pol = policy_lookup.loc[sku_id]

        res = run_sQ_simulation_with_backorders(
            demand, sku_row["lead_time_days"], pol["reorder_point"], pol["eoq"],
            backorder_fill_rate=config.BACKORDER_FILL_RATE, rng=rng,
        )

        margin_per_unit = sku_row["unit_price"] - sku_row["unit_cost"]
        holding_cost_per_unit = sku_row["unit_cost"] * sku_row["holding_cost_pct"]

        # The base pipeline's flat-rate estimate for comparison, using the
        # SAME stockout-day count this simulation independently produced.
        flat_rate_lost_value = round(
            res["stockout_days"] * pol["avg_daily_demand"] * config.LOST_SALE_FRACTION * margin_per_unit, 2
        )
        # The backorder model's explicit estimate: only genuinely LOST units
        # cost margin; backordered units are eventually fulfilled (at an
        # assumed customer-goodwill cost, not modelled here) rather than lost.
        explicit_lost_value = round(res["units_lost"] * margin_per_unit, 2)

        results.append({
            "sku_id": sku_id,
            "category": sku_row.get("category"),
            "stockout_days": res["stockout_days"],
            "units_backordered_and_recovered": res["units_backordered"],
            "units_genuinely_lost": res["units_lost"],
            "max_simultaneous_backlog": res["max_backlog"],
            "flat_rate_lost_sales_value": flat_rate_lost_value,
            "explicit_backorder_lost_sales_value": explicit_lost_value,
            "estimate_delta": round(explicit_lost_value - flat_rate_lost_value, 2),
        })

    results_df = pd.DataFrame(results).sort_values("estimate_delta")
    results_df.to_csv(config.OUT_DIR / "backorder_simulation_results.csv", index=False)

    total_flat = results_df["flat_rate_lost_sales_value"].sum()
    total_explicit = results_df["explicit_backorder_lost_sales_value"].sum()
    total_backordered = results_df["units_backordered_and_recovered"].sum()
    total_lost = results_df["units_genuinely_lost"].sum()

    summary = {
        "backorder_fill_rate_assumed": config.BACKORDER_FILL_RATE,
        "total_units_backordered_and_recovered": round(total_backordered, 1),
        "total_units_genuinely_lost": round(total_lost, 1),
        "pct_of_unmet_demand_recovered": round(
            100 * total_backordered / max(total_backordered + total_lost, 1e-9), 1
        ),
        "flat_rate_estimated_lost_value": round(total_flat, 2),
        "explicit_backorder_estimated_lost_value": round(total_explicit, 2),
        "estimate_delta": round(total_explicit - total_flat, 2),
    }
    pd.Series(summary).to_csv(config.OUT_DIR / "backorder_simulation_summary.csv")

    logger.info(f"Simulated backorders for {len(results_df)} SKUs "
               f"(fill rate assumed: {config.BACKORDER_FILL_RATE:.0%})")
    logger.info(f"Of all unmet demand: {summary['pct_of_unmet_demand_recovered']:.1f}% recovered "
               f"via backorder, {total_lost:,.0f} units genuinely lost")
    logger.info(f"Flat-rate estimate (base pipeline):    ${total_flat:,.0f}")
    logger.info(f"Explicit backorder estimate (this run): ${total_explicit:,.0f}")
    logger.info(f"Difference: ${summary['estimate_delta']:+,.0f} -- the base pipeline's flat "
               f"{config.LOST_SALE_FRACTION:.0%} assumption "
               f"{'over' if summary['estimate_delta'] < 0 else 'under'}states the lost-sale cost "
               f"relative to this more granular model")
    logger.info(f"Output: {config.OUT_DIR / 'backorder_simulation_results.csv'}, "
               f"backorder_simulation_summary.csv")


if __name__ == "__main__":
    main()
