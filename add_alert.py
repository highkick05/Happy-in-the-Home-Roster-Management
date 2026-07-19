import re

with open('src/server.ts', 'r') as f:
    text = f.read()

trigger_target = """        db.prepare(updateQueryStr).run(...updateParams);"""

trigger_replacement = """        db.prepare(updateQueryStr).run(...updateParams);

        if (is_incident) {
           const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(shift.client_id) as any;
           const staff = db.prepare("SELECT first_name, last_name FROM users WHERE id = ?").get(shift.staff_id) as any;
           
           if (client && staff) {
              const staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
              const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
              
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

text = text.replace(trigger_target, trigger_replacement)

with open('src/server.ts', 'w') as f:
    f.write(text)
