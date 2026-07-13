with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

code = code.replace('className="flex items-center justify-between bg-[#1C1D22] border-b border-[#0B0C0E] py-2 px-4"', 'className="flex items-center justify-between bg-[#1C1D22] border-b border-[#0B0C0E] py-1 px-3"')

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)

