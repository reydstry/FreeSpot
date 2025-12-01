"""
Table Controller - Business logic for table operations
"""

from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models import Floor, Table
from src.schemas import TableCreate, TableUpdate
from src.detection import detection_service


class TableController:
    """Controller for table-related business logic"""
    
    @staticmethod
    def get_all(db: Session, floor_id: Optional[int] = None):
        """Get all tables, optionally filtered by floor"""
        query = db.query(Table)
        if floor_id:
            query = query.filter(Table.floor_id == floor_id)
        return query.all()
    
    @staticmethod
    def get_with_frames(floor_id: int, db: Session, canvas_width: int, canvas_height: int):
        """Get tables with frame coordinates for CCTV overlay"""
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        tables = db.query(Table).filter(Table.floor_id == floor_id).all()
        
        return {
            "floor_id": floor_id,
            "floor_number": floor.number,
            "canvas_width": canvas_width,
            "canvas_height": canvas_height,
            "tables": [
                {
                    "id": t.id,
                    "name": t.name,
                    "status": t.status,
                    "coords": t.coords,
                    "width": t.width,
                    "height": t.height,
                    "rotation": t.rotation,
                    "capacity": t.capacity
                }
                for t in tables
            ]
        }
    
    @staticmethod
    def create(table_data: TableCreate, db: Session):
        """Create a new table"""
        # Verify floor exists
        floor = db.query(Floor).filter(Floor.id == table_data.floor_id).first()
        if not floor:
            raise HTTPException(
                status_code=400, 
                detail=f"Floor {table_data.floor_id} not found"
            )
        
        db_table = Table(**table_data.model_dump())
        db.add(db_table)
        db.commit()
        db.refresh(db_table)
        
        print(f"✅ Created table: {db_table.name} on Floor {floor.number}")
        
        # Update detection if running for this floor
        TableController._update_detection_tables(table_data.floor_id, db)
        
        return db_table
    
    @staticmethod
    def update(table_id: int, table_data: TableUpdate, db: Session):
        """Update a table"""
        db_table = db.query(Table).filter(Table.id == table_id).first()
        if not db_table:
            raise HTTPException(status_code=404, detail="Table not found")
        
        update_data = table_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_table, key, value)
        
        db.commit()
        db.refresh(db_table)
        
        # Update detection if running for this floor
        TableController._update_detection_tables(db_table.floor_id, db)
        
        return db_table
    
    @staticmethod
    def delete(table_id: int, db: Session):
        """Delete a table"""
        table = db.query(Table).filter(Table.id == table_id).first()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        
        floor_id = table.floor_id
        table_name = table.name
        
        db.delete(table)
        db.commit()
        
        print(f"🗑️  Deleted table: {table_name}")
        
        # Update detection if running for this floor
        TableController._update_detection_tables(floor_id, db)
        
        return {"message": f"Table {table_name} deleted"}
    
    @staticmethod
    def _update_detection_tables(floor_id: int, db: Session):
        """Helper: Update tables in active detection"""
        if floor_id in detection_service.active_streams:
            tables = db.query(Table).filter(Table.floor_id == floor_id).all()
            detection_service.active_streams[floor_id]["tables"] = [
                t.to_dict() for t in tables
            ]
