"""
FreeSpot Backend - YOLOv11 Detection Service
Real-time person detection with GPU/CPU fallback
"""

import cv2
import numpy as np
import torch
import time
import threading
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Callable
from collections import defaultdict

from src.config import settings


class DetectionService:
    """
    YOLOv11 Detection Service
    - Supports NVIDIA CUDA, AMD ROCm, and CPU
    - Uses center point detection for table occupancy
    - Processes RTSP/HTTP streams
    """
    
    def __init__(self):
        self.model = None
        self.device = None
        self.is_initialized = False
        self.active_streams: Dict[int, dict] = {}  # floor_id -> stream info
        self.detection_threads: Dict[int, threading.Thread] = {}
        self.stop_events: Dict[int, threading.Event] = {}
        self.latest_results: Dict[int, dict] = {}
        self.callbacks: Dict[int, List[Callable]] = defaultdict(list)
        
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize YOLO model with GPU/CPU detection"""
        try:
            print("=" * 60)
            print("🚀 Initializing YOLOv11 Detection Service")
            print("=" * 60)
            
            # Detect available device
            self.device = self._detect_device()
            print(f"📱 Selected device: {self.device}")
            
            # Load YOLO model
            from ultralytics import YOLO
            
            model_path = settings.YOLO_MODEL
            print(f"📦 Loading model: {model_path}")
            
            self.model = YOLO(model_path)
            self.model.to(self.device)
            
            # Warm up model
            print("🔥 Warming up model...")
            dummy_img = np.zeros((720, 1280, 3), dtype=np.uint8)
            self.model.predict(dummy_img, verbose=False)
            
            self.is_initialized = True
            print("✅ YOLOv11 model loaded successfully!")
            print(f"   - Model: {model_path}")
            print(f"   - Device: {self.device}")
            print(f"   - Confidence threshold: {settings.DETECTION_CONFIDENCE}")
            print("=" * 60)
            
        except Exception as e:
            print(f"❌ Failed to initialize YOLO model: {e}")
            print("   Attempting CPU fallback...")
            try:
                from ultralytics import YOLO
                self.device = "cpu"
                self.model = YOLO(settings.YOLO_MODEL)
                self.model.to("cpu")
                self.is_initialized = True
                print("✅ Fallback to CPU successful")
            except Exception as e2:
                print(f"❌ CPU fallback also failed: {e2}")
                self.is_initialized = False
    
    def _detect_device(self) -> str:
        """Detect best available device (CUDA > ROCm > CPU)"""
        if settings.FORCE_CPU:
            print("⚠️  FORCE_CPU is enabled, using CPU")
            return "cpu"
        
        # Check NVIDIA CUDA
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
            print(f"🎮 NVIDIA GPU detected: {gpu_name}")
            print(f"   Memory: {gpu_memory:.1f} GB")
            return "cuda:0"
        
        # Check AMD ROCm (via HIP)
        try:
            if hasattr(torch, 'hip') and torch.hip.is_available():
                print("🎮 AMD GPU detected (ROCm)")
                return "hip:0"
        except:
            pass
        
        # Check Apple MPS
        try:
            if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                print("🍎 Apple Silicon detected (MPS)")
                return "mps"
        except:
            pass
        
        print("💻 No GPU detected, using CPU")
        return "cpu"
    
    def start_detection(
        self, 
        floor_id: int, 
        stream_url: str, 
        tables: List[dict],
        canvas_width: int = 1280,
        canvas_height: int = 720
    ) -> bool:
        """Start detection for a specific floor"""
        if not self.is_initialized:
            print(f"❌ Cannot start detection: Model not initialized")
            return False
        
        if floor_id in self.active_streams:
            print(f"⚠️  Detection already running for floor {floor_id}")
            return True
        
        print(f"\n{'=' * 60}")
        print(f"🎥 Starting detection for Floor {floor_id}")
        print(f"   Stream URL: {stream_url}")
        print(f"   Tables: {len(tables)}")
        print(f"   Canvas: {canvas_width}x{canvas_height}")
        print(f"   Interval: {settings.DETECTION_INTERVAL}s")
        print(f"{'=' * 60}\n")
        
        # Store stream info
        self.active_streams[floor_id] = {
            "url": stream_url,
            "tables": tables,
            "canvas_width": canvas_width,
            "canvas_height": canvas_height,
            "started_at": datetime.now().isoformat()
        }
        
        # Create stop event
        self.stop_events[floor_id] = threading.Event()
        
        # Start detection thread
        thread = threading.Thread(
            target=self._detection_loop,
            args=(floor_id,),
            daemon=True
        )
        self.detection_threads[floor_id] = thread
        thread.start()
        
        return True
    
    def stop_detection(self, floor_id: int) -> bool:
        """Stop detection for a specific floor"""
        if floor_id not in self.active_streams:
            print(f"⚠️  No detection running for floor {floor_id}")
            return False
        
        print(f"🛑 Stopping detection for floor {floor_id}")
        
        # Signal thread to stop
        if floor_id in self.stop_events:
            self.stop_events[floor_id].set()
        
        # Wait for thread to finish
        if floor_id in self.detection_threads:
            self.detection_threads[floor_id].join(timeout=5)
            del self.detection_threads[floor_id]
        
        # Cleanup
        if floor_id in self.stop_events:
            del self.stop_events[floor_id]
        if floor_id in self.active_streams:
            del self.active_streams[floor_id]
        if floor_id in self.latest_results:
            del self.latest_results[floor_id]
        
        print(f"✅ Detection stopped for floor {floor_id}")
        return True
    
    def _detection_loop(self, floor_id: int):
        """Main detection loop running in a separate thread"""
        stream_info = self.active_streams.get(floor_id)
        if not stream_info:
            return
        
        stream_url = stream_info["url"]
        canvas_width = stream_info["canvas_width"]
        canvas_height = stream_info["canvas_height"]
        
        print(f"🔄 Detection loop started for floor {floor_id}")
        
        # Open video capture
        cap = None
        retry_count = 0
        max_retries = 5
        
        while not self.stop_events[floor_id].is_set():
            try:
                # FRESH DATA: Get latest tables from database each iteration
                tables = self._get_fresh_tables(floor_id)
                if not tables:
                    print(f"⚠️  No tables found for floor {floor_id}, skipping detection")
                    time.sleep(settings.DETECTION_INTERVAL)
                    continue
                
                # REAL-TIME FIX: Close and reopen stream each time to get fresh frame
                # This is the most reliable way to avoid buffered frames
                if cap is not None:
                    cap.release()
                
                cap = cv2.VideoCapture(stream_url)
                
                if not cap.isOpened():
                    retry_count += 1
                    if retry_count >= max_retries:
                        print(f"❌ Max retries reached for floor {floor_id}")
                        break
                    print(f"⚠️  Failed to open stream (attempt {retry_count}/{max_retries})")
                    time.sleep(2)
                    continue
                
                retry_count = 0
                
                # Set minimal buffer
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                
                # Read the frame (should be fresh since we just opened the stream)
                ret, frame = cap.read()
                
                # Release immediately after reading
                cap.release()
                cap = None
                
                if not ret or frame is None:
                    print(f"⚠️  Failed to read frame from floor {floor_id}")
                    time.sleep(1)
                    continue
                
                # Get frame dimensions
                frame_height, frame_width = frame.shape[:2]
                
                # Run detection with fresh tables data
                start_time = time.time()
                result = self._process_frame(
                    frame, 
                    tables, 
                    canvas_width, 
                    canvas_height,
                    frame_width,
                    frame_height
                )
                processing_time = (time.time() - start_time) * 1000
                
                # Create result object
                detection_result = {
                    "floor_id": floor_id,
                    "timestamp": datetime.now().isoformat(),
                    "persons_detected": result["person_count"],
                    "table_status": result["table_status"],
                    "frame_width": frame_width,
                    "frame_height": frame_height,
                    "processing_time_ms": round(processing_time, 2)
                }
                
                # Store latest result
                self.latest_results[floor_id] = detection_result
                
                # Log status
                occupied_count = sum(1 for t in result["table_status"] if t["occupied"])
                available_count = len(result["table_status"]) - occupied_count
                
                print(f"📊 [Floor {floor_id}] Persons: {result['person_count']} | "
                      f"Tables: {len(tables)} | Occupied: {occupied_count} | Available: {available_count} | "
                      f"Time: {processing_time:.0f}ms")
                
                # Notify callbacks
                self._notify_callbacks(floor_id, detection_result)
                
                # Wait for next detection interval
                time.sleep(settings.DETECTION_INTERVAL)
                
            except Exception as e:
                print(f"❌ Error in detection loop for floor {floor_id}: {e}")
                import traceback
                traceback.print_exc()
                time.sleep(2)
        
        # Cleanup
        if cap:
            cap.release()
        print(f"🔄 Detection loop ended for floor {floor_id}")
    
    def _process_frame(
        self, 
        frame: np.ndarray, 
        tables: List[dict],
        canvas_width: int,
        canvas_height: int,
        frame_width: int,
        frame_height: int
    ) -> dict:
        """Process a single frame and detect persons"""
        
        # Run YOLO detection
        results = self.model.predict(
            frame,
            conf=settings.DETECTION_CONFIDENCE,
            classes=[0],  # Only detect persons (class 0 in COCO)
            verbose=False
        )
        
        # Extract person detections
        persons = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = box.conf[0].item()
                
                # Calculate center point
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                
                persons.append({
                    "bbox": [x1, y1, x2, y2],
                    "center": [center_x, center_y],
                    "confidence": confidence
                })
        
        # Calculate scale factors
        scale_x = frame_width / canvas_width
        scale_y = frame_height / canvas_height
        
        # Check each table for occupancy using center point detection
        table_status = []
        for table in tables:
            coords = table.get("coords", [0, 0])  # [x, y] position
            width = table.get("width", 100)
            height = table.get("height", 100)
            table_id = table.get("id")
            table_name = table.get("name", f"Table {table_id}")
            rotation = table.get("rotation", 0.0)
            
            # Calculate table bounds from coords, width, height
            x1 = coords[0] if coords else 0
            y1 = coords[1] if len(coords) > 1 else 0
            x2 = x1 + width
            y2 = y1 + height
            
            # Scale table coordinates to frame size
            scaled_coords = [
                x1 * scale_x,
                y1 * scale_y,
                x2 * scale_x,
                y2 * scale_y
            ]
            
            # Check if any person's center point is inside this table
            is_occupied = False
            min_distance = None
            persons_in_table = 0
            
            for person in persons:
                center_x, center_y = person["center"]
                
                # Check if center point is inside table bounds
                # Apply rotation if needed
                if rotation != 0:
                    is_inside, distance = self._point_in_rotated_rect(
                        center_x, center_y, scaled_coords, rotation
                    )
                else:
                    is_inside = (
                        scaled_coords[0] <= center_x <= scaled_coords[2] and
                        scaled_coords[1] <= center_y <= scaled_coords[3]
                    )
                    if is_inside:
                        # Calculate distance to center of table
                        table_center_x = (scaled_coords[0] + scaled_coords[2]) / 2
                        table_center_y = (scaled_coords[1] + scaled_coords[3]) / 2
                        distance = np.sqrt(
                            (center_x - table_center_x) ** 2 + 
                            (center_y - table_center_y) ** 2
                        )
                    else:
                        distance = None
                
                if is_inside:
                    is_occupied = True
                    persons_in_table += 1
                    if distance is not None:
                        if min_distance is None or distance < min_distance:
                            min_distance = distance
            
            table_status.append({
                "id": table_id,
                "name": table_name,
                "occupied": is_occupied,
                "method": "center_point",
                "distance": round(min_distance, 2) if min_distance else None,
                "person_count": persons_in_table
            })
        
        return {
            "person_count": len(persons),
            "persons": persons,
            "table_status": table_status
        }
    
    def _point_in_rotated_rect(
        self, 
        px: float, 
        py: float, 
        coords: List[float], 
        rotation: float
    ) -> Tuple[bool, Optional[float]]:
        """Check if a point is inside a rotated rectangle"""
        # Get rectangle center
        cx = (coords[0] + coords[2]) / 2
        cy = (coords[1] + coords[3]) / 2
        
        # Rotate point around center (inverse rotation)
        cos_r = np.cos(-rotation)
        sin_r = np.sin(-rotation)
        
        # Translate point to origin
        tx = px - cx
        ty = py - cy
        
        # Rotate
        rx = tx * cos_r - ty * sin_r
        ry = tx * sin_r + ty * cos_r
        
        # Translate back
        rotated_x = rx + cx
        rotated_y = ry + cy
        
        # Check if inside unrotated rectangle
        half_width = (coords[2] - coords[0]) / 2
        half_height = (coords[3] - coords[1]) / 2
        
        is_inside = (
            abs(rx) <= half_width and
            abs(ry) <= half_height
        )
        
        distance = np.sqrt(rx ** 2 + ry ** 2) if is_inside else None
        
        return is_inside, distance
    
    def _get_fresh_tables(self, floor_id: int) -> List[dict]:
        """Get fresh tables data from database for a specific floor"""
        try:
            from src.database import SessionLocal
            from src.models import Table
            
            db = SessionLocal()
            try:
                tables = db.query(Table).filter(Table.floor_id == floor_id).all()
                tables_data = [t.to_dict() for t in tables]
                return tables_data
            finally:
                db.close()
        except Exception as e:
            print(f"⚠️  Failed to get fresh tables: {e}")
            # Fallback to cached tables if available
            stream_info = self.active_streams.get(floor_id)
            if stream_info and "tables" in stream_info:
                return stream_info["tables"]
            return []
    
    def register_callback(self, floor_id: int, callback: Callable):
        """Register a callback for detection results"""
        self.callbacks[floor_id].append(callback)
    
    def unregister_callback(self, floor_id: int, callback: Callable):
        """Unregister a callback"""
        if callback in self.callbacks[floor_id]:
            self.callbacks[floor_id].remove(callback)
    
    def _notify_callbacks(self, floor_id: int, result: dict):
        """Notify all registered callbacks"""
        for callback in self.callbacks.get(floor_id, []):
            try:
                callback(result)
            except Exception as e:
                print(f"⚠️  Callback error: {e}")
    
    def get_latest_result(self, floor_id: int) -> Optional[dict]:
        """Get the latest detection result for a floor"""
        return self.latest_results.get(floor_id)
    
    def get_status(self) -> dict:
        """Get detection service status"""
        streams_info = {}
        for floor_id, info in self.active_streams.items():
            # Get fresh table count from DB
            tables = self._get_fresh_tables(floor_id)
            streams_info[floor_id] = {
                "url": info["url"],
                "tables_count": len(tables),
                "started_at": info["started_at"]
            }
        
        return {
            "is_running": len(self.active_streams) > 0,
            "streams": streams_info,
            "device": str(self.device),
            "model": settings.YOLO_MODEL,
            "initialized": self.is_initialized
        }


# Global detection service instance
detection_service = DetectionService()
