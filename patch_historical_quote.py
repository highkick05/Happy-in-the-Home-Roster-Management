import re

with open('src/server.ts', 'r') as f:
    code = f.read()

# Update req.body destructuring
old_destructure = "      const { clientId, date } = req.body;"
new_destructure = "      const { clientId, date, activity } = req.body;"
code = code.replace(old_destructure, new_destructure)

# Update insert
old_insert = """        db.prepare(`
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
          ) VALUES (?, ?, ?, ?, ?, ?, '[]', ?)
        `).run(
          parseInt(clientId),
          quoteNum || fallbackNum,
          0, 
          'DRAFT', 
          date,
          date,
          activity || 'Historical Quote'
        );"""

code = code.replace(old_insert, new_insert)

with open('src/server.ts', 'w') as f:
    f.write(code)
print("Replaced historical quote backend successfully")
