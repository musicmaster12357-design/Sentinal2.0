#!/bin/bash
cd backend
echo "Starting deployment..." > startup.log
python reset_db.py >> startup.log 2>&1
alembic upgrade head >> startup.log 2>&1
uvicorn app.main:app --host 0.0.0.0 --port 8001 >> startup.log 2>&1 &
python -m http.server ${PORT:-8000}
