import re
with open('backend/app/api/attendance.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the double Z mess
content = content.replace('((record.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(record.timestamp, "tzinfo", None) else "")) + "Z") if record.timestamp and not record.timestamp.tzinfo else ((record.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(record.timestamp, "tzinfo", None) else "")) if record.timestamp else None)',
'(record.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(record.timestamp, "tzinfo", None) else "")) if record.timestamp else None')

content = content.replace('((r.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(r.timestamp, "tzinfo", None) else "")) + "Z") if r.timestamp and not r.timestamp.tzinfo else ((r.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(r.timestamp, "tzinfo", None) else "")) if r.timestamp else None)',
'(r.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(r.timestamp, "tzinfo", None) else "")) if r.timestamp else None')

with open('backend/app/api/attendance.py', 'w', encoding='utf-8') as f:
    f.write(content)
