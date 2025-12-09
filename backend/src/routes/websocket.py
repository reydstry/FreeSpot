"""WebSocket Routes for real-time updates"""

import asyncio
import httpx
import base64
import random
import io
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.models import Floor, Table, CCTVStream
from src.config import settings

# Try to import cv2 and numpy for image processing
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️ OpenCV not available - will use HTTP snapshot mode")

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
        print(f"✅ [WS] Client connected to floor {floor_id}. Total connections: {len(self.active_connections[floor_id])}")

    def disconnect(self, websocket: WebSocket, floor_id: int):
        if floor_id in self.active_connections:
            if websocket in self.active_connections[floor_id]:
                self.active_connections[floor_id].remove(websocket)
            print(f"🔌 [WS] Client disconnected from floor {floor_id}. Remaining: {len(self.active_connections.get(floor_id, []))}")
            # Stop detection if no more connections
            if not self.active_connections[floor_id] and floor_id in self.active_streams:
                print(f"🛑 [WS] No more clients, stopping detection for floor {floor_id}")
                self.active_streams[floor_id].cancel()
                del self.active_streams[floor_id]

    async def broadcast(self, floor_id: int, message: dict):
        if floor_id in self.active_connections:
            clients_count = len(self.active_connections[floor_id])
            if clients_count == 0:
                print(f"⚠️ [BROADCAST] No clients to broadcast to for floor {floor_id}")
                return
            
            print(f"📡 [BROADCAST] Sending to {clients_count} client(s) on floor {floor_id}: {message.get('status', 'unknown')} - {message.get('mode', 'N/A')}")
            
            dead = []
            sent_count = 0
            for conn in self.active_connections[floor_id]:
                try:
                    await conn.send_json(message)
                    sent_count += 1
                except Exception as e:
                    print(f"⚠️ [WS] Failed to send to client: {e}")
                    dead.append(conn)
            for d in dead:
                self.active_connections[floor_id].remove(d)
            
            print(f"✅ [BROADCAST] Sent to {sent_count}/{clients_count} clients")

    def start_detection(self, floor_id: int, stream_url: str, tables: list, canvas_width: int, canvas_height: int):
        if floor_id in self.active_streams:
            print(f"ℹ️ [DETECTION] Detection already running for floor {floor_id}")
            return
        
        self.stream_data[floor_id] = {
            "stream_url": stream_url,
            "tables": tables,
            "canvas_width": canvas_width,
            "canvas_height": canvas_height
        }
        
        print(f"🚀 [DETECTION] Starting detection for floor {floor_id}")
        task = asyncio.create_task(self._detection_loop(floor_id))
        self.active_streams[floor_id] = task

    async def _detection_loop(self, floor_id: int):
        """Main detection loop that captures frames from HTTP stream and sends to ML API"""
        data = self.stream_data.get(floor_id)
        if not data:
            print(f"❌ [DETECTION] No stream data for floor {floor_id}")
            return

        stream_url = data["stream_url"]
        tables = data["tables"]
        canvas_width = data["canvas_width"]
        canvas_height = data["canvas_height"]

        print(f"═══════════════════════════════════════════════════")
        print(f"🚀 [DETECTION] STARTING DETECTION LOOP")
        print(f"═══════════════════════════════════════════════════")
        print(f"📍 Floor ID: {floor_id}")
        print(f"📹 Stream URL: {stream_url}")
        print(f"📊 Tables: {len(tables)}")
        print(f"📐 Canvas: {canvas_width}x{canvas_height}")
        print(f"🤖 ML API URL: {settings.ML_API_URL}")
        print(f"═══════════════════════════════════════════════════")

        # Convert video stream URL to snapshot URL if needed
        # IP Webcam uses /shot.jpg for snapshots
        snapshot_url = stream_url
        if "/video" in stream_url:
            snapshot_url = stream_url.replace("/video", "/shot.jpg")
        elif not stream_url.endswith((".jpg", ".jpeg", ".png")):
            # Try adding /shot.jpg for IP Webcam
            snapshot_url = stream_url.rstrip("/") + "/shot.jpg"
        
        print(f"📸 Snapshot URL: {snapshot_url}")

        # Send initial status
        await self.broadcast(floor_id, {
            "type": "status",
            "message": "Connecting to CCTV stream...",
            "status": "connecting",
            "timestamp": datetime.now().isoformat()
        })

        loop_count = 0
        consecutive_errors = 0
        max_consecutive_errors = 5

        while floor_id in self.active_streams:
            loop_count += 1
            try:
                print(f"🔄 [DETECTION] Loop #{loop_count} for floor {floor_id}")
                
                # Capture frame from HTTP stream
                frame_base64 = await self._capture_frame_http(snapshot_url)
                
                if frame_base64:
                    consecutive_errors = 0  # Reset error counter on success
                    print(f"📸 [DETECTION] Frame captured successfully ({len(frame_base64)} bytes base64)")
                    
                    # Send to ML API for detection
                    detection_result = await self._send_to_ml_api(
                        floor_id, tables, frame_base64, canvas_width, canvas_height
                    )
                    
                    if detection_result:
                        await self.broadcast(floor_id, {
                            "timestamp": datetime.now().isoformat(),
                            "persons_detected": detection_result.get("person_count", 0),
                            "table_status": detection_result.get("table_status", []),
                            "status": "detecting",
                            "mode": "stream_detection"
                        })
                        print(f"✅ [DETECTION] Floor {floor_id}: {detection_result.get('person_count', 0)} persons detected")
                    else:
                        print(f"⚠️ [DETECTION] ML API returned no result, using frame-based estimation")
                        # Fallback: just report frame captured, no detection
                        await self.broadcast(floor_id, {
                            "timestamp": datetime.now().isoformat(),
                            "persons_detected": 0,
                            "table_status": [{"id": t["id"], "name": t.get("name"), "occupied": False, "method": "no_ml"} for t in tables],
                            "status": "detecting",
                            "mode": "stream_no_ml"
                        })
                else:
                    consecutive_errors += 1
                    print(f"⚠️ [DETECTION] Failed to capture frame (error {consecutive_errors}/{max_consecutive_errors})")
                    
                    await self.broadcast(floor_id, {
                        "timestamp": datetime.now().isoformat(),
                        "error": f"Cannot capture frame from CCTV (attempt {consecutive_errors})",
                        "status": "error",
                        "mode": "stream_error"
                    })
                    
                    if consecutive_errors >= max_consecutive_errors:
                        print(f"❌ [DETECTION] Too many consecutive errors, stopping detection")
                        await self.broadcast(floor_id, {
                            "timestamp": datetime.now().isoformat(),
                            "error": "CCTV stream unavailable. Please check the stream URL.",
                            "status": "stopped"
                        })
                        break

                # Wait for next detection interval
                await asyncio.sleep(settings.DETECTION_INTERVAL)

            except asyncio.CancelledError:
                print(f"🛑 [DETECTION] Cancelled for floor {floor_id}")
                break
            except Exception as e:
                print(f"❌ [DETECTION] Error: {e}")
                await self.broadcast(floor_id, {
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                    "status": "error"
                })
                await asyncio.sleep(5)

        print(f"🏁 [DETECTION] Loop ended for floor {floor_id}")

    async def _capture_frame_http(self, snapshot_url: str) -> str | None:
        """Capture a frame from HTTP snapshot URL and return as base64"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                print(f"📡 [HTTP] Fetching snapshot from: {snapshot_url}")
                response = await client.get(snapshot_url)
                
                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    print(f"📡 [HTTP] Response: {response.status_code}, Content-Type: {content_type}, Size: {len(response.content)} bytes")
                    
                    # Check if it's an image
                    if "image" in content_type or response.content[:3] == b'\xff\xd8\xff':  # JPEG magic bytes
                        frame_base64 = base64.b64encode(response.content).decode('utf-8')
                        return frame_base64
                    else:
                        print(f"⚠️ [HTTP] Response is not an image: {content_type}")
                        return None
                else:
                    print(f"⚠️ [HTTP] Failed to fetch snapshot: {response.status_code}")
                    return None
        except Exception as e:
            print(f"❌ [HTTP] Error fetching snapshot: {e}")
            return None

    async def _send_to_ml_api(self, floor_id: int, tables: list, frame_base64: str, canvas_width: int, canvas_height: int) -> dict | None:
        """Send frame to ML API for detection"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                print(f"🤖 [ML API] Sending frame to {settings.ML_API_URL}/detect/base64")
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
                    print(f"🤖 [ML API] Detection result: {result}")
                    return result
                else:
                    print(f"⚠️ [ML API] Error response: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"❌ [ML API] Request failed: {e}")
            return None

    def is_detecting(self, floor_id: int) -> bool:
        return floor_id in self.active_streams


manager = DetectionManager()


@router.websocket("/ws/detection/{floor_id}")
async def websocket_detection(websocket: WebSocket, floor_id: int):
    print(f"═══════════════════════════════════════════════════")
    print(f"🔌 [WEBSOCKET] NEW CONNECTION REQUEST")
    print(f"═══════════════════════════════════════════════════")
    print(f"📍 Floor ID: {floor_id}")
    
    # Get data from database and close session immediately
    from src.database import SessionLocal
    db = SessionLocal()
    
    try:
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        stream = db.query(CCTVStream).filter(
            CCTVStream.floor_id == floor_id,
            CCTVStream.is_active == True
        ).first()
        tables = db.query(Table).filter(Table.floor_id == floor_id).all()
        
        # Extract data before closing session
        floor_data = {"id": floor.id, "name": floor.name} if floor else None
        stream_url = stream.url if stream else None
        tables_data = [
            {
                "id": t.id,
                "name": t.name,
                "coords": t.coords,
                "width": t.width,
                "height": t.height
            }
            for t in tables
        ] if tables else []
        
    finally:
        db.close()  # Close DB session immediately after query
        print(f"✅ Database session closed")
    
    print(f"📊 Floor found: {floor_data is not None}")
    print(f"📹 Stream found: {stream_url is not None}")
    print(f"🪑 Tables found: {len(tables_data)}")
    
    try:
        await manager.connect(websocket, floor_id)
        
        if floor_data and stream_url and tables_data:
            print(f"✅ All data available, starting detection...")
            print(f"📹 Stream URL: {stream_url}")
            
            # Start detection if not already running
            if not manager.is_detecting(floor_id):
                manager.start_detection(
                    floor_id,
                    stream_url,
                    tables_data,
                    settings.CANVAS_WIDTH,
                    settings.CANVAS_HEIGHT
                )
            else:
                print(f"ℹ️ Detection already running for floor {floor_id}")
            
            # Send initial status
            await websocket.send_json({
                "type": "connected",
                "message": "Detection sedang berjalan...",
                "floor_id": floor_id,
                "floor_name": floor_data["name"],
                "stream_url": stream_url,
                "tables_count": len(tables_data),
                "status": "detecting",
                "timestamp": datetime.now().isoformat()
            })
            print(f"✅ Initial status sent to client")
        else:
            missing = []
            if not floor_data:
                missing.append("floor")
            if not stream_url:
                missing.append("active CCTV stream")
            if not tables_data:
                missing.append("tables")
            error_msg = f"Missing: {', '.join(missing)}"
            print(f"❌ {error_msg}")
            
            await websocket.send_json({
                "type": "error",
                "error": error_msg,
                "timestamp": datetime.now().isoformat()
            })
        
        print(f"═══════════════════════════════════════════════════")
        
        # Keep connection alive with ping/pong
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except:
                    break
                
    except WebSocketDisconnect:
        print(f"🔌 [WS] Client disconnected normally from floor {floor_id}")
        manager.disconnect(websocket, floor_id)
    except Exception as e:
        print(f"❌ [WEBSOCKET] Error: {e}")
        manager.disconnect(websocket, floor_id)


def get_manager():
    return manager
