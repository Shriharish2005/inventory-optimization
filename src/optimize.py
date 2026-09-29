"""
optimize.py
-----------
Turns demand statistics into a concrete inventory policy per SKU using the
shared formulas in common/policy.py:

  safety stock  = z(service level) * sigma_daily_demand * sqrt(lead time)
  reorder point = avg_daily_demand * lead_time + safety stock
  EOQ           = sqrt(2 * annual_demand * order_cost / holding_cost_per_unit)

Service levels are tuned by ABC class (A-items get 98%, C-items 90%) rather
than applied uniformly -- it rarely makes sense to hold the same safety
margin on a top revenue driver as on a slow-moving tail item.

Also produces a LIVE REORDER ALERT table: each SKU's latest stock position
compared against its reorder point, classified RED / YELLOW / GREEN, with
days-of-cover remaining. This is the operational output a planner would
actually act on each morning.
"""

import sqlite3
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger
from common.policy import compute_policy, reorder_status

logger = get_logger("optimize")


def compute_demand_stats(conn):
    df = pd.read_sql("SELECT * FROM sales_fact_clean", conn, parse_dates=["date"])
    daily = df.groupby(["sku_id", "date"])["qty_sold"].sum().reset_index()
    stats = daily.groupby("sku_id")["qty_sold"].agg(
        avg_daily_demand="mean", std_daily_demand="std"
    ).reset_index()
    stats["std_daily_demand"] = stats["std_daily_demand"].fillna(0)
    return stats


def build_policy_table(stats, sku_dim, abc_classification):
    df = stats.merge(sku_dim, on="sku_id").merge(
        abc_classification[["sku_id", "abc_class"]], on="sku_id", how="left"
    )
    df["abc_class"] = df["abc_class"].fillna("C")
    df["service_level"] = df["abc_class"].map(config.SERVICE_LEVEL_BY_CLASS).fillna(
        config.DEFAULT_SERVICE_LEVEL
    )

    rows, failures = [], []
    for _, r in df.iterrows():
        try:
            p = compute_policy(
                avg_daily_demand=r["avg_daily_demand"],
                std_daily_demand=r["std_daily_demand"],
                lead_time_days=r["lead_time_days"],
                unit_cost=r["unit_cost"],
                order_cost=r["order_cost"],
                holding_cost_pct=r["holding_cost_pct"],
                service_level=r["service_level"],
                sku_id=r["sku_id"],
            )
        except ValueError as exc:
            failures.append(str(exc))
            continue

        row = {
            "sku_id": r["sku_id"],
            "category": r.get("category"),
            "sub_category": r.get("sub_category"),
            "market": r.get("market"),
            "abc_class": r["abc_class"],
            "service_level": p.service_level,
            "z_score": p.z_score,
            "lead_time_days": r["lead_time_days"],
            "avg_daily_demand": round(r["avg_daily_demand"], 3),
            "std_daily_demand": round(r["std_daily_demand"], 3),
            "safety_stock": p.safety_stock,
            "reorder_point": p.reorder_point,
            "eoq": p.eoq,
            "orders_per_year": p.orders_per_year,
            "annual_holding_cost": p.annual_holding_cost,
            "annual_ordering_cost": p.annual_ordering_cost,
            "annual_inventory_cost": p.annual_inventory_cost,
        }
        rows.append(row)

    if failures:
        logger.warning(f"{len(failures)} SKU(s) skipped during policy build; first: {failures[0]}")

    return pd.DataFrame(rows).sort_values("annual_inventory_cost", ascending=False)


def build_reorder_alerts(conn, policy):
    """Compare each SKU's most recent stock position against its reorder point."""
    latest = pd.read_sql(
        """
        SELECT i.sku_id, i.stock_on_hand, i.date
        FROM inventory_snapshot i
        JOIN (
            SELECT sku_id, MAX(date) AS max_date
            FROM inventory_snapshot GROUP BY sku_id
        ) m ON i.sku_id = m.sku_id AND i.date = m.max_date
        """,
        conn, parse_dates=["date"],
    )

    alerts = policy.merge(latest, on="sku_id", how="left")
    alerts["stock_on_hand"] = alerts["stock_on_hand"].fillna(0)

    alerts["status"] = alerts.apply(
        lambda r: reorder_status(
            r["stock_on_hand"], r["reorder_point"], r["avg_daily_demand"],
            config.ALERT_YELLOW_BUFFER_DAYS,
        ), axis=1,
    )
    alerts["days_of_cover"] = (
        alerts["stock_on_hand"] / alerts["avg_daily_demand"].replace(0, pd.NA)
    ).round(1)
    alerts["units_below_reorder_point"] = (
        (alerts["reorder_point"] - alerts["stock_on_hand"]).clip(lower=0).round(1)
    )
    alerts["suggested_order_qty"] = alerts.apply(
        lambda r: r["eoq"] if r["status"] == "RED" else 0, axis=1
    )

    cols = [
        "sku_id", "category", "market", "abc_class", "status",
        "stock_on_hand", "reorder_point", "days_of_cover",
        "units_below_reorder_point", "suggested_order_qty", "eoq", "lead_time_days",
    ]
    cols = [c for c in cols if c in alerts.columns]
    status_order = {"RED": 0, "YELLOW": 1, "GREEN": 2}
    alerts = alerts[cols].assign(_o=alerts["status"].map(status_order)).sort_values(
        ["_o", "units_below_reorder_point"], ascending=[True, False]
    ).drop(columns="_o")

    counts = alerts["status"].value_counts().to_dict()
    logger.info(f"Reorder alerts: {counts}")
    return alerts


def main():
    conn = sqlite3.connect(config.DB_PATH)
    try:
        sku_dim = pd.read_sql("SELECT * FROM sku_dim", conn)
        abc_path = config.OUT_DIR / "abc_classification.csv"
        if not abc_path.exists():
            raise FileNotFoundError(
                f"{abc_path} not found -- run `python src/clean_eda.py` before optimize.py"
            )
        abc_classification = pd.read_csv(abc_path)

        stats = compute_demand_stats(conn)
        policy = build_policy_table(stats, sku_dim, abc_classification)
        policy.to_csv(config.OUT_DIR / "inventory_policy.csv", index=False)

        alerts = build_reorder_alerts(conn, policy)
        alerts.to_csv(config.OUT_DIR / "reorder_alerts.csv", index=False)

        logger.info(f"Inventory policy built for {len(policy)} SKUs")
        logger.info(
            f"Total projected annual inventory cost: ${policy['annual_inventory_cost'].sum():,.0f}"
        )
        logger.info(f"Outputs: inventory_policy.csv, reorder_alerts.csv")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
