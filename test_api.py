import urllib.request
import json
url = "https://sentinal20-production.up.railway.app/api/auth/login"
data = json.dumps({"email": "faculty@test.com", "password": "SCAMS@yenepoya!"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode())
except Exception as e:
    print("Error:", e)
