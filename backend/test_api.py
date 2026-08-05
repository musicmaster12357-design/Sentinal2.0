import asyncio
import httpx
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def run():
    async with httpx.AsyncClient() as client:
        r = await client.post("https://sentinal20-production.up.railway.app/api/auth/login", json={"email": "faculty@test.com", "password": "SCAMS@yenepoya!"})
        token = r.json()["access_token"]
        r_students = await client.get("https://sentinal20-production.up.railway.app/api/analytics/students", headers={"Authorization": f"Bearer {token}"})
        live_students = r_students.json()
        print("Type:", type(live_students))
        if isinstance(live_students, list) and len(live_students) > 0:
            print("First item:", live_students[0])
        elif isinstance(live_students, dict):
            print("Keys:", live_students.keys())
            if "students" in live_students:
                print("First item:", live_students["students"][0])

asyncio.run(run())
