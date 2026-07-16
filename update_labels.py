import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

target = """              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Assigned Staff</label>"""
replacement = """              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Staff</label>"""
code = code.replace(target, replacement)

target2 = """              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Assigned Clients</label>"""
replacement2 = """              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Clients</label>"""
code = code.replace(target2, replacement2)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)

print("Updated labels")
