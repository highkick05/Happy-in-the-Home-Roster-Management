import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    text = text.replace(
        "updateSettings: (newSettings: any) => void;",
        "updateSettings: (newSettings: any) => void;\n  updateUser: (user: User) => void;"
    )

    text = text.replace(
        "const updateSettings = (newSettings: any) => {",
        "const updateUser = (newUser: User) => {\n    setUser(newUser);\n  };\n\n  const updateSettings = (newSettings: any) => {"
    )

    text = text.replace(
        "<AuthContext.Provider value={{ user, settings, token, login, logout, switchRole, updateSettings, isLoading }}>",
        "<AuthContext.Provider value={{ user, settings, token, login, logout, switchRole, updateSettings, updateUser, isLoading }}>"
    )

    with open(filepath, 'w') as f:
        f.write(text)

update_file('src/context/AuthContext.tsx')
