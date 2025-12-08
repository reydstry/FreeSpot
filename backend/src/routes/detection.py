"""Detection Routes"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas import DetectionStart
from src.controllers import DetectionController

router = APIRouter(prefix="/detection", tags=["Detection"])


@router.post("/start/{floor_id}")
async def start_detection(floor_id: int, params: DetectionStart = DetectionStart(), db: Session = Depends(get_db)):
    return DetectionController.start(floor_id, params, db)


@router.post("/stop/{floor_id}")
async def stop_detection(floor_id: int):
    return DetectionController.stop(floor_id)


@router.get("/status")
async def get_detection_status():
    return DetectionController.get_status()


@router.get("/status/{floor_id}")
async def get_floor_detection_status(floor_id: int, db: Session = Depends(get_db)):
    return DetectionController.get_floor_status(floor_id, db)


@router.get("/result/{floor_id}")
async def get_detection_result(floor_id: int):
    return DetectionController.get_result(floor_id)


@router.get("/system-info")
async def get_system_info():
    return DetectionController.get_system_info()
