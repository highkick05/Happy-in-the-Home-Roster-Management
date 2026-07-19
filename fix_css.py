import re

with open('src/index.css', 'r') as f:
    text = f.read()

if 'font-size: 11px !important;' not in text:
    text = text.replace('.rbc-toolbar button {', '.rbc-toolbar button {\n  font-size: 11px !important;\n  padding: 4px 10px !important;')

# Also for the label "July 13 - 19"
text = text.replace('.rbc-toolbar .rbc-toolbar-label {', '.rbc-toolbar .rbc-toolbar-label {\n  font-size: 14px !important;')

with open('src/index.css', 'w') as f:
    f.write(text)
