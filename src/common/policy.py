"""
policy.py
---------
Pure, dependency-light functions for turning demand statistics into an
inventory policy, and for simulating that policy against demand history.
Kept separate from any file I/O so they can be:
  - imported by optimize.py and simulate.py (no duplicated formulas)
  - imported directly by analytical scripts and simulators
  - unit tested in isolation (see tests/test_policy.py)
"""

from dataclasses import dataclass

import numpy as np
from scipy.stats import norm  # type: ignore


@dataclass
class SkuPolicy:
    sku_id: str
    service_level: float
    z_score: float
    safety_stock: float
    reorder_point: float
    eoq: float
    orders_per_year: float
    annual_holding_cost: float
    annual_ordering_cost: float
    annual_inventory_cost: float


def compute_policy(
    avg_daily_demand,
    std_daily_demand,
    lead_time_days,
    unit_cost,
    order_cost,
    holding_cost_pct,
    service_level,
    sku_id="",
):
    """Compute safety stock, reorder point, and EOQ for a single SKU.

    safety_stock  = z(service_level) * std_daily_demand * sqrt(lead_time)
    reorder_point = avg_daily_demand * lead_time + safety_stock
    eoq           = sqrt(2 * annual_demand * order_cost / holding_cost_per_unit)
    """
    if avg_daily_demand < 0 or std_daily_demand < 0:
        raise ValueError(f"[{sku_id}] demand statistics must be non-negative")
    if lead_time_days <= 0:
        raise ValueError(f"[{sku_id}] lead_time_days must be positive, got {lead_time_days}")
    if not (0 < service_level < 1):
        raise ValueError(f"[{sku_id}] service_level must be in (0, 1), got {service_level}")

    z = float(norm.ppf(service_level))
    safety_stock = max(0.0, z * std_daily_demand * np.sqrt(lead_time_days))
    reorder_point = avg_daily_demand * lead_time_days + safety_stock

    annual_demand = avg_daily_demand * 365
    holding_cost_per_unit = max(unit_cost * holding_cost_pct, 1e-6)  # guard against divide-by-zero

    if annual_demand <= 0:
        eoq = 0.0
    else:
        eoq = float(np.sqrt((2 * annual_demand * order_cost) / holding_cost_per_unit))
    eoq = max(eoq, 1.0)  # never recommend ordering zero units

    orders_per_year = annual_demand / eoq if eoq else 0.0
    annual_holding_cost = (eoq / 2 + safety_stock) * holding_cost_per_unit
    annual_ordering_cost = orders_per_year * order_cost

    return SkuPolicy(
        sku_id=sku_id,
        service_level=service_level,
        z_score=round(z, 3),
        safety_stock=round(safety_stock, 1),
        reorder_point=round(reorder_point, 1),
        eoq=round(eoq, 0),
        orders_per_year=round(orders_per_year, 1),
        annual_holding_cost=round(annual_holding_cost, 2),
        annual_ordering_cost=round(annual_ordering_cost, 2),
        annual_inventory_cost=round(annual_holding_cost + annual_ordering_cost, 2),
    )


def run_sQ_simulation(daily_demand, lead_time, reorder_point, order_qty):
    """Classic (s, Q) inventory simulation, reordering off inventory POSITION
    (on-hand + already-on-order) rather than on-hand stock alone. This allows
    multiple orders to be in the pipeline at once, which matters for fast
    movers whose order cycle (order_qty / demand) is shorter than the
    supplier lead time -- a single-order-at-a-time policy would be
    infeasible for those SKUs and understate real-world practice.

    Returns (stockout_days, avg_stock_on_hand, ending_stock_on_hand).
    """
    daily_demand = np.asarray(daily_demand, dtype=float)
    lead_time = max(1, int(lead_time))
    order_qty = max(order_qty, 1.0)

    stock = reorder_point + order_qty  # start fully stocked at the top of a cycle
    pending_orders = []  # list of [arrival_day, qty]
    stockout_days = 0
    stock_levels = np.empty(len(daily_demand))

    for day_idx, demand in enumerate(daily_demand):
        if pending_orders:
            arriving = [o for o in pending_orders if o[0] == day_idx]
            if arriving:
                stock += sum(o[1] for o in arriving)
                pending_orders = [o for o in pending_orders if o[0] != day_idx]

        if demand > stock:
            stockout_days += 1
        stock = max(0.0, stock - demand)

        inventory_position = stock + sum(o[1] for o in pending_orders)
        if inventory_position <= reorder_point:
            pending_orders.append([day_idx + lead_time, order_qty])

        stock_levels[day_idx] = stock

    if len(stock_levels) == 0:
        return 0, 0.0, 0.0
    return stockout_days, float(stock_levels.mean()), float(stock_levels[-1])


