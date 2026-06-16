from fastapi import APIRouter, HTTPException
from database import uploads_col, rows_col
from bson import ObjectId
import pandas as pd
from services.chart_engine import generate_chart_configs
from services.nl_query import nl_to_chart

router = APIRouter()


async def _load_df_and_upload(upload_id: str):
    """Shared helper: fetch upload metadata + build DataFrame from rows."""
    try:
        oid = ObjectId(upload_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    upload = await uploads_col.find_one({"_id": oid})
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    cursor = rows_col.find({"upload_id": oid}, {"data": 1})
    rows = [doc["data"] async for doc in cursor]
    df = pd.DataFrame(rows)
    return upload, df


@router.get("/api/analytics/{upload_id}")
async def get_analytics(upload_id: str):
    upload, df = await _load_df_and_upload(upload_id)
    schema = upload["schema"]
    charts = generate_chart_configs(df, schema)
    return {"charts": charts, "schema": schema}


@router.post("/api/analytics/{upload_id}/query")
async def custom_query(upload_id: str, body: dict):
    """
    Structured query endpoint — accepts the query-builder payload directly.

    Body shape:
    {
      "chart_type":  "bar" | "line" | "scatter" | "pie" | "histogram" | "combo",
      "x_column":    "<column name>",
      "y_columns":   ["<col>", ...],      # one OR more numeric columns
                                           # (single string also accepted)
      "aggregation": "sum" | "mean" | "count" | "min" | "max" | "none",
      "filters": [
        { "column": "<col>", "operator": "eq|neq|gt|lt|gte|lte|contains", "value": "<val>" }
      ],
      "sort_by":  "value" | "name" | "none",
      "sort_dir": "asc" | "desc",
      "limit":    10,
      "title":    "<optional>"
    }

    combo chart notes
    ─────────────────
    • Requires at least 2 entries in y_columns.
    • The backend aggregates all y_columns and returns type="combo" with
      multi_series=true.  The frontend then auto-splits bar vs line series
      using the same ratio-based scale detection (RATIO_THRESHOLD=20×).
    • If fewer than 2 valid y_columns are resolved, the type silently
      falls back to "bar" so the chart never returns empty.
    """
    VALID_CHART_TYPES = {"bar", "line", "scatter", "pie", "histogram", "combo"}
    chart_type = body.get("chart_type", "bar")
    if chart_type not in VALID_CHART_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown chart_type '{chart_type}'. "
                   f"Valid values: {sorted(VALID_CHART_TYPES)}",
        )

    upload, df = await _load_df_and_upload(upload_id)
    result = nl_to_chart(df, upload["schema"], body)   # body is already a dict
    return result


@router.post("/api/analytics/{upload_id}/nl-query")
async def nl_query(upload_id: str, body: dict):
    """
    Natural-language / plain-text query endpoint (keyword fallback).
    Body: { "query": "show average price by category" }
    Also accepts the full structured payload under "query" as a JSON string.
    """
    upload, df = await _load_df_and_upload(upload_id)
    query = body.get("query", "")
    result = nl_to_chart(df, upload["schema"], query)
    return result


@router.get("/api/schema/{upload_id}")
async def get_schema(upload_id: str):
    """
    Returns just the schema for an upload — useful for the frontend
    to populate column-name dropdowns in the query builder.
    """
    try:
        oid = ObjectId(upload_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    upload = await uploads_col.find_one({"_id": oid}, {"schema": 1, "filename": 1, "row_count": 1})
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    return {
        "upload_id": upload_id,
        "filename":  upload.get("filename"),
        "row_count": upload.get("row_count"),
        "schema":    upload["schema"]
    }