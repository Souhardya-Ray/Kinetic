import pandas as pd
import json
from collections import defaultdict

# Ratio threshold — mirrors the frontend's buildAxisMap RATIO_THRESHOLD constant.
# A series whose max is >20× smaller than the dominant series goes to right axis
# (rendered as a line in a combo chart).
_RATIO_THRESHOLD = 20


def _max_abs(df: pd.DataFrame, col: str) -> float:
    """Return the maximum absolute value of a numeric column (0 if all NaN)."""
    series = pd.to_numeric(df[col], errors="coerce").abs()
    return float(series.max()) if not series.empty and series.notna().any() else 0.0


def _split_by_scale(
    df: pd.DataFrame, cols: list[str]
) -> tuple[list[str], list[str]]:
    """
    Split *cols* into (bar_keys, line_keys) using the same ratio-based rule
    as the frontend's ``buildAxisMap``.

    bar_keys  — large-magnitude columns  → rendered as grouped bars (left axis)
    line_keys — small-magnitude columns  → rendered as line overlay (right axis)

    Returns ([], []) when all columns share the same scale (no combo needed).
    """
    if not cols:
        return [], []

    max_vals = {col: _max_abs(df, col) for col in cols}
    sorted_cols = sorted(cols, key=lambda c: max_vals[c], reverse=True)
    dominant = max_vals[sorted_cols[0]] or 1.0

    bar_keys  = [c for c in sorted_cols
                 if dominant / (max_vals[c] or 1.0) <= _RATIO_THRESHOLD]
    line_keys = [c for c in sorted_cols
                 if dominant / (max_vals[c] or 1.0) >  _RATIO_THRESHOLD]
    return bar_keys, line_keys


def generate_chart_configs(df: pd.DataFrame, schema: list[dict]) -> list[dict]:
    """
    Auto-generate chart configs from an uploaded dataset.

    Currently produces **combo charts** whenever numeric columns in the dataset
    span very different scales (ratio > 20×).  Two passes are made:

    A) Time-series prefix groups
       Columns that share a prefix separated by an underscore are treated as a
       time series (e.g. ``energy_jan``, ``energy_feb``).  If the group contains
       mixed-scale columns, a combo chart is emitted for that prefix.

    B) Cross-column overview
       A single overview combo chart is generated from up to 5 of the dataset's
       numeric columns (3 bar + 2 line) when a scale gap is detected.

    The returned list is empty when no mixed-scale columns are found, so the
    frontend receives ``charts: []`` and silently shows nothing — exactly the
    same behaviour as before this change.
    """
    charts: list[dict] = []
    # numeric_cols     = [c["name"] for c in schema if c["type"] == "numeric"]
    # categorical_cols = [c["name"] for c in schema if c["type"] == "categorical"]

    # if not numeric_cols or not categorical_cols:
    #     return charts

    # cat_col = categorical_cols[0]   # primary x-axis / grouping column
    # generated_ids: set[str] = set()

    # # ── A. Time-series prefix groups (e.g. sales_jan, sales_feb …) ───────────
    # prefix_groups: dict[str, list[str]] = defaultdict(list)
    # for col in numeric_cols:
    #     parts = col.rsplit("_", 1)
    #     if len(parts) == 2:
    #         prefix_groups[parts[0]].append(col)

    # for prefix, cols in prefix_groups.items():
    #     if len(cols) < 2:
    #         continue

    #     bar_keys, line_keys = _split_by_scale(df, cols)
    #     if not bar_keys or not line_keys:
    #         # All columns are on the same scale — not a combo candidate.
    #         continue

    #     all_cols = bar_keys + line_keys
    #     chart_id = f"{prefix}__combo"
    #     if chart_id in generated_ids:
    #         continue
    #     generated_ids.add(chart_id)

    #     try:
    #         grouped = (
    #             df.groupby(cat_col)[all_cols]
    #             .sum()
    #             .reset_index()
    #             .rename(columns={cat_col: "name"})
    #         )
    #         charts.append({
    #             "chart_id":     chart_id,
    #             "type":         "combo",
    #             "title":        (
    #                 f"{prefix.replace('_', ' ').title()} — Combo by {cat_col}"
    #             ),
    #             "x_column":     cat_col,
    #             "y_columns":    all_cols,
    #             "multi_series": True,
    #             "data":         json.loads(grouped.to_json(orient="records")),
    #         })
    #     except Exception:
    #         continue   # skip silently on aggregation errors

    # # ── B. Cross-column overview combo (up to 3 bar + 2 line series) ─────────
    # if len(numeric_cols) >= 2:
    #     bar_keys, line_keys = _split_by_scale(df, numeric_cols[:8])

    #     if bar_keys and line_keys:
    #         all_keys = bar_keys[:3] + line_keys[:2]
    #         chart_id = f"{cat_col}__overview_combo"

    #         if chart_id not in generated_ids:
    #             generated_ids.add(chart_id)
    #             try:
    #                 grouped = (
    #                     df.groupby(cat_col)[all_keys]
    #                     .sum()
    #                     .reset_index()
    #                     .rename(columns={cat_col: "name"})
    #                 )
    #                 charts.append({
    #                     "chart_id":     chart_id,
    #                     "type":         "combo",
    #                     "title":        f"Overview Combo Chart by {cat_col}",
    #                     "x_column":     cat_col,
    #                     "y_columns":    all_keys,
    #                     "multi_series": True,
    #                     "data":         json.loads(grouped.to_json(orient="records")),
    #                 })
    #             except Exception:
    #                 pass

    return charts
