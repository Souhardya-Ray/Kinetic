from fastapi import APIRouter, HTTPException, Query
from database import rows_col
from bson import ObjectId

router = APIRouter()

ALLOWED_SORT_DIRS = {"asc", "desc"}


def _build_query(upload_id: ObjectId, q: str, filter_field: str, filter_value: str) -> dict:
    query: dict = {"upload_id": upload_id}

    if q:
        query["$text"] = {"$search": q}

    if filter_field and filter_value:
        # Exact match on nested data field (case-insensitive for strings)
        query[f"data.{filter_field}"] = {
            "$regex": f"^{filter_value}$",
            "$options": "i",
        }

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
):
    if sort_dir not in ALLOWED_SORT_DIRS:
        raise HTTPException(status_code=400, detail="sort_dir must be 'asc' or 'desc'")

    try:
        oid = ObjectId(upload_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid upload_id")

    skip = (page - 1) * limit
    has_text = bool(q.strip())
    query = _build_query(oid, q.strip(), filter_field.strip(), filter_value.strip())
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
