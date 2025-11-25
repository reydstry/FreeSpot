# 🪑 FreeSpot - Table Occupancy Detection System

Full-stack application untuk deteksi ketersediaan meja menggunakan YOLO computer vision, FastAPI backend, React frontend, dan PostgreSQL database.

## 🎯 Features

- ✅ **Real-time Detection** - RTSP/HLS stream processing dengan YOLO v11
- ✅ **Multi-Floor Support** - Manage multiple floors with independent CCTV streams
- ✅ **PostgreSQL Database** - Persistent storage untuk tables, floors, dan streams
- ✅ **RESTful API** - FastAPI backend dengan OpenAPI documentation
- ✅ **WebSocket** - Real-time updates ke frontend
- ✅ **React Frontend** - Modern PWA dengan Tailwind CSS
- ✅ **Docker Support** - Easy deployment dengan Docker Compose

## 📋 Tech Stack

### Backend

- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM untuk database operations
- **YOLO v11** - Object detection model
- **OpenCV** - Computer vision library
- **Uvicorn** - ASGI server

### Frontend

- **React + Vite** - Frontend framework
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library

### Infrastructure

- **Docker & Docker Compose** - Containerization

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (recommended) OR
- **Python 3.11+** + **Node.js 18+** + **PostgreSQL 15+**

### Option 1: Docker Deployment (PostgreSQL + Backend Only)

```powershell
# Start PostgreSQL & Backend
docker-compose up -d --build

# Di terminal lain, jalankan Frontend
cd frontend
npm install
npm run dev
```

Services akan berjalan di:

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432

### Option 2: Full Local Development (No Docker)

#### 1. Setup PostgreSQL Database

```powershell
# Install PostgreSQL dari: https://www.postgresql.org/download/windows/

# Create database
psql -U postgres
CREATE DATABASE freespot_db;
\q
```

#### 2. Setup Backend

```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
copy .env.example .env
# Edit .env dan sesuaikan DATABASE_URL

# Initialize database
python src/init_db.py

# Run backend
python src/app.py
```

Backend akan berjalan di: **http://localhost:8000**

#### 3. Setup Frontend

```powershell
cd frontend

# Install dependencies
npm install

# Setup environment variables
copy .env.example .env

# Run development server
npm run dev
```

Frontend akan berjalan di: **http://localhost:5173**

## 📁 Project Structure

```
FreeSpot/
├── backend/
│   ├── src/
│   │   ├── app.py              # FastAPI application
│   │   ├── database.py         # Database connection
│   │   ├── models.py           # SQLAlchemy models
│   │   └── init_db.py          # Database initialization
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile             # Backend container
│   ├── .env.example           # Environment template
│   └── nginx.conf             # Nginx configuration
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js         # Backend API client
│   │   ├── pages/
│   │   │   ├── EditLayoutPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── TablePage.jsx
│   │   └── components/
│   ├── package.json
│   └── .env.example
└── docker-compose.yml          # Docker orchestration
```

## 🔧 Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/freespot_db

# Server
PORT=8000
HOST=0.0.0.0

# YOLO Configuration
YOLO_MODEL=yolo11x.pt
CONFIDENCE_THRESHOLD=0.6
MIN_PERSON_AREA=1000
MAX_PERSON_AREA=500000
PROXIMITY_THRESHOLD=100

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend Environment Variables

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## 📡 API Endpoints

### Floors Management

- `GET /floors` - Get all floors
- `POST /floors` - Create new floor
- `DELETE /floors/{id}` - Delete floor

### Tables Management

- `GET /tables` - Get all tables (optional: `?floor_id=X`)
- `POST /tables` - Create new table
- `PUT /tables/{id}` - Update table
- `DELETE /tables/{id}` - Delete table

### CCTV Streams Management

- `GET /cctv-streams` - Get all streams (optional: `?floor_id=X`)
- `POST /cctv-streams` - Create new stream
- `PUT /cctv-streams/{id}` - Update stream
- `DELETE /cctv-streams/{id}` - Delete stream

### Detection Control

- `POST /detection/start/{floor_id}` - Start detection
- `POST /detection/stop/{floor_id}` - Stop detection
- `GET /detection/status` - Get detection status
- `WS /ws/detection` - WebSocket for real-time updates

**Full API Documentation**: http://localhost:8000/docs

## 🎮 Usage Guide

