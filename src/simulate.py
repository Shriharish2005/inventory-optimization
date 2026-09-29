"""
simulate.py
-----------
Runs the SAME (s, Q) simulation engine (common/policy.py) against two
policies so the comparison is fair and apples-to-apples:

  - Naive policy     : reorder point = lead-time demand only (no safety stock),
                        order quantity = two weeks of average demand. This
                        mirrors how teams manage inventory without formal
                        demand-variability analysis.
  - Optimized policy : reorder point and EOQ from optimize.py, which account
                        for demand variability and the ordering/holding cost
                        trade-off.

Also runs a SERVICE-LEVEL SENSITIVITY sweep: re-costing the whole catalogue
at service levels from 90% to 99% to show where the marginal safety stock
stops paying for itself. That curve is the actual decision aid -- it tells a
planner which target to pick rather than assuming one.
"""

import sqlite3
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger
from common.policy import compute_policy, run_sQ_simulation

logger = get_logger("simulate")

SENSITIVITY_SERVICE_LEVELS = [0.90, 0.92, 0.95, 0.97, 0.98, 0.99]


def simulate_sku(demand, sku_row, reorder_point, order_qty):
    lead_time = int(sku_row["lead_time_days"])
    stockouts, avg_stock, _ = run_sQ_simulation(demand, lead_time, reorder_point, order_qty)
    holding_cost_per_unit = sku_row["unit_cost"] * sku_row["holding_cost_pct"]
    return stockouts, avg_stock, avg_stock * holding_cost_per_unit


def run_comparison(daily_sales, sku_dim, policy):
    results = []
    sku_lookup = sku_dim.set_index("sku_id")
    policy_lookup = policy.set_index("sku_id")

    for sku_id, g in daily_sales.groupby("sku_id"):
        if sku_id not in policy_lookup.index:
            continue
        g = g.sort_values("date")
        demand = g["qty_sold"].values
        sku_row = sku_lookup.loc[sku_id]
        pol = policy_lookup.loc[sku_id]

        lead_time = int(sku_row["lead_time_days"])
        avg_demand = pol["avg_daily_demand"]

        naive_rop = avg_demand * lead_time
        naive_qty = max(avg_demand * 14, 1.0)
        naive_stockouts, naive_stock, naive_holding = simulate_sku(demand, sku_row, naive_rop, naive_qty)
        opt_stockouts, opt_stock, opt_holding = simulate_sku(
            demand, sku_row, pol["reorder_point"], pol["eoq"]
        )

        margin_per_unit = sku_row["unit_price"] - sku_row["unit_cost"]
        stockouts_avoided = naive_stockouts - opt_stockouts
        lost_sales_avoided = round(
            stockouts_avoided * avg_demand * config.LOST_SALE_FRACTION * margin_per_unit, 2
        )
        holding_delta = round(naive_holding - opt_holding, 2)

        n_days = len(demand)
        results.append({
            "sku_id": sku_id,
            "category": sku_row.get("category"),
            "market": sku_row.get("market"),
            "abc_class": pol.get("abc_class"),
            "naive_stockout_days": naive_stockouts,
            "optimized_stockout_days": opt_stockouts,
            "stockout_days_avoided": stockouts_avoided,
            "naive_service_level_achieved": round(1 - naive_stockouts / n_days, 3),
            "optimized_service_level_achieved": round(1 - opt_stockouts / n_days, 3),
            "naive_avg_stock": round(naive_stock, 1),
            "optimized_avg_stock": round(opt_stock, 1),
            "naive_annual_holding_cost": round(naive_holding, 2),
            "optimized_annual_holding_cost": round(opt_holding, 2),
            "holding_cost_delta": holding_delta,
            "est_lost_sales_avoided_value": lost_sales_avoided,
            "net_dollar_impact": round(lost_sales_avoided + holding_delta, 2),
        })

    return pd.DataFrame(results)


