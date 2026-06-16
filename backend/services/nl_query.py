import pandas as pd
import json
import numpy as np


# ── Numpy sanitizer ────────────────────────────────────────────────────────

def sanitize(obj):
    if isinstance(obj, list):
        return [sanitize(i) for i in obj]
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj


# ── Main entry point ───────────────────────────────────────────────────────

def nl_to_chart(df: pd.DataFrame, schema: list, user_query) -> dict:
    """
    Accepts either:
      - a dict  (structured query from frontend query-builder)
      - a JSON string (same thing serialised)
      - a plain string (keyword fallback)

    Structured query shape
    ──────────────────────
    {
      "chart_type":   "bar" | "line" | "scatter" | "pie" | "histogram" | "combo",

      "x_column":     "<col>",          # group-by / category axis
      "y_columns":    ["<col>", ...],   # one OR MORE numeric columns to plot
                                        # (single column also accepted as string)

      "aggregation":  "sum" | "mean" | "count" | "min" | "max" | "none",

      "filters": [                      # ALL filters are ANDed together
        {
          "column":   "<col>",
          "operator": "eq | neq | gt | lt | gte | lte | contains",
          "value":    "<val>"
        }
      ],

      "sort_by":  "value" | "name" | "none",
      "sort_dir": "asc" | "desc",
      "limit":    10,                   # top-N rows, 0 = no limit
      "title":    "<optional>"
    }

    Multi-column example
    ────────────────────
    "Show sales_jan, sales_feb, sales_mar of Electronics by Product Name"
    {
      "chart_type":  "bar",
      "x_column":    "Product Name",
      "y_columns":   ["sales_jan", "sales_feb", "sales_mar"],
      "aggregation": "sum",
      "filters":     [{"column": "Product Category", "operator": "eq", "value": "Electronics"}],
      "sort_by":     "value",
      "sort_dir":    "desc",
      "limit":       10
    }
    """
    config = _parse_query(user_query, schema)
    return _build_chart(df, config)


# ── Chart builder ──────────────────────────────────────────────────────────

