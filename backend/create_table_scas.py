import sqlite3

conn = sqlite3.connect('app/scas.db')
cursor = conn.cursor()
cursor.execute('''
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL
)
''')
conn.commit()
conn.close()
print("Table created")
