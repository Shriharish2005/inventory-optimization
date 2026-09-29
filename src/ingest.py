"""
ingest.py
---------
Validates the input CSVs, then loads them into a SQLite database
(inventory.db) with indexes for fast downstream queries.

Validation runs BEFORE the load so a malformed CSV fails fast with a
specific message rather than producing wrong numbers three steps later.

In production this would point at PostgreSQL/Snowflake instead -- swapping
the connection string is the only change needed.
"""

import sqlite3
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import config
from common.logging_utils import get_logger
from common.validation import (
    validate_sku_dim,
    validate_sales_fact,
    validate_inventory_snapshot,
)

logger = get_logger("ingest")


def read_inputs():
    required = {
        "sku_dim.csv": config.DATA_DIR / "sku_dim.csv",
        "sales_fact.csv": config.DATA_DIR / "sales_fact.csv",
        "inventory_snapshot.csv": config.DATA_DIR / "inventory_snapshot.csv",
    }
    missing = [name for name, p in required.items() if not p.exists()]
    if missing:
        raise FileNotFoundError(
            f"Missing input file(s): {', '.join(missing)} in {config.DATA_DIR}.\n"
            "Build them first with either:\n"
            "  python src/load_real_data.py    (real Global Superstore dataset)\n"
            "  python src/generate_data.py     (synthetic dataset)"
        )

    sku_dim = pd.read_csv(required["sku_dim.csv"])
    sales_fact = pd.read_csv(required["sales_fact.csv"], parse_dates=["date"])
    inventory_snapshot = pd.read_csv(required["inventory_snapshot.csv"], parse_dates=["date"])
    return sku_dim, sales_fact, inventory_snapshot


def validate_all(sku_dim, sales_fact, inventory_snapshot):
    logger.info("Validating input data...")

    r1 = validate_sku_dim(sku_dim)
    r1.log(logger)
    r1.raise_if_invalid("sku_dim")

    r2 = validate_sales_fact(sales_fact, sku_ids=sku_dim["sku_id"].unique())
    r2.log(logger)
    r2.raise_if_invalid("sales_fact")

    r3 = validate_inventory_snapshot(inventory_snapshot)
    r3.log(logger)
    r3.raise_if_invalid("inventory_snapshot")

    total_warnings = len(r1.warnings) + len(r2.warnings) + len(r3.warnings)
    if total_warnings:
        logger.info(f"Validation passed with {total_warnings} warning(s) -- see above")
    else:
        logger.info("Validation passed with no issues")


def main():
    sku_dim, sales_fact, inventory_snapshot = read_inputs()
    validate_all(sku_dim, sales_fact, inventory_snapshot)

    conn = sqlite3.connect(config.DB_PATH)
    try:
        sku_dim.to_sql("sku_dim", conn, if_exists="replace", index=False)
        sales_fact.to_sql("sales_fact", conn, if_exists="replace", index=False)
        inventory_snapshot.to_sql("inventory_snapshot", conn, if_exists="replace", index=False)

        conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_sku_date ON sales_fact(sku_id, date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_inv_sku_date ON inventory_snapshot(sku_id, date)")
        conn.commit()

        check = pd.read_sql(
            """
            SELECT s.category,
                   COUNT(DISTINCT f.sku_id) AS n_skus,
                   SUM(f.revenue)           AS total_revenue
            FROM sales_fact f
            JOIN sku_dim s ON f.sku_id = s.sku_id
            GROUP BY s.category
            ORDER BY total_revenue DESC
            """,
            conn,
        )
        logger.info(f"Loaded into {config.DB_PATH}")
        for _, row in check.iterrows():
            logger.info(f"  {row['category']:<20} {int(row['n_skus']):>4} SKUs   ${row['total_revenue']:>14,.0f}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
