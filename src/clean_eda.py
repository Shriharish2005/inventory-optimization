"""
clean_eda.py
------------
Cleans the raw sales data and runs exploratory analysis.

Cleaning: deduplication, negative-quantity correction, and outlier
flagging (demand spikes beyond 5 sigma are capped for forecasting but
recorded, since a genuine promo spike shouldn't quietly inflate every
safety-stock number downstream).

Analysis: ABC classification, demand variability, an XYZ predictability
classification, and a combined ABC-XYZ segmentation -- the standard
inventory-planning framework for deciding which SKUs get tight
forecasting versus simple rules.

Outputs a data-quality report plus charts and CSVs to outputs/.
"""

import json
import sqlite3
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger

logger = get_logger("clean_eda")

OUTLIER_SIGMA = 5.0


from typing import Any

def clean_sales(conn):
    df = pd.read_sql("SELECT * FROM sales_fact", conn, parse_dates=["date"])
    n_before = len(df)
    report: dict[str, Any] = {"rows_in": n_before}

    n_bad_dates = df["date"].isna().sum()
    if n_bad_dates:
        df = df.dropna(subset=["date"])
    report["rows_dropped_bad_date"] = int(n_bad_dates)

    dupes = df.duplicated(subset=["date", "sku_id"]).sum()
    df = df.drop_duplicates(subset=["date", "sku_id"], keep="first")
    report["duplicate_rows_removed"] = int(dupes)

    n_negative = (df["qty_sold"] < 0).sum()
    df["qty_sold"] = df["qty_sold"].clip(lower=0)
    df["revenue"] = df["revenue"].clip(lower=0)
    report["negative_values_corrected"] = int(n_negative)

    # Outlier capping: per-SKU, cap demand above mean + 5 sigma so a single
    # extreme spike doesn't dominate the variability estimate that drives
    # safety stock. Flagged and counted rather than silently altered.
    stats = df.groupby("sku_id")["qty_sold"].agg(["mean", "std"])
    df = df.merge(stats, left_on="sku_id", right_index=True, how="left")
    df["std"] = df["std"].fillna(0)
    cap = df["mean"] + OUTLIER_SIGMA * df["std"]
    outlier_mask = df["qty_sold"] > cap
    n_outliers = outlier_mask.sum()
    df["qty_sold_raw"] = df["qty_sold"]
    df.loc[outlier_mask, "qty_sold"] = cap[outlier_mask].round()
    df = df.drop(columns=["mean", "std"])
    report["demand_outliers_capped"] = int(n_outliers)
    report["outlier_sigma_threshold"] = OUTLIER_SIGMA

    report["rows_out"] = len(df)
    zero_share = float((df["qty_sold"] == 0).mean())
    report["zero_demand_day_share"] = round(zero_share, 3)

    logger.info(
        f"Cleaning: {n_before:,} -> {len(df):,} rows "
        f"({dupes:,} duplicates, {n_negative:,} negatives, {n_outliers:,} outliers capped)"
    )
    logger.info(f"Zero-demand days: {zero_share:.1%} of all SKU-days (drives intermittent-demand model choice)")

    df.to_sql("sales_fact_clean", conn, if_exists="replace", index=False)
    with open(config.OUT_DIR / "data_quality_report.json", "w") as f:
        json.dump(report, f, indent=2)
    return df


def abc_analysis(df, sku_dim):
    revenue_by_sku = (
        df.groupby("sku_id")["revenue"].sum().sort_values(ascending=False).reset_index()
    )
    total = revenue_by_sku["revenue"].sum()
    revenue_by_sku["cum_pct"] = revenue_by_sku["revenue"].cumsum() / total if total else 0
    revenue_by_sku["revenue_share"] = revenue_by_sku["revenue"] / total if total else 0

    def classify(cum_pct):
        if cum_pct <= config.ABC_A_THRESHOLD:
            return "A"
        if cum_pct <= config.ABC_B_THRESHOLD:
            return "B"
        return "C"

    revenue_by_sku["abc_class"] = revenue_by_sku["cum_pct"].apply(classify)
    meta_cols = [c for c in ["sku_id", "category", "sub_category", "market"] if c in sku_dim.columns]
    result = revenue_by_sku.merge(sku_dim[meta_cols], on="sku_id", how="left")

    counts = result["abc_class"].value_counts().to_dict()
    logger.info(f"ABC classification: {counts}")

    fig, ax1 = plt.subplots(figsize=(11, 5))
    colors = result["abc_class"].map({"A": "#0F6E56", "B": "#854F0B", "C": "#5F5E5A"})
    ax1.bar(range(len(result)), result["revenue"], color=colors)
    ax1.set_xlabel("SKU (ranked by revenue)")
    ax1.set_ylabel("Revenue ($)")
    ax2 = ax1.twinx()
    ax2.plot(range(len(result)), result["cum_pct"] * 100, color="black", linewidth=1.2)
    ax2.axhline(config.ABC_A_THRESHOLD * 100, color="gray", linestyle="--", linewidth=1)
    ax2.set_ylabel("Cumulative % of revenue")
    ax1.set_title("ABC analysis: revenue contribution by planning SKU")
    fig.tight_layout()
    fig.savefig(config.OUT_DIR / "abc_pareto.png", dpi=120)
    plt.close(fig)

    result.to_csv(config.OUT_DIR / "abc_classification.csv", index=False)
    return result


