"""
variable_lead_time_analysis.py
-------------------------------
OPT-IN, additive analysis: re-computes the inventory policy treating
supplier lead time as a random variable (mean + std) instead of the fixed
constant the base pipeline uses, via compute_policy_variable_lead_time() in
common/policy.py.

This is a SEPARATE script, not part of the default `run_all.py` sequence.
It reads outputs/inventory_policy.csv (already produced by optimize.py) and
writes its own output file, so nothing the base pipeline produces is
modified:

    outputs/inventory_policy.csv              <- untouched, from optimize.py
    outputs/inventory_policy_variable_lt.csv  <- new, from this script

Run manually, or via `python run_all.py --with-vlt`:
    python src/variable_lead_time_analysis.py
"""

import sqlite3
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger
from common.policy import compute_policy_variable_lead_time

logger = get_logger("variable_lead_time")


def main():
    policy_path = config.OUT_DIR / "inventory_policy.csv"
    if not policy_path.exists():
        raise FileNotFoundError(f"{policy_path} not found -- run `python src/optimize.py` first")
    policy = pd.read_csv(policy_path)

    conn = sqlite3.connect(config.DB_PATH)
    try:
        sku_dim = pd.read_sql("SELECT * FROM sku_dim", conn)
    finally:
        conn.close()

    merged = policy.merge(sku_dim[["sku_id", "unit_cost", "order_cost", "holding_cost_pct"]],
                          on="sku_id", how="left")

    rows, failures = [], []
    for _, r in merged.iterrows():
        cat_val = r.get("category")
        category = str(cat_val) if cat_val is not None else ""
        std_fraction = config.REAL_DATA_LEAD_TIME_STD_FRACTION_BY_CATEGORY.get(
            category, config.DEFAULT_LEAD_TIME_STD_FRACTION
        )
        std_lead_time = r["lead_time_days"] * std_fraction
        try:
            p = compute_policy_variable_lead_time(
                avg_daily_demand=r["avg_daily_demand"],
                std_daily_demand=r["std_daily_demand"],
                avg_lead_time_days=r["lead_time_days"],
                std_lead_time_days=std_lead_time,
                unit_cost=r["unit_cost"],
                order_cost=r["order_cost"],
                holding_cost_pct=r["holding_cost_pct"],
                service_level=r["service_level"],
                sku_id=str(r["sku_id"]),
            )
        except ValueError as exc:
            failures.append(str(exc))
            continue

        rows.append({
            "sku_id": r["sku_id"],
            "category": r.get("category"),
            "abc_class": r.get("abc_class"),
            "lead_time_std_fraction_assumed": round(std_fraction, 2),
            "std_lead_time_days": round(std_lead_time, 2),
            "fixed_lt_safety_stock": r["safety_stock"],
            "variable_lt_safety_stock": p.safety_stock,
            "safety_stock_increase": round(p.safety_stock - r["safety_stock"], 1),
            "fixed_lt_reorder_point": r["reorder_point"],
            "variable_lt_reorder_point": p.reorder_point,
            "fixed_lt_annual_cost": r["annual_inventory_cost"],
            "variable_lt_annual_cost": p.annual_inventory_cost,
            "annual_cost_increase": round(p.annual_inventory_cost - r["annual_inventory_cost"], 2),
        })

    if failures:
        logger.warning(f"{len(failures)} SKU(s) skipped; first: {failures[0]}")

    result = pd.DataFrame(rows).sort_values("safety_stock_increase", ascending=False)
    result.to_csv(config.OUT_DIR / "inventory_policy_variable_lt.csv", index=False)

    total_increase = result["annual_cost_increase"].sum()
    pct_increase = 100 * total_increase / result["fixed_lt_annual_cost"].sum()
    avg_ss_increase_pct = (
        100 * (result["variable_lt_safety_stock"].sum() / result["fixed_lt_safety_stock"].sum() - 1)
    )

    logger.info(f"Recomputed policy for {len(result)} SKUs assuming lead-time variability "
               f"({dict((k, f'{v:.0%}') for k, v in config.REAL_DATA_LEAD_TIME_STD_FRACTION_BY_CATEGORY.items())} "
               f"of the mean lead time, by category)")
    logger.info(f"Safety stock required rises {avg_ss_increase_pct:+.1f}% once lead-time "
               f"variability is modelled instead of assumed away")
    logger.info(f"Annual inventory cost rises ${total_increase:,.0f} ({pct_increase:+.1f}%) "
               f"across the catalogue as a result")
    top = result.iloc[0]
    logger.info(f"Most affected SKU: {top['sku_id']} "
               f"(+{top['safety_stock_increase']:.0f} units of safety stock)")
    logger.info(f"Output: {config.OUT_DIR / 'inventory_policy_variable_lt.csv'}")
    logger.info(
        "This treats the base pipeline's fixed lead time as the baseline and asks 'what if "
        "we also modelled how much that lead time actually varies?' -- not a replacement "
        "for the base policy, a sensitivity check on one of its documented assumptions."
    )


if __name__ == "__main__":
    main()
