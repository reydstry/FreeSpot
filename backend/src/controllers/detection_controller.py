"""Detection Controller - Connects to external ML API"""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models import Floor, Table, CCTVStream
from src.schemas import DetectionStart
from src.config import settings


class DetectionController:

    @staticmethod
    def start(floor_id: int, params: DetectionStart, db: Session):
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")

        stream = db.query(CCTVStream).filter(
            CCTVStream.floor_id == floor_id,
            CCTVStream.is_active == True
        ).first()

        if not stream:
            raise HTTPException(status_code=400, detail="No active CCTV stream for this floor")

        tables = db.query(Table).filter(Table.floor_id == floor_id).all()
        tables_data = [t.to_dict() for t in tables]

        return {
            "message": f"Detection ready for floor {floor.number}",
            "floor_id": floor_id,
            "stream_url": stream.url,
            "tables_count": len(tables_data),
            "detection_interval": settings.DETECTION_INTERVAL,
            "canvas_size": f"{params.canvas_width}x{params.canvas_height}",
            "ml_api_url": settings.ML_API_URL,
            "tables": tables_data,
        }

    @staticmethod
    def stop(floor_id: int):
        return {"message": f"Detection stopped for floor {floor_id}"}

    @staticmethod
    def get_status():
        return {"ml_api_url": settings.ML_API_URL}

    @staticmethod
    def get_floor_status(floor_id: int, db: Session):
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")

        streams = db.query(CCTVStream).filter(CCTVStream.floor_id == floor_id).all()
        active_streams = [s for s in streams if s.is_active]

        return {
            "floor_id": floor_id,
            "floor_name": floor.name,
            "floor_number": floor.number,
            "cctv_streams": [
                {"id": s.id, "name": s.name, "url": s.url, "is_active": s.is_active}
                for s in streams
            ],
            "active_streams_count": len(active_streams),
            "ml_api_url": settings.ML_API_URL,
        }

    @staticmethod
    def get_result(floor_id: int):
        raise HTTPException(status_code=404, detail="Detection results provided by ML API")

    @staticmethod
    def get_system_info():
        return {"ml_api_url": settings.ML_API_URL}
