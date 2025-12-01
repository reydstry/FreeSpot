"""
FreeSpot Backend - Database Models
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Floor(Base):
    """Floor model - represents a floor in the building"""
    __tablename__ = "floors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    number = Column(Integer, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tables = relationship("Table", back_populates="floor", cascade="all, delete-orphan")
    cctv_streams = relationship("CCTVStream", back_populates="floor", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Floor {self.number}: {self.name}>"


class Table(Base):
    """Table model - represents a table in the restaurant/cafe"""
    __tablename__ = "tables"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer, default=4)
    status = Column(String(20), default="available")  # available, occupied, reserved
    floor_id = Column(Integer, ForeignKey("floors.id", ondelete="CASCADE"), nullable=False)
    
    # Coordinates for detection zone [x1, y1, x2, y2]
    coords = Column(JSON, default=[0, 0, 100, 100])
    
    # Rotation in radians
    rotation = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    floor = relationship("Floor", back_populates="tables")
    
    def __repr__(self):
        return f"<Table {self.name} on Floor {self.floor_id}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "capacity": self.capacity,
            "status": self.status,
            "floor_id": self.floor_id,
            "coords": self.coords,
            "rotation": self.rotation
        }


class CCTVStream(Base):
    """CCTV Stream model - represents a CCTV camera stream"""
    __tablename__ = "cctv_streams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)  # RTSP or HTTP stream URL
    floor_id = Column(Integer, ForeignKey("floors.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    floor = relationship("Floor", back_populates="cctv_streams")
    
    def __repr__(self):
        return f"<CCTVStream {self.name} for Floor {self.floor_id}>"
