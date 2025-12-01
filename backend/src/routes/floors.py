"""
Floor Routes - API endpoints for floor operations
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas import FloorCreate, FloorResponse
from src.controllers import FloorController

router = APIRouter(prefix="/floors", tags=["Floors"])


@router.get("", response_model=List[FloorResponse])
async def get_floors(db: Session = Depends(get_db)):
    """Get all floors"""
    return FloorController.get_all(db)


@router.post("", response_model=FloorResponse)
async def create_floor(floor: FloorCreate, db: Session = Depends(get_db)):
    """Create a new floor"""
    return FloorController.create(floor, db)


@router.delete("/{floor_id}")
async def delete_floor(floor_id: int, db: Session = Depends(get_db)):
    """Delete a floor"""
    return FloorController.delete(floor_id, db)
