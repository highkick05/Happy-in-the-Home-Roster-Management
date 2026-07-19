import re
with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

text = re.sub(
    r'<div className="w-40">(\s*<select\s*value=\{v\.insurance_type)',
    r'<div className="w-[125px]">\1',
    text
)

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
