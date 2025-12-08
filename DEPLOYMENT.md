# FreeSpot Deployment Guide (Full Free)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   Backend API   │────▶│     ML API      │
│    (Vercel)     │     │   (Railway)     │     │ (HuggingFace)   │
│      FREE       │     │      FREE       │     │      FREE       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   PostgreSQL    │
                        │   (Railway)     │
                        │      FREE       │
                        └─────────────────┘
```

---

## 1. Deploy ML API (Hugging Face Spaces) - PERTAMA

1. Buka https://huggingface.co → Login/Register
2. Click avatar → **New Space**
3. Settings:
   - **Space name**: `freespot-ml-api`
   - **License**: MIT
   - **SDK**: `Docker`
   - **Hardware**: `CPU basic` (FREE)
4. Setelah Space dibuat, upload files dari folder `ml_api/`:
   - `Dockerfile`
   - `main.py`
   - `requirements.txt`
   - `README.md`
5. Tunggu build selesai (~5-10 menit)
6. Catat URL: `https://USERNAME-freespot-ml-api.hf.space`

**Test:**

```bash
curl https://USERNAME-freespot-ml-api.hf.space/health
```

---

## 2. Deploy PostgreSQL (Railway)

1. Buka https://railway.app → Login
2. **New Project** → **Provision PostgreSQL**
3. Klik PostgreSQL → **Variables** → Copy `DATABASE_URL`

---

## 3. Deploy Backend (Railway)

1. Di project sama, **New** → **GitHub Repo**
2. Pilih repo `FreeSpot`, **Root Directory**: `backend`
3. Set **Variables**:

| Variable       | Value                                       |
| -------------- | ------------------------------------------- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`                |
| `ML_API_URL`   | `https://USERNAME-freespot-ml-api.hf.space` |
| `DEBUG`        | `false`                                     |

4. **Settings** → **Networking** → **Generate Domain**
5. Catat URL backend (contoh: `https://freespot-xxx.up.railway.app`)

---

## 4. Deploy Frontend (Vercel)

1. Buka https://vercel.com → Login
2. **New Project** → Import `FreeSpot`
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: `Vite`
4. **Environment Variables**:

| Variable            | Value                                 |
| ------------------- | ------------------------------------- |
| `VITE_API_BASE_URL` | `https://freespot-xxx.up.railway.app` |

5. Deploy

---

## Cost Summary (ALL FREE)

| Service  | Platform     | Limit                   |
| -------- | ------------ | ----------------------- |
| Frontend | Vercel       | Unlimited               |
| Backend  | Railway      | 500 hours/month         |
| Database | Railway      | Shared dengan backend   |
| ML API   | Hugging Face | Free (sleep after idle) |

---

## Troubleshooting

### ML API cold start

- HF free tier sleep setelah idle
- Request pertama ~30-60 detik untuk wake up

### Railway hours limit

- 500 hours/month shared antara backend + database
- Jika habis, service pause sampai bulan depan

### Backend tidak connect ML API

- Pastikan URL benar: `https://USERNAME-freespot-ml-api.hf.space`
- Cek ML API running dengan `/health`

### Frontend CORS error

- Backend sudah set `allow_origins=["*"]`
- Pastikan `VITE_API_BASE_URL` tidak ada trailing slash
