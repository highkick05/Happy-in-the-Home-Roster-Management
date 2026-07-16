import re

with open("src/components/ui/CustomDatePicker.tsx", "r") as f:
    code = f.read()

# Replace pl-2 with pl-0 or something if we want it tighter
code = code.replace('className={className + " w-full pl-2 pr-7 cursor-pointer py-0 h-full !border-0 bg-transparent"}',
                    'className={className + " w-full pl-1 pr-6 cursor-pointer py-0 h-full !border-0 bg-transparent"}')
code = code.replace('pr-2 pointer-events-none', 'pr-1 pointer-events-none')

with open("src/components/ui/CustomDatePicker.tsx", "w") as f:
    f.write(code)
