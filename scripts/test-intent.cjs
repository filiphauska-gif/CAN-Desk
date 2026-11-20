const text = "Jano, já musím do pátku 27. 11. připravit tisková data pro Laponsko.";
const lower = text.toLowerCase();
const names = ["Jana Nováková", "Petr Král"];
const mentioned = names.filter((n) => lower.includes(n.split(" ")[0].toLowerCase()));
const selfIntent =
  /\b(já|ja)\s+(musím|musim|udělám|udelam|zařídím|zaridim|pošlu|poslu|připravím|pripravim|vytvořím|vytvorim|dodám|dodam|odevzdám|odevzdam)\b/.test(lower) ||
  /\bmusím\b|\bmusim\b/.test(lower);
const weIntent = /\bmáme\b|\bmame\b/.test(lower);
console.log({ lower, mentioned, selfIntent, weIntent });
