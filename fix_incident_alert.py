import re

with open('src/server.ts', 'r') as f:
    text = f.read()

target = """        const stmt = db.prepare(updateQueryStr);
        stmt.run(...updateParams);"""

replacement = """        const stmt = db.prepare(updateQueryStr);
        stmt.run(...updateParams);

        if (is_incident) {
           const alertClient = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(shift.client_id) as any;
           const alertStaff = db.prepare("SELECT first_name, last_name FROM users WHERE id = ?").get(shift.staff_id) as any;
           
           if (alertClient && alertStaff) {
              const staffName = `${alertStaff.first_name || ''} ${alertStaff.last_name || ''}`.trim();
              const clientName = `${alertClient.first_name || ''} ${alertClient.last_name || ''}`.trim();
              
              const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").all() as any[];
              const insertNotification = db.prepare(`
                INSERT INTO notifications (user_id, type, title, message, link)
                VALUES (?, 'ALERT', 'Incident Reported', ?, ?)
              `);
              
              for (const admin of admins) {
                 insertNotification.run(
                   admin.id,
                   `ALERT! ${staffName} has submitted an Incident for ${clientName}`,
                   `/clients/${shift.client_id}/progress-notes`
                 );
              }
           }
        }"""

text = text.replace(target, replacement)

with open('src/server.ts', 'w') as f:
    f.write(text)