### 1. Setup Floors & Tables

1. Buka **Setup Meja** page
2. Klik **Edit Lantai** untuk add/remove floors
3. Draw tables di canvas dengan drag
4. Atau klik **Tambah Meja** untuk manual input
5. Edit table properties (name, capacity, position)

### 2. Configure CCTV Streams

1. Buka **Pengaturan** page
2. Pilih lantai
3. Input RTSP/HLS stream URL
4. Format contoh:
   - RTSP: `rtsp://username:password@ip:port/stream`
   - HLS: `https://example.com/stream.m3u8`
5. Klik **Simpan Pengaturan**

### 3. Start Detection

1. Buka **Status Meja** page
2. Detection akan auto-start jika CCTV stream tersedia
3. Lihat real-time status meja (tersedia/terpakai)
4. Status otomatis update setiap 0.5 detik

## 🐛 Troubleshooting

### PostgreSQL Connection Error

```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Restart PostgreSQL
Restart-Service postgresql-x64-15
```

### Backend Port Already in Use

```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F
```

### RTSP Stream Not Opening

1. **Check stream URL** - Test dengan VLC Media Player
2. **Firewall** - Allow backend to access network
3. **Convert to HLS** - Browser tidak support RTSP langsung

**Cara convert RTSP ke HLS dengan ffmpeg:**

```powershell
ffmpeg -i rtsp://stream_url -c copy -hls_time 2 -hls_list_size 3 output.m3u8
```

### YOLO Model Download Failed

```powershell
# Manual download
python -c "from ultralytics import YOLO; YOLO('yolo11x.pt')"
```

### Docker Container Won't Start

```powershell
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Rebuild
docker-compose down
docker-compose up -d --build
```

## 🔒 Production Deployment

### 1. Update CORS Origins

Edit `backend/.env`:

```env
CORS_ORIGINS=https://yourdomain.com
```

### 2. Setup Reverse Proxy

Use Nginx or Caddy as reverse proxy in production:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5173;  # Frontend
    }

    location /api {
        proxy_pass http://localhost:8000;  # Backend
    }
}
```

### 3. Secure Database

Change default PostgreSQL password di `docker-compose.yml` dan `.env`.

### 4. Environment Variables

Never commit `.env` files! Use secrets management in production.

## 📊 Performance Tips

### CPU vs GPU

- **CPU**: ~2-5 FPS detection
- **GPU**: ~25-35 FPS detection

**Enable GPU (CUDA)**:

```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### Optimize Detection

1. **Use smaller YOLO model**:

   ```python
   YOLO_MODEL=yolo11n.pt  # Fastest
   ```

2. **Reduce detection frequency**:
   Edit `src/app.py`:

   ```python
   await asyncio.sleep(1.0)  # 1 FPS instead of 2 FPS
   ```

3. **Lower confidence threshold**:
   ```env
   CONFIDENCE_THRESHOLD=0.4
   ```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

## 📝 Database Schema

```sql
-- Floors Table
CREATE TABLE floors (
    id SERIAL PRIMARY KEY,
    floor_number INTEGER UNIQUE NOT NULL,
    name VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tables Table
CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    capacity INTEGER DEFAULT 4,
    floor_id INTEGER REFERENCES floors(id) ON DELETE CASCADE,
    coords JSON NOT NULL,  -- [x_min, y_min, x_max, y_max]
    status VARCHAR DEFAULT 'tersedia',
    occupied BOOLEAN DEFAULT FALSE,
    distance FLOAT,
    detection_method VARCHAR,
    last_detected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- CCTV Streams Table
CREATE TABLE cctv_streams (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER REFERENCES floors(id) ON DELETE CASCADE,
    url VARCHAR NOT NULL,
    name VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Detection Logs Table (Optional)
CREATE TABLE detection_logs (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER REFERENCES floors(id) ON DELETE CASCADE,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    persons_detected INTEGER DEFAULT 0,
    occupied_tables INTEGER DEFAULT 0,
    available_tables INTEGER DEFAULT 0,
    detection_data JSON,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

## 📄 License

MIT License - See project root for details

## 📞 Support

- **Issues**: https://github.com/reydstry/FreeSpot/issues
- **Discussions**: https://github.com/reydstry/FreeSpot/discussions

---

Made with ❤️ using FastAPI + React + PostgreSQL + YOLO
