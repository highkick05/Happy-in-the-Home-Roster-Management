import re

with open('src/components/Tasks/TaskCard.tsx', 'r') as f:
    text = f.read()

text = text.replace("flex items-center text-[11px] font-medium px-2 py-1 rounded-none border", "flex items-center text-[10px] font-medium px-2 py-1 rounded-none border")
text = text.replace("text-[11px] leading-tight", "text-[10px] leading-tight")

with open('src/components/Tasks/TaskCard.tsx', 'w') as f:
    f.write(text)
