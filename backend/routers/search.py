import json
from fastapi import APIRouter, HTTPException, Query
from database import rows_col, uploads_col
from bson import ObjectId

router = APIRouter()

ALLOWED_SORT_DIRS = {"asc", "desc"}


def _build_query(upload_id: ObjectId, q: str, filters_list: list, schema: list) -> dict:
    query: dict = {"upload_id": upload_id}

    if q:
        query["$text"] = {"$search": q}

    schema_types = {col["name"]: col.get("type") for col in schema}
    and_conditions = []

    for f in filters_list:
        col = f.get("column")
        op = f.get("operator", "eq")
        val = f.get("value")
        if not col or val is None or val == "":
            continue

        field_type = schema_types.get(col)
        field_key = f"data.{col}"
        cond = {}

        if field_type == "numeric":
            try:
                val_float = float(val)
                if op == "eq":
                    if val_float.is_integer():
                        cond[field_key] = {"$in": [val_float, int(val_float)]}
                    else:
                        cond[field_key] = val_float
                elif op == "neq":
                    if val_float.is_integer():
                        cond[field_key] = {"$nin": [val_float, int(val_float)]}
                    else:
                        cond[field_key] = {"$ne": val_float}
                elif op == "gt":
                    cond[field_key] = {"$gt": val_float}
                elif op == "lt":
                    cond[field_key] = {"$lt": val_float}
                elif op == "gte":
                    cond[field_key] = {"$gte": val_float}
                elif op == "lte":
                    cond[field_key] = {"$lte": val_float}
            except ValueError:
                cond[field_key] = {"$regex": f"^{val}$", "$options": "i"}
        else:
            if op == "eq":
                cond[field_key] = {"$regex": f"^{val}$", "$options": "i"}
            elif op == "neq":
                cond[field_key] = {"$not": {"$regex": f"^{val}$", "$options": "i"}}
            elif op == "contains":
                cond[field_key] = {"$regex": val, "$options": "i"}
            elif op == "gt":
                cond[field_key] = {"$gt": val}
            elif op == "lt":
                cond[field_key] = {"$lt": val}
            elif op == "gte":
                cond[field_key] = {"$gte": val}
            elif op == "lte":
                cond[field_key] = {"$lte": val}

        if cond:
            and_conditions.append(cond)

    if and_conditions:
        query["$and"] = and_conditions

    return query


def _sort_spec(sort_by: str, sort_dir: str, has_text_search: bool) -> list:
    direction = 1 if sort_dir == "asc" else -1

    if has_text_search:
        # Text queries require sorting by score first when using $text
        return [("score", {"$meta": "textScore"})]

    if sort_by == "row_index":
        return [("row_index", direction)]

    return [(f"data.{sort_by}", direction)]


@router.get("/api/search/{upload_id}")
async def search(
    upload_id: str,
    q: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = "row_index",
    sort_dir: str = "asc",
    filter_field: str = "",
    filter_value: str = "",
    filters: str = "",
):
    if sort_dir not in ALLOWED_SORT_DIRS:
        raise HTTPException(status_code=400, detail="sort_dir must be 'asc' or 'desc'")

    try:
        oid = ObjectId(upload_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    schema = []
    upload = await uploads_col.find_one({"_id": oid}, {"schema": 1})
    if upload and "schema" in upload:
        schema = upload["schema"]

    filters_list = []
    if filters:
        try:
            filters_list = json.loads(filters)
        except Exception:
            pass

    if filter_field and filter_value:
        filters_list.append({
            "column": filter_field,
            "operator": "eq",
            "value": filter_value
        })

    skip = (page - 1) * limit
    has_text = bool(q.strip())
    query = _build_query(oid, q.strip(), filters_list, schema)
    sort_list = _sort_spec(sort_by.strip() or "row_index", sort_dir, has_text)

    total = await rows_col.count_documents(query)

    projection = {"data": 1, "row_index": 1}
    if has_text:
        projection["score"] = {"$meta": "textScore"}

    cursor = (
        rows_col.find(query, projection)
        .sort(sort_list)
        .skip(skip)
        .limit(limit)
    )

    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc.pop("score", None)
        results.append(doc)

    return {
        "results": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit) if total else 0,
    }


@router.get("/api/search/{upload_id}/facets/{field}")
async def facet_values(upload_id: str, field: str, limit: int = Query(50, ge=1, le=200)):
    """Distinct values for a column (for filter dropdown)."""
    try:
        oid = ObjectId(upload_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    if not field or "." in field:
        raise HTTPException(status_code=400, detail="Invalid field name")

    pipeline = [
        {"$match": {"upload_id": oid}},
        {"$group": {"_id": f"$data.{field}"}},
        {"$match": {"_id": {"$nin": [None, ""]}}},
        {"$sort": {"_id": 1}},
        {"$limit": limit},
    ]

    values = []
    async for doc in rows_col.aggregate(pipeline):
        val = doc["_id"]
        values.append(str(val) if val is not None else "")

    return {"field": field, "values": values}


@router.get("/api/product/{upload_id}/{row_index}")
async def get_product(upload_id: str, row_index: int):
    doc = await rows_col.find_one(
        {"upload_id": ObjectId(upload_id), "row_index": row_index}
    )
    if not doc:
        raise HTTPException(status_code=404)
    doc["_id"] = str(doc["_id"])
    doc["upload_id"] = str(doc["upload_id"])
    return doc