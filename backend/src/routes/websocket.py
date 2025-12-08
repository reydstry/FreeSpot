"""WebSocket Routes for real-time updates"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, floor_id: int):
        await websocket.accept()
        if floor_id not in self.active_connections:
            self.active_connections[floor_id] = []
        self.active_connections[floor_id].append(websocket)

    def disconnect(self, websocket: WebSocket, floor_id: int):
        if floor_id in self.active_connections:
            if websocket in self.active_connections[floor_id]:
                self.active_connections[floor_id].remove(websocket)

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


manager = ConnectionManager()


@router.websocket("/ws/detection/{floor_id}")
async def websocket_detection(websocket: WebSocket, floor_id: int):
    await manager.connect(websocket, floor_id)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, floor_id)
    except Exception:
        manager.disconnect(websocket, floor_id)


def get_manager():
    return manager
