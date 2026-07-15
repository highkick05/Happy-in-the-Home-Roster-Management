with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

code = code.replace("sanitize: {", "sanitizer: {")

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)
