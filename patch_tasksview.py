with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace(
    """<div key={col.id} className="flex flex-col w-[300px] max-h-full bg-black/20 rounded-none p-2 border border-white/[0.02]">""",
    """<div key={col.id} className="flex flex-col w-[300px] max-h-full">"""
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
