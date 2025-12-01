"""
Table Routes - API endpoints for table operations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas import TableCreate, TableUpdate, TableResponse
from src.controllers import TableController
from src.config import settings

router = APIRouter(prefix="/tables", tags=["Tables"])


@router.get("", response_model=List[TableResponse])
async def get_tables(floor_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all tables, optionally filtered by floor"""
    return TableController.get_all(db, floor_id)


@router.get("/with-frames/{floor_id}")
async def get_tables_with_frames(floor_id: int, db: Session = Depends(get_db)):
    """Get tables with frame coordinates for CCTV overlay"""
    return TableController.get_with_frames(
        floor_id, db, 
        settings.CANVAS_WIDTH, 
        settings.CANVAS_HEIGHT
    )


@router.post("", response_model=TableResponse)
async def create_table(table: TableCreate, db: Session = Depends(get_db)):
    """Create a new table"""
    return TableController.create(table, db)


@router.put("/{table_id}", response_model=TableResponse)
async def update_table(table_id: int, table: TableUpdate, db: Session = Depends(get_db)):
    """Update a table"""
    return TableController.update(table_id, table, db)


@router.delete("/{table_id}")
async def delete_table(table_id: int, db: Session = Depends(get_db)):
    """Delete a table"""
    return TableController.delete(table_id, db)