def _build_chart(df: pd.DataFrame, config: dict) -> dict:
    chart_type  = config.get("chart_type", "bar")
    x_col       = config.get("x_column")
    # Accept both "y_column" (old) and "y_columns" (new multi-support)
    y_cols_raw  = config.get("y_columns") or config.get("y_column")
    if isinstance(y_cols_raw, str):
        y_cols = [y_cols_raw] if y_cols_raw else []
    elif isinstance(y_cols_raw, list):
        y_cols = [c for c in y_cols_raw if c]
    else:
        y_cols = []

    agg         = config.get("aggregation", "sum")
    filters     = config.get("filters", [])
    sort_by     = config.get("sort_by", "none")
    sort_dir    = config.get("sort_dir", "desc")
    limit       = int(config.get("limit", 0))
    title       = config.get("title", "")

    # ── 1. Apply filters ───────────────────────────────────────────────────
    fdf = _apply_filters(df, filters)

    # ── 2. Scatter ─────────────────────────────────────────────────────────
    if chart_type == "scatter":
        xc = x_col
        yc = y_cols[0] if y_cols else None
        if xc and yc and xc in fdf.columns and yc in fdf.columns:
            tmp = fdf[[xc, yc]].dropna().sample(min(500, len(fdf)), random_state=42)
            tmp.columns = ["x", "y"]
            data = tmp.to_dict(orient="records")
        else:
            data = []
        return sanitize({
            "chart_id": "nl_result",
            "type": "scatter",
            "title": title or f"{xc} vs {yc}",
            "x_column": xc, "y_column": yc,
            "data": data
        })

    # ── 3. Histogram ───────────────────────────────────────────────────────
    if chart_type == "histogram":
        col = x_col or (y_cols[0] if y_cols else None)
        if col and col in fdf.columns:
            series = pd.to_numeric(fdf[col], errors="coerce").dropna()
            counts, bin_edges = np.histogram(series, bins=20)
            data = [
                {"name": f"{round(float(bin_edges[i]), 2)}", "value": int(counts[i])}
                for i in range(len(counts))
            ]
        else:
            data = []
        return sanitize({
            "chart_id": "nl_result",
            "type": "histogram",
            "title": title or f"Distribution of {col}",
            "data": data
        })

    # ── 4. Pie ─────────────────────────────────────────────────────────────
    if chart_type == "pie":
        col = x_col
        yc  = y_cols[0] if y_cols else None
        if col and col in fdf.columns:
            if yc and yc in fdf.columns and agg != "count":
                tmp = _aggregate(fdf, col, [yc], agg)
                tmp = tmp.rename(columns={yc: "value", col: "name"})
            else:
                tmp = fdf[col].value_counts().reset_index()
                tmp.columns = ["name", "value"]
            tmp = _sort_and_limit(tmp, sort_by, sort_dir, limit)
            data = tmp[["name", "value"]].to_dict(orient="records")
        else:
            data = []
        return sanitize({
            "chart_id": "nl_result",
            "type": "pie",
            "title": title or f"{'Count' if not yc else agg.capitalize() + ' of ' + yc} by {col}",
            "data": data
        })

    # ── 4.5. Combo — requires ≥2 y-columns; fall back to bar otherwise ─────
    # The multi-series block below naturally emits  type="combo"  because it
    # inherits the chart_type variable — we just need to guard the edge case
    # where the user requests combo but only one (or zero) columns are valid.
    if chart_type == "combo":
        preview = [c for c in y_cols if c in fdf.columns]
        if len(preview) < 2:
            chart_type = "bar"   # not enough series → plain bar chart

    # ── 5. Bar / Line / Combo — single or MULTIPLE y columns ────────────────
    if not x_col or x_col not in fdf.columns:
        return sanitize({"chart_id": "nl_result", "type": chart_type,
                         "title": "No data — check column names", "data": []})

    valid_y = [c for c in y_cols if c in fdf.columns]

    if not valid_y:
        # Count occurrences
        tmp = fdf[x_col].value_counts().reset_index()
        tmp.columns = ["name", "value"]
        tmp = _sort_and_limit(tmp, sort_by, sort_dir, limit)
        return sanitize({
            "chart_id": "nl_result",
            "type": chart_type,
            "title": title or f"Count by {x_col}",
            "x_column": x_col,
            "data": tmp.to_dict(orient="records")
        })

    # Aggregate all valid y columns together
    agg_df = _aggregate(fdf, x_col, valid_y, agg)

    if len(valid_y) == 1:
        # Single y → simple {name, value} format (works with all chart types)
        yc = valid_y[0]
        tmp = agg_df[[x_col, yc]].rename(columns={x_col: "name", yc: "value"})
        tmp = _sort_and_limit(tmp, sort_by, sort_dir, limit)
        auto_title = title or f"{agg.capitalize()} of {yc} by {x_col}"
        if filters:
            filter_desc = ", ".join(
                f"{f['column']}={f['value']}" for f in filters
                if f.get("column") and f.get("value")
            )
            auto_title += f" (where {filter_desc})"
        return sanitize({
            "chart_id": "nl_result",
            "type": chart_type,
            "title": auto_title,
            "x_column": x_col,
            "y_column": yc,
            "data": tmp.to_dict(orient="records")
        })

    else:
        # Multiple y columns → multi-series format
        # data shape: [ { "name": "Laptop", "sales_jan": 100, "sales_feb": 200 }, ... ]
        if sort_by == "value":
            # Sort by sum of all y cols
            agg_df["_total"] = agg_df[valid_y].sum(axis=1)
            agg_df = agg_df.sort_values("_total", ascending=(sort_dir == "asc"))
            agg_df = agg_df.drop(columns=["_total"])
        elif sort_by == "name":
            agg_df = agg_df.sort_values(x_col, ascending=(sort_dir == "asc"))
        if limit > 0:
            agg_df = agg_df.head(limit)

        agg_df = agg_df.rename(columns={x_col: "name"})
        auto_title = title or (
            f"{agg.capitalize()} of {', '.join(valid_y)} by {x_col}"
        )
        if filters:
            filter_desc = ", ".join(
                f"{f['column']}={f['value']}" for f in filters
                if f.get("column") and f.get("value")
            )
            auto_title += f" (where {filter_desc})"
        return sanitize({
            "chart_id": "nl_result",
            "type": chart_type,
            "title": auto_title,
            "x_column": x_col,
            "y_columns": valid_y,
            "multi_series": True,
            "data": agg_df.to_dict(orient="records")
        })


# ── Aggregation helper ─────────────────────────────────────────────────────

