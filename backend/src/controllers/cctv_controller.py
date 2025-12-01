"""
CCTV Controller - Business logic for CCTV stream operations
"""

import asyncio
from typing import Optional, Callable
from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models import Floor, Table, CCTVStream
from src.schemas import CCTVStreamCreate, CCTVStreamUpdate
from src.detection import detection_service
from src.database import SessionLocal


class CCTVController:
    """Controller for CCTV stream-related business logic"""
    
    # Event loop and callback registry
    _event_loop = None
    _broadcast_callback: Optional[Callable] = None
    
    @classmethod
    def set_event_loop(cls, loop):
        """Set reference to main event loop"""
        cls._event_loop = loop
    
    @classmethod
    def set_broadcast_callback(cls, broadcast_cb: Callable):
        """Set callback for broadcasting"""
        cls._broadcast_callback = broadcast_cb
    
    @staticmethod
    def get_all(db: Session, floor_id: Optional[int] = None):
        """Get all CCTV streams, optionally filtered by floor"""
        query = db.query(CCTVStream)
        if floor_id:
            query = query.filter(CCTVStream.floor_id == floor_id)
        return query.all()
    
    @staticmethod
    def create(stream_data: CCTVStreamCreate, db: Session, canvas_width: int, canvas_height: int):
        """Create a new CCTV stream"""
        # Verify floor exists
        floor = db.query(Floor).filter(Floor.id == stream_data.floor_id).first()
        if not floor:
            raise HTTPException(
                status_code=400, 
                detail=f"Floor {stream_data.floor_id} not found"
            )
        
        db_stream = CCTVStream(**stream_data.model_dump())
        db.add(db_stream)
        db.commit()
        db.refresh(db_stream)
        
        print(f"✅ Created CCTV stream: {db_stream.name} for Floor {floor.number}")
        
        # Auto-start detection if stream is active and no detection running
        if stream_data.is_active and floor.id not in detection_service.active_streams:
            CCTVController._start_detection_for_floor(floor, db_stream.url, db, canvas_width, canvas_height)
            print(f"▶️  Detection auto-started for Floor {floor.number}")
        
        return db_stream
    
    @staticmethod
    def update(stream_id: int, stream_data: CCTVStreamUpdate, db: Session, canvas_width: int, canvas_height: int):
        """Update a CCTV stream"""
        db_stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
        if not db_stream:
            raise HTTPException(status_code=404, detail="CCTV stream not found")
        
        old_is_active = db_stream.is_active
        floor_id = db_stream.floor_id
        
        update_data = stream_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_stream, key, value)
        
        db.commit()
        db.refresh(db_stream)
        
        new_is_active = db_stream.is_active
        
        # Handle detection start/stop based on is_active change
        if old_is_active != new_is_active:
            if new_is_active:
                CCTVController._handle_stream_activated(floor_id, db_stream, db, canvas_width, canvas_height)
            else:
                CCTVController._handle_stream_deactivated(floor_id, stream_id, db)
        elif "url" in update_data and floor_id in detection_service.active_streams:
            # URL changed - restart detection
            CCTVController._restart_detection(floor_id, db_stream.url, db, canvas_width, canvas_height)
        
        return db_stream
    
    @staticmethod
    def delete(stream_id: int, db: Session):
        """Delete a CCTV stream"""
        stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
        if not stream:
            raise HTTPException(status_code=404, detail="CCTV stream not found")
        
        floor_id = stream.floor_id
        stream_name = stream.name
        
        db.delete(stream)
        db.commit()
        
        print(f"🗑️  Deleted CCTV stream: {stream_name}")
        
        # Stop detection if no more active streams
        remaining = db.query(CCTVStream).filter(
            CCTVStream.floor_id == floor_id,
            CCTVStream.is_active == True
        ).count()
        
        if remaining == 0 and floor_id in detection_service.active_streams:
            detection_service.stop_detection(floor_id)
        
        return {"message": f"CCTV stream {stream_name} deleted"}
    
    @staticmethod
    def toggle(stream_id: int, db: Session, canvas_width: int, canvas_height: int):
        """Toggle CCTV stream active status"""
        db_stream = db.query(CCTVStream).filter(CCTVStream.id == stream_id).first()
        if not db_stream:
            raise HTTPException(status_code=404, detail="CCTV stream not found")
        
        floor_id = db_stream.floor_id
        floor = db.query(Floor).filter(Floor.id == floor_id).first()
        old_status = db_stream.is_active
        
        # Toggle status
        db_stream.is_active = not old_status
        db.commit()
        db.refresh(db_stream)
        
        new_status = db_stream.is_active
        status_text = "ON" if new_status else "OFF"
        
        # Handle detection based on new status
        if new_status:
            if floor_id not in detection_service.active_streams:
                CCTVController._start_detection_for_floor(floor, db_stream.url, db, canvas_width, canvas_height)
                print(f"▶️  Detection started for Floor {floor.number} (CCTV toggled ON)")
        else:
            other_active = db.query(CCTVStream).filter(
                CCTVStream.floor_id == floor_id,
                CCTVStream.is_active == True,
                CCTVStream.id != stream_id
            ).count()
            
            if other_active == 0 and floor_id in detection_service.active_streams:
                detection_service.stop_detection(floor_id)
                print(f"⏹️  Detection stopped for Floor {floor.number} (CCTV toggled OFF)")
        
        return {
            "message": f"CCTV stream '{db_stream.name}' turned {status_text}",
            "stream_id": stream_id,
            "is_active": new_status,
            "detection_running": floor_id in detection_service.active_streams
        }
    
    # ========================================
    # Helper Methods
    # ========================================
    
    @staticmethod
    def _start_detection_for_floor(floor: Floor, stream_url: str, db: Session, canvas_width: int, canvas_height: int):
        """Start detection for a floor"""
        tables = db.query(Table).filter(Table.floor_id == floor.id).all()
        tables_data = [t.to_dict() for t in tables]
        
        detection_service.start_detection(
            floor_id=floor.id,
            stream_url=stream_url,
            tables=tables_data,
            canvas_width=canvas_width,
            canvas_height=canvas_height
        )
        
        # Register callback
        CCTVController._register_detection_callback(floor.id)
    
    @staticmethod
    def _handle_stream_activated(floor_id: int, db_stream: CCTVStream, db: Session, canvas_width: int, canvas_height: int):
        """Handle when a stream is activated"""
        if floor_id not in detection_service.active_streams:
            floor = db.query(Floor).filter(Floor.id == floor_id).first()
            CCTVController._start_detection_for_floor(floor, db_stream.url, db, canvas_width, canvas_height)
            print(f"▶️  Detection started for Floor {floor.number} (CCTV activated)")
    
    @staticmethod
    def _handle_stream_deactivated(floor_id: int, stream_id: int, db: Session):
        """Handle when a stream is deactivated"""
        other_active = db.query(CCTVStream).filter(
            CCTVStream.floor_id == floor_id,
            CCTVStream.is_active == True,
            CCTVStream.id != stream_id
        ).count()
        
        if other_active == 0 and floor_id in detection_service.active_streams:
            detection_service.stop_detection(floor_id)
            print(f"⏹️  Detection stopped for Floor {floor_id} (no active CCTV)")
    
    @staticmethod
    def _restart_detection(floor_id: int, stream_url: str, db: Session, canvas_width: int, canvas_height: int):
        """Restart detection with new URL"""
        detection_service.stop_detection(floor_id)
        
        tables = db.query(Table).filter(Table.floor_id == floor_id).all()
        tables_data = [t.to_dict() for t in tables]
        
        detection_service.start_detection(
            floor_id=floor_id,
            stream_url=stream_url,
            tables=tables_data,
            canvas_width=canvas_width,
            canvas_height=canvas_height
        )
        
        CCTVController._register_detection_callback(floor_id)
        print(f"🔄 Detection restarted for Floor {floor_id} (URL changed)")
    
    @staticmethod
    def _register_detection_callback(floor_id: int):
        """Register callback for detection results"""
        if CCTVController._broadcast_callback and CCTVController._event_loop:
            
            def update_db_sync(fid, table_status):
                """Sync DB update (thread-safe)"""
                db = SessionLocal()
                try:
                    from src.models import Table as TableModel
                    for status in table_status:
                        table = db.query(TableModel).filter(TableModel.id == status["id"]).first()
                        if table:
                            new_status = "occupied" if status["occupied"] else "available"
                            if table.status != new_status:
                                table.status = new_status
                    db.commit()
                except Exception as e:
                    print(f"❌ DB update error: {e}")
                    db.rollback()
                finally:
                    db.close()
            
            def make_callback(fid):
                def sync_callback(result):
                    try:
                        # Update DB synchronously (thread-safe)
                        update_db_sync(fid, result["table_status"])
                        
                        # Schedule async broadcast on main event loop
                        if CCTVController._event_loop and CCTVController._event_loop.is_running():
                            asyncio.run_coroutine_threadsafe(
                                CCTVController._broadcast_callback(fid, result),
                                CCTVController._event_loop
                            )
                    except Exception as e:
                        print(f"⚠️  Callback error: {e}")
                
                return sync_callback
            
            detection_service.register_callback(floor_id, make_callback(floor_id))