def reorder_status(current_stock, reorder_point, avg_daily_demand, yellow_buffer_days=3):
    """Classify a SKU's current inventory position for the alerts dashboard.

    RED    : at or below the reorder point right now -- place an order today.
    YELLOW : within `yellow_buffer_days` of average demand above the reorder
             point -- will likely cross it soon, worth watching.
    GREEN  : comfortably above the reorder point.
    """
    if avg_daily_demand <= 0:
        buffer_units = 0
    else:
        buffer_units = yellow_buffer_days * avg_daily_demand

    if current_stock <= reorder_point:
        return "RED"
    if current_stock <= reorder_point + buffer_units:
        return "YELLOW"
    return "GREEN"


# =====================================================================
# ADDITIVE EXTENSIONS -- everything below is new. Nothing above this
# line was changed; compute_policy(), run_sQ_simulation(), and
# reorder_status() keep their original signatures and behaviour so
# every existing caller (optimize.py, simulate.py, the frontend data export,
# the original tests) is unaffected.
# =====================================================================


@dataclass
class SkuPolicyVLT(SkuPolicy):
    """Same fields as SkuPolicy, plus the lead-time assumption actually used,
    so a report can show the reader that variability was modelled rather
    than assumed away."""
    avg_lead_time_days: float = 0.0
    std_lead_time_days: float = 0.0


def compute_policy_variable_lead_time(
    avg_daily_demand,
    std_daily_demand,
    avg_lead_time_days,
    std_lead_time_days,
    unit_cost,
    order_cost,
    holding_cost_pct,
    service_level,
    sku_id="",
):
    """Same policy as compute_policy(), except the supplier lead time is
    treated as a random variable (mean + std) instead of a fixed constant.

    The base pipeline assumes a constant lead time per category, which is a
    documented simplification (see README: "Known limitations"). In reality
    a supplier's lead time varies shipment to shipment, and that variability
    is often a BIGGER driver of stockouts than demand variability alone.

    Combined-variance safety stock (the standard formula when both demand
    and lead time are random and independent):

        sigma_combined = sqrt(
            avg_lead_time * std_daily_demand**2
            + avg_daily_demand**2 * std_lead_time**2
        )
        safety_stock = z(service_level) * sigma_combined

    When std_lead_time_days == 0 this reduces exactly to the fixed-lead-time
    formula in compute_policy(), so it is a strict generalisation, not a
    different model.
    """
    if avg_daily_demand < 0 or std_daily_demand < 0:
        raise ValueError(f"[{sku_id}] demand statistics must be non-negative")
    if avg_lead_time_days <= 0:
        raise ValueError(f"[{sku_id}] avg_lead_time_days must be positive, got {avg_lead_time_days}")
    if std_lead_time_days < 0:
        raise ValueError(f"[{sku_id}] std_lead_time_days must be non-negative")
    if not (0 < service_level < 1):
        raise ValueError(f"[{sku_id}] service_level must be in (0, 1), got {service_level}")

    z = float(norm.ppf(service_level))
    combined_variance = (
        avg_lead_time_days * std_daily_demand ** 2
        + (avg_daily_demand ** 2) * (std_lead_time_days ** 2)
    )
    sigma_combined = np.sqrt(max(combined_variance, 0.0))
    safety_stock = max(0.0, z * sigma_combined)
    reorder_point = avg_daily_demand * avg_lead_time_days + safety_stock

    annual_demand = avg_daily_demand * 365
    holding_cost_per_unit = max(unit_cost * holding_cost_pct, 1e-6)

    eoq = 0.0 if annual_demand <= 0 else float(
        np.sqrt((2 * annual_demand * order_cost) / holding_cost_per_unit)
    )
    eoq = max(eoq, 1.0)

    orders_per_year = annual_demand / eoq if eoq else 0.0
    annual_holding_cost = (eoq / 2 + safety_stock) * holding_cost_per_unit
    annual_ordering_cost = orders_per_year * order_cost

    return SkuPolicyVLT(
        sku_id=sku_id,
        service_level=service_level,
        z_score=round(z, 3),
        safety_stock=round(safety_stock, 1),
        reorder_point=round(reorder_point, 1),
        eoq=round(eoq, 0),
        orders_per_year=round(orders_per_year, 1),
        annual_holding_cost=round(annual_holding_cost, 2),
        annual_ordering_cost=round(annual_ordering_cost, 2),
        annual_inventory_cost=round(annual_holding_cost + annual_ordering_cost, 2),
        avg_lead_time_days=round(avg_lead_time_days, 2),
        std_lead_time_days=round(std_lead_time_days, 2),
    )


