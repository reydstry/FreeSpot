"""
FreeSpot Backend - Main FastAPI Application
Real-time table occupancy detection system
"""

import asyncio
import json
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import get_db, init_db, SessionLocal
from models import Floor, Table, CCTVStream
from schemas import (
    FloorCreate, FloorResponse,
    TableCreate, TableUpdate, TableResponse,
    CCTVStreamCreate, CCTVStreamUpdate, CCTVStreamResponse,
    DetectionStart, DetectionResult, DetectionStatusResponse
)
from detection import detection_service


# ========================================
# WebSocket Connection Manager
# ========================================

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, floor_id: int):
        await websocket.accept()
        if floor_id not in self.active_connections:
            self.active_connections[floor_id] = []
        self.active_connections[floor_id].append(websocket)
        print(f"🔌 WebSocket connected for floor {floor_id} (total: {len(self.active_connections[floor_id])})")
    
    def disconnect(self, websocket: WebSocket, floor_id: int):
        if floor_id in self.active_connections:
            if websocket in self.active_connections[floor_id]:
                self.active_connections[floor_id].remove(websocket)
            print(f"🔌 WebSocket disconnected for floor {floor_id} (remaining: {len(self.active_connections[floor_id])})")
    
    async def broadcast(self, floor_id: int, message: dict):
        if floor_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[floor_id]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.append(connection)
            
            # Remove dead connections
            for dead in dead_connections:
                self.active_connections[floor_id].remove(dead)


manager = ConnectionManager()


# ========================================
# Application Lifecycle
# ========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    print("\n" + "=" * 60)
    print("🚀 FreeSpot Backend Starting...")
    print("=" * 60)
    
    # Initialize database
    init_db()
    
    # Log configuration
    print(f"\n📋 Configuration:")
    print(f"   - Database: {settings.DATABASE_URL[:50]}...")
    print(f"   - Detection Interval: {settings.DETECTION_INTERVAL}s")
    print(f"   - Model: {settings.YOLO_MODEL}")
    print(f"   - Canvas: {settings.CANVAS_WIDTH}x{settings.CANVAS_HEIGHT}")
    
    # Auto-start detection for floors with CCTV
    await auto_start_detection()
    
    print(f"\n✅ Server ready at http://{settings.HOST}:{settings.PORT}")
    print("=" * 60 + "\n")
    
    yield
    
    # Shutdown
    print("\n🛑 Shutting down...")
    # Stop all active detections
    for floor_id in list(detection_service.active_streams.keys()):
        detection_service.stop_detection(floor_id)


async def auto_start_detection():
    """Auto-start detection for all floors with active CCTV streams"""
    db = SessionLocal()
    try:
        floors = db.query(Floor).all()
        
        for floor in floors:
            # Get active CCTV streams for this floor
            streams = db.query(CCTVStream).filter(
                CCTVStream.floor_id == floor.id,
                CCTVStream.is_active == True
            ).all()
            
            if streams:
                # Get tables for this floor
                tables = db.query(Table).filter(Table.floor_id == floor.id).all()
                tables_data = [t.to_dict() for t in tables]
                
                # Start detection with first active stream
                stream_url = streams[0].url
                detection_service.start_detection(
                    floor_id=floor.id,
                    stream_url=stream_url,
                    tables=tables_data,
                    canvas_width=settings.CANVAS_WIDTH,
                    canvas_height=settings.CANVAS_HEIGHT
                )
                
                # Register callback for WebSocket broadcasting
                def make_callback(fid):
                    async def broadcast_result(result):
                        # Update table status in database
                        await update_table_status_in_db(fid, result["table_status"])
                        # Broadcast to WebSocket clients
                        await manager.broadcast(fid, result)
                    
                    def sync_callback(result):
                        asyncio.create_task(broadcast_result(result))
                    
                    return sync_callback
                
                detection_service.register_callback(floor.id, make_callback(floor.id))
                print(f"✅ Auto-started detection for Floor {floor.number}")
    
    finally:
        db.close()


async def update_table_status_in_db(floor_id: int, table_status: list):
    """Update table status in database based on detection results"""
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
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================
# Health Check
# ========================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "detection_service": detection_service.is_initialized,
        "device": str(detection_service.device)
    }


# ========================================
# Floor Endpoints
# ========================================

@app.get("/floors", response_model=List[FloorResponse])
async def get_floors(db: Session = Depends(get_db)):
    """Get all floors"""
    floors = db.query(Floor).order_by(Floor.number).all()
    return floors


