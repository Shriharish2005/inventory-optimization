"""
load_dataco_data.py
--------------------
Transforms the REAL DataCo Smart Supply Chain dataset (180,508 actual
retail transactions, 2015-2017, 5 markets, 11 departments / 50 product
categories) into the three-table schema the pipeline expects: sku_dim,
sales_fact, inventory_snapshot.

Why this is a second, separate loader rather than a flag on
load_real_data.py
------------------------------------------------------------------------
This is a different real dataset with a different schema, not another
option on the Global Superstore loader. It's kept as its own script
(mirroring load_real_data.py's structure) so both real-data sources stay
independently runnable and auditable -- `run_all.py --dataco` picks this
one, the default remains Global Superstore.

What's different (and better) here than the Superstore loader
---------------------------------------------------------------
Global Superstore records customer *shipping* dates only, so
load_real_data.py has to ASSUME supplier lead times per category
(config.REAL_DATA_LEAD_TIME_BY_CATEGORY) -- a documented business
guess, not data.

DataCo additionally records "Days for shipment (scheduled)" and "Days
for shipping (real)" on every order -- an actual promised-vs-observed
delivery window. Read as a proxy for supplier/replenishment lead time,
this lets lead time (and its VARIABILITY) be DATA-DERIVED per
department instead of assumed. That closes the single biggest
documented gap in the Superstore loader.

Gaps that remain (same as Superstore, documented rather than hidden):
1. GRAIN. We plan at Category Name x Market (e.g. "Cleats | Europe"),
   the same one-level-up-from-SKU grain load_real_data.py uses, for the
   same reason: individual products are too sparse to forecast daily.
2. STOCK ON HAND. Not in the source data. Reconstructed by simulating a
   naive reorder policy against the real observed demand, exactly as
   load_real_data.py does -- this gives the "before" picture the
   optimized policy is measured against.
3. ORDER COST / HOLDING COST %. Not in any transactional dataset (no
   retailer publishes procurement or warehousing cost). Assigned by
   department from documented assumptions in config.py, same pattern as
   Superstore's per-category assumptions.

Unit cost is derived from Sales and Order Item Profit Ratio, so margins
reflect actual transaction economics.

Only orders in config.DATACO_VALID_ORDER_STATUSES are kept -- CANCELED
and SUSPECTED_FRAUD orders were never actually fulfilled and would
inflate demand history with sales that didn't happen.

Usage:
    python src/load_dataco_data.py                 # default: min 180 active days
    python src/load_dataco_data.py --min-days 300   # stricter density filter
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger

logger = get_logger("load_dataco_data")

DEFAULT_MIN_ACTIVE_DAYS = 180


def load_raw():
    path = config.DATACO_RAW_FILE
    if not path.exists():
        raise FileNotFoundError(
            f"DataCo dataset not found at {path}.\n"
            "This is a large (~96MB) real dataset and isn't fetched "
            "automatically -- see README.md for the source and place the "
            "CSV at data/raw/dataco_supply_chain.csv."
        )
    df = pd.read_csv(path, encoding="latin-1")
    logger.info(f"Loaded {len(df):,} real transactions from {path.name}")
    return df


def build_planning_skus(df, min_active_days):
    """Filter to valid orders, aggregate transactions to the
    Category Name x Market planning grain."""
    df = df.copy()

    n_invalid = int((~df["Order Status"].isin(config.DATACO_VALID_ORDER_STATUSES)).sum())
    if n_invalid:
        logger.warning(
            f"Dropping {n_invalid:,} rows with an order status outside "
            f"{sorted(config.DATACO_VALID_ORDER_STATUSES)} (never actually fulfilled)"
        )
        df = df[df["Order Status"].isin(config.DATACO_VALID_ORDER_STATUSES)]

    df["date"] = pd.to_datetime(df["order date (DateOrders)"], errors="coerce")
    n_bad_dates = int(df["date"].isna().sum())
    if n_bad_dates:
        logger.warning(f"Dropping {n_bad_dates:,} rows with unparseable order dates")
        df = df.dropna(subset=["date"])
    df["date"] = df["date"].dt.normalize()

    df["sku_id"] = df["Category Name"].str.strip() + " | " + df["Market"].str.strip()

    density = df.groupby("sku_id")["date"].nunique()
    keep = density[density >= min_active_days].index
    dropped = len(density) - len(keep)
    logger.info(
        f"Planning grain: Category Name x Market -> {len(density)} candidate SKUs; "
        f"keeping {len(keep)} with >= {min_active_days} active days "
        f"({dropped} dropped as too sparse to forecast)"
    )
    if len(keep) == 0:
        raise ValueError(
            f"No SKUs met the {min_active_days}-active-day threshold. "
            "Lower it with --min-days."
        )

    return df[df["sku_id"].isin(keep)].copy()


def build_sku_dim(df):
    """Derive per-SKU economics AND data-derived lead time from the real
    Sales / Order Item Profit Ratio / shipment-day columns."""
    agg = df.groupby("sku_id").agg(
        department=("Department Name", "first"),
        category=("Category Name", "first"),
        market=("Market", "first"),
        total_sales=("Sales", "sum"),
        total_qty=("Order Item Quantity", "sum"),
        avg_profit_ratio=("Order Item Profit Ratio", "mean"),
        # Real, data-derived lead time: mean/std of the scheduled shipment
        # window per SKU, read as a proxy for supplier replenishment lead
        # time (see module docstring for the reasoning and its limits).
        lead_time_mean=("Days for shipment (scheduled)", "mean"),
        lead_time_std=("Days for shipment (scheduled)", "std"),
    ).reset_index()

    # Real unit economics: average realised price, and cost implied by the
    # average profit ratio (profit_ratio = (price - cost) / price).
    agg["unit_price"] = (agg["total_sales"] / agg["total_qty"]).round(2)
    agg["unit_cost"] = (agg["unit_price"] * (1 - agg["avg_profit_ratio"])).round(2)

    # Same guard as the Superstore loader: floor margin at 5% so a
    # loss-making category doesn't make every lost sale "profitable" to skip.
    bad_margin = (agg["unit_cost"] >= agg["unit_price"]) | (agg["unit_cost"] <= 0)
    if bad_margin.any():
        logger.warning(
            f"{int(bad_margin.sum())} SKU(s) had a non-positive or inverted margin "
            "in the real data; flooring their margin at 5% so lost-sale valuations "
            "stay interpretable"
        )
        agg.loc[bad_margin, "unit_cost"] = (agg.loc[bad_margin, "unit_price"] * 0.95).round(2)

    agg["lead_time_days"] = agg["lead_time_mean"].round().clip(lower=1).astype(int)
    agg["lead_time_std_days"] = agg["lead_time_std"].fillna(config.DEFAULT_LEAD_TIME_STD_FRACTION * agg["lead_time_days"]).round(2)

    agg["order_cost"] = agg["department"].map(config.DATACO_ORDER_COST_BY_DEPT).fillna(35.0)
    agg["holding_cost_pct"] = agg["department"].map(config.DATACO_HOLDING_COST_PCT_BY_DEPT).fillna(0.22)

    cols = [
        "sku_id", "category", "department", "market",
        "unit_cost", "unit_price", "lead_time_days", "lead_time_std_days",
        "order_cost", "holding_cost_pct",
    ]
    return agg[cols]


def build_sales_fact(df):
    """Daily demand per planning SKU, with zero-fill for non-selling days."""
    daily = df.groupby(["sku_id", "date"]).agg(
        qty_sold=("Order Item Quantity", "sum"),
        revenue=("Sales", "sum"),
    ).reset_index()

    full_range = pd.date_range(daily["date"].min(), daily["date"].max(), freq="D")
    logger.info(
        f"Demand history spans {full_range.min().date()} to {full_range.max().date()} "
        f"({len(full_range):,} days)"
    )

    filled = []
    for sku_id, g in daily.groupby("sku_id"):
        g = (
            g.set_index("date")
            .reindex(full_range)
            .rename_axis("date")
            .reset_index()
        )
        g["sku_id"] = sku_id
        g["qty_sold"] = g["qty_sold"].fillna(0)
        g["revenue"] = g["revenue"].fillna(0)
        filled.append(g)

    out = pd.concat(filled, ignore_index=True)
    out["qty_sold"] = out["qty_sold"].astype(int)
    out["revenue"] = out["revenue"].round(2)
    return out[["date", "sku_id", "qty_sold", "revenue"]]


def build_inventory_snapshot(sales_fact, sku_dim):
    """Reconstruct a plausible stock-on-hand history by running a NAIVE
    reorder policy against the real demand -- the 'current state' baseline
    the optimized policy is later measured against. Same approach as the
    Superstore loader, using each SKU's own (data-derived) lead time."""
    rows = []
    sku_lookup = sku_dim.set_index("sku_id")

    for sku_id, g in sales_fact.groupby("sku_id"):
        g = g.sort_values("date")
        demand = g["qty_sold"].values
        lead_time = int(sku_lookup.loc[sku_id, "lead_time_days"])
        avg_demand = demand.mean()

        naive_rop = avg_demand * lead_time
        naive_qty = max(avg_demand * 14, 1.0)

        stock = naive_rop + naive_qty
        pending = []
        levels = []
        for day_idx, d in enumerate(demand):
            if pending:
                arriving = [o for o in pending if o[0] == day_idx]
                if arriving:
                    stock += sum(o[1] for o in arriving)
                    pending = [o for o in pending if o[0] != day_idx]
            stock = max(0.0, stock - d)
            position = stock + sum(o[1] for o in pending)
            if position <= naive_rop:
                pending.append([day_idx + lead_time, naive_qty])
            levels.append(round(stock))

        rows.append(pd.DataFrame({
            "date": g["date"].values,
            "sku_id": sku_id,
            "stock_on_hand": levels,
        }))

    return pd.concat(rows, ignore_index=True)


