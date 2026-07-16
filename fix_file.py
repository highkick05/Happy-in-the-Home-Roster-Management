import re

with open("src/server.ts", "r") as f:
    code = f.read()

pattern = re.compile(r'  \} catch \(e: any\) \{\n    console\.warn\("Migration warning for settings table:", e\.message\);\n  \}\n    \n    console\.log\("\[DEBUG\] Completed is_historical column check\."\);\n  \} catch \(e: any\) \{\n    if \(e\.message && !e\.message\.includes\("duplicate column"\)\) \{\n      console\.warn\("Migration warning:", e\.message\);\n    \}\n  \}')
if pattern.search(code):
    code = pattern.sub('  } catch (e: any) {\n    console.warn("Migration warning for settings table:", e.message);\n  }', code)
else:
    print("Not found, trying alternative")
    # let's just find the duplicate `is_historical` log and remove it and the catch
    code = re.sub(r'\s*console\.log\("\[DEBUG\] Completed is_historical column check\."\);\n  \} catch \(e: any\) \{\n    if \(e\.message && !e\.message\.includes\("duplicate column"\)\) \{\n      console\.warn\("Migration warning:", e\.message\);\n    \}\n  \}', '', code)

with open("src/server.ts", "w") as f:
    f.write(code)
