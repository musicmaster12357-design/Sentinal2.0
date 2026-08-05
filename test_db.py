import sqlite3
import pprint
c = sqlite3.connect('backend/app/scas.db')
c.row_factory = sqlite3.Row
print('Latest session:')
sess = c.execute("SELECT id, start_time FROM attendance_sessions ORDER BY id DESC LIMIT 1").fetchone()
print(dict(sess))
print(f'Attendance count for session {sess["id"]}:')
print(c.execute(f"SELECT COUNT(*) as cnt FROM attendance WHERE session_id = {sess['id']}").fetchone()['cnt'])
print('All attendance records for this session:')
recs = c.execute(f"SELECT * FROM attendance WHERE session_id = {sess['id']}").fetchall()
for r in recs:
    print(dict(r))
