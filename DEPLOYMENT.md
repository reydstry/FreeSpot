# FreeSpot Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   Backend API   │────▶│     ML API      │
│    (Vercel)     │     │   (Railway)     │     │    (Render)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   PostgreSQL    │
                        │   (Railway)     │
                        └─────────────────┘
```

---

## 1. Deploy PostgreSQL Database (Railway)

### Steps:

1. Buka [Railway](https://railway.app) dan login
2. Click **"New Project"** → **"Provision PostgreSQL"**
3. Tunggu database selesai di-provision
4. Klik PostgreSQL service → tab **"Variables"**
5. Copy value `DATABASE_URL` (format: `postgresql://user:pass@host:port/db`)

---

## 2. Deploy Backend API (Railway)

### Steps:

1. Di project Railway yang sama, click **"New"** → **"GitHub Repo"**
2. Connect repo GitHub kamu, pilih folder **`backend`** sebagai root directory
3. Atau gunakan **"Deploy from GitHub"** dengan settings:
   - **Root Directory**: `backend`
   - **Build Command**: _(kosongkan, Railway auto-detect Dockerfile)_
   - **Start Command**: _(kosongkan, sudah di Dockerfile)_

### Environment Variables:

Tambahkan di tab **Variables**:

| Variable       | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference ke PostgreSQL service) |
| `ML_API_URL`   | `https://your-ml-api.onrender.com` (isi setelah deploy ML API) |
| `HOST`         | `0.0.0.0`                                                      |
| `PORT`         | `8000`                                                         |
| `DEBUG`        | `false`                                                        |
| `RELOAD`       | `false`                                                        |

### Generate Domain:

1. Klik backend service → **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Catat URL (contoh: `freespot-backend.up.railway.app`)

---

## 3. Deploy ML API (Render)

### Steps:

1. Buka [Render](https://render.com) dan login
2. Click **"New"** → **"Web Service"**
3. Connect repo GitHub kamu
4. Settings:
   - **Name**: `freespot-ml-api`
   - **Root Directory**: `ml_api`
   - **Runtime**: `Docker`
   - **Instance Type**: `Starter` atau lebih tinggi (perlu RAM untuk YOLO)

### Environment Variables:

| Variable | Value  |
| -------- | ------ |
| `PORT`   | `9000` |

### Tunggu Build:

- Build pertama akan lama (~10-15 menit) karena download YOLO model
- Setelah deploy, catat URL (contoh: `https://freespot-ml-api.onrender.com`)
- **Update** `ML_API_URL` di Railway backend dengan URL ini

---

## 4. Deploy Frontend (Vercel)

### Steps:

1. Buka [Vercel](https://vercel.com) dan login
2. Click **"Add New"** → **"Project"**
3. Import repo GitHub kamu
4. Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Environment Variables:

| Variable            | Value                                                                |
| ------------------- | -------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `https://freespot-backend.up.railway.app` (URL backend dari Railway) |

### Deploy:

Click **"Deploy"** dan tunggu selesai.

---

## 5. Post-Deployment Checklist

### Verify Services:

- [ ] Backend health: `https://your-backend.railway.app/health`
- [ ] ML API health: `https://your-ml-api.onrender.com/health`
- [ ] Frontend loads properly

### Update CORS (jika perlu):

Jika frontend tidak bisa connect, tambahkan domain frontend ke CORS di `backend/main.py`:

```python
origins = [
    "https://your-frontend.vercel.app",
    ...
]
```

### Initialize Database:

Database tables akan auto-create saat backend pertama kali start (via SQLAlchemy `create_all`).

---

## Troubleshooting

### Backend tidak connect ke Database

- Pastikan `DATABASE_URL` sudah benar
- Check format: `postgresql://user:pass@host:port/dbname`

### ML API timeout / cold start

- Render free tier memiliki cold start
- Pertama kali hit `/detect` bisa lambat karena load YOLO model

### Frontend tidak bisa fetch API

- Check CORS settings di backend
- Pastikan `VITE_API_BASE_URL` tidak ada trailing slash

### Image build gagal di Railway

- Pastikan `backend/Dockerfile` tidak ada dependency ML (torch, ultralytics)
- Cek logs di Railway dashboard

---

## Local Development

### Backend:

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env dengan DATABASE_URL lokal
uvicorn main:app --reload
```

### ML API:

```bash
cd ml_api
pip install -r requirements.txt
uvicorn main:app --port 9000 --reload
```

### Frontend:

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env dengan VITE_API_BASE_URL=http://localhost:8000
npm run dev
```
