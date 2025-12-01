"""
FreeSpot Backend - Main FastAPI Application
Real-time table occupancy detection system
"""

import asyncio
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.detection import detection_service
from src.database import SessionLocal
from src.models import Floor, Table, CCTVStream
from src.routes import (
    floors_router,
    tables_router,
    cctv_router,
    detection_router,
    websocket_router
)
from src.routes.websocket import get_manager
from src.controllers import CCTVController


# Global reference to main event loop
main_event_loop = None


# ========================================
# Application Lifecycle
# ========================================

def update_table_status_in_db_sync(floor_id: int, table_status: list):
    """Update table status in database (synchronous version for thread safety)"""
    db = SessionLocal()
    try:
        for status in table_status:
            table = db.query(Table).filter(Table.id == status["id"]).first()
            if table:
                new_status = "occupied" if status["occupied"] else "available"
                if table.status != new_status:
                    table.status = new_status
                    print(f"   📝 Updated {table.name}: {new_status}")
        
        db.commit()
    except Exception as e:
        print(f"❌ Failed to update table status: {e}")
        db.rollback()
    finally:
        db.close()


async def update_table_status_in_db(floor_id: int, table_status: list):
    """Update table status in database (async wrapper)"""
    # Run sync function in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, update_table_status_in_db_sync, floor_id, table_status)


async def auto_start_detection():
    """Auto-start detection for all floors with active CCTV streams"""
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    
    db = SessionLocal()
    manager = get_manager()
    
    try:
        floors = db.query(Floor).all()
        
        for floor in floors:
            streams = db.query(CCTVStream).filter(
                CCTVStream.floor_id == floor.id,
                CCTVStream.is_active == True
            ).all()
            
            if streams:
                tables = db.query(Table).filter(Table.floor_id == floor.id).all()
                tables_data = [t.to_dict() for t in tables]
                
                stream_url = streams[0].url
                detection_service.start_detection(
                    floor_id=floor.id,
                    stream_url=stream_url,
                    tables=tables_data,
                    canvas_width=settings.CANVAS_WIDTH,
                    canvas_height=settings.CANVAS_HEIGHT
                )
                
                # Register callback for WebSocket broadcasting
                def make_callback(fid, mgr):
                    def sync_callback(result):
                        """Callback called from detection thread"""
                        try:
                            # Update DB synchronously (thread-safe)
                            update_table_status_in_db_sync(fid, result["table_status"])
                            
                            # Schedule async broadcast on main event loop
                            if main_event_loop and main_event_loop.is_running():
                                asyncio.run_coroutine_threadsafe(
                                    mgr.broadcast(fid, result),
                                    main_event_loop
                                )
                        except Exception as e:
                            print(f"⚠️  Callback error: {e}")
                    
                    return sync_callback
                
                detection_service.register_callback(floor.id, make_callback(floor.id, manager))
                print(f"✅ Auto-started detection for Floor {floor.number}")
    
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    
    print("\n" + "=" * 60)
    print("🚀 FreeSpot Backend Starting...")
    print("=" * 60)
    
    # Log configuration
    print(f"\n📋 Configuration:")
    print(f"   - Database: {settings.DATABASE_URL[:50]}...")
    print(f"   - Detection Interval: {settings.DETECTION_INTERVAL}s")
    print(f"   - Model: {settings.YOLO_MODEL}")
    print(f"   - Canvas: {settings.CANVAS_WIDTH}x{settings.CANVAS_HEIGHT}")
    
    # Set event loop and broadcast callback for CCTV controller
    manager = get_manager()
    CCTVController.set_event_loop(main_event_loop)
    CCTVController.set_broadcast_callback(manager.broadcast)
    
    # Auto-start detection for floors with CCTV
    await auto_start_detection()
    
    print(f"\n✅ Server ready at http://{settings.HOST}:{settings.PORT}")
    print("=" * 60 + "\n")
    
    yield
    
    # Shutdown
    print("\n🛑 Shutting down...")
    for floor_id in list(detection_service.active_streams.keys()):
        detection_service.stop_detection(floor_id)


# ========================================
# FastAPI Application
# ========================================

app = FastAPI(
    title="FreeSpot API",
    description="Real-time table occupancy detection system using YOLOv11",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================
# Include Routers
# ========================================

app.include_router(floors_router)
app.include_router(tables_router)
app.include_router(cctv_router)
app.include_router(detection_router)
app.include_router(websocket_router)


# ========================================
# Health Check
# ========================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "detection_service": detection_service.is_initialized,
        "device": str(detection_service.device)
    }


# ========================================
# Run Server
# ========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
