from fastapi import APIRouter, UploadFile, File
from database import uploads_col, rows_col, get_fs_bucket
from services.parser import parse_file
from services.chart_engine import generate_chart_configs
from bson import ObjectId
from datetime import datetime
import pandas as pd
from io import BytesIO

router = APIRouter()

@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_bytes = await file.read()

    # 1. Parse file
    df, schema, id_col, name_col = parse_file(file_bytes, file.filename)

    # 2. Store raw file in GridFS
    fs_bucket = get_fs_bucket()
    file_id = await fs_bucket.upload_from_stream(file.filename, BytesIO(file_bytes))

    # 3. Insert upload metadata
    upload_doc = {
        "filename": file.filename,
        "uploaded_at": datetime.utcnow(),
        "row_count": len(df),
        "is_active": True,
        "schema": schema,
        "id_column": id_col,
        "name_column": name_col,
        "gridfs_file_id": file_id
    }
    result = await uploads_col.insert_one(upload_doc)
    upload_id = result.inserted_id

    # 4. Deactivate all other uploads
    await uploads_col.update_many(
        {"_id": {"$ne": upload_id}},
        {"$set": {"is_active": False}}
    )

    # 5. Insert rows in bulk (use insert_many for performance)
    row_docs = [
        {
            "upload_id": upload_id,
            "row_index": i,
            "data": {k: (None if pd.isna(v) else v) for k, v in row.items()}
        }
        for i, row in df.iterrows()
    ]
    
    # Insert in chunks of 500 to avoid document size limits
    chunk_size = 500
    for i in range(0, len(row_docs), chunk_size):
        await rows_col.insert_many(row_docs[i:i+chunk_size])

    # 6. Generate chart configs
    charts = generate_chart_configs(df, schema)

    return {
        "upload_id": str(upload_id),
        "row_count": len(df),
        "schema": schema,
        "chart_configs": charts
    }

@router.get("/api/uploads")
async def list_uploads():
    cursor = uploads_col.find({}, {"schema": 0}).sort("uploaded_at", -1)
    uploads = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if "gridfs_file_id" in doc:
            doc["gridfs_file_id"] = str(doc["gridfs_file_id"])
        uploads.append(doc)
    return uploads

@router.post("/api/uploads/{upload_id}/activate")
async def activate_upload(upload_id: str):
    oid = ObjectId(upload_id)
    await uploads_col.update_many({}, {"$set": {"is_active": False}})
    await uploads_col.update_one({"_id": oid}, {"$set": {"is_active": True}})
    return {"status": "ok"}
