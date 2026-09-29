"""
validation.py
--------------
Schema and sanity checks for the three input tables. Run these before
loading data into the pipeline so a malformed CSV fails fast with a
clear, specific message instead of a confusing KeyError three steps
downstream (or worse, silently producing wrong numbers).

Each validate_* function returns a ValidationReport. Errors mean the
pipeline should stop; warnings are printed but non-fatal.
"""

from dataclasses import dataclass, field


class DataValidationError(Exception):
    """Raised when input data fails a hard schema/sanity check."""


@dataclass
class ValidationReport:
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)

    @property
    def ok(self):
        return len(self.errors) == 0

    def raise_if_invalid(self, context=""):
        if not self.ok:
            prefix = f"[{context}] " if context else ""
            msg = prefix + "; ".join(self.errors)
            raise DataValidationError(msg)

    def log(self, logger):
        for w in self.warnings:
            logger.warning(w)
        for e in self.errors:
            logger.error(e)


REQUIRED_SKU_DIM_COLUMNS = {
    "sku_id", "category", "unit_cost", "unit_price",
    "lead_time_days", "order_cost", "holding_cost_pct",
}
REQUIRED_SALES_COLUMNS = {"date", "sku_id", "qty_sold", "revenue"}
REQUIRED_INVENTORY_COLUMNS = {"date", "sku_id", "stock_on_hand"}


def _check_columns(df, required, label, report):
    missing = required - set(df.columns)
    if missing:
        report.errors.append(f"{label} is missing required column(s): {sorted(missing)}")


def validate_sku_dim(df):
    report = ValidationReport()
    _check_columns(df, REQUIRED_SKU_DIM_COLUMNS, "sku_dim", report)
    if not report.ok:
        return report

    if df["sku_id"].duplicated().any():
        dupes = df.loc[df["sku_id"].duplicated(), "sku_id"].unique().tolist()
        report.errors.append(f"sku_dim has duplicate sku_id values: {dupes[:10]}")

    for col in ("unit_cost", "unit_price", "lead_time_days", "order_cost"):
        if (df[col] <= 0).any():
            report.warnings.append(
                f"sku_dim: {int((df[col] <= 0).sum())} row(s) have non-positive '{col}'; "
                "these SKUs may produce nonsensical policy numbers"
            )

    if (df["unit_price"] < df["unit_cost"]).any():
        n = int((df["unit_price"] < df["unit_cost"]).sum())
        report.warnings.append(
            f"sku_dim: {n} SKU(s) have unit_price < unit_cost (negative margin) -- "
            "lost-sale value estimates for these will be negative"
        )

    if ((df["holding_cost_pct"] <= 0) | (df["holding_cost_pct"] > 1)).any():
        report.warnings.append(
            "sku_dim: some holding_cost_pct values are outside the plausible (0, 1] range"
        )

    if df.empty:
        report.errors.append("sku_dim has zero rows")

    return report


def validate_sales_fact(df, sku_ids=None):
    report = ValidationReport()
    _check_columns(df, REQUIRED_SALES_COLUMNS, "sales_fact", report)
    if not report.ok:
        return report

    if df.empty:
        report.errors.append("sales_fact has zero rows")
        return report

    if df["date"].isna().any():
        report.warnings.append(f"sales_fact: {int(df['date'].isna().sum())} row(s) have an unparseable date and will be dropped")

    if (df["qty_sold"] < 0).any():
        report.warnings.append(
            f"sales_fact: {int((df['qty_sold'] < 0).sum())} row(s) have negative qty_sold "
            "(will be treated as data-entry errors and clipped to 0 during cleaning)"
        )

    dupe_mask = df.duplicated(subset=["date", "sku_id"], keep=False)
    if dupe_mask.any():
        report.warnings.append(
            f"sales_fact: {int(dupe_mask.sum())} row(s) share a duplicate (date, sku_id) pair "
            "(will be deduplicated during cleaning)"
        )

    if sku_ids is not None:
        orphans = set(df["sku_id"].unique()) - set(sku_ids)
        if orphans:
            report.warnings.append(
                f"sales_fact: {len(orphans)} sku_id value(s) have no matching row in sku_dim "
                f"and will be dropped from downstream joins: {sorted(orphans)[:10]}"
            )

    return report


def validate_inventory_snapshot(df):
    report = ValidationReport()
    _check_columns(df, REQUIRED_INVENTORY_COLUMNS, "inventory_snapshot", report)
    if not report.ok:
        return report
    if (df["stock_on_hand"] < 0).any():
        report.warnings.append(
            f"inventory_snapshot: {int((df['stock_on_hand'] < 0).sum())} row(s) have negative stock_on_hand"
        )
    return report
