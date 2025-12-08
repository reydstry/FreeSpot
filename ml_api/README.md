---
title: FreeSpot ML API
emoji: 🪑
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
license: mit
---

# FreeSpot ML API

YOLO-based person detection for table occupancy system.

## Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `POST /detect` - Detect persons in image (form-data)
- `POST /detect/base64` - Detect persons in image (JSON with base64)

## Usage

```bash
curl -X POST "https://YOUR-SPACE.hf.space/detect" \
  -F "floor_id=1" \
  -F "tables=[{\"id\":1,\"name\":\"Table 1\",\"coords\":[100,100],\"width\":50,\"height\":50}]" \
  -F "canvas_width=1280" \
  -F "canvas_height=720" \
  -F "frame=@image.jpg"
```
