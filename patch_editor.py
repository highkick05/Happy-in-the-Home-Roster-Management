with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

code = code.replace("bg-[#0B0C0E]", "bg-brand-bg")
code = code.replace("bg-[#1C1D22]", "bg-brand-navy")
code = code.replace("border-[#0B0C0E]", "border-border-subtle")

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()
    
code = code.replace("bg-[#1C1D22]", "bg-brand-navy")

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)
