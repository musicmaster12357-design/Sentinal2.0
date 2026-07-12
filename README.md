# Smart Classroom Attendance Management System (SCAMS)

A highly secure, real-time campus attendance platform featuring a 3-step cryptographic handshake (Signed QR + Nonce Challenge), sub-3-second attendance logging, and real-time faculty monitoring.

## 🚀 Key Features

* **Three-Step Advanced Security Handshake**: Utilizes HMAC-SHA256 Signed QR codes + Nonce challenge to guarantee anti-spoofing and prevent proxy attendance.
* **Real-time Live Monitoring**: Faculty dashboards update instantly via WebSockets as students scan their attendance.
* **Instant Feedback Loop**: Students are prompted to submit class feedback immediately after marking attendance.
* **Excel Export**: Faculty can generate full attendance matrices and download them dynamically in Excel format.

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite, Tailwind CSS v3, Framer Motion, html5-qrcode
* **Backend**: FastAPI, SQLAlchemy (async), SQLite (default local DB)
* **Real-Time**: WebSockets (FastAPI native)
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

# Install dependencies directly
pip install -r requirements.txt

# Run the FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*The backend API will now be running on `http://localhost:8000`*

### 2. Frontend Setup (React/Vite)
Open a **new** terminal and navigate to the `frontend` directory:
```bash
cd frontend

# Install dependencies
npm install

# Run the Vite development server
npm run dev
```
### 3. Creating an Admin / Faculty Account
To log into the Faculty Dashboard, you must first create a master faculty account directly in the database.
1. Open the file `backend/seed_faculty.py`.
2. Edit line `6` to set your desired password (default is `password123`):
   `hashed_password = pwd_context.hash("your_secure_password")`
3. Edit line `13` to set your Name and Email (default is `faculty@test.com`):
   `c.execute("INSERT INTO faculty (id, name, email, department, password_hash) VALUES (1, 'Your Name', 'your.email@university.edu', 'Computer Science', ?)", (hashed_password,))`
4. Run the script:
   ```bash
   cd backend
   python seed_faculty.py
   ```
   
   **Default Testing Credentials:**
   If you just run the file without editing it, it will create the following default account for you:
   * **Email:** `faculty@test.com`
   * **Password:** `password123`

   *(You can now log into the `/faculty/login` portal using these credentials).*

### 4. Usage & Testing
1. Navigate to the Faculty portal (`/faculty/login`) to create a faculty account or log in.
2. Start a new live session from the Faculty Dashboard. A rotating QR code will appear.
3. Open a new window (or use a mobile device on the same network) and go to the Student portal (`/student/login`).
4. Register a new student account (restricted to Semester I).
5. Open the built-in QR Scanner on the student dashboard and scan the faculty's QR code.
6. The attendance will instantly pop up on the Faculty's screen!

---

## 🌍 Preparing for Production Deployment

To deploy this application to production, follow these steps:

### 1. Database Migration (Required)
SQLite is NOT suitable for serverless deployment platforms (like Vercel/Render). You must swap the database to PostgreSQL.
- Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
- In `backend/app/config.py`, change the `DATABASE_URL` from `sqlite+aiosqlite:///./attendance.db` to your new PostgreSQL connection string (e.g., `postgresql+asyncpg://user:pass@host/db`).

### 2. Frontend Deployment (Vercel / Netlify)
1. Push your repository to GitHub.
2. Connect your GitHub repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Set the Root Directory to `frontend`.
4. Build command: `npm run build`
5. Output Directory: `dist`
6. Add your environment variables (e.g., `VITE_API_URL=https://your-backend-url.com/api`).

### 3. Backend Deployment (Render / Railway / DigitalOcean)
*Note: Do NOT deploy the backend to Vercel, as Serverless Functions do not support long-lived WebSockets!*
1. Connect your GitHub repository to [Render](https://render.com) (Web Service) or [Railway](https://railway.app).
2. Set the Root Directory to `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Ensure your `frontend` domain is added to the `origins` list in `backend/app/main.py` to allow CORS!
