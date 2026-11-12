const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = walk(path.join(__dirname, "..", "src"));
const replacements = [
  // Cards -> glass
  ["bg-white rounded-xl border border-[#E7E5E4]", "glass rounded-xl"],
  ["bg-white rounded-lg border border-[#E7E5E4]", "glass rounded-lg"],
  ["bg-white rounded-2xl border border-[#E7E5E4]", "glass rounded-2xl"],
  ["rounded-lg border border-[#E7E5E4] bg-white", "rounded-lg glass"],
  ["border border-[#E7E5E4] bg-white", "glass"],
  // Inputs
  ["bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]", "glass-input text-sm"],
  // Dividers / borders inside cards
  ["divide-[#E7E5E4]", "divide-black/5"],
  ["border-b border-[#E7E5E4]", "border-b border-black/5"],
  ["border-t border-[#E7E5E4]", "border-t border-black/5"],
  ["border-l-4", "border-l-4"],
  // Soft surfaces
  ["hover:bg-[#F5F5F4]", "hover:bg-white/40"],
  ["bg-[#F5F5F4]", "bg-white/35"],
  ["bg-[#FAF8F5]", "bg-white/30"],
  // Backgrounds handled by aurora
  ["bg-[#F5F2EF]", "bg-transparent"],
  // Remaining neutral borders
  ["border-[#E7E5E4]", "border-white/40"],
];

let changedFiles = 0;
for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  let original = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, "utf-8");
    changedFiles++;
  }
}
console.log("Changed files:", changedFiles);
