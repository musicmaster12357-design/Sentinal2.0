#!/bin/bash
cd backend
python reset_db.py
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
