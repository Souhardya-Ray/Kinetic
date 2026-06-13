import pandas as pd
import json

def generate_chart_configs(df: pd.DataFrame, schema: list[dict]) -> list[dict]:
    charts = []
    numeric_cols = [c["name"] for c in schema if c["type"] == "numeric"]
    categorical_cols = [c["name"] for c in schema if c["type"] == "categorical"]

    # 1. KPI cards (return as a special chart type)
    # kpi_data = []
    # for col in numeric_cols[:6]:
    #     kpi_data.append({
    #         "label": col,
    #         "value": float(round(df[col].sum(), 2)),
    #         "mean": float(round(df[col].mean(), 2))
    #     })
    # if kpi_data:
    #     charts.append({"chart_id": "kpis", "type": "kpi", "data": kpi_data})

    # 2. For each categorical column, sum each numeric column -> grouped bar
    # for cat_col in categorical_cols[:3]:
    #     for num_col in numeric_cols[:4]:
    #         grouped = df.groupby(cat_col)[num_col].sum().reset_index()
    #         # Do NOT rename columns, frontend uses cat_col and num_col as keys
    #         charts.append({
    #             "chart_id": f"{cat_col}__{num_col}__bar",
    #             "type": "bar",
    #             "title": f"{num_col} by {cat_col}",
    #             "x_column": cat_col,
    #             "y_column": num_col,
    #             "data": json.loads(grouped.to_json(orient="records"))
    #         })

    # 3. Detect time-series columns (same prefix, different suffix)
    # from collections import defaultdict
    # prefix_groups = defaultdict(list)
    # for col in numeric_cols:
    #     parts = col.rsplit("_", 1)
    #     if len(parts) == 2:
    #         prefix_groups[parts[0]].append(col)
    # for prefix, cols in prefix_groups.items():
    #     if len(cols) >= 2:
    #         totals = {col: float(df[col].sum()) for col in cols}
    #         data = [{"name": col.split("_")[-1], "value": val}
    #                 for col, val in totals.items()]
    #         charts.append({
    #             "chart_id": f"{prefix}__trend",
    #             "type": "line",
    #             "title": f"{prefix} trend over time",
    #             "data": data
    #         })

    # 4. Scatter: first two numeric cols
    # if len(numeric_cols) >= 2:
    #     scatter_data = df[[numeric_cols[0], numeric_cols[1]]].dropna()
    #     scatter_data = scatter_data.sample(min(500, len(scatter_data)))
    #     scatter_data.columns = ["x", "y"]
    #     charts.append({
    #         "chart_id": f"{numeric_cols[0]}__{numeric_cols[1]}__scatter",
    #         "type": "scatter",
    #         "title": f"{numeric_cols[0]} vs {numeric_cols[1]}",
    #         "x_column": numeric_cols[0],
    #         "y_column": numeric_cols[1],
    #         "data": json.loads(scatter_data.to_json(orient="records"))
    #     })

    # 5. Pie: row count per first categorical column
    # if categorical_cols:
    #     pie_data = df[categorical_cols[0]].value_counts().reset_index()
    #     pie_data.columns = ["name", "value"]
    #     charts.append({
    #         "chart_id": f"{categorical_cols[0]}__pie",
    #         "type": "pie",
    #         "title": f"Distribution by {categorical_cols[0]}",
    #         "data": json.loads(pie_data.to_json(orient="records"))
    #     })

    # 6. Histogram: distribution of first numeric column
    # if numeric_cols:
    #     hist_col = numeric_cols[0]
    #     hist_data, bin_edges = pd.cut(df[hist_col].dropna(),
    #                                   bins=20, retbins=True)
    #     hist_counts = hist_data.value_counts().sort_index()
    #     hist_out = [
    #         {"name": f"{round(e,1)}", "value": int(c)}
    #         for e, c in zip(bin_edges[1:], hist_counts)
    #     ]
    #     charts.append({
    #         "chart_id": f"{hist_col}__histogram",
    #         "type": "histogram",
    #         "title": f"Distribution of {hist_col}",
    #         "data": hist_out
    #     })

    return charts