@app.post("/floors", response_model=FloorResponse)
async def create_floor(floor: FloorCreate, db: Session = Depends(get_db)):
    """Create a new floor"""
    # Check if floor number already exists
    existing = db.query(Floor).filter(Floor.number == floor.number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Floor {floor.number} already exists")
    
    db_floor = Floor(**floor.model_dump())
    db.add(db_floor)
    db.commit()
    db.refresh(db_floor)
    
    print(f"✅ Created floor: {db_floor.name} (#{db_floor.number})")
    return db_floor


@app.delete("/floors/{floor_id}")
async def delete_floor(floor_id: int, db: Session = Depends(get_db)):
    """Delete a floor"""
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    
    # Stop detection if running
    if floor_id in detection_service.active_streams:
        detection_service.stop_detection(floor_id)
    
    db.delete(floor)
    db.commit()
    
    print(f"🗑️  Deleted floor: {floor.name}")
    return {"message": f"Floor {floor.name} deleted"}


# ========================================
# Table Endpoints
# ========================================

@app.get("/tables", response_model=List[TableResponse])
async def get_tables(floor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all tables, optionally filtered by floor"""
    query = db.query(Table)
    if floor_id:
        query = query.filter(Table.floor_id == floor_id)
    tables = query.all()
    return tables


@app.post("/tables", response_model=TableResponse)
async def create_table(table: TableCreate, db: Session = Depends(get_db)):
    """Create a new table"""
    # Verify floor exists
    floor = db.query(Floor).filter(Floor.id == table.floor_id).first()
    if not floor:
        raise HTTPException(status_code=400, detail=f"Floor {table.floor_id} not found")
    
    db_table = Table(**table.model_dump())
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    
    print(f"✅ Created table: {db_table.name} on Floor {floor.number}")
    
    # Update detection if running for this floor
    if table.floor_id in detection_service.active_streams:
        tables = db.query(Table).filter(Table.floor_id == table.floor_id).all()
        detection_service.active_streams[table.floor_id]["tables"] = [t.to_dict() for t in tables]
    
    return db_table


@app.put("/tables/{table_id}", response_model=TableResponse)
async def update_table(table_id: int, table: TableUpdate, db: Session = Depends(get_db)):
    """Update a table"""
    db_table = db.query(Table).filter(Table.id == table_id).first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    update_data = table.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_table, key, value)
    
    db.commit()
    db.refresh(db_table)
    
    # Update detection if running for this floor
    if db_table.floor_id in detection_service.active_streams:
        tables = db.query(Table).filter(Table.floor_id == db_table.floor_id).all()
        detection_service.active_streams[db_table.floor_id]["tables"] = [t.to_dict() for t in tables]
    
    return db_table


@app.delete("/tables/{table_id}")
async def delete_table(table_id: int, db: Session = Depends(get_db)):
    """Delete a table"""
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    floor_id = table.floor_id
    db.delete(table)
    db.commit()
    
    print(f"🗑️  Deleted table: {table.name}")
    
    # Update detection if running for this floor
    if floor_id in detection_service.active_streams:
        tables = db.query(Table).filter(Table.floor_id == floor_id).all()
        detection_service.active_streams[floor_id]["tables"] = [t.to_dict() for t in tables]
    
    return {"message": f"Table {table.name} deleted"}


# ========================================
# CCTV Stream Endpoints
# ========================================

@app.get("/cctv-streams", response_model=List[CCTVStreamResponse])
async def get_cctv_streams(floor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all CCTV streams, optionally filtered by floor"""
    query = db.query(CCTVStream)
    if floor_id:
        query = query.filter(CCTVStream.floor_id == floor_id)
    streams = query.all()
    return streams


@app.post("/cctv-streams", response_model=CCTVStreamResponse)
async def create_cctv_stream(stream: CCTVStreamCreate, db: Session = Depends(get_db)):
    """Create a new CCTV stream"""
    # Verify floor exists
    floor = db.query(Floor).filter(Floor.id == stream.floor_id).first()
    if not floor:
        raise HTTPException(status_code=400, detail=f"Floor {stream.floor_id} not found")
    
    db_stream = CCTVStream(**stream.model_dump())
    db.add(db_stream)
    db.commit()
    db.refresh(db_stream)
    
    print(f"✅ Created CCTV stream: {db_stream.name} for Floor {floor.number}")
    
    # Auto-start detection if this is first stream for the floor
    if stream.is_active:
        existing_streams = db.query(CCTVStream).filter(
            CCTVStream.floor_id == stream.floor_id,
            CCTVStream.is_active == True,
            CCTVStream.id != db_stream.id
        ).count()
        
        if existing_streams == 0 and floor.id not in detection_service.active_streams:
            # Start detection for this floor
            tables = db.query(Table).filter(Table.floor_id == floor.id).all()
            tables_data = [t.to_dict() for t in tables]
            
            detection_service.start_detection(
                floor_id=floor.id,
                stream_url=stream.url,
                tables=tables_data,
                canvas_width=settings.CANVAS_WIDTH,
                canvas_height=settings.CANVAS_HEIGHT
            )
    
    return db_stream


@app.put("/cctv-streams/{stream_id}", response_model=CCTVStreamResponse)
async def update_cctv_stream(stream_id: int, stream: CCTVStreamUpdate, db: Session = Depends(get_db)):
    """Update a CCTV stream"""
    db_stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
    if not db_stream:
        raise HTTPException(status_code=404, detail="CCTV stream not found")
    
    update_data = stream.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_stream, key, value)
    
    db.commit()
    db.refresh(db_stream)
    
    return db_stream


@app.delete("/cctv-streams/{stream_id}")
async def delete_cctv_stream(stream_id: int, db: Session = Depends(get_db)):
    """Delete a CCTV stream"""
    stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="CCTV stream not found")
    
    floor_id = stream.floor_id
    db.delete(stream)
    db.commit()
    
    print(f"🗑️  Deleted CCTV stream: {stream.name}")
    
    # Check if there are other active streams for this floor
    remaining = db.query(CCTVStream).filter(
        CCTVStream.floor_id == floor_id,
        CCTVStream.is_active == True
    ).count()
    
    # Stop detection if no more streams
    if remaining == 0 and floor_id in detection_service.active_streams:
        detection_service.stop_detection(floor_id)
    
    return {"message": f"CCTV stream {stream.name} deleted"}


