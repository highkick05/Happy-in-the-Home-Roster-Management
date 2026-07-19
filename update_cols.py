import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

# Remove insurance_provider block from table row
text = re.sub(
    r'<div className="w-24">\s*<InlineInput\s*value=\{v\.insurance_provider\}[\s\S]*?className="text-xs text-\[\#8B949E\] uppercase tracking-wider"\s*/>\s*</div>',
    '',
    text
)

# Remove roadside_provider block from table row
text = re.sub(
    r'<div className="w-24">\s*<InlineInput\s*value=\{v\.roadside_provider\}[\s\S]*?className="text-xs text-\[\#8B949E\] uppercase tracking-wider"\s*/>\s*</div>',
    '',
    text
)

# Widen year column (currently w-12 or something)
text = re.sub(
    r'<div className="text-xs text-\[\#8B949E\] w-12">',
    r'<div className="text-xs text-[#8B949E] w-16">',
    text
)

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
