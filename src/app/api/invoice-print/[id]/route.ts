import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { COMPANY } from "@/lib/company";

const czk = (n: number) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Kč";

const pageCss = `
  @page { margin: 18mm; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1C1917; font-size: 12px; line-height: 1.5; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:16px; border-bottom:2px solid #6366F1; }
  .header h1 { font-size: 20px; margin:0; }
  .muted { color:#78716C; }
  .grid { display:flex; gap:24px; margin-bottom:24px; }
  .box { flex:1; background:#F5F5F4; border-radius:8px; padding:12px 16px; }
  .box label { font-size:10px; color:#78716C; text-transform:uppercase; letter-spacing:.04em; }
  .box p { margin:4px 0; }
  table { width:100%; border-collapse:collapse; margin:16px 0 24px; }
  th { background:#F5F5F4; text-align:left; padding:8px 12px; font-size:11px; color:#78716C; }
  td { padding:8px 12px; border-bottom:1px solid #E7E5E4; }
  .right { text-align:right; }
  .totals { margin-left:auto; width:280px; }
  .totals td { border:none; padding:4px 0; }
  .totals .grand { font-size:16px; font-weight:700; border-top:2px solid #1C1917; padding-top:6px; }
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } }, project: { include: { client: true } } },
  });
  if (!inv) return new Response("Not found", { status: 404 });

  const snap = inv.clientSnapshot ? JSON.parse(inv.clientSnapshot) : null;
  const client = snap?.client || {
    name: inv.project.client.name,
    address: inv.project.client.billingAddress || "",
    ico: inv.project.client.companyId || "",
    dic: inv.project.client.vatId || "",
    email: inv.project.client.email || "",
  };
  const vatRate = snap?.vatRate ?? 21;
  const net = inv.items.reduce((s, i) => s + i.total, 0);
  const vat = Math.round(net * (vatRate / 100));
  const total = net + vat;

  const itemRows = inv.items
    .map(
      (i) => `<tr>
        <td>${i.description}</td>
        <td class="right">${i.quantity}</td>
        <td>${i.unit}</td>
        <td class="right">${czk(i.unitPrice)}</td>
        <td class="right">${czk(i.total)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8">
<title>Faktura ${inv.number || ""}</title><style>${pageCss}</style></head><body>
<div class="header">
  <div><h1>FAKTURA ${inv.number || ""}</h1>
  <p class="muted">Zakázka: ${inv.project.jobNumber || ""} - ${inv.project.name}</p></div>
  <div class="muted" style="text-align:right">
    <p>Datum vystavení: <strong>${format(inv.date, "d.M.yyyy", { locale: cs })}</strong></p>
    ${inv.dueDate ? `<p>Splatnost: <strong>${format(inv.dueDate, "d.M.yyyy", { locale: cs })}</strong></p>` : ""}
  </div>
</div>
<div class="grid">
  <div class="box"><label>Dodavatel</label>
    <p><strong>${COMPANY.name}</strong></p>
    <p>${COMPANY.address}</p>
    <p>IČ: ${COMPANY.ico} | DIČ: ${COMPANY.dic}</p>
    <p>${COMPANY.email}</p>
  </div>
  <div class="box"><label>Odběratel</label>
    <p><strong>${client.name}</strong></p>
    <p>${client.address || ""}</p>
    <p>IČ: ${client.ico || "-"} | DIČ: ${client.dic || "-"}</p>
    <p>${client.email || ""}</p>
  </div>
  <div class="box"><label>Bankovní spojení</label>
    <p>Č. účtu: <strong>${COMPANY.bank}</strong></p>
    <p>IBAN: ${COMPANY.iban}</p>
    <p>VS: ${(inv.number || "").replace(/\D/g, "") || "-"}</p>
  </div>
</div>
<table>
  <thead><tr><th>Položka</th><th class="right">Množství</th><th>MJ</th><th class="right">Cena/MJ</th><th class="right">Celkem</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>
<table class="totals">
  <tr><td>Bez DPH</td><td class="right">${czk(net)}</td></tr>
  <tr><td>DPH ${vatRate} %</td><td class="right">${czk(vat)}</td></tr>
  <tr class="grand"><td>Celkem k úhradě</td><td class="right">${czk(total)}</td></tr>
</table>
${inv.note ? `<p class="muted" style="margin-top:24px">${inv.note}</p>` : ""}
<script>window.onload = () => window.print();</script>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
