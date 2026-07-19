import re

with open('src/index.css', 'r') as f:
    text = f.read()

text = text.replace('gap: 12px;', 'gap: 8px;')
text = text.replace('margin: 8px 0;', 'margin: 4px 0;')
text = text.replace('margin-bottom: 10px;', 'margin-bottom: 5px;')

with open('src/index.css', 'w') as f:
    f.write(text)
