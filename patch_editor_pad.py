with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

code = code.replace('px-6 py-4 rounded-b-none', 'px-6 py-2 rounded-b-none')

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)

