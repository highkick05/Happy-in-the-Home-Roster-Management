import re

with open('src/components/ProgressNotes/EditorJSWrapper.tsx', 'r') as f:
    text = f.read()

text = text.replace('text-[15px]', 'text-[11px]')
text = text.replace('min-h-[140px]', 'min-h-[100px]')

with open('src/components/ProgressNotes/EditorJSWrapper.tsx', 'w') as f:
    f.write(text)
