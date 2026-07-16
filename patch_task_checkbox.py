import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Add onToggleTaskStatus prop
props_pattern = re.compile(r'(onToggleSubtask\n\}: any\) \{)', re.DOTALL)
code = props_pattern.sub(r'onToggleSubtask,\n  onToggleTaskStatus\n}: any) {', code, count=1)

# Modify button onClick
btn_pattern = re.compile(r'(<button onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*/\* TODO \*/\s*\}\}\s*className=\{`mt-0\.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full border \$\{isChecked \? \'bg-brand-teal border-brand-teal\' : \'border-\[\#8B949E\] group-hover:border-white/50\'\}`\}>)', re.DOTALL)
new_btn = """<button onClick={(e) => { e.stopPropagation(); if (onToggleTaskStatus) onToggleTaskStatus(task); }} className={`mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full border ${isChecked ? 'bg-brand-teal border-brand-teal' : 'border-[#8B949E] group-hover:border-white/50'}`}>"""
code = btn_pattern.sub(new_btn, code, count=1)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
