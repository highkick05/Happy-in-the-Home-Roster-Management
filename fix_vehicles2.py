import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

# 1. Fix handleSetPrimary
text = text.replace(
    "body: JSON.stringify({ ...vehicle, is_primary: 1 })",
    "body: JSON.stringify({ ...vehicle, is_primary: vehicle.is_primary ? 0 : 1 })"
)

# 2. Add padding to the table container and remove overflow-hidden
text = text.replace(
    'className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden overflow-x-auto"',
    'className="bg-brand-navy rounded-xl border border-border-subtle overflow-x-auto min-h-[450px]"'
)

# 3. Change R/S EXPIRY to ROADSIDE EXPIRY
text = text.replace(
    '<th className="px-3 py-3 border-r border-border-subtle/30">R/S Expiry</th>',
    '<th className="px-3 py-3 border-r border-border-subtle/30">Roadside Expiry</th>'
)
# Just in case the text is slightly different (e.g., uppercase vs title case)
text = text.replace(
    '>R/S Expiry<',
    '>Roadside Expiry<'
)

# 4. Make Make & Model column wider (w-32 -> w-48)
text = text.replace(
    '<div className="font-medium text-white w-32">',
    '<div className="font-medium text-white w-48">'
)

# 5. Fix <select> options styling
# We can just add className="bg-brand-navy text-white" to all <option> tags.
text = text.replace('<option ', '<option className="bg-brand-navy text-white" ')

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)

