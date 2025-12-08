"""CCTV Controller"""

from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models import Floor, CCTVStream
from src.schemas import CCTVStreamCreate, CCTVStreamUpdate


class CCTVController:

    @staticmethod
    def get_all(db: Session, floor_id: Optional[int] = None):
        query = db.query(CCTVStream)
        if floor_id:
            query = query.filter(CCTVStream.floor_id == floor_id)
        return query.all()

    @staticmethod
    def create(stream_data: CCTVStreamCreate, db: Session, canvas_width: int, canvas_height: int):
        floor = db.query(Floor).filter(Floor.id == stream_data.floor_id).first()
        if not floor:
            raise HTTPException(status_code=400, detail=f"Floor {stream_data.floor_id} not found")

        db_stream = CCTVStream(**stream_data.model_dump())
        db.add(db_stream)
        db.commit()
        db.refresh(db_stream)
        return db_stream

    @staticmethod
    def update(stream_id: int, stream_data: CCTVStreamUpdate, db: Session, canvas_width: int, canvas_height: int):
        db_stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
        if not db_stream:
            raise HTTPException(status_code=404, detail="CCTV stream not found")

        update_data = stream_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_stream, key, value)

        db.commit()
        db.refresh(db_stream)
        return db_stream

    @staticmethod
    def delete(stream_id: int, db: Session):
        stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
        if not stream:
            raise HTTPException(status_code=404, detail="CCTV stream not found")

        stream_name = stream.name
        db.delete(stream)
        db.commit()
        return {"message": f"CCTV stream {stream_name} deleted"}

    @staticmethod
    def toggle(stream_id: int, db: Session, canvas_width: int, canvas_height: int):
        db_stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
        if not db_stream:
            raise HTTPException(status_code=404, detail="CCTV stream not found")

        db_stream.is_active = not db_stream.is_active
        db.commit()
        db.refresh(db_stream)

        status_text = "ON" if db_stream.is_active else "OFF"
        return {
            "message": f"CCTV stream '{db_stream.name}' turned {status_text}",
            "stream_id": stream_id,
            "is_active": db_stream.is_active
        }
