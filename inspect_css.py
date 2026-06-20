import re

with open("app-0d7a2f83.css", "r", encoding="utf-8") as f:
    css = f.read()

# Let's find font-family declarations
fonts = re.findall(r'font-family:[^;}]+', css)
print("Font-family declarations:")
for f in set(fonts[:10]):
    print(" -", f.strip())

# Let's find root variables or data-theme variables
# E.g., variables starting with --
variables = re.findall(r'--[a-zA-Z0-9-]+:[^;}]+', css)
print("\nSome CSS variables:")
for v in set(variables[:20]):
    print(" -", v.strip())
