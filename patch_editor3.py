with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

code = code.replace("text-[15px] leading-relaxed [&>div]:mb-1", "text-[15px] text-[#E6EDF3] leading-[1.4] [&>div]:mb-0")

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)