def main():
    parser = argparse.ArgumentParser(description="Build pipeline tables from the real DataCo Smart Supply Chain dataset")
    parser.add_argument("--min-days", type=int, default=DEFAULT_MIN_ACTIVE_DAYS,
                        help=f"minimum active selling days for a SKU to be kept (default {DEFAULT_MIN_ACTIVE_DAYS})")
    args = parser.parse_args()

    raw = load_raw()
    df = build_planning_skus(raw, args.min_days)

    sku_dim = build_sku_dim(df)
    sales_fact = build_sales_fact(df)
    inventory_snapshot = build_inventory_snapshot(sales_fact, sku_dim)

    # sku_dim keeps lead_time_std_days and department as extra, informative
    # columns for anyone inspecting the CSV directly, but the pipeline's
    # schema validator only requires the base column set -- drop nothing,
    # ingest.py simply ignores columns it doesn't need.
    sku_dim.to_csv(config.DATA_DIR / "sku_dim.csv", index=False)
    sales_fact.to_csv(config.DATA_DIR / "sales_fact.csv", index=False)
    inventory_snapshot.to_csv(config.DATA_DIR / "inventory_snapshot.csv", index=False)

    logger.info(f"Wrote sku_dim.csv            : {len(sku_dim):,} planning SKUs")
    logger.info(f"Wrote sales_fact.csv         : {len(sales_fact):,} rows")
    logger.info(f"Wrote inventory_snapshot.csv : {len(inventory_snapshot):,} rows")
    logger.info(
        f"Real revenue represented: ${sales_fact['revenue'].sum():,.0f} "
        f"across {sku_dim['market'].nunique()} markets and {sku_dim['department'].nunique()} departments"
    )
    logger.info(
        f"Data-derived lead time: {sku_dim['lead_time_days'].mean():.1f} days average "
        f"(vs. assumed lead times in the Global Superstore loader)"
    )


if __name__ == "__main__":
    main()
