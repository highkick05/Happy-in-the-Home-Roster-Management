import re

with open('src/server.ts', 'r') as f:
    text = f.read()

# Add is_incident to the destructured req.body
text = re.sub(
    r'(const \{\s*actual_start_time,\s*actual_finish_time,\s*notes,\s*abtCoordinates,\s*odometer_end_reading,\s*odometer_end_photo,)(\s*\} = req\.body;)',
    r'\1\n        is_incident,\2',
    text,
    count=1
)

with open('src/server.ts', 'w') as f:
    f.write(text)
