import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")  # e.g. mongodb+srv://user:pass@cluster.mongodb.net/
if not MONGO_URL:
    raise RuntimeError("MONGO_URL must be set in the environment or backend/.env before starting the backend")
client = AsyncIOMotorClient(MONGO_URL)
db = client["material_mgmt"]

uploads_col = db["uploads"]
rows_col = db["rows"]

_fs_bucket = None

def get_fs_bucket():
    global _fs_bucket
    if _fs_bucket is None:
        _fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="raw_files")
    return _fs_bucket

async def create_indexes():
    await rows_col.create_index([("upload_id", 1)])
    await rows_col.create_index([("upload_id", 1), ("row_index", 1)])
    await rows_col.create_index([("$**", "text")])