def run_service_level_sensitivity(daily_sales, sku_dim, policy):
    """Re-cost the catalogue at a range of service-level targets to find where
    additional safety stock stops paying for itself."""
    sku_lookup = sku_dim.set_index("sku_id")
    policy_lookup = policy.set_index("sku_id")
    demand_by_sku = {sku: g.sort_values("date")["qty_sold"].values
                     for sku, g in daily_sales.groupby("sku_id")}

    rows = []
    for sl in SENSITIVITY_SERVICE_LEVELS:
        tot_stockouts = tot_holding = tot_lost_value = 0.0
        for sku_id, demand in demand_by_sku.items():
            if sku_id not in policy_lookup.index:
                continue
            sku_row = sku_lookup.loc[sku_id]
            pol = policy_lookup.loc[sku_id]
            try:
                p = compute_policy(
                    avg_daily_demand=pol["avg_daily_demand"],
                    std_daily_demand=pol["std_daily_demand"],
                    lead_time_days=sku_row["lead_time_days"],
                    unit_cost=sku_row["unit_cost"],
                    order_cost=sku_row["order_cost"],
                    holding_cost_pct=sku_row["holding_cost_pct"],
                    service_level=sl,
                    sku_id=sku_id,
                )
            except ValueError:
                continue
            stockouts, _, holding = simulate_sku(demand, sku_row, p.reorder_point, p.eoq)
            margin = sku_row["unit_price"] - sku_row["unit_cost"]
            tot_stockouts += stockouts
            tot_holding += holding
            tot_lost_value += stockouts * pol["avg_daily_demand"] * config.LOST_SALE_FRACTION * margin

        rows.append({
            "service_level_target": sl,
            "total_stockout_days": int(tot_stockouts),
            "total_holding_cost": round(tot_holding, 2),
            "est_lost_sales_value": round(tot_lost_value, 2),
            "total_cost_of_policy": round(tot_holding + tot_lost_value, 2),
        })
        logger.info(
            f"  service level {sl:.0%}: {int(tot_stockouts):>5} stockout-days, "
            f"${tot_holding:>10,.0f} holding, ${tot_holding + tot_lost_value:>11,.0f} total cost"
        )

    df = pd.DataFrame(rows)
    best = df.loc[df["total_cost_of_policy"].idxmin()]
    logger.info(
        f"Lowest total cost at a {best['service_level_target']:.0%} service-level target "
        f"(${best['total_cost_of_policy']:,.0f})"
    )
    return df


def main():
    conn = sqlite3.connect(config.DB_PATH)
    try:
        sales = pd.read_sql("SELECT * FROM sales_fact_clean", conn, parse_dates=["date"])
        sku_dim = pd.read_sql("SELECT * FROM sku_dim", conn)
    finally:
        conn.close()

    policy_path = config.OUT_DIR / "inventory_policy.csv"
    if not policy_path.exists():
        raise FileNotFoundError(f"{policy_path} not found -- run `python src/optimize.py` first")
    policy = pd.read_csv(policy_path)

    daily_sales = sales.groupby(["sku_id", "date"])["qty_sold"].sum().reset_index()

    logger.info(f"Simulating naive vs. optimized policy across {policy['sku_id'].nunique()} SKUs...")
    results_df = run_comparison(daily_sales, sku_dim, policy)
    results_df.to_csv(config.OUT_DIR / "simulation_results.csv", index=False)

    n_days = daily_sales["date"].nunique()
    total_naive_so = results_df["naive_stockout_days"].sum()
    total_opt_so = results_df["optimized_stockout_days"].sum()
    avoided = total_naive_so - total_opt_so
    total_naive_hold = results_df["naive_annual_holding_cost"].sum()
    total_opt_hold = results_df["optimized_annual_holding_cost"].sum()

    summary = {
        "n_skus": int(results_df["sku_id"].nunique()),
        "n_days_simulated": int(n_days),
        "total_stockout_days_naive": int(total_naive_so),
        "total_stockout_days_optimized": int(total_opt_so),
        "stockout_days_avoided": int(avoided),
        "pct_stockout_reduction": round(100 * avoided / total_naive_so, 1) if total_naive_so else 0,
        "avg_service_level_naive": round(results_df["naive_service_level_achieved"].mean(), 3),
        "avg_service_level_optimized": round(results_df["optimized_service_level_achieved"].mean(), 3),
        "total_holding_cost_naive": round(total_naive_hold, 2),
        "total_holding_cost_optimized": round(total_opt_hold, 2),
        "total_holding_cost_delta": round(total_naive_hold - total_opt_hold, 2),
        "pct_holding_cost_change": round(
            100 * (total_naive_hold - total_opt_hold) / total_naive_hold, 1
        ) if total_naive_hold else 0,
        "est_lost_sales_avoided_value": round(results_df["est_lost_sales_avoided_value"].sum(), 2),
        "net_dollar_impact": round(results_df["net_dollar_impact"].sum(), 2),
    }
    pd.Series(summary).to_csv(config.OUT_DIR / "simulation_summary.csv")

    logger.info("=== Optimized vs. naive policy ===")
    for k, v in summary.items():
        logger.info(f"  {k}: {v}")

    logger.info("Running service-level sensitivity sweep...")
    sens = run_service_level_sensitivity(daily_sales, sku_dim, policy)
    sens.to_csv(config.OUT_DIR / "service_level_sensitivity.csv", index=False)

    logger.info("Outputs: simulation_results.csv, simulation_summary.csv, service_level_sensitivity.csv")


if __name__ == "__main__":
    main()