def demand_variability(df, sku_dim):
    """Compute per-SKU demand variability and XYZ predictability class.

    XYZ is the standard companion to ABC: X = stable and easy to forecast,
    Y = moderately variable, Z = erratic. Combined with ABC it tells you
    where forecasting effort actually pays off.
    """
    daily = df.groupby(["sku_id", "date"])["qty_sold"].sum().reset_index()

    # Daily demand in real retail data is highly intermittent (most SKU-days
    # are zero), which inflates the coefficient of variation for every SKU and
    # makes XYZ classification meaningless. Standard practice is to measure
    # predictability on WEEKLY buckets, where the signal is visible. Safety
    # stock still uses daily sigma -- only the XYZ label uses weekly CV.
    weekly = (
        daily.set_index("date")
        .groupby("sku_id")["qty_sold"]
        .resample("W")
        .sum()
        .reset_index()
    )
    weekly_stats = weekly.groupby("sku_id")["qty_sold"].agg(
        weekly_mean="mean", weekly_std="std"
    ).reset_index()
    weekly_stats["cv"] = (
        weekly_stats["weekly_std"] / weekly_stats["weekly_mean"].replace(0, np.nan)
    ).fillna(0)

    daily_stats = daily.groupby("sku_id")["qty_sold"].agg(["mean", "std"]).reset_index()
    stats = daily_stats.merge(weekly_stats[["sku_id", "cv", "weekly_mean", "weekly_std"]], on="sku_id")

    zero_share = daily.groupby("sku_id")["qty_sold"].apply(lambda s: (s == 0).mean()).rename("zero_day_share")
    stats = stats.merge(zero_share, on="sku_id")

    def xyz(cv):
        if cv <= 0.5:
            return "X"
        if cv <= 1.0:
            return "Y"
        return "Z"

    stats["xyz_class"] = stats["cv"].apply(xyz)
    meta_cols = [c for c in ["sku_id", "category", "sub_category", "market"] if c in sku_dim.columns]
    stats = stats.merge(sku_dim[meta_cols], on="sku_id", how="left").sort_values("cv", ascending=False)

    logger.info(f"XYZ predictability: {stats['xyz_class'].value_counts().to_dict()}")

    fig, ax = plt.subplots(figsize=(11, 5))
    colors = stats["xyz_class"].map({"X": "#0F6E56", "Y": "#854F0B", "Z": "#A32D2D"})
    ax.bar(range(len(stats)), stats["cv"], color=colors)
    ax.set_ylabel("Coefficient of variation (weekly demand)")
    ax.set_xlabel("SKU (ranked by volatility)")
    ax.set_title("Demand predictability by SKU (X = stable, Y = variable, Z = erratic)")
    fig.tight_layout()
    fig.savefig(config.OUT_DIR / "demand_variability.png", dpi=120)
    plt.close(fig)

    stats.to_csv(config.OUT_DIR / "demand_variability.csv", index=False)
    return stats


def abc_xyz_segmentation(abc_result, variability):
    """Cross ABC (value) with XYZ (predictability) into a 9-box segmentation
    and attach a recommended management approach to each combination."""
    seg = abc_result[["sku_id", "abc_class", "revenue"]].merge(
        variability[["sku_id", "xyz_class", "cv", "zero_day_share"]], on="sku_id", how="inner"
    )
    seg["segment"] = seg["abc_class"] + seg["xyz_class"]

    recommendations = {
        "AX": "High value, predictable -- automate replenishment, keep safety stock lean",
        "AY": "High value, moderately variable -- forecast closely, review monthly",
        "AZ": "High value, erratic -- highest risk; hold generous safety stock and review weekly",
        "BX": "Mid value, predictable -- automate with periodic review",
        "BY": "Mid value, variable -- standard reorder policy",
        "BZ": "Mid value, erratic -- buffer with safety stock, avoid over-forecasting",
        "CX": "Low value, predictable -- simple fixed reorder rule, minimal attention",
        "CY": "Low value, variable -- simple rule, accept occasional stockouts",
        "CZ": "Low value, erratic -- consider make-to-order or delisting",
    }
    seg["recommended_approach"] = seg["segment"].map(recommendations)

    summary = seg.groupby("segment").agg(
        n_skus=("sku_id", "count"), revenue=("revenue", "sum")
    ).reset_index().sort_values("revenue", ascending=False)
    summary["recommended_approach"] = summary["segment"].map(recommendations)

    logger.info(f"ABC-XYZ segmentation: {len(seg)} SKUs across {seg['segment'].nunique()} segments")

    seg.to_csv(config.OUT_DIR / "abc_xyz_segmentation.csv", index=False)
    summary.to_csv(config.OUT_DIR / "abc_xyz_summary.csv", index=False)
    return seg


def main():
    conn = sqlite3.connect(config.DB_PATH)
    try:
        sku_dim = pd.read_sql("SELECT * FROM sku_dim", conn)
        clean_df = clean_sales(conn)
        abc_result = abc_analysis(clean_df, sku_dim)
        variability = demand_variability(clean_df, sku_dim)
        abc_xyz_segmentation(abc_result, variability)
        logger.info(f"Outputs written to {config.OUT_DIR}/")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
