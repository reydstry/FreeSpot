"""
CCTV Routes - API endpoints for CCTV stream operations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas import CCTVStreamCreate, CCTVStreamUpdate, CCTVStreamResponse
from src.controllers import CCTVController
from src.config import settings

router = APIRouter(prefix="/cctv-streams", tags=["CCTV Streams"])


@router.get("", response_model=List[CCTVStreamResponse])
async def get_cctv_streams(floor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all CCTV streams, optionally filtered by floor"""
    return CCTVController.get_all(db, floor_id)


@router.post("", response_model=CCTVStreamResponse)
async def create_cctv_stream(stream: CCTVStreamCreate, db: Session = Depends(get_db)):
    """Create a new CCTV stream"""
    return CCTVController.create(
        stream, db,
        settings.CANVAS_WIDTH,
        settings.CANVAS_HEIGHT
    )


@router.put("/{stream_id}", response_model=CCTVStreamResponse)
async def update_cctv_stream(stream_id: int, stream: CCTVStreamUpdate, db: Session = Depends(get_db)):
    """Update a CCTV stream"""
    return CCTVController.update(
        stream_id, stream, db,
        settings.CANVAS_WIDTH,
        settings.CANVAS_HEIGHT
    )


@router.delete("/{stream_id}")
async def delete_cctv_stream(stream_id: int, db: Session = Depends(get_db)):
    """Delete a CCTV stream"""
    return CCTVController.delete(stream_id, db)


@router.post("/{stream_id}/toggle")
async def toggle_cctv_stream(stream_id: int, db: Session = Depends(get_db)):
    """Toggle CCTV stream active status (on/off) - controls detection automatically"""
    return CCTVController.toggle(
        stream_id, db,
        settings.CANVAS_WIDTH,
        settings.CANVAS_HEIGHT
    )
