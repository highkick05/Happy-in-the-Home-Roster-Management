import re
with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

# Update the editor JS wrapper classes to remove prose and add custom line height and margin
old_classes = "prose prose-invert max-w-none text-[15px] editorjs-wrapper"
new_classes = "text-[15px] leading-relaxed [&>div]:mb-1 [&>div]:last:mb-0 block editorjs-wrapper"

code = code.replace(old_classes, new_classes)

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)
    
