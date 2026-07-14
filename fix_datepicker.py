import re

with open("src/components/ui/CustomDatePicker.tsx", "r") as f:
    code = f.read()

old_input = """          <input 
            type="text"
            className={className + " w-full pl-2 pr-7 cursor-pointer"}"""

new_input = """          <input 
            type="text"
            className={className + " w-full pl-2 pr-7 cursor-pointer py-0 h-full !border-0 bg-transparent"}"""
code = code.replace(old_input, new_input)

with open("src/components/ui/CustomDatePicker.tsx", "w") as f:
    f.write(code)

