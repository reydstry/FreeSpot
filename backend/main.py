"""FreeSpot Backend API"""

from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routes import (
    floors_router,
    tables_router,
    cctv_router,
    detection_router,
    websocket_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "=" * 50)
    print("🚀 FreeSpot Backend Starting...")
    print(f"📋 Database: {settings.DATABASE_URL[:40]}...")
    print(f"📋 ML API: {settings.ML_API_URL}")
    print(f"✅ Server ready at http://{settings.HOST}:{settings.PORT}")
    print("=" * 50 + "\n")
    yield
    print("\n🛑 Shutting down...")


app = FastAPI(
    title="FreeSpot API",
    description="Real-time table occupancy detection system",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(floors_router)
app.include_router(tables_router)
app.include_router(cctv_router)
app.include_router(detection_router)
app.include_router(websocket_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ml_api_url": settings.ML_API_URL
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

