"""
FreeSpot Backend - Pydantic Schemas
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ========================================
# Floor Schemas
# ========================================

class FloorBase(BaseModel):
    name: str
    number: int


class FloorCreate(FloorBase):
    pass


class FloorResponse(FloorBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ========================================
# Table Schemas
# ========================================

class TableBase(BaseModel):
    name: str
    capacity: int = 4
    status: str = "available"
    floor_id: int
    coords: List[float] = [0, 0, 100, 100]
    rotation: float = 0.0


class TableCreate(TableBase):
    pass


class TableUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    coords: Optional[List[float]] = None
    rotation: Optional[float] = None


class TableResponse(TableBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ========================================
# CCTV Stream Schemas
# ========================================

class CCTVStreamBase(BaseModel):
    name: str
    url: str
    floor_id: int
    is_active: bool = True


class CCTVStreamCreate(CCTVStreamBase):
    pass


class CCTVStreamUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    is_active: Optional[bool] = None


class CCTVStreamResponse(CCTVStreamBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ========================================
# Detection Schemas
# ========================================

class DetectionStart(BaseModel):
    canvas_width: int = 1280
    canvas_height: int = 720


class TableStatus(BaseModel):
    id: int
    name: str
    occupied: bool
    method: str = "center_point"
    distance: Optional[float] = None
    person_count: int = 0


class DetectionResult(BaseModel):
    floor_id: int
    timestamp: str
    persons_detected: int
    table_status: List[TableStatus]
    frame_width: int
    frame_height: int
    processing_time_ms: float


class DetectionStatusResponse(BaseModel):
    is_running: bool
    streams: dict
    device: str
    model: str
