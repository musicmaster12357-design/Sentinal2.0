import re

with open('backend/app/schemas/user.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_schema = '''class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    specialisation: Optional[str] = None
    semester: Optional[str] = None'''

new_schema = '''class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    specialisation: Optional[str] = None
    semester: Optional[str] = None
    email: Optional[EmailStr] = None
    campus_id: Optional[str] = None'''

content = content.replace(old_schema, new_schema)

with open('backend/app/schemas/user.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated schema")