# ========================================
# Detection Endpoints
# ========================================

@app.post("/detection/start/{floor_id}")
async def start_detection(
    floor_id: int, 
    params: DetectionStart = DetectionStart(),
    db: Session = Depends(get_db)
):
    """Start detection for a specific floor"""
    # Get floor
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    
    # Get active CCTV stream
    stream = db.query(CCTVStream).filter(
        CCTVStream.floor_id == floor_id,
        CCTVStream.is_active == True
    ).first()
    
    if not stream:
        raise HTTPException(status_code=400, detail="No active CCTV stream for this floor")
    
    # Get tables
    tables = db.query(Table).filter(Table.floor_id == floor_id).all()
    tables_data = [t.to_dict() for t in tables]
    
    # Start detection
    success = detection_service.start_detection(
        floor_id=floor_id,
        stream_url=stream.url,
        tables=tables_data,
        canvas_width=params.canvas_width,
        canvas_height=params.canvas_height
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start detection")
    
    return {
        "message": f"Detection started for floor {floor.number}",
        "floor_id": floor_id,
        "stream_url": stream.url,
        "tables_count": len(tables_data),
        "detection_interval": settings.DETECTION_INTERVAL,
        "canvas_size": f"{params.canvas_width}x{params.canvas_height}"
    }


@app.post("/detection/stop/{floor_id}")
async def stop_detection(floor_id: int):
    """Stop detection for a specific floor"""
    success = detection_service.stop_detection(floor_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Detection was not running for this floor")
    
    return {"message": f"Detection stopped for floor {floor_id}"}


@app.get("/detection/status")
async def get_detection_status():
    """Get detection service status"""
    return detection_service.get_status()


@app.get("/detection/result/{floor_id}")
async def get_detection_result(floor_id: int):
    """Get latest detection result for a floor"""
    result = detection_service.get_latest_result(floor_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="No detection result available")
    
    return result


# ========================================
# WebSocket Endpoint
# ========================================

@app.websocket("/ws/detection/{floor_id}")
async def websocket_detection(websocket: WebSocket, floor_id: int):
    """WebSocket endpoint for real-time detection updates"""
    await manager.connect(websocket, floor_id)
    
    try:
        # Send initial status
        result = detection_service.get_latest_result(floor_id)
        if result:
            await websocket.send_json(result)
        
        # Keep connection alive and wait for detection updates
        while True:
            try:
                # Wait for messages (ping/pong handling)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                
                # Handle ping
                if data == "ping":
                    await websocket.send_text("pong")
                
            except asyncio.TimeoutError:
                # Send latest result as heartbeat
                result = detection_service.get_latest_result(floor_id)
                if result:
                    await websocket.send_json(result)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, floor_id)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket, floor_id)


# ========================================
# Additional API for frontend
# ========================================

@app.get("/tables/with-frames/{floor_id}")
async def get_tables_with_frames(floor_id: int, db: Session = Depends(get_db)):
    """Get tables with frame coordinates for CCTV overlay"""
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    
    tables = db.query(Table).filter(Table.floor_id == floor_id).all()
    
    return {
        "floor_id": floor_id,
        "floor_number": floor.number,
        "canvas_width": settings.CANVAS_WIDTH,
        "canvas_height": settings.CANVAS_HEIGHT,
        "tables": [
            {
                "id": t.id,
                "name": t.name,
                "status": t.status,
                "coords": t.coords,
                "rotation": t.rotation,
                "capacity": t.capacity
            }
            for t in tables
        ]
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
