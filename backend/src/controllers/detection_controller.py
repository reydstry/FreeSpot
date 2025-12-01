"""
Detection Controller - Business logic for detection operations
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models import Floor, Table, CCTVStream
from src.schemas import DetectionStart
from src.detection import detection_service


class DetectionController:
    """Controller for detection-related business logic"""
    
    @staticmethod
    def start(floor_id: int, params: DetectionStart, db: Session):
        """Start detection for a specific floor"""
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        stream = db.query(CCTVStream).filter(
            CCTVStream.floor_id == floor_id,
            CCTVStream.is_active == True
        ).first()
        
        if not stream:
            raise HTTPException(
                status_code=400, 
                detail="No active CCTV stream for this floor"
            )
        
        tables = db.query(Table).filter(Table.floor_id == floor_id).all()
        tables_data = [t.to_dict() for t in tables]
        
        success = detection_service.start_detection(
            floor_id=floor_id,
            stream_url=stream.url,
            tables=tables_data,
            canvas_width=params.canvas_width,
            canvas_height=params.canvas_height
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to start detection")
        
        from src.config import settings
        
        return {
            "message": f"Detection started for floor {floor.number}",
            "floor_id": floor_id,
            "stream_url": stream.url,
            "tables_count": len(tables_data),
            "detection_interval": settings.DETECTION_INTERVAL,
            "canvas_size": f"{params.canvas_width}x{params.canvas_height}"
        }
    
    @staticmethod
    def stop(floor_id: int):
        """Stop detection for a specific floor"""
        success = detection_service.stop_detection(floor_id)
        
        if not success:
            raise HTTPException(
                status_code=400, 
                detail="Detection was not running for this floor"
            )
        
        return {"message": f"Detection stopped for floor {floor_id}"}
    
    @staticmethod
    def get_status():
        """Get detection service status"""
        return detection_service.get_status()
    
    @staticmethod
    def get_floor_status(floor_id: int, db: Session):
        """Get detection status for a specific floor"""
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        streams = db.query(CCTVStream).filter(CCTVStream.floor_id == floor_id).all()
        active_streams = [s for s in streams if s.is_active]
        
        detection_running = floor_id in detection_service.active_streams
        latest_result = detection_service.get_latest_result(floor_id)
        
        return {
            "floor_id": floor_id,
            "floor_name": floor.name,
            "floor_number": floor.number,
            "cctv_streams": [
                {
                    "id": s.id,
                    "name": s.name,
                    "url": s.url,
                    "is_active": s.is_active
                }
                for s in streams
            ],
            "active_streams_count": len(active_streams),
            "detection_running": detection_running,
            "detection_info": detection_service.active_streams.get(floor_id, {}).get("started_at") if detection_running else None,
            "last_detection": latest_result.get("timestamp") if latest_result else None,
            "tables_monitored": latest_result.get("table_status", []) if latest_result else []
        }
    
    @staticmethod
    def get_result(floor_id: int):
        """Get latest detection result for a floor"""
        result = detection_service.get_latest_result(floor_id)
        
        if not result:
            raise HTTPException(
                status_code=404, 
                detail="No detection result available"
            )
        
        return result
