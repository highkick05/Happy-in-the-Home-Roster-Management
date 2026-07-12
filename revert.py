import re

with open("src/server.ts", "r") as f:
    content = f.read()

# I will replace the block in POST /api/shifts that has duplicates
old_post_vars = """      is_historical,
        progress_note,
        start_odometer,
        end_odometer,
      progress_note,
      start_odometer,
      end_odometer
    } = req.body;"""

new_post_vars = """      is_historical,
      progress_note,
      start_odometer,
      end_odometer
    } = req.body;"""

content = content.replace(old_post_vars, new_post_vars)

with open("src/server.ts", "w") as f:
    f.write(content)
