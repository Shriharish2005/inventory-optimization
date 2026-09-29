"""
report.py
---------
Generates a one-page, stakeholder-facing executive summary in Markdown
from the pipeline outputs -- the artefact a non-technical reader actually
reads, as opposed to the notebooks and CSVs.

Deliberately written as findings and recommendations rather than metrics:
every number is paired with what it means and what to do about it.

Usage:
    python src/report.py
"""

import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger

logger = get_logger("report")


def _read(name, **kwargs):
    path = config.OUT_DIR / name
    if not path.exists():
        raise FileNotFoundError(
            f"{path} not found -- run the full pipeline first (`python run_all.py`)"
        )
    return pd.read_csv(path, **kwargs)


def build_report():
    summary = _read("simulation_summary.csv", index_col=0).iloc[:, 0]
    results = _read("simulation_results.csv")
    policy = _read("inventory_policy.csv")
    alerts = _read("reorder_alerts.csv")
    sensitivity = _read("service_level_sensitivity.csv")
    accuracy = _read("forecast_accuracy.csv")

    seg_path = config.OUT_DIR / "abc_xyz_summary.csv"
    segmentation = pd.read_csv(seg_path) if seg_path.exists() else None

    dq_path = config.OUT_DIR / "data_quality_report.json"
    dq = json.loads(dq_path.read_text()) if dq_path.exists() else {}

    best_sl = sensitivity.loc[sensitivity["total_cost_of_policy"].idxmin()]
    red_alerts = alerts[alerts["status"] == "RED"]
    top_wins = results.nlargest(5, "net_dollar_impact")
    worst = results.nsmallest(3, "net_dollar_impact")

    n_days = int(summary["n_days_simulated"])
    years = n_days / 365.25

    lines = []
    A = lines.append

    A(f"# Inventory optimization: executive summary")
    A("")
    A(f"*Generated {date.today().isoformat()} from {int(summary['n_skus'])} planning SKUs "
      f"across {n_days:,} days ({years:.1f} years) of real transaction history.*")
    A("")

    A("## The recommendation in one line")
    A("")
    net = float(summary["net_dollar_impact"])
    A(f"Adopting a variability-aware reorder policy cuts stockout days by "
      f"**{summary['pct_stockout_reduction']:.1f}%** and delivers an estimated "
      f"**${net:,.0f} net benefit** over the simulated period, after paying for the "
      f"additional inventory it requires.")
    A("")

    A("## What was compared")
    A("")
    A("| | Current (naive) policy | Proposed (optimized) policy |")
    A("|---|---|---|")
    A(f"| Reorder trigger | Lead-time demand only | Lead-time demand + safety stock |")
    A(f"| Order quantity | Fixed 2 weeks of demand | Economic Order Quantity |")
    A(f"| Stockout days | {int(summary['total_stockout_days_naive']):,} | "
      f"{int(summary['total_stockout_days_optimized']):,} |")
    A(f"| Service level achieved | {float(summary['avg_service_level_naive']):.1%} | "
      f"{float(summary['avg_service_level_optimized']):.1%} |")
    A(f"| Inventory holding cost | ${float(summary['total_holding_cost_naive']):,.0f} | "
      f"${float(summary['total_holding_cost_optimized']):,.0f} |")
    A("")

    A("## The trade-off, stated honestly")
    A("")
    hold_delta = float(summary["total_holding_cost_delta"])
    lost_avoided = float(summary["est_lost_sales_avoided_value"])
    A(f"The optimized policy is **not free**. It carries more inventory, costing an additional "
      f"**${abs(hold_delta):,.0f}** in holding cost. In exchange it avoids an estimated "
      f"**${lost_avoided:,.0f}** in lost-sale margin by preventing "
      f"{int(summary['stockout_days_avoided']):,} stockout days.")
    A("")
    A(f"Net position: **${net:,.0f}**. The case rests on the assumption that roughly "
      f"{config.LOST_SALE_FRACTION:.0%} of demand during a stockout is genuinely lost rather "
      f"than deferred. If that figure is materially lower in practice, the case weakens — "
      f"it should be validated against actual backorder data before rollout.")
    A("")

    A("## Key finding: the service-level target is set too high")
    A("")
    A(f"Sweeping service-level targets from 90% to 99% shows total cost (holding + lost sales) "
      f"is minimised at **{best_sl['service_level_target']:.0%}**, not at the 98% typically "
      f"applied to high-value items. Pushing beyond that point buys fewer stockouts at a price "
      f"that exceeds the margin it protects.")
    A("")
    A("| Service level | Stockout days | Holding cost | Total cost |")
    A("|---|---|---|---|")
    for _, r in sensitivity.iterrows():
        marker = " **<- lowest**" if r["service_level_target"] == best_sl["service_level_target"] else ""
        A(f"| {r['service_level_target']:.0%} | {int(r['total_stockout_days']):,} | "
          f"${r['total_holding_cost']:,.0f} | ${r['total_cost_of_policy']:,.0f}{marker} |")
    A("")

    A("## Immediate operational actions")
    A("")
    A(f"**{len(red_alerts)} SKUs are at or below their reorder point right now** and need orders placed.")
    if len(red_alerts):
        A("")
        A("Highest-priority five (largest gap below reorder point):")
        A("")
        A("| SKU | Class | On hand | Reorder point | Suggested order |")
        A("|---|---|---|---|---|")
        for _, r in red_alerts.head(5).iterrows():
            A(f"| {r['sku_id']} | {r.get('abc_class', '-')} | {r['stock_on_hand']:,.0f} | "
              f"{r['reorder_point']:,.0f} | {r['suggested_order_qty']:,.0f} |")
    A("")

    A("## Where the value is concentrated")
    A("")
    A("Top five SKUs by net benefit:")
    A("")
    A("| SKU | Stockout days avoided | Net $ impact |")
    A("|---|---|---|")
    for _, r in top_wins.iterrows():
        A(f"| {r['sku_id']} | {int(r['stockout_days_avoided']):,} | ${r['net_dollar_impact']:,.0f} |")
    A("")
    if len(worst) and worst["net_dollar_impact"].min() < 0:
        A("Not every SKU benefits. These lose money under the optimized policy — the extra "
          "safety stock costs more than the stockouts it prevents, and they should stay on a "
          "simple reorder rule:")
        A("")
        A("| SKU | Net $ impact |")
        A("|---|---|")
        for _, r in worst.iterrows():
            A(f"| {r['sku_id']} | ${r['net_dollar_impact']:,.0f} |")
        A("")

    if segmentation is not None:
        A("## How to manage the catalogue")
        A("")
        A("ABC (value) crossed with XYZ (predictability) gives a management approach per segment:")
        A("")
        A("| Segment | SKUs | Revenue | Approach |")
        A("|---|---|---|---|")
        for _, r in segmentation.head(6).iterrows():
            A(f"| {r['segment']} | {int(r['n_skus'])} | ${r['revenue']:,.0f} | {r['recommended_approach']} |")
        A("")

    A("## Forecasting notes")
    A("")
    model_counts = accuracy["best_model"].value_counts().to_dict()
    A(f"Model selection across SKUs: {model_counts}. "
      f"Average error: {accuracy['best_mae'].mean():.2f} units/day.")
    A("")
    if dq.get("zero_demand_day_share") is not None:
        A(f"Demand is highly intermittent — **{dq['zero_demand_day_share']:.1%}** of all SKU-days "
          f"have zero sales. This is why Croston's method is selected for a large share of SKUs; "
          f"conventional smoothing models chase noise on sparse series.")
        A("")

    A("## Caveats")
    A("")
    A("- Supplier lead times are assumed by category; the source data records customer shipping "
      "dates, not replenishment lead times.")
    A("- Stock-on-hand history is reconstructed by simulating a naive policy against real demand, "
      "since the source data contains no inventory levels.")
    A(f"- Demand outliers beyond {dq.get('outlier_sigma_threshold', 5)} sigma were capped "
      f"({dq.get('demand_outliers_capped', 0):,} values) so single spikes do not inflate safety stock.")
    A("- Lost-sale valuation uses margin, not revenue, and applies the fraction noted above.")
    A("")

    return "\n".join(lines)


def main():
    md = build_report()
    out_path = config.OUT_DIR / "executive_summary.md"
    out_path.write_text(md, encoding="utf-8")
    logger.info(f"Executive summary written to {out_path} ({len(md.splitlines())} lines)")


if __name__ == "__main__":
    main()
