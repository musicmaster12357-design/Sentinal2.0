from fastapi.testclient import TestClient
from app.main import app
import json
import base64

client = TestClient(app)

print("--- Testing Phase 2 IAM Backend with TestClient ---")

# 1. Login as Admin/Faculty
print("\n1. Logging in as Admin/Faculty...")
res = client.post("/api/auth/login", json={
    "email": "faculty@test.com",
    "password": "SCAMS@yenepoya!"
})
if res.status_code == 200:
    print("SUCCESS: Logged in!")
    tokens = res.json()
    admin_access_token = tokens["access_token"]
else:
    print(f"FAILED: {res.status_code} - {res.text}")
    exit(1)

# 2. Get Profile
print("\n2. Fetching Profile...")
res = client.get("/api/users/me", headers={"Authorization": f"Bearer {admin_access_token}"})
if res.status_code == 200:
    print("SUCCESS: Profile fetched.")
    print(json.dumps(res.json(), indent=2))
else:
    print(f"FAILED: {res.status_code} - {res.text}")

# 3. Create a Session
print("\n3. Starting a Session...")
res = client.post("/api/session/start", 
    headers={"Authorization": f"Bearer {admin_access_token}"},
    json={"duration": 120, "title": "Advanced Python", "time_slot": "10:00-12:00", "subject": "CS101"}
)
if res.status_code == 200:
    print("SUCCESS: Session created.")
    session_data = res.json()
    session_id = session_data["id"]
    print(f"Session ID: {session_id}")
else:
    print(f"FAILED: {res.status_code} - {res.text}")
    exit(1)

# 4. Get Active Session
print("\n4. Fetching Active Session...")
res = client.get("/api/session/active", headers={"Authorization": f"Bearer {admin_access_token}"})
if res.status_code == 200:
    print("SUCCESS: Active Session found.")
    active_session_data = res.json()
    qr_token = active_session_data["current_qr"]
else:
    print(f"FAILED: {res.status_code} - {res.text}")

# 5. Register a Student
print("\n5. Registering a Student...")
res = client.post("/api/auth/register", json={
    "email": "student1@test.com",
    "password": "password123",
    "name": "Test Student",
    "campus_id": "STU001",
    "role_name": "Student",
    "phone": "1234567890"
})
if res.status_code == 200:
    print("SUCCESS: Student registered.")
else:
    print(f"FAILED (might already exist): {res.status_code} - {res.text}")

# 6. Login as Student
print("\n6. Logging in as Student...")
res = client.post("/api/auth/login", json={
    "email": "student1@test.com",
    "password": "password123"
})
if res.status_code == 200:
    print("SUCCESS: Student logged in.")
    student_access_token = res.json()["access_token"]
else:
    print(f"FAILED: {res.status_code} - {res.text}")
    exit(1)

# 7. Student Scans QR
print("\n7. Student scanning QR...")
payload_str = base64.urlsafe_b64decode(qr_token + '==').decode()
payload = json.loads(payload_str)

res = client.post("/api/attendance/scan", 
    headers={"Authorization": f"Bearer {student_access_token}"},
    json={
        "session_id": payload["session_id"],
        "nonce": payload["nonce"],
        "issued_at": payload["issued_at"],
        "expires": payload["expires"],
        "signature": payload["signature"]
    }
)
if res.status_code == 200:
    print("SUCCESS: Attendance scanned.")
else:
    print(f"FAILED: {res.status_code} - {res.text}")

# 8. End Session
print("\n8. Ending Session...")
res = client.post(f"/api/session/{session_id}/end", headers={"Authorization": f"Bearer {admin_access_token}"})
if res.status_code == 200:
    print("SUCCESS: Session ended.")
else:
    print(f"FAILED: {res.status_code} - {res.text}")

print("\n--- ALL TESTS COMPLETED ---")
