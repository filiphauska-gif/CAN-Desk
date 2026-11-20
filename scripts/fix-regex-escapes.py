import re

BS = chr(92)

# ---- chat.ts: rebuild intent block ----
p = "src/server/actions/chat.ts"
c = open(p, encoding="utf-8", errors="replace").read()
start = c.index("      const selfIntent =")
end = c.index("      if (mentioned.length > 0) targets = mentioned;")
block = (
    "      const selfIntent =\n"
    f"        /{BS}b(já|ja){BS}s+(musím|musim|udělám|udelam|zařídím|zaridim|pošlu|poslu|připravím|pripravim|vytvořím|vytvorim|dodám|dodam|odevzdám|odevzdam){BS}b/.test(lower) ||\n"
    f"        /{BS}bmusím{BS}b|{BS}bmusim{BS}b/.test(lower);\n"
    f"      const weIntent = /{BS}bmáme{BS}b|{BS}bmame{BS}b/.test(lower);\n"
    f"      const otherIntent = /{BS}b(udělej|udelej|pošli|posli|připrav|priprav|zařiď|zarid|vytvoř|vytvor|dodej|pošlete|poslete|udělejte|udelejte){BS}b/.test(lower);\n\n"
)
c = c[:start] + block + c[end:]
open(p, "w", encoding="utf-8", newline="").write(c)

# ---- extractor: fix corrupted line(s) ----
p2 = "src/lib/chat-task-extract.ts"
d = open(p2, encoding="utf-8", errors="replace").read()
lines = d.splitlines()
fixed = []
for line in lines:
    if chr(8) in line:
        # rebuild the "já musím" strip line
        line = '    .replace(/^(já' + BS + 's+|ja' + BS + 's+)?musím' + BS + 's+/i, "")'
    fixed.append(line)
d = "\n".join(fixed) + ("\n" if d.endswith("\n") else "")
open(p2, "w", encoding="utf-8", newline="").write(d)

for f in (p, p2):
    chk = open(f, encoding="utf-8").read()
    print(f, "| backspace:", chk.count(chr(8)), "| double:", chk.count(BS * 2))
