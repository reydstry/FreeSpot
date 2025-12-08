"""Floor Routes"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas import FloorCreate, FloorResponse
from src.controllers import FloorController

router = APIRouter(prefix="/floors", tags=["Floors"])


@router.get("", response_model=List[FloorResponse])
async def get_floors(db: Session = Depends(get_db)):
    return FloorController.get_all(db)


@router.post("", response_model=FloorResponse)
async def create_floor(floor: FloorCreate, db: Session = Depends(get_db)):
    return FloorController.create(floor, db)


@router.delete("/{floor_id}")
async def delete_floor(floor_id: int, db: Session = Depends(get_db)):
    return FloorController.delete(floor_id, db)
