from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_faculty
from app.schemas.user import TokenData
from datetime import date, datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from io import BytesIO
from fastapi.responses import StreamingResponse
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api/attendance/faculty", tags=["attendance_matrix"])

@router.get("/matrix")
async def get_attendance_matrix(
    date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_faculty)
):
    from app.models.session import AttendanceSession
    from app.models.student import Student
    from app.models.attendance import AttendanceRecord
    
    # 1. Fetch all sessions for this faculty on this date
    stmt_sessions = select(AttendanceSession).where(
        AttendanceSession.faculty_id == current_user.user_id
    ).order_by(AttendanceSession.start_time)
    
    res = await db.execute(stmt_sessions)
    all_sessions = res.scalars().all()
    
    day_sessions = [s for s in all_sessions if s.start_time.date() == date]
    
    if not day_sessions:
        return {"sessions": [], "students": [], "grouped_students": {}}
        
    stmt_students = select(Student)
    res_students = await db.execute(stmt_students)
    students = res_students.scalars().all()
    
    session_ids = [s.id for s in day_sessions]
    
    stmt_att = select(AttendanceRecord).where(
        AttendanceRecord.session_id.in_(session_ids)
    )
    res_att = await db.execute(stmt_att)
    attendances = res_att.scalars().all()
    
    # map: student_id -> session_id -> bool
    att_map = {}
    for a in attendances:
        if a.student_id not in att_map:
            att_map[a.student_id] = {}
        att_map[a.student_id][a.session_id] = (a.status == "present")
        
    student_list = []
    for s in students:
        s_data = {
            "id": s.id,
            "campus_id": s.campus_id,
            "name": s.name,
            "email": s.email,
            "phone": s.phone,
            "course": s.course,
            "specialisation": s.specialisation,
            "semester": s.semester,
            "attendance": {sid: att_map.get(s.id, {}).get(sid, False) for sid in session_ids}
        }
        student_list.append(s_data)
        
    # Group by course+specialisation
    grouped_students = {}
    for s in student_list:
        key = f"{s['course'] or 'Unknown'}({s['specialisation'] or 'None'})"
        if key not in grouped_students:
            grouped_students[key] = []
        grouped_students[key].append(s)
        
    sessions_data = []
    for s in day_sessions:
        if s.start_time:
            st = s.start_time
            if st.tzinfo is None:
                st = st.replace(tzinfo=pytz.UTC)
            ist_start = st.astimezone(IST)
        else:
            ist_start = None
            
        if s.end_time:
            et = s.end_time
            if et.tzinfo is None:
                et = et.replace(tzinfo=pytz.UTC)
            ist_end = et.astimezone(IST)
        else:
            ist_end = None

        time_str = "Unknown"
        if ist_start and ist_end:
            time_str = f"{ist_start.strftime('%I:%M %p')} - {ist_end.strftime('%I:%M %p')}"
        elif ist_start:
            time_str = ist_start.strftime('%I:%M %p')
            
        sessions_data.append({
            "id": s.id,
            "subject_id": s.subject_id,
            "start_time": time_str
        })
    
    unique_dates = []
    for s in all_sessions:
        d = s.start_time.date()
        if d not in unique_dates:
            unique_dates.append(d)
            
    try:
        day_number = unique_dates.index(date) + 1
    except ValueError:
        day_number = "?"

    return {
        "day_number": day_number,
        "sessions": sessions_data,
        "grouped_students": grouped_students
    }


def _make_header_style(bold=True, size=11, color="FFFFFF", bg_color=None, center=True):
    """Helper to create cell style."""
    font = Font(bold=bold, size=size, color=color)
    alignment = Alignment(horizontal="center" if center else "left", vertical="center", wrap_text=True)
    fill = PatternFill("solid", fgColor=bg_color) if bg_color else None
    return font, alignment, fill


def _apply_border(cell):
    thin = Side(style="thin", color="4A5568")
    cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)


