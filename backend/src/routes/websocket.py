"""
WebSocket Routes - WebSocket endpoints for real-time updates
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.detection import detection_service

router = APIRouter(tags=["WebSocket"])


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
            
            for dead in dead_connections:
                self.active_connections[floor_id].remove(dead)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws/detection/{floor_id}")
async def websocket_detection(websocket: WebSocket, floor_id: int):
    """WebSocket endpoint for real-time detection updates"""
    await manager.connect(websocket, floor_id)
    
    last_timestamp = None
    
    try:
        # Send initial status
        result = detection_service.get_latest_result(floor_id)
        if result:
            await websocket.send_json(result)
            last_timestamp = result.get("timestamp")
        
        # Keep connection alive and poll for new detection results
        while True:
            try:
                # Check for client messages with short timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.5)
                
                if data == "ping":
                    await websocket.send_text("pong")
                
            except asyncio.TimeoutError:
                # Poll for new detection results every 0.5s
                result = detection_service.get_latest_result(floor_id)
                if result:
                    current_timestamp = result.get("timestamp")
                    # Only send if there's new data
                    if current_timestamp != last_timestamp:
                        await websocket.send_json(result)
                        last_timestamp = current_timestamp
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, floor_id)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket, floor_id)


def get_manager():
    """Get the connection manager instance"""
    return manager