def _aggregate(df: pd.DataFrame, group_col: str, value_cols: list, agg: str) -> pd.DataFrame:
    """Group df by group_col and aggregate all value_cols with agg function."""
    if agg == "none":
        return df[[group_col] + value_cols].dropna(subset=[group_col])
    agg_map = {"sum": "sum", "mean": "mean", "count": "count", "min": "min", "max": "max"}
    fn = agg_map.get(agg, "sum")
    numeric_only_cols = [
        c for c in value_cols
        if pd.api.types.is_numeric_dtype(df[c])
    ]
    if not numeric_only_cols:
        # fallback to count
        tmp = df[group_col].value_counts().reset_index()
        tmp.columns = [group_col, value_cols[0]]
        return tmp
    result = getattr(df.groupby(group_col)[numeric_only_cols], fn)().reset_index()
    return result


# ── Sort + limit helper ────────────────────────────────────────────────────

def _sort_and_limit(df: pd.DataFrame, sort_by: str, sort_dir: str, limit: int) -> pd.DataFrame:
    if sort_by == "value" and "value" in df.columns:
        df = df.sort_values("value", ascending=(sort_dir == "asc"))
    elif sort_by == "name" and "name" in df.columns:
        df = df.sort_values("name", ascending=(sort_dir == "asc"))
    if limit > 0:
        df = df.head(limit)
    return df


# ── Filter helper ──────────────────────────────────────────────────────────

def _apply_filters(df: pd.DataFrame, filters: list) -> pd.DataFrame:
    if not filters:
        return df
    mask = pd.Series([True] * len(df), index=df.index)
    for f in filters:
        col = f.get("column")
        op  = f.get("operator", "eq")
        val = f.get("value")
        if not col or col not in df.columns or val is None or val == "":
            continue
        series = df[col]
        try:
            if op == "eq":
                mask &= series.astype(str).str.strip().str.lower() == str(val).strip().lower()
            elif op == "neq":
                mask &= series.astype(str).str.strip().str.lower() != str(val).strip().lower()
            elif op == "contains":
                mask &= series.astype(str).str.lower().str.contains(str(val).lower(), na=False)
            elif op == "gt":
                mask &= pd.to_numeric(series, errors="coerce") > float(val)
            elif op == "lt":
                mask &= pd.to_numeric(series, errors="coerce") < float(val)
            elif op == "gte":
                mask &= pd.to_numeric(series, errors="coerce") >= float(val)
            elif op == "lte":
                mask &= pd.to_numeric(series, errors="coerce") <= float(val)
        except Exception:
            continue
    return df[mask]


# ── Plain-text keyword fallback ────────────────────────────────────────────

def _parse_query(user_query, schema: list) -> dict:
    if isinstance(user_query, dict):
        return user_query
    try:
        parsed = json.loads(user_query)
        if isinstance(parsed, dict):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass

    query = str(user_query).lower()
    numeric_cols     = [c["name"] for c in schema if c["type"] == "numeric"]
    categorical_cols = [c["name"] for c in schema if c["type"] == "categorical"]

    chart_type = "bar"
    if any(w in query for w in ["pie", "breakdown", "share", "proportion"]):
        chart_type = "pie"
    elif any(w in query for w in ["scatter", "correlation", " vs ", "versus"]):
        chart_type = "scatter"
    elif any(w in query for w in ["line", "trend", "over time", "growth"]):
        chart_type = "line"
    elif any(w in query for w in ["histogram", "distribution", "frequency"]):
        chart_type = "histogram"
    elif any(w in query for w in [
        "combo", "mixed chart", "bar and line", "bars and line",
        "bar line", "combined chart", "overlay",
    ]):
        chart_type = "combo"

    agg = "sum"
    if any(w in query for w in ["average", "mean", "avg"]):
        agg = "mean"
    elif any(w in query for w in ["count", "how many", "number of"]):
        agg = "count"
    elif "min" in query:
        agg = "min"
    elif "max" in query:
        agg = "max"

    # Detect ALL mentioned numeric columns (for multi-series)
    mentioned_num = [c for c in numeric_cols    if c.lower() in query]
    mentioned_cat = [c for c in categorical_cols if c.lower() in query]

    x_col  = mentioned_cat[0] if mentioned_cat else (categorical_cols[0] if categorical_cols else None)
    y_cols = mentioned_num    if mentioned_num  else ([numeric_cols[0]]   if numeric_cols    else [])

    return {
        "chart_type":  chart_type,
        "x_column":    x_col,
        "y_columns":   y_cols,
        "aggregation": agg,
        "filters":     [],
        "sort_by":     "value",
        "sort_dir":    "desc",
        "limit":       0,
        "title":       ""
    }
