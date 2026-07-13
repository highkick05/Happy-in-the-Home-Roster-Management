import re

with open('src/server.ts', 'r') as f:
    code = f.read()

old_insert = """        db.prepare(`
          INSERT INTO quotes (
            client_id,
            quote_number,
            amount,
            status,
            date,
            start_time,
            end_time,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          parseInt(clientId),
          quoteNum || fallbackNum,
          0, 
          'DRAFT', 
          date,
          date, 
          date  
        );"""

new_insert = """        db.prepare(`
          INSERT INTO quotes (
            client_id,
            quote_number,
            amount,
            status,
            quote_date,
            activity_date,
            services_json,
            activity_name
          ) VALUES (?, ?, ?, ?, ?, ?, '[]', 'Historical Quote')
        `).run(
          parseInt(clientId),
          quoteNum || fallbackNum,
          0, 
          'DRAFT', 
          date,
          date
        );"""

if old_insert in code:
    code = code.replace(old_insert, new_insert)
    with open('src/server.ts', 'w') as f:
        f.write(code)
    print("Replaced successfully")
else:
    print("Could not find old_insert")
