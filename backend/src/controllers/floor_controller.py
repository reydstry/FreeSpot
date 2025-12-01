"""
Floor Controller - Business logic for floor operations
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models import Floor, Table, CCTVStream
from src.schemas import FloorCreate
from src.detection import detection_service


class FloorController:
    """Controller for floor-related business logic"""
    
    @staticmethod
    def get_all(db: Session):
        """Get all floors ordered by number"""
        return db.query(Floor).order_by(Floor.number).all()
    
    @staticmethod
    def create(floor_data: FloorCreate, db: Session):
        """Create a new floor"""
        # Check if floor number already exists
        existing = db.query(Floor).filter(Floor.number == floor_data.number).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Floor {floor_data.number} already exists"
            )
        
        db_floor = Floor(**floor_data.model_dump())
        db.add(db_floor)
        db.commit()
        db.refresh(db_floor)
        
        print(f"✅ Created floor: {db_floor.name} (#{db_floor.number})")
        return db_floor
    
    @staticmethod
    def delete(floor_id: int, db: Session):
        """Delete a floor"""
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        # Stop detection if running
        if floor_id in detection_service.active_streams:
            detection_service.stop_detection(floor_id)
        
        db.delete(floor)
        db.commit()
        
        print(f"🗑️  Deleted floor: {floor.name}")
        return {"message": f"Floor {floor.name} deleted"}
