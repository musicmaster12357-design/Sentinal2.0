import sqlite3
c = sqlite3.connect('backend/app/scas.db')
c.execute("DELETE FROM student_session_details")
c.execute("DELETE FROM attendance")
c.execute("DELETE FROM attendance_sessions")
c.commit()
print("Sessions cleared!")
