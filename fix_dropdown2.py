import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

text = text.replace('<div className="min-w-[140px] w-full">', '<div className="w-40">')

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