@router.get("/export/excel")
async def export_excel(
    date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_faculty)
):
    matrix_data = await get_attendance_matrix(date=date, db=db, current_user=current_user)
    
    wb = openpyxl.Workbook()
    
    if not matrix_data["sessions"]:
        ws = wb.active
        ws.title = "No Data"
        ws.append(["No sessions found for this date."])
    else:
        sessions = matrix_data["sessions"]
        n_sessions = len(sessions)
        # Fixed columns: S.No, Campus ID, Name, Email, Phone → 5 columns
        FIXED_COLS = 5
        total_cols = FIXED_COLS + n_sessions
        
        first = True
        for group_name, students in matrix_data["grouped_students"].items():
            safe_title = group_name.replace("/", "-").replace("[", "").replace("]", "").replace(":", "")[:31]
            if first:
                ws = wb.active
                ws.title = safe_title
                first = False
            else:
                ws = wb.create_sheet(title=safe_title)

            # ── Row 1: Group title (e.g. BCA(Data Science)) ──────────────────
            ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
            c = ws.cell(row=1, column=1, value=group_name)
            c.font = Font(bold=True, size=14, color="FFFFFF")
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.fill = PatternFill("solid", fgColor="1E3A5F")
            ws.row_dimensions[1].height = 28

            # ── Row 2: Total count ────────────────────────────────────────────
            ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=total_cols)
            c2 = ws.cell(row=2, column=1, value=f"Total Students Registered: {len(students)}")
            c2.font = Font(italic=True, size=11, color="94A3B8")
            c2.alignment = Alignment(horizontal="center", vertical="center")
            c2.fill = PatternFill("solid", fgColor="0F172A")
            ws.row_dimensions[2].height = 20

            # ── Row 3: "Day 1" super-header merged over session columns ───────
            # Fixed columns (S.No .. Phone) get no Day label; merge them vertically with row 4
            fixed_headers = ["S.No", "Campus ID", "Name", "Email", "Phone Number"]
            for col_idx, header in enumerate(fixed_headers, 1):
                # Write to the top-left cell of the merge (row 3)
                c = ws.cell(row=3, column=col_idx, value=header)
                c.font = Font(bold=True, size=10, color="FFFFFF")
                c.alignment = Alignment(horizontal="center", vertical="center")
                c.fill = PatternFill("solid", fgColor="334155")
                _apply_border(c)
                # Apply border and fill to the bottom cell of the merge too for visual consistency
                c_bottom = ws.cell(row=4, column=col_idx)
                c_bottom.fill = PatternFill("solid", fgColor="334155")
                _apply_border(c_bottom)
                ws.merge_cells(start_row=3, start_column=col_idx, end_row=4, end_column=col_idx)
            
            # Day header spanning the session columns
            ws.merge_cells(
                start_row=3,
                start_column=FIXED_COLS + 1,
                end_row=3,
                end_column=total_cols
            )
            day_num = matrix_data.get("day_number", "?")
            day_cell = ws.cell(row=3, column=FIXED_COLS + 1, value=f"Day {day_num}")
            day_cell.font = Font(bold=True, size=12, color="FFFFFF")
            day_cell.alignment = Alignment(horizontal="center", vertical="center")
            day_cell.fill = PatternFill("solid", fgColor="1D4ED8")
            ws.row_dimensions[3].height = 22

            # ── Row 4: Column sub-headers (Sessions) ──────────────────────────


            for s_idx, s in enumerate(sessions, 1):
                col = FIXED_COLS + s_idx
                c = ws.cell(row=4, column=col, value=f"Session {s_idx}\n{s['subject_id']}\n{s['start_time']}")
                c.font = Font(bold=True, size=9, color="FFFFFF")
                c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                c.fill = PatternFill("solid", fgColor="334155")
                _apply_border(c)
                ws.row_dimensions[4].height = 50

            # ── Rows 5+: Data ─────────────────────────────────────────────────
            for i, student in enumerate(students, 1):
                row_num = 4 + i
                row_data = [
                    i,
                    student["campus_id"],
                    student["name"],
                    student["email"],
                    student["phone"] or "N/A"
                ]
                for col_idx, val in enumerate(row_data, 1):
                    c = ws.cell(row=row_num, column=col_idx, value=val)
                    c.alignment = Alignment(horizontal="center", vertical="center")
                    c.font = Font(size=10)
                    _apply_border(c)

                for s_idx, s in enumerate(sessions, 1):
                    col = FIXED_COLS + s_idx
                    present = student["attendance"].get(s["id"], False)
                    c = ws.cell(row=row_num, column=col, value="✅" if present else "❌")
                    c.alignment = Alignment(horizontal="center", vertical="center")
                    c.font = Font(size=12)
                    _apply_border(c)

            # ── Column widths ─────────────────────────────────────────────────
            col_widths = [8, 14, 22, 28, 14] + [22] * n_sessions
            for col_idx, width in enumerate(col_widths, 1):
                ws.column_dimensions[get_column_letter(col_idx)].width = width
                
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Attendance_{date.isoformat()}.xlsx"}
    )
