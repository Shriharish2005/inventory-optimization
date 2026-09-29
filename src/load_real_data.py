"""
load_real_data.py
------------------
Transforms the REAL Global Superstore dataset (51,290 actual retail
transactions, 2011-2014, 147 countries) into the three-table schema the
pipeline expects: sku_dim, sales_fact, inventory_snapshot.

Why a transformation step is needed
-----------------------------------
Real transactional data is not inventory-planning data. Three gaps have to
be closed honestly, and each is a documented assumption rather than a
number invented to make results look good:

1. GRAIN. Individual products in this dataset sell on a handful of days
   across four years -- far too sparse to forecast daily demand. We plan at
   the Sub-Category x Market grain (e.g. "Binders | EU"), which is how real
   replenishment planning actually works: you forecast a category's demand
   in a region, not every individual item. This yields 119 planning SKUs.

2. SUPPLIER LEAD TIMES. The dataset records customer shipping dates, not
   supplier replenishment lead times -- a different thing entirely. Lead
   times are assigned per category from documented assumptions in config.py
   (Furniture is slow-moving and bulky, Office Supplies fast).

3. STOCK ON HAND. The dataset has no inventory levels at all. We reconstruct
   a plausible history by simulating a naive reorder policy against the real
   observed demand. This gives the "before" picture the optimized policy is
   measured against -- and because the demand driving it is real, the
   stockout patterns it produces are meaningful.

Unit cost is derived from the real Sales and Profit columns, so margins
reflect actual transaction economics rather than a guess.

Usage:
    python src/load_real_data.py                 # default: min 180 active days
    python src/load_real_data.py --min-days 300  # stricter density filter
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger
from common.policy import run_sQ_simulation

logger = get_logger("load_real_data")

DEFAULT_MIN_ACTIVE_DAYS = 180


def load_raw():
    path = config.REAL_DATASET_RAW_FILE
    if not path.exists():
        raise FileNotFoundError(
            f"Real dataset not found at {path}.\n"
            "Download it with:\n"
            "  curl -L -o data/raw/global_superstore.csv "
            "https://raw.githubusercontent.com/dijendersaini/TimeSeriesAnalysis/master/"
            "'Global Superstore.csv'"
        )
    df = pd.read_csv(path, encoding="utf-8")
    logger.info(f"Loaded {len(df):,} real transactions from {path.name}")
    return df


def build_planning_skus(df, min_active_days):
    """Aggregate transactions to the Sub-Category x Market planning grain."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["Order Date"], format="%d-%m-%Y", errors="coerce")

    n_bad_dates = int(df["date"].isna().sum())
    if n_bad_dates:
        logger.warning(f"Dropping {n_bad_dates:,} rows with unparseable order dates")
        df = df.dropna(subset=["date"])

    df["sku_id"] = df["Sub-Category"].str.strip() + " | " + df["Market"].str.strip()

    density = df.groupby("sku_id")["date"].nunique()
    keep = density[density >= min_active_days].index
    dropped = len(density) - len(keep)
    logger.info(
        f"Planning grain: Sub-Category x Market -> {len(density)} candidate SKUs; "
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
    """Derive per-SKU economics from the real Sales/Profit/Quantity columns."""
    agg = df.groupby("sku_id").agg(
        category=("Category", "first"),
        sub_category=("Sub-Category", "first"),
        market=("Market", "first"),
        total_sales=("Sales", "sum"),
        total_profit=("Profit", "sum"),
        total_qty=("Quantity", "sum"),
    ).reset_index()

    # Real unit economics: average realised price and cost per unit sold.
    agg["unit_price"] = (agg["total_sales"] / agg["total_qty"]).round(2)
    agg["unit_cost"] = ((agg["total_sales"] - agg["total_profit"]) / agg["total_qty"]).round(2)

    # Guard against loss-making categories producing a cost above price, which
    # would make every lost sale "profitable" to skip. Floor the margin at 5%.
    bad_margin = agg["unit_cost"] >= agg["unit_price"]
    if bad_margin.any():
        logger.warning(
            f"{int(bad_margin.sum())} SKU(s) sold at an aggregate loss in the real data "
            "(discount-heavy categories); flooring their margin at 5% so lost-sale "
            "valuations stay interpretable"
        )
        agg.loc[bad_margin, "unit_cost"] = (agg.loc[bad_margin, "unit_price"] * 0.95).round(2)

    agg["lead_time_days"] = agg["category"].map(config.REAL_DATA_LEAD_TIME_BY_CATEGORY).fillna(7).astype(int)
    agg["order_cost"] = agg["category"].map(config.REAL_DATA_ORDER_COST_BY_CATEGORY).fillna(40.0)
    agg["holding_cost_pct"] = agg["category"].map(config.REAL_DATA_HOLDING_COST_PCT_BY_CATEGORY).fillna(0.20)

    cols = [
        "sku_id", "category", "sub_category", "market",
        "unit_cost", "unit_price", "lead_time_days",
        "order_cost", "holding_cost_pct",
    ]
    return agg[cols]


def build_sales_fact(df):
    """Daily demand per planning SKU, with zero-fill for non-selling days."""
    daily = df.groupby(["sku_id", "date"]).agg(
        qty_sold=("Quantity", "sum"),
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
    """Reconstruct a plausible stock-on-hand history by running a NAIVE reorder
    policy against the real demand. This is the 'current state' baseline the
    optimized policy is later measured against."""
    rows = []
    sku_lookup = sku_dim.set_index("sku_id")

    for sku_id, g in sales_fact.groupby("sku_id"):
        g = g.sort_values("date")
        demand = g["qty_sold"].values
        lead_time = int(sku_lookup.loc[sku_id, "lead_time_days"])
        avg_demand = demand.mean()

        # Naive: reorder point = lead-time demand only (no safety stock),
        # order quantity = two weeks of average demand.
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
    parser = argparse.ArgumentParser(description="Build pipeline tables from the real Global Superstore dataset")
    parser.add_argument("--min-days", type=int, default=DEFAULT_MIN_ACTIVE_DAYS,
                        help=f"minimum active selling days for a SKU to be kept (default {DEFAULT_MIN_ACTIVE_DAYS})")
    args = parser.parse_args()

    raw = load_raw()
    df = build_planning_skus(raw, args.min_days)

    sku_dim = build_sku_dim(df)
    sales_fact = build_sales_fact(df)
    inventory_snapshot = build_inventory_snapshot(sales_fact, sku_dim)

    sku_dim.to_csv(config.DATA_DIR / "sku_dim.csv", index=False)
    sales_fact.to_csv(config.DATA_DIR / "sales_fact.csv", index=False)
    inventory_snapshot.to_csv(config.DATA_DIR / "inventory_snapshot.csv", index=False)

    logger.info(f"Wrote sku_dim.csv            : {len(sku_dim):,} planning SKUs")
    logger.info(f"Wrote sales_fact.csv         : {len(sales_fact):,} rows")
    logger.info(f"Wrote inventory_snapshot.csv : {len(inventory_snapshot):,} rows")
    logger.info(
        f"Real revenue represented: ${sales_fact['revenue'].sum():,.0f} "
        f"across {sku_dim['market'].nunique()} markets and {sku_dim['category'].nunique()} categories"
    )


if __name__ == "__main__":
    main()
