import re

with open('/app/applet/src/utils/travelCalculator.ts', 'r') as f:
    text = f.read()

# Replace prevShift query
old_prev = """    const prevShift = db.prepare(`
      SELECT * FROM shifts 
      WHERE staff_id = ? 
      AND DATE(start_time) = DATE(?)
      AND DATETIME(start_time) <= DATETIME(?) 
      AND id != ? 
      AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
      AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
      ORDER BY start_time DESC LIMIT 1
    `).get(shift.staff_id, shift.start_time, shift.start_time, shift.id) as any;"""

new_prev = """    const prevShift = db.prepare(`
      SELECT * FROM shifts 
      WHERE staff_id = ? 
      AND DATETIME(start_time) <= DATETIME(?) 
      AND id != ? 
      AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
      AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
      ORDER BY start_time DESC LIMIT 1
    `).get(shift.staff_id, shift.start_time, shift.id) as any;"""

text = text.replace(old_prev, new_prev)

# Replace nextShift query
old_next = """    const nextShift = db.prepare(`
      SELECT * FROM shifts 
      WHERE staff_id = ? 
      AND DATE(start_time) = DATE(?)
      AND DATETIME(start_time) >= DATETIME(?) 
      AND id != ? 
      AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
      AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
      ORDER BY start_time ASC LIMIT 1
    `).get(shift.staff_id, shift.start_time, shift.start_time, shift.id) as any;"""

new_next = """    const nextShift = db.prepare(`
      SELECT * FROM shifts 
      WHERE staff_id = ? 
      AND DATETIME(start_time) >= DATETIME(?) 
      AND id != ? 
      AND status NOT IN ('CANCELLED', 'DELETED', 'deleted')
      AND funding_type NOT IN ('HCP', 'Home Care', 'HOME_CARE')
      ORDER BY start_time ASC LIMIT 1
    `).get(shift.staff_id, shift.start_time, shift.id) as any;"""

text = text.replace(old_next, new_next)

with open('/app/applet/src/utils/travelCalculator.ts', 'w') as f:
    f.write(text)

