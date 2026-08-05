import asyncio
import httpx

async def run():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://127.0.0.1:8000/api/auth/login', json={'email': 'faculty@test.com', 'password': 'SCAMS@yenepoya!'})
        token = r.json().get('access_token')
        if not token:
            print("Login failed:", r.text)
            return
            
        r2 = await client.get('http://127.0.0.1:8000/api/attendance/faculty/feedbacks', headers={'Authorization': f'Bearer {token}'})
        print("Status:", r2.status_code)
        print("Response:", r2.text)

asyncio.run(run())
