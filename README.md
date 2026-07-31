# Sentinal: Smart Classroom Attendance Management System

Sentinal is a state-of-the-art, highly secure, real-time campus attendance platform. Featuring a 3-step cryptographic handshake (Signed QR + Nonce Challenge), sub-3-second attendance logging, and real-time faculty monitoring, Sentinal eliminates proxy attendance while delivering a premium "Dark Tech" aesthetic.

## 🚀 Key Features

* **Three-Step Advanced Security Handshake**: Utilizes HMAC-SHA256 Signed rotating QR codes + Nonce challenge to guarantee anti-spoofing and prevent remote proxy attendance.
* **Real-time Live Monitoring**: Faculty dashboards update instantly via WebSockets as students scan their attendance, with zero polling required.
* **Instant Feedback Loop**: Students are prompted to submit class feedback immediately after marking attendance, granting faculty immediate insights into lecture comprehension.
* **Dynamic Excel Export**: Faculty can generate full attendance matrices grouped seamlessly and download them in `.xlsx` format.
* **Premium Tech UI**: A highly polished, sleek Dark Charcoal (`#0B0F19`) and Electric Cyan (`#00F0FF`) color palette powered by Tailwind CSS, featuring frosted glassmorphism and fluid micro-animations.
* **Hardened Security**: Protected against SQL Injection via SQLAlchemy ORM, secured with JSON Web Tokens (JWT), and fully patched against NPM vulnerabilities.

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS v3, Zustand (State Management), Framer Motion, HTML5-QRCode
* **Backend**: Python 3.10+, FastAPI, SQLAlchemy (Async), SQLite (default local DB)
* **Real-Time Layer**: WebSockets (FastAPI Native)
* **Architecture**: Decoupled Client-Server

---

## 🏃‍♂️ How to Run Locally

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**

### 1. Backend Setup (FastAPI)
Open a terminal and navigate to the `backend` directory:
```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install backend dependencies
pip install -r requirements.txt

# Run the FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*The backend API will now be running on `http://localhost:8000`*

### 2. Frontend Setup (React/Vite)
Open a **new** terminal and navigate to the `frontend` directory:
```bash
cd frontend

# Install frontend dependencies
npm install

# Run the Vite development server
npm run dev
```
*The frontend will launch on `http://localhost:5173`*

### 3. Database Initialization & Seeding
By default, the backend relies on an asynchronous SQLite database (`scas.db`). The system is completely pre-configured and ready to use, but to get started testing:

1. **Faculty Account:** Create your master Faculty account to manage sessions. You can register via the `/faculty/login` portal in the web UI.
2. **Student Database:** The repository includes a `new_students_ocr.txt` file and a `seed_new_students.py` script. Run this python script from the backend terminal to pre-populate the database with the official student registry.

### 4. Usage Workflow
1. Navigate to the Faculty portal (`http://localhost:5173/faculty/login`) and log in.
2. Click **Start Session** from the Faculty Dashboard and set the start/end time. A rotating QR code will appear on the projector screen.
3. Open a new window (or use your smartphone connected to the same WiFi) and navigate to the Student portal (`http://localhost:5173/student/login`).
4. Register a student using their **Campus ID** (e.g. `24BSC223`). The system will auto-fetch their name from the seeded database!
5. Open the built-in QR Scanner on the student dashboard and scan the faculty's active QR code on the projector.
6. The attendance will instantly ping the Faculty's dashboard in real-time, locking the student in as Present.

---

## 🌍 Preparing for Production Deployment

Sentinal is fully optimized for cloud deployment. Follow these steps to push to production:

### 1. Database Migration (Required)
SQLite is strictly for local development and is **NOT** suitable for ephemeral serverless deployment platforms. You must swap the database to PostgreSQL.
- Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
- In your cloud host's Environment Variables, set `DATABASE_URL` to your new PostgreSQL connection string (e.g., `postgresql+asyncpg://user:pass@host/db`).

### 2. Backend Deployment (Railway / Render)
*Note: Do NOT deploy the backend to Vercel. Serverless Functions sever long-lived WebSocket connections after 10 seconds!*
1. Connect your GitHub repository to [Railway](https://railway.app) or [Render](https://render.com).
2. Set the Root Directory to `backend`.
3. The platform will automatically detect the `Procfile` (`web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`) and deploy the app.
4. **Important Config:** Add your production frontend URL to the CORS `origins` list in `backend/app/main.py`. Set your `JWT_SECRET_KEY` in the environment variables.

### 3. Frontend Deployment (Vercel)
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set the Root Directory to `frontend`.
3. Vercel will automatically detect Vite and run `npm run build`.
4. Ensure the `vercel.json` file remains intact, as it ensures React Router operates correctly.
5. In Vercel's Environment Variables, add:
   - `VITE_API_URL=https://your-railway-backend-url.com/api`
   - `VITE_WS_URL=wss://your-railway-backend-url.com/ws`

---

## 📁 Repository Structure

```text
Sentinal/
├── backend/                     # FastAPI Backend Server
│   ├── app/
│   │   ├── api/                 # REST API endpoints & Websockets
│   │   ├── models/              # SQLAlchemy Database Models
│   │   ├── schemas/             # Pydantic Validation Schemas
│   │   ├── security/            # JWT and HMAC Signature handling
│   │   └── main.py              # Application entry point
│   ├── alembic/                 # Database Migrations
│   ├── Procfile                 # Railway/Render Deployment Config
│   └── requirements.txt         # Python Dependencies
│
└── frontend/                    # React + Vite Client
    ├── src/
    │   ├── pages/               # Faculty and Student UI Views
    │   ├── components/          # Reusable UI Elements (Loaders, Layouts)
    │   ├── store/               # Zustand Global State
    │   └── index.css            # Premium Tech Tailwind Base Styles
    ├── tailwind.config.js       # Color Palette Tokens
    └── vercel.json              # Vercel Deployment Config
```
