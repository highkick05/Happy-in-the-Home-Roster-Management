import sqlite3

db_path = "/app/applet/data/dev-database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("""
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    """)
except Exception as e:
    print(e)

conn.commit()
conn.close()
print("Notifications table fixed")
