from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_indexes
from routers import upload, analytics, search
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Build CORS origin list from FRONTEND_URL env var; always include localhost fallback.
# Strip trailing slash — browsers send origins without one (e.g. https://foo.vercel.app).
_frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
allowed_origins = list(filter(None, ["http://localhost:3000", _frontend_url]))
print(f"[CORS] allowed origins: {allowed_origins}")

app = FastAPI(title="Material Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(analytics.router)
app.include_router(search.router)

@app.on_event("startup")
async def startup_event():
    await create_indexes()
    print(f"[startup] CORS allowed origins: {allowed_origins}")

@app.get("/")
def root():
    return {"message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
