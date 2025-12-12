"""FreeSpot Backend Configuration"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/freespot"
    DETECTION_INTERVAL: int = 10
    DETECTION_CONFIDENCE: float = 0.5
    ML_API_URL: str = "http://localhost:9000"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    CANVAS_WIDTH: int = 1280
    CANVAS_HEIGHT: int = 720

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


settings = Settings()
