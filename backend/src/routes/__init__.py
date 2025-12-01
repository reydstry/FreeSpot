# FreeSpot Routes
from .floors import router as floors_router
from .tables import router as tables_router
from .cctv import router as cctv_router
from .detection import router as detection_router
from .websocket import router as websocket_router

__all__ = [
    "floors_router",
    "tables_router", 
    "cctv_router",
    "detection_router",
    "websocket_router"
]
