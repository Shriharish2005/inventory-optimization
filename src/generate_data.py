"""
generate_data.py
-----------------
Generates a realistic (but synthetic) inventory dataset for the project:
- sku_dim.csv          : product master data (category, cost, price, lead time)
- sales_fact.csv       : daily sales transactions per SKU
- inventory_snapshot.csv : daily stock-on-hand per SKU

The data intentionally includes real-world messiness: missing days,
occasional data entry errors, and varying demand patterns (seasonal,
steady, spiky/promotional) so the cleaning step in the pipeline has
real work to do.
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

N_SKUS = 30
START_DATE = "2023-01-01"
END_DATE = "2024-12-31"
CATEGORIES = ["Beverages", "Snacks", "Dairy", "Frozen", "Household", "Personal Care"]

DEMAND_PROFILES = ["steady", "seasonal", "growing", "declining", "spiky"]


def build_sku_dim():
    rows = []
    for i in range(1, N_SKUS + 1):
        sku_id = f"SKU-{i:03d}"
        category = np.random.choice(CATEGORIES)
        unit_cost = round(np.random.uniform(2, 40), 2)
        margin = np.random.uniform(1.3, 2.2)
        unit_price = round(unit_cost * margin, 2)
        lead_time_days = int(np.random.choice([3, 5, 7, 10, 14, 21], p=[0.15, 0.2, 0.25, 0.2, 0.12, 0.08]))
        order_cost = round(np.random.uniform(15, 75), 2)  # cost to place one purchase order
        holding_cost_pct = round(np.random.uniform(0.15, 0.30), 2)  # annual holding cost as % of unit cost
        demand_profile = np.random.choice(DEMAND_PROFILES)
        base_daily_demand = round(np.random.uniform(3, 60), 1)
        rows.append({
            "sku_id": sku_id,
            "category": category,
            "unit_cost": unit_cost,
            "unit_price": unit_price,
            "lead_time_days": lead_time_days,
            "order_cost": order_cost,
            "holding_cost_pct": holding_cost_pct,
            "demand_profile": demand_profile,
            "base_daily_demand": base_daily_demand,
        })
    return pd.DataFrame(rows)


def simulate_demand(dates, profile, base_demand):
    n = len(dates)
    t = np.arange(n)
    doy = dates.dayofyear.values
    dow = dates.dayofweek.values

    weekly_effect = 1 + 0.15 * np.sin(2 * np.pi * dow / 7)

    if profile == "steady":
        trend = np.ones(n)
    elif profile == "seasonal":
        trend = 1 + 0.5 * np.sin(2 * np.pi * doy / 365.25)
    elif profile == "growing":
        trend = 1 + (t / n) * 0.8
    elif profile == "declining":
        trend = 1 - (t / n) * 0.5
    elif profile == "spiky":
        trend = np.ones(n)
    else:
        trend = np.ones(n)

    mean_demand = base_demand * trend * weekly_effect
    mean_demand = np.clip(mean_demand, 0.1, None)

    demand = np.random.poisson(mean_demand)

    if profile == "spiky":
        promo_days = np.random.choice(n, size=max(1, n // 45), replace=False)
        demand[promo_days] = (demand[promo_days] * np.random.uniform(3, 6, size=len(promo_days))).astype(int)

    return demand


def build_sales_and_inventory(sku_dim):
    dates = pd.date_range(START_DATE, END_DATE, freq="D")
    sales_rows = []
    inv_rows = []

    for _, sku in sku_dim.iterrows():
        demand = simulate_demand(dates, sku["demand_profile"], sku["base_daily_demand"])

        stock = sku["base_daily_demand"] * sku["lead_time_days"] * 2.5
        reorder_point_est = sku["base_daily_demand"] * sku["lead_time_days"] * 1.3
        order_qty = sku["base_daily_demand"] * 14

        for d, qty_demanded in zip(dates, demand):
            qty_sold = min(qty_demanded, max(stock, 0))
            stock -= qty_sold

            if stock <= reorder_point_est:
                # simulate a delayed delivery arriving after lead time (not modeled day-by-day here,
                # simplified as an immediate partial restock with occasional delay noise)
                if np.random.rand() > 0.08:
                    stock += order_qty * np.random.uniform(0.9, 1.1)

            sales_rows.append({
                "date": d,
                "sku_id": sku["sku_id"],
                "qty_sold": int(qty_sold),
                "revenue": round(qty_sold * sku["unit_price"], 2),
            })
            inv_rows.append({
                "date": d,
                "sku_id": sku["sku_id"],
                "stock_on_hand": max(0, round(stock)),
            })

    sales_df = pd.DataFrame(sales_rows)
    inv_df = pd.DataFrame(inv_rows)
    return sales_df, inv_df


def introduce_messiness(sales_df, inv_df):
    """Inject realistic data-quality issues for the cleaning step to handle."""
    sales_df = sales_df.copy()

    # 1. Randomly drop ~1.5% of rows (missing days in feed)
    drop_idx = sales_df.sample(frac=0.015, random_state=1).index
    sales_df = sales_df.drop(drop_idx)

    # 2. A handful of duplicate rows (double-counted uploads)
    dup_rows = sales_df.sample(frac=0.005, random_state=2)
    sales_df = pd.concat([sales_df, dup_rows], ignore_index=True)

    # 3. A few negative/erroneous quantities (data entry errors)
    err_idx = sales_df.sample(frac=0.003, random_state=3).index
    sales_df.loc[err_idx, "qty_sold"] = -sales_df.loc[err_idx, "qty_sold"].abs()

    return sales_df.reset_index(drop=True), inv_df


def main():
    print("Generating SKU master data...")
    sku_dim = build_sku_dim()

    print("Simulating daily sales and inventory levels...")
    sales_df, inv_df = build_sales_and_inventory(sku_dim)

    print("Injecting realistic data-quality issues...")
    sales_df, inv_df = introduce_messiness(sales_df, inv_df)

    sku_dim.to_csv(DATA_DIR / "sku_dim.csv", index=False)
    sales_df.to_csv(DATA_DIR / "sales_fact.csv", index=False)
    inv_df.to_csv(DATA_DIR / "inventory_snapshot.csv", index=False)

    print(f"Done. Files written to {DATA_DIR}/")
    print(f"  sku_dim.csv            : {len(sku_dim)} SKUs")
    print(f"  sales_fact.csv         : {len(sales_df):,} rows")
    print(f"  inventory_snapshot.csv : {len(inv_df):,} rows")


if __name__ == "__main__":
    main()
