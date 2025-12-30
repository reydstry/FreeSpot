"""
FreeSpot Backend - Database Models
Disesuaikan dengan struktur SQL yang ada di folder database/
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from src.database import Base


class Floor(Base):
    """Floor model - represents a floor in the building"""
    __tablename__ = "floors"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    number = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    # Tidak ada updated_at di floors.sql
    
    # Relationships
    tables = relationship("Table", back_populates="floor", cascade="all, delete-orphan")
    cctv_streams = relationship("CCTVStream", back_populates="floor", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Floor {self.number}: {self.name}>"


class Table(Base):
    """Table model - represents a table in the restaurant/cafe"""
    __tablename__ = "tables"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    floor_id = Column(Integer, ForeignKey("floors.id"), nullable=False)
    capacity = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="available")  # available, occupied, reserved
    
    # Coordinates for detection zone [x_min, y_min, x_max, y_max] - JSON type
    coords = Column(JSONB, nullable=True)
    
    # Dimensions (auto-calculated from coords)
    width = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    
    # Rotation in radians
    rotation = Column(Float, default=0.0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    floor = relationship("Floor", back_populates="tables")
    
    # Indexes defined in __table_args__
    __table_args__ = (
        Index('idx_tables_floor_id', 'floor_id'),
        Index('idx_tables_status', 'status'),
    )
    
    def __repr__(self):
        return f"<Table {self.name} on Floor {self.floor_id}>"
    
    def to_dict(self):
        # Normalize coords and ensure width/height are present for detection
        coords = self.coords
        width = self.width
        height = self.height

        try:
            # If coords is a dict like {x, y, width, height}
            if isinstance(coords, dict):
                x = coords.get('x')
                y = coords.get('y')
                w = coords.get('width')
                h = coords.get('height')
                if w is not None and h is not None:
                    width = float(w)
                    height = float(h)
                # Keep coords as-is (dict) for backward compatibility
            # If coords is a list
            elif isinstance(coords, (list, tuple)):
                if len(coords) >= 4:
                    # Assume [x_min, y_min, x_max, y_max]
                    try:
                        x_min = float(coords[0])
                        y_min = float(coords[1])
                        x_max = float(coords[2])
                        y_max = float(coords[3])
                        width = float(x_max - x_min)
                        height = float(y_max - y_min)
                    except Exception:
                        pass
                elif len(coords) == 2:
                    # coords may be [x, y] and width/height stored separately
                    if width is not None and height is not None:
                        width = float(width)
                        height = float(height)
        except Exception:
            # Be defensive: if anything goes wrong, leave width/height as-is
            pass

        return {
            "id": self.id,
            "name": self.name,
            "capacity": self.capacity,
            "status": self.status,
            "floor_id": self.floor_id,
            "coords": self.coords,
            "width": width,
            "height": height,
            "rotation": self.rotation
        }


class CCTVStream(Base):
    """CCTV Stream model - represents a CCTV camera stream"""
    __tablename__ = "cctv_streams"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    floor_id = Column(Integer, ForeignKey("floors.id"), nullable=False)
    name = Column(String(100), nullable=False)
    url = Column(Text, nullable=False)  # RTSP or HTTP stream URL
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    # Tidak ada updated_at di cctv_streams.sql
    
    # Relationships
    floor = relationship("Floor", back_populates="cctv_streams")
    
    # Indexes defined in __table_args__
    __table_args__ = (
        Index('idx_cctv_floor_id', 'floor_id'),
        Index('idx_cctv_active', 'is_active'),
    )
    
    def __repr__(self):
        return f"<CCTVStream {self.name} for Floor {self.floor_id}>"
