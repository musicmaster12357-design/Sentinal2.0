import sqlite3
import os
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
hashed_password = pwd_context.hash("password123")

db_path = os.path.join(os.path.dirname(__file__), "scas.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("INSERT INTO faculty (id, name, email, department, password_hash) VALUES (1, 'Admin Faculty', 'faculty@test.com', 'Computer Science', ?)", (hashed_password,))
    conn.commit()
    print("Seeded faculty@test.com / password123")
except sqlite3.IntegrityError:
    print("Faculty already exists.")

conn.close()
