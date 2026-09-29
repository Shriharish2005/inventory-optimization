"""
config.py
---------
Single source of truth for paths and tunable parameters. Every script
imports from here instead of hardcoding values, so changing a service
level or a file path never requires hunting through multiple files.

Values can be overridden with environment variables (useful for Docker /
CI) without touching code, e.g.:
    INVOPT_TEST_DAYS=30 python src/forecast.py
"""

import os
from pathlib import Path

# ---- Paths ----
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
OUT_DIR = BASE_DIR / "outputs"
DB_PATH = DATA_DIR / "inventory.db"

for _dir in (DATA_DIR, RAW_DATA_DIR, OUT_DIR):
    _dir.mkdir(parents=True, exist_ok=True)


def _env_int(name, default):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_float(name, default):
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


# ---- Forecasting ----
TEST_DAYS = _env_int("INVOPT_TEST_DAYS", 60)          # backtest holdout window
MIN_HISTORY_DAYS = _env_int("INVOPT_MIN_HISTORY_DAYS", 90)  # minimum days of history required to forecast a SKU
SEASONAL_PERIOD = _env_int("INVOPT_SEASONAL_PERIOD", 7)     # weekly seasonality
INTERMITTENT_ZERO_SHARE = _env_float("INVOPT_INTERMITTENT_ZERO_SHARE", 0.4)  # % zero-demand days -> treat as intermittent

# ---- Inventory policy ----
DEFAULT_SERVICE_LEVEL = _env_float("INVOPT_DEFAULT_SERVICE_LEVEL", 0.95)
SERVICE_LEVEL_BY_CLASS = {
    "A": _env_float("INVOPT_SERVICE_LEVEL_A", 0.98),
    "B": _env_float("INVOPT_SERVICE_LEVEL_B", 0.95),
    "C": _env_float("INVOPT_SERVICE_LEVEL_C", 0.90),
}
ABC_A_THRESHOLD = _env_float("INVOPT_ABC_A_THRESHOLD", 0.80)  # cumulative revenue % for class A
ABC_B_THRESHOLD = _env_float("INVOPT_ABC_B_THRESHOLD", 0.95)  # cumulative revenue % for class B

# ---- Simulation / lost-sale valuation ----
LOST_SALE_FRACTION = _env_float("INVOPT_LOST_SALE_FRACTION", 0.5)  # share of a stockout day's demand assumed lost

# ---- Alerts (reorder status) ----
ALERT_YELLOW_BUFFER_DAYS = _env_int("INVOPT_ALERT_YELLOW_BUFFER_DAYS", 3)  # days of cover above reorder point counted as "watch"

# ---- Parallelism ----
MAX_WORKERS = _env_int("INVOPT_MAX_WORKERS", min(8, (os.cpu_count() or 4)))

# ---- Real-data loader ----
REAL_DATASET_RAW_FILE = RAW_DATA_DIR / "global_superstore.csv"
# Supplier lead-time assumptions by product category (the public dataset has
# customer shipping dates, not supplier replenishment lead times, so these
# are documented business assumptions rather than data-derived values).
REAL_DATA_LEAD_TIME_BY_CATEGORY = {
    "Furniture": 14,
    "Technology": 10,
    "Office Supplies": 5,
}
REAL_DATA_ORDER_COST_BY_CATEGORY = {
    "Furniture": 60.0,
    "Technology": 50.0,
    "Office Supplies": 25.0,
}
REAL_DATA_HOLDING_COST_PCT_BY_CATEGORY = {
    "Furniture": 0.22,
    "Technology": 0.28,
    "Office Supplies": 0.18,
}

# ---- Additive extension: lead-time VARIABILITY assumptions ----
# The base pipeline (compute_policy in policy.py) treats lead time as a
# fixed constant per category above. Real supplier lead-time distributions
# aren't in this dataset either (same gap as the mean lead time itself), so
# this is a second documented assumption -- not a data-derived figure --
# used only by the opt-in variable-lead-time analysis
# (src/variable_lead_time_analysis.py), never by the default pipeline.
# Expressed as a fraction of the mean lead time, following the common
# inventory-planning rule of thumb that supplier variability scales with
# the lead time itself (a supplier promising 14 days varies more in
# absolute days than one promising 5).
REAL_DATA_LEAD_TIME_STD_FRACTION_BY_CATEGORY = {
    "Furniture": 0.35,        # bulky/freight items: least reliable lead times
    "Technology": 0.25,
    "Office Supplies": 0.15,  # fast-moving, well-stocked supplier base
}
DEFAULT_LEAD_TIME_STD_FRACTION = _env_float("INVOPT_LEAD_TIME_STD_FRACTION", 0.25)

# ---- Additive extension: backorder model ----
# Used only by the opt-in backorder analysis (src/backorder_analysis.py).
# The base pipeline instead uses the single LOST_SALE_FRACTION above,
# applied as a flat rate to every stockout day.
BACKORDER_FILL_RATE = _env_float("INVOPT_BACKORDER_FILL_RATE", 0.5)

# ---- Alternative real-data source: DataCo Smart Supply Chain ----
# A second real dataset (180,508 transactions, 2015-2017, 5 markets, 11
# departments / 50 product categories), used by src/load_dataco_data.py as
# an alternative to the Global Superstore loader above. Unlike Superstore,
# this dataset records BOTH "Days for shipment (scheduled)" and "Days for
# shipping (real)" per order -- an actual observed supplier/carrier lead
# time and its real variability -- so lead times here are DATA-DERIVED
# (mean and std per department) rather than assumed, closing the biggest
# documented gap in the Superstore loader. Order cost and holding cost %
# are still business assumptions, since neither dataset records them.
DATACO_RAW_FILE = RAW_DATA_DIR / "dataco_supply_chain.csv"
DATACO_ORDER_COST_BY_DEPT = {
    "Technology": 55.0,
    "Discs Shop": 30.0,
    "Book Shop": 25.0,
    "Fitness": 35.0,
    "Golf": 45.0,
    "Outdoors": 45.0,
    "Fan Shop": 35.0,
    "Apparel": 30.0,
    "Footwear": 35.0,
    "Pet Shop": 30.0,
    "Health and Beauty ": 25.0,  # trailing space matches the raw column value
}
DATACO_HOLDING_COST_PCT_BY_DEPT = {
    "Technology": 0.28,
    "Discs Shop": 0.20,
    "Book Shop": 0.18,
    "Fitness": 0.22,
    "Golf": 0.24,
    "Outdoors": 0.22,
    "Fan Shop": 0.20,
    "Apparel": 0.25,
    "Footwear": 0.24,
    "Pet Shop": 0.20,
    "Health and Beauty ": 0.20,
}
# Order statuses that represent real fulfilled/expected demand. Rows outside
# this set (CANCELED, SUSPECTED_FRAUD) are dropped before aggregation so they
# don't inflate demand history with orders that were never actually shipped.
DATACO_VALID_ORDER_STATUSES = {
    "COMPLETE", "CLOSED", "PENDING", "PENDING_PAYMENT",
    "PROCESSING", "ON_HOLD", "PAYMENT_REVIEW",
}
