import re

with open('backend/app/api/matrix.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_query = '''    stmt = (
        select(User, StudentSessionDetail, AttendanceRecord.session_id)
        .join(AttendanceRecord, User.id == AttendanceRecord.student_id)
        .join(StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id)
        .where(AttendanceRecord.session_id.in_(session_ids))
        .order_by(StudentSessionDetail.submitted_time)
    )'''

new_query = '''    from app.models.user import Profile
    stmt = (
        select(User, StudentSessionDetail, AttendanceRecord.session_id, Profile)
        .join(AttendanceRecord, User.id == AttendanceRecord.student_id)
        .join(StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id)
        .outerjoin(Profile, User.id == Profile.user_id)
        .where(AttendanceRecord.session_id.in_(session_ids))
        .order_by(StudentSessionDetail.submitted_time)
    )'''

content = content.replace(old_query, new_query)

old_loop = '''    for user_obj, feedback, sess_id in records:
        if sess_id not in grouped_feedbacks:
            grouped_feedbacks[sess_id] = []
        grouped_feedbacks[sess_id].append({
            "student_name": user_obj.profile.name if user_obj.profile else "Unknown",
            "campus_id": user_obj.campus_id,
            "course": user_obj.profile.course if user_obj.profile else "N/A",'''

new_loop = '''    for user_obj, feedback, sess_id, p in records:
        if sess_id not in grouped_feedbacks:
            grouped_feedbacks[sess_id] = []
        grouped_feedbacks[sess_id].append({
            "student_name": p.name if p else "Unknown",
            "campus_id": user_obj.campus_id,
            "course": p.course_name if p else "N/A",'''

content = content.replace(old_loop, new_loop)

with open('backend/app/api/matrix.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated matrix.py")
