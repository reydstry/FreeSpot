# FreeSpot Backend Source
from .config import settings
from .detection import detection_service

__all__ = ["settings", "detection_service"]
