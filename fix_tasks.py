with open("src/server.ts", "r") as f:
    code = f.read()

code = code.replace("SELECT ts.task_id, u.id, u.first_name, u.last_name, u.avatar", "SELECT ts.task_id, u.id, u.first_name, u.last_name")

with open("src/server.ts", "w") as f:
    f.write(code)
