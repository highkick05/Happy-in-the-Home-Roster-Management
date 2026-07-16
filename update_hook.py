import re

with open("src/hooks/useCountdown.ts", "r") as f:
    code = f.read()

target = """        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          // Trigger shake effect
          document.body.classList.add('shake-alert');
          setTimeout(() => {
            document.body.classList.remove('shake-alert');
          }, 3000);
        }"""

replacement = """        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
        }"""

if target in code:
    code = code.replace(target, replacement)
    print("Replaced shake effect")
else:
    print("Target not found")
    
with open("src/hooks/useCountdown.ts", "w") as f:
    f.write(code)

