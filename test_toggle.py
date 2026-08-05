import asyncio
import httpx

async def run():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://127.0.0.1:8000/api/auth/login', json={'email': 'faculty@test.com', 'password': 'SCAMS@yenepoya!'})
        token = r.json().get('access_token')
        r2 = await client.post('http://127.0.0.1:8000/api/auth/settings/registration', headers={'Authorization': f'Bearer {token}'})
        print(f"Status: {r2.status_code}")
        print(r2.text)

asyncio.run(run())
