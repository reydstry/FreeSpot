"""WebSocket Routes for real-time updates"""

import asyncio
import httpx
import cv2
import base64
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.models import Floor, Table, CCTVStream
from src.config import settings

router = APIRouter(tags=["WebSocket"])


class DetectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}
        self.active_streams: dict[int, asyncio.Task] = {}
        self.stream_data: dict[int, dict] = {}

    async def connect(self, websocket: WebSocket, floor_id: int):
        await websocket.accept()
        if floor_id not in self.active_connections:
            self.active_connections[floor_id] = []
        self.active_connections[floor_id].append(websocket)

    def disconnect(self, websocket: WebSocket, floor_id: int):
        if floor_id in self.active_connections:
            if websocket in self.active_connections[floor_id]:
                self.active_connections[floor_id].remove(websocket)
            # Stop detection if no more connections
            if not self.active_connections[floor_id] and floor_id in self.active_streams:
                self.active_streams[floor_id].cancel()
                del self.active_streams[floor_id]

    async def broadcast(self, floor_id: int, message: dict):
        if floor_id in self.active_connections:
            dead = []
            for conn in self.active_connections[floor_id]:
                try:
                    await conn.send_json(message)
                except:
                    dead.append(conn)
            for d in dead:
                self.active_connections[floor_id].remove(d)

    def start_detection(self, floor_id: int, stream_url: str, tables: list, canvas_width: int, canvas_height: int):
        if floor_id in self.active_streams:
            return  # Already running
        
        self.stream_data[floor_id] = {
            "stream_url": stream_url,
            "tables": tables,
            "canvas_width": canvas_width,
            "canvas_height": canvas_height
        }
        
        task = asyncio.create_task(self._detection_loop(floor_id))
        self.active_streams[floor_id] = task

    async def _detection_loop(self, floor_id: int):
        """Main detection loop that captures frames and sends to ML API"""
        data = self.stream_data.get(floor_id)
        if not data:
            return

        stream_url = data["stream_url"]
        tables = data["tables"]
        canvas_width = data["canvas_width"]
        canvas_height = data["canvas_height"]

        print(f"🚀 [DETECTION] Starting detection loop for floor {floor_id}")
        print(f"📹 [DETECTION] Stream URL: {stream_url}")
        print(f"📊 [DETECTION] Tables: {len(tables)}")

        cap = None
        retry_count = 0
        max_retries = 5

        while floor_id in self.active_streams:
            try:
                # Open video capture if not open
                if cap is None or not cap.isOpened():
                    print(f"🔌 [DETECTION] Opening video stream...")
                    cap = cv2.VideoCapture(stream_url)
                    if not cap.isOpened():
                        retry_count += 1
                        error_msg = f"Cannot open video stream (attempt {retry_count}/{max_retries})"
                        print(f"❌ [DETECTION] {error_msg}")
                        await self.broadcast(floor_id, {
                            "error": error_msg,
                            "timestamp": datetime.now().isoformat(),
                            "status": "connecting"
                        })
                        if retry_count >= max_retries:
                            await self.broadcast(floor_id, {
                                "error": "Failed to connect to CCTV stream after multiple attempts",
                                "timestamp": datetime.now().isoformat(),
                                "status": "error"
                            })
                            break
                        await asyncio.sleep(3)
                        continue
                    retry_count = 0
                    print(f"✅ [DETECTION] Video stream opened successfully")

                # Read frame
                ret, frame = cap.read()
                if not ret:
                    print(f"⚠️ [DETECTION] Failed to read frame, reopening stream...")
                    cap.release()
                    cap = None
                    await asyncio.sleep(1)
                    continue

                # Encode frame to base64
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                # Send to ML API
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{settings.ML_API_URL}/detect/base64",
                        json={
                            "floor_id": floor_id,
                            "tables": tables,
                            "frame_base64": frame_base64,
                            "canvas_width": canvas_width,
                            "canvas_height": canvas_height,
                            "confidence": settings.DETECTION_CONFIDENCE
                        }
                    )

                    if response.status_code == 200:
                        result = response.json()
                        # Broadcast result to all connected clients
                        await self.broadcast(floor_id, {
                            "timestamp": datetime.now().isoformat(),
                            "persons_detected": result.get("person_count", 0),
                            "table_status": result.get("table_status", []),
                            "status": "detecting"
                        })
                        print(f"✅ [DETECTION] Floor {floor_id}: {result.get('person_count', 0)} persons detected")
                    else:
                        print(f"⚠️ [DETECTION] ML API returned {response.status_code}")

                # Wait for next detection interval
                await asyncio.sleep(settings.DETECTION_INTERVAL)

            except asyncio.CancelledError:
                print(f"🛑 [DETECTION] Detection loop cancelled for floor {floor_id}")
                break
            except Exception as e:
                print(f"❌ [DETECTION] Error in detection loop: {e}")
                await self.broadcast(floor_id, {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                    "status": "error"
                })
                await asyncio.sleep(3)

        if cap:
            cap.release()
        print(f"🏁 [DETECTION] Detection loop ended for floor {floor_id}")

    def is_detecting(self, floor_id: int) -> bool:
        return floor_id in self.active_streams


manager = DetectionManager()


@router.websocket("/ws/detection/{floor_id}")
async def websocket_detection(websocket: WebSocket, floor_id: int):
    # Get database session
    from src.database import SessionLocal
    db = SessionLocal()
    
    try:
        await manager.connect(websocket, floor_id)
        
        # Get floor info and start detection if not already running
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        stream = db.query(CCTVStream).filter(
            CCTVStream.floor_id == floor_id,
            CCTVStream.is_active == True
        ).first()
        tables = db.query(Table).filter(Table.floor_id == floor_id).all()
        
        if floor and stream and tables:
            tables_data = [
                {
                    "id": t.id,
                    "name": t.name,
                    "coords": [t.x, t.y],
                    "width": t.width,
                    "height": t.height
                }
                for t in tables
            ]
            
            # Start detection if not already running
            if not manager.is_detecting(floor_id):
                manager.start_detection(
                    floor_id,
                    stream.url,
                    tables_data,
                    settings.CANVAS_WIDTH,
                    settings.CANVAS_HEIGHT
                )
            
            # Send initial status
            await websocket.send_json({
                "type": "connected",
                "message": "Detection sedang berjalan...",
                "floor_id": floor_id,
                "floor_name": floor.name,
                "stream_url": stream.url,
                "tables_count": len(tables_data),
                "status": "detecting",
                "timestamp": datetime.now().isoformat()
            })
        else:
            await websocket.send_json({
                "type": "error",
                "error": "Floor, CCTV stream, or tables not found",
                "timestamp": datetime.now().isoformat()
            })
        
        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, floor_id)
    except Exception as e:
        print(f"❌ [WEBSOCKET] Error: {e}")
        manager.disconnect(websocket, floor_id)
    finally:
        db.close()


def get_manager():
    return manager
