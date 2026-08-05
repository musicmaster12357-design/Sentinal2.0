import re

with open('backend/app/api/attendance.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the query
old_query = '''    stmt = select(AttendanceRecord, User, StudentSessionDetail, AttendanceSession).options(selectinload(User.profile)).join(
        User, AttendanceRecord.student_id == User.id
    ).join(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).join(
        AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id
    ).where('''

new_query = '''    from app.models.user import Profile
    stmt = select(AttendanceRecord, User, StudentSessionDetail, AttendanceSession, Profile).join(
        User, AttendanceRecord.student_id == User.id
    ).join(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).join(
        AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id
    ).outerjoin(
        Profile, User.id == Profile.user_id
    ).where('''

content = content.replace(old_query, new_query)

# Replace the return dict
old_return = '''    return [{
        "student_name": (s.profile.name if s.profile else 'N/A'),
        "campus_id": s.campus_id,
        "session_id": sess.id,
        "subject_id": sess.subject_id,
        "session_date": to_ist_iso(sess.start_time),
        "interactive_rating": d.interactive_rating,
        "relevant_rating": d.relevant_rating,
        "learned_today": d.learned_today,
        "key_takeaway": d.key_takeaway,
        "overall_satisfaction": d.overall_satisfaction,
        "submitted_time": to_ist_iso(d.submitted_time),
        "email": s.email,
        "phone": s.phone,
        "course": (s.profile.course if s.profile else 'N/A'),
        "specialisation": (s.profile.specialisation if s.profile else 'N/A')
    } for r, s, d, sess in records]'''

new_return = '''    return [{
        "student_name": (p.name if p else 'N/A'),
        "campus_id": s.campus_id,
        "session_id": sess.id,
        "subject_id": sess.subject_id,
        "session_date": to_ist_iso(sess.start_time),
        "interactive_rating": d.interactive_rating,
        "relevant_rating": d.relevant_rating,
        "learned_today": d.learned_today,
        "key_takeaway": d.key_takeaway,
        "overall_satisfaction": d.overall_satisfaction,
        "submitted_time": to_ist_iso(d.submitted_time),
        "email": s.email,
        "phone": p.phone if p else None,
        "course": (p.course_name if p else 'N/A'),
        "specialisation": (p.specialisation if p else 'N/A')
    } for r, s, d, sess, p in records]'''

content = content.replace(old_return, new_return)

with open('backend/app/api/attendance.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("success")
