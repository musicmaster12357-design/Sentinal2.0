import hmac
import hashlib
import time
from app.config import settings

def generate_qr_signature(session_id: int, nonce: str, issued_at: int, expires: int) -> str:
    payload = f"{session_id}:{nonce}:{issued_at}:{expires}"
    signature = hmac.new(
        settings.QR_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature

def verify_qr_signature(session_id: int, nonce: str, issued_at: int, expires: int, signature: str) -> bool:
    expected = generate_qr_signature(session_id, nonce, issued_at, expires)
    return hmac.compare_digest(expected, signature)

def is_qr_expired(expires: int) -> bool:
    return int(time.time()) > expires
