import db from './db.js';

const parseDateString = (d) => {
  if (!d) return null;
  if (d.includes('/')) {
    // Attempt DD/MM/YYYY
    const parts = d.split(/[ \/,T]/); 
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    let isPM = d.toLowerCase().includes('pm');
    let isAM = d.toLowerCase().includes('am');
    
    let timePart = "00:00:00";
    const timeMatch = d.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      let m = timeMatch[2];
      let s = timeMatch[3] || '00';
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      timePart = `${h.toString().padStart(2, '0')}:${m}:${s}`;
    }
    
    return `${year}-${month}-${day}T${timePart}Z`; // Assuming they were local? Actually if we append Z we make it UTC, which might shift it.
    // Let's just store without Z, SQLite handles YYYY-MM-DD HH:MM:SS
  }
  // Try JS parse
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return dt.toISOString();
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
console.log(`Updated ${updated} shifts.`);
