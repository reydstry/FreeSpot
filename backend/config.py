"""
FreeSpot Backend - Configuration Settings
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/freespot"
    
    # Detection Settings
    DETECTION_INTERVAL: int = 5  # seconds (5 for dev, 60 for production)
    DETECTION_CONFIDENCE: float = 0.5
    YOLO_MODEL: str = "yolo11m.pt"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # GPU Settings
    FORCE_CPU: bool = False
    
    # Canvas Settings (16:9 aspect ratio)
    CANVAS_WIDTH: int = 1280
    CANVAS_HEIGHT: int = 720
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


settings = Settings()
