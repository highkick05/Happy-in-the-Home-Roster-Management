with open("src/server.ts", "r") as f:
    code = f.read()

code = code.replace("avatar: ts.avatar", "avatar: undefined")

with open("src/server.ts", "w") as f:
    f.write(code)
