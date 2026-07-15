import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = code.replace("a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i)", "a.filename?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || a.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)")

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
