import sqlite3

db_path = "/app/applet/data/dev-database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE files ADD COLUMN uploaded_by INTEGER")
except:
    pass

try:
    cursor.execute("ALTER TABLE files ADD COLUMN date_expires TEXT")
except:
    pass

try:
    cursor.execute("ALTER TABLE files ADD COLUMN compliance_type TEXT")
except:
    pass

conn.commit()
conn.close()
print("Files table fixed")
