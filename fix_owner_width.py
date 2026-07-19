import re
with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

# 1. Car Details Make & Model field
text = text.replace('className="font-medium text-white min-w-[140px] w-full"', 'className="font-medium text-white min-w-[120px] w-full"')

# 2. Owner select field
text = text.replace(
    'className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:border-border-subtle focus:ring-1 focus:ring-brand-teal rounded appearance-none text-[#8B949E] text-sm"',
    'className="min-w-[140px] w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:border-border-subtle focus:ring-1 focus:ring-brand-teal rounded appearance-none text-[#8B949E] text-sm"'
)

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
