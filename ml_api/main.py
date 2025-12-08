import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import numpy as np
import cv2
from ultralytics import YOLO

app = FastAPI(title="FreeSpot ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolo11l.pt")


class Table(BaseModel):
    id: int
    name: str
    coords: List[float]
    width: float
    height: float
    rotation: float = 0.0


class DetectRequest(BaseModel):
    floor_id: int
    tables: List[Table]
    frame: bytes
    canvas_width: int
    canvas_height: int
    detection_confidence: float = 0.5


@app.post("/detect")
def detect(req: DetectRequest) -> Dict[str, Any]:
    nparr = np.frombuffer(req.frame, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"error": "Invalid image"}

    results = model.predict(frame, conf=req.detection_confidence, classes=[0], verbose=False)

    persons = []
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            persons.append({"center": [(x1 + x2) / 2, (y1 + y2) / 2]})

    frame_height, frame_width = frame.shape[:2]
    scale_x = frame_width / req.canvas_width
    scale_y = frame_height / req.canvas_height

    table_status = []
    for t in req.tables:
        x1, y1 = t.coords[0], t.coords[1]
        x2, y2 = x1 + t.width, y1 + t.height
        sx1, sy1, sx2, sy2 = x1 * scale_x, y1 * scale_y, x2 * scale_x, y2 * scale_y

        occupied = any(sx1 <= p["center"][0] <= sx2 and sy1 <= p["center"][1] <= sy2 for p in persons)
        table_status.append({"id": t.id, "name": t.name, "occupied": occupied})

    return {
        "floor_id": req.floor_id,
        "person_count": len(persons),
        "table_status": table_status,
        "frame_width": frame_width,
        "frame_height": frame_height,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 9000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
