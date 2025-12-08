"""Floor Controller"""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models import Floor
from src.schemas import FloorCreate


class FloorController:

    @staticmethod
    def get_all(db: Session):
        return db.query(Floor).order_by(Floor.number).all()

    @staticmethod
    def create(floor_data: FloorCreate, db: Session):
        existing = db.query(Floor).filter(Floor.number == floor_data.number).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Floor {floor_data.number} already exists")

        db_floor = Floor(**floor_data.model_dump())
        db.add(db_floor)
        db.commit()
        db.refresh(db_floor)
        return db_floor

    @staticmethod
    def delete(floor_id: int, db: Session):
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")

        db.delete(floor)
        db.commit()
        return {"message": f"Floor {floor.name} deleted"}