def sample_lead_time(avg_lead_time_days, std_lead_time_days, rng):
    """Draw one realistic lead-time sample (whole days, at least 1) from a
    normal distribution truncated at 1 day. Used by the backorder simulation
    so each replenishment order can arrive early or late, not always exactly
    on the mean lead time."""
    if std_lead_time_days <= 0:
        return max(1, int(round(avg_lead_time_days)))
    draw = rng.normal(avg_lead_time_days, std_lead_time_days)
    return max(1, int(round(draw)))


def run_sQ_simulation_with_backorders(
    daily_demand,
    lead_time,
    reorder_point,
    order_qty,
    backorder_fill_rate=0.5,
    std_lead_time_days=0.0,
    rng=None,
):
    """Extends run_sQ_simulation() with explicit backorder handling instead
    of the simulator's original all-or-nothing stockout day count.

    The base simulate.py values a stockout day using a flat assumption
    (LOST_SALE_FRACTION, default 50%) applied uniformly to every stockout.
    This function replaces that blanket assumption with an actual
    day-by-day backlog: unmet demand is split into a portion customers wait
    for (filled from the next delivery) and a portion genuinely lost, per
    `backorder_fill_rate`. It also supports a stochastic lead time via
    `std_lead_time_days`, reusing sample_lead_time() above.

    Returns a dict: stockout_days, avg_stock_on_hand, ending_stock_on_hand,
    units_backordered (recovered once stock arrives), units_lost (never
    recovered), and max_backlog (worst simultaneous backlog, a service
    signal on its own).

    This does not replace run_sQ_simulation() -- simulate.py's existing
    naive-vs-optimized comparison and its output files are untouched. This
    is an additional, opt-in analysis a caller can run alongside it.
    """
    daily_demand = np.asarray(daily_demand, dtype=float)
    lead_time = max(1, int(lead_time))
    order_qty = max(order_qty, 1.0)
    if not (0.0 <= backorder_fill_rate <= 1.0):
        raise ValueError(f"backorder_fill_rate must be in [0, 1], got {backorder_fill_rate}")
    rng = rng or np.random.default_rng()

    stock = reorder_point + order_qty
    pending_orders = []  # list of [arrival_day, qty]
    backlog = 0.0
    stockout_days = 0
    units_backordered = 0.0
    units_lost = 0.0
    max_backlog = 0.0
    stock_levels = np.empty(len(daily_demand))

    for day_idx, demand in enumerate(daily_demand):
        if pending_orders:
            arriving = [o for o in pending_orders if o[0] == day_idx]
            if arriving:
                arrived_qty = sum(o[1] for o in arriving)
                pending_orders = [o for o in pending_orders if o[0] != day_idx]
                stock += arrived_qty
                if backlog > 0:
                    fill = min(backlog, stock)
                    stock -= fill
                    backlog -= fill
                    units_backordered += fill

        total_demand_today = demand + 0  # today's fresh demand only enters backlog logic below
        if total_demand_today > stock:
            stockout_days += 1
            unmet = total_demand_today - stock
            stock = 0.0
            waited = unmet * backorder_fill_rate
            lost = unmet - waited
            backlog += waited
            units_lost += lost
            max_backlog = max(max_backlog, backlog)
        else:
            stock -= total_demand_today

        inventory_position = stock + sum(o[1] for o in pending_orders) - backlog
        if inventory_position <= reorder_point:
            lt = sample_lead_time(lead_time, std_lead_time_days, rng)
            pending_orders.append([day_idx + lt, order_qty])

        stock_levels[day_idx] = stock

    if len(stock_levels) == 0:
        return {
            "stockout_days": 0, "avg_stock_on_hand": 0.0, "ending_stock_on_hand": 0.0,
            "units_backordered": 0.0, "units_lost": 0.0, "max_backlog": 0.0,
        }
    return {
        "stockout_days": stockout_days,
        "avg_stock_on_hand": float(stock_levels.mean()),
        "ending_stock_on_hand": float(stock_levels[-1]),
        "units_backordered": round(units_backordered, 1),
        "units_lost": round(units_lost, 1),
        "max_backlog": round(max_backlog, 1),
    }
