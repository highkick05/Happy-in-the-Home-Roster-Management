import re

with open('src/server.ts', 'r') as f:
    content = f.read()

migration_code = """
  try {
    const parseDateString = (d) => {
      if (!d) return null;
      if (d.includes('/')) {
        const parts = d.split(/[ \\/,T]/); 
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        let isPM = d.toLowerCase().includes('pm');
        let isAM = d.toLowerCase().includes('am');
        let timePart = "00:00:00";
        const timeMatch = d.match(/(\\d{1,2}):(\\d{2})(?::(\\d{2}))?/);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          let m = timeMatch[2];
          let s = timeMatch[3] || '00';
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          timePart = `${h.toString().padStart(2, '0')}:${m}:${s}`;
        }
        // SQLite uses YYYY-MM-DD HH:MM:SS natively for date() and strftime()
        return `${year}-${month}-${day}T${timePart}Z`;
      }
      return d;
    };

    const shifts = db.prepare("SELECT id, start_time, end_time FROM shifts").all();
    let updated = 0;
    for (const s of shifts) {
      let changed = false;
      let newStart = s.start_time;
      let newEnd = s.end_time;
      if (s.start_time && s.start_time.includes('/')) {
        newStart = parseDateString(s.start_time);
        changed = true;
      }
      if (s.end_time && s.end_time.includes('/')) {
        newEnd = parseDateString(s.end_time);
        changed = true;
      }
      if (changed) {
        db.prepare("UPDATE shifts SET start_time = ?, end_time = ? WHERE id = ?").run(newStart, newEnd, s.id);
        updated++;
      }
    }
    if (updated > 0) console.log(`[DEBUG] Migrated ${updated} shifts to standard ISO date formats.`);
  } catch (e) {
    console.warn("Migration warning for shifts dates:", e.message);
  }
"""

# Insert right before "console.log('Database initialization complete');"
if "console.log('Database initialization complete');" in content:
    content = content.replace("console.log('Database initialization complete');", migration_code + "\\n  console.log('Database initialization complete');")
else:
    # Just insert it before app.use
    content = content.replace("  app.use(express.json({", migration_code + "\\n  app.use(express.json({")

with open('src/server.ts', 'w') as f:
    f.write(content)

