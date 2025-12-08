import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
import base64
import json

app = FastAPI(title="FreeSpot ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
MODEL_PATH = os.getenv("YOLO_MODEL", "yolov8n.pt")

@app.on_event("startup")
async def load_model():
    global model
    try:
        from ultralytics import YOLO
        model = YOLO(MODEL_PATH)
        print(f"Model {MODEL_PATH} loaded")
    except Exception as e:
        print(f"Model load error: {e}")

@app.get("/")
def root():
    return {"service": "FreeSpot ML API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}


class DetectResponse(BaseModel):
    success: bool
    floor_id: int
    person_count: int
    table_status: list
    message: Optional[str] = None


@app.post("/detect", response_model=DetectResponse)
async def detect(
    floor_id: int = Form(...),
    tables: str = Form(...),
    canvas_width: int = Form(1280),
    canvas_height: int = Form(720),
    confidence: float = Form(0.5),
    frame: UploadFile = File(...)
):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        contents = await frame.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        img_h, img_w = img.shape[:2]
        scale_x = img_w / canvas_width
        scale_y = img_h / canvas_height
        
        results = model(img, conf=confidence, classes=[0], verbose=False)
        
        persons = []
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    persons.append(((x1 + x2) / 2, (y1 + y2) / 2))
        
        tables_data = json.loads(tables)
        table_status = []
        
        for t in tables_data:
            tid = t["id"]
            tx, ty = t["coords"][0] * scale_x, t["coords"][1] * scale_y
            tw, th = t["width"] * scale_x, t["height"] * scale_y
            
            occupied = any(tx <= px <= tx + tw and ty <= py <= ty + th for px, py in persons)
            table_status.append({"id": tid, "name": t.get("name", f"Table {tid}"), "occupied": occupied})
        
        return DetectResponse(success=True, floor_id=floor_id, person_count=len(persons), table_status=table_status)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid tables JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect/base64")
async def detect_base64(floor_id: int, tables: list, frame_base64: str, canvas_width: int = 1280, canvas_height: int = 720, confidence: float = 0.5):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        img_data = base64.b64decode(frame_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        img_h, img_w = img.shape[:2]
        scale_x, scale_y = img_w / canvas_width, img_h / canvas_height
        
        results = model(img, conf=confidence, classes=[0], verbose=False)
        
        persons = []
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    persons.append(((x1 + x2) / 2, (y1 + y2) / 2))
        
        table_status = []
        for t in tables:
            tid = t["id"]
            tx, ty = t["coords"][0] * scale_x, t["coords"][1] * scale_y
            tw, th = t["width"] * scale_x, t["height"] * scale_y
            occupied = any(tx <= px <= tx + tw and ty <= py <= ty + th for px, py in persons)
            table_status.append({"id": tid, "name": t.get("name", f"Table {tid}"), "occupied": occupied})
        
        return {"success": True, "floor_id": floor_id, "person_count": len(persons), "table_status": table_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 7860)))
