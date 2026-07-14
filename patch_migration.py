with open("src/server.ts", "r") as f:
    code = f.read()

migration_code = """
    // Migration: Add author_id to progress_notes if it doesn't exist
    try {
      const progressNotesColumns = db.prepare("PRAGMA table_info(progress_notes)").all() as any[];
      if (!progressNotesColumns.some(col => col.name === 'author_id')) {
        db.exec("ALTER TABLE progress_notes ADD COLUMN author_id INTEGER NOT NULL DEFAULT 1");
        console.log("Migrated progress_notes table to add author_id");
      }
    } catch (e) {
      console.error("Failed to migrate progress_notes:", e);
    }
"""

target = 'console.log("[DEBUG] Completed client_ledger_entries table setup.");'
code = code.replace(target, target + "\n" + migration_code)

with open("src/server.ts", "w") as f:
    f.write(code)
