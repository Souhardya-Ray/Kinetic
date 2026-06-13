from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_indexes
from routers import upload, analytics, search
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Comma-separated list in .env  e.g.  http://localhost:3000,https://yourapp.vercel.app
_raw_origins = os.getenv("ALLOWED_ORIGINS")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

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

@app.get("/")
def root():
    return {"message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
