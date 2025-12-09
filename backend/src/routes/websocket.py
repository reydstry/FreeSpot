"""WebSocket Routes for real-time updates"""

import asyncio
import httpx
import base64
import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.models import Floor, Table, CCTVStream
from src.config import settings

# Try to import cv2, but make it optional
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️ OpenCV not available - using simulation mode for detection")

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
        """Main detection loop that captures frames and sends to ML API"""
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
        print(f"📦 OpenCV Available: {CV2_AVAILABLE}")
        print(f"═══════════════════════════════════════════════════")

        # Send initial status
        await self.broadcast(floor_id, {
            "type": "status",
            "message": "Detection loop started",
            "status": "connecting",
            "timestamp": datetime.now().isoformat()
        })

        # If OpenCV not available or can't connect to stream, use simulation mode
        use_simulation = not CV2_AVAILABLE
        cap = None
        
        if CV2_AVAILABLE:
            print(f"🔌 [DETECTION] Attempting to open video stream...")
            cap = cv2.VideoCapture(stream_url)
            if not cap.isOpened():
                print(f"⚠️ [DETECTION] Cannot open stream, switching to simulation mode")
                use_simulation = True
                cap = None

        if use_simulation:
            print(f"🎮 [DETECTION] Using SIMULATION MODE")
            await self.broadcast(floor_id, {
                "type": "status", 
                "message": "Mode simulasi aktif (CCTV tidak tersedia)",
                "status": "simulation",
                "timestamp": datetime.now().isoformat()
            })

        loop_count = 0
        while floor_id in self.active_streams:
            loop_count += 1
            try:
                print(f"🔄 [DETECTION] Loop #{loop_count} for floor {floor_id}")
                
                if use_simulation:
                    # Simulation mode - generate more realistic detection data
                    # Use 0-2 range for more realistic simulation when alone
                    persons_detected = random.randint(0, 2)
                    table_status = []
                    for t in tables:
                        # Occupied if persons detected > 0 AND random chance
                        # More realistic: only occupied if someone is actually detected
                        occupied = persons_detected > 0 and random.random() < 0.5
                        table_status.append({
                            "id": t["id"],
                            "name": t.get("name", f"Table {t['id']}"),
                            "occupied": occupied,
                            "method": "simulation"
                        })
                    
                    result_data = {
                        "timestamp": datetime.now().isoformat(),
                        "persons_detected": persons_detected,
                        "table_status": table_status,
                        "status": "detecting",
                        "mode": "simulation"
                    }
                    
                    print(f"✅ [SIMULATION] Floor {floor_id}: {persons_detected} persons (simulated)")
                    await self.broadcast(floor_id, result_data)
                    
                else:
                    # Real detection mode with OpenCV
                    ret, frame = cap.read()
                    if not ret:
                        print(f"⚠️ [DETECTION] Failed to read frame")
                        await self.broadcast(floor_id, {
                            "error": "Failed to read CCTV frame",
                            "status": "error",
                            "timestamp": datetime.now().isoformat()
                        })
                        await asyncio.sleep(2)
                        continue

                    # Encode frame to base64
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')

                    # Send to ML API
                    try:
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
                                await self.broadcast(floor_id, {
                                    "timestamp": datetime.now().isoformat(),
                                    "persons_detected": result.get("person_count", 0),
                                    "table_status": result.get("table_status", []),
                                    "status": "detecting",
                                    "mode": "ml_api"
                                })
                                print(f"✅ [ML API] Floor {floor_id}: {result.get('person_count', 0)} persons")
                            else:
                                print(f"⚠️ [ML API] Error: {response.status_code}")
                                # Fallback to simulation on ML API error
                                await self._send_simulation_result(floor_id, tables)
                    except Exception as e:
                        print(f"❌ [ML API] Request failed: {e}")
                        await self._send_simulation_result(floor_id, tables)

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
                await asyncio.sleep(3)

        if cap:
            cap.release()
        print(f"🏁 [DETECTION] Loop ended for floor {floor_id}")

    async def _send_simulation_result(self, floor_id: int, tables: list):
        """Send simulated detection result"""
        persons_detected = random.randint(0, 3)
        table_status = []
        for t in tables:
            occupied = random.random() < 0.3
            table_status.append({
                "id": t["id"],
                "name": t.get("name", f"Table {t['id']}"),
                "occupied": occupied,
                "method": "simulation_fallback"
            })
        
        await self.broadcast(floor_id, {
            "timestamp": datetime.now().isoformat(),
            "persons_detected": persons_detected,
            "table_status": table_status,
            "status": "detecting",
            "mode": "simulation_fallback"
        })

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
