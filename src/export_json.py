"""
export_json.py
---------------
OPT-IN, additive bridge: converts the pipeline's CSV outputs into JSON for
the React/shadcn frontend (frontend/). Does not read from or write to any
existing CSV -- purely a read-only export step run after the base pipeline.

The frontend is a static client-side SPA (no backend framework), so it
reads bundled JSON rather than hitting a live API -- this script produces
exactly that bundle.

Run manually, after the base pipeline:
    python src/export_json.py

Or as part of the full pipeline:
    python run_all.py --with-frontend-data
"""

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger

logger = get_logger("export_json")

FRONTEND_DATA_DIR = config.BASE_DIR / "frontend" / "src" / "data"


def _read_csv(name, **kwargs):
    path = config.OUT_DIR / name
    if not path.exists():
        return None
    return pd.read_csv(path, **kwargs)


def _df_to_records(df):
    if df is None:
        return []
    # NaN -> null in JSON, not the string "NaN"
    return json.loads(df.to_json(orient="records"))


def export_summary():
    summary_df = pd.read_csv(config.OUT_DIR / "simulation_summary.csv", index_col=0)
    summary = summary_df.iloc[:, 0].to_dict()
    return {k: (None if pd.isna(v) else v) for k, v in summary.items()}


def export_sensitivity():
    return _df_to_records(_read_csv("service_level_sensitivity.csv"))


def export_policy():
    return _df_to_records(_read_csv("inventory_policy.csv"))


def export_alerts():
    return _df_to_records(_read_csv("reorder_alerts.csv"))


def export_simulation_results():
    return _df_to_records(_read_csv("simulation_results.csv"))


def export_abc():
    return _df_to_records(_read_csv("abc_classification.csv"))


def export_variability():
    return _df_to_records(_read_csv("demand_variability.csv"))


def export_segmentation():
    return {
        "detail": _df_to_records(_read_csv("abc_xyz_segmentation.csv")),
        "summary": _df_to_records(_read_csv("abc_xyz_summary.csv")),
    }


def export_forecast_accuracy():
    return _df_to_records(_read_csv("forecast_accuracy.csv"))


def export_forecast_vs_actual():
    df = _read_csv("forecast_vs_actual.csv", parse_dates=["date"])
    if df is None:
        return {}
    df = df.copy()
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    out = {}
    for sku_id, g in df.groupby("sku_id"):
        out[sku_id] = _df_to_records(g.drop(columns=["sku_id"]))
    return out


def export_geography():
    raw_path = config.REAL_DATASET_RAW_FILE
    if not raw_path.exists():
        logger.warning(f"{raw_path} not found -- skipping geography export")
        return []
    raw = pd.read_csv(raw_path, usecols=["Country", "Market", "Sales", "Profit", "Quantity"])
    by_country = raw.groupby("Country", as_index=False).agg(
        revenue=("Sales", "sum"), profit=("Profit", "sum"), units=("Quantity", "sum"))
    by_country["margin_pct"] = (by_country["profit"] / by_country["revenue"] * 100).round(1)
    return _df_to_records(by_country.sort_values("revenue", ascending=False))


def export_sku_dim():
    path = config.DATA_DIR / "sku_dim.csv"
    if not path.exists():
        return []
    return _df_to_records(pd.read_csv(path))


def export_executive_summary():
    path = config.OUT_DIR / "executive_summary.md"
    return path.read_text(encoding="utf-8") if path.exists() else ""


EXPORTERS = {
    "summary.json": export_summary,
    "sensitivity.json": export_sensitivity,
    "policy.json": export_policy,
    "alerts.json": export_alerts,
    "simulation_results.json": export_simulation_results,
    "abc.json": export_abc,
    "variability.json": export_variability,
    "segmentation.json": export_segmentation,
    "forecast_accuracy.json": export_forecast_accuracy,
    "forecast_vs_actual.json": export_forecast_vs_actual,
    "geography.json": export_geography,
    "sku_dim.json": export_sku_dim,
}


def main():
    required = config.OUT_DIR / "simulation_summary.csv"
    if not required.exists():
        raise FileNotFoundError(
            f"{required} not found -- run the base pipeline first: python run_all.py"
        )

    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)

    for filename, fn in EXPORTERS.items():
        try:
            data = fn()
        except Exception as exc:
            logger.warning(f"Skipped {filename}: {exc}")
            continue
        out_path = FRONTEND_DATA_DIR / filename
        out_path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
        size_kb = out_path.stat().st_size / 1024
        logger.info(f"Wrote {filename:<28} {size_kb:>7.1f} KB")

    summary_md = export_executive_summary()
    md_path = FRONTEND_DATA_DIR / "executive_summary.md.json"
    md_path.write_text(json.dumps(summary_md), encoding="utf-8")
    logger.info(f"Wrote {md_path.name:<28} {md_path.stat().st_size / 1024:>7.1f} KB")

    logger.info(f"Frontend data bundle written to {FRONTEND_DATA_DIR}")


if __name__ == "__main__":
    main()
