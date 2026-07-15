with open("src/components/Kiosk/WallboardView.tsx", "r") as f:
    code = f.read()

code = code.replace("t.status === 'Active'", "(t.status === 'To Do' || t.status === 'In Progress')")

with open("src/components/Kiosk/WallboardView.tsx", "w") as f:
    f.write(code)
