import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { COMPANY } from "@/lib/company";

const czk = (n: number) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Kč";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } }, project: { include: { client: true } } },
  });
  if (!order) return new Response("Not found", { status: 404 });

  const total = order.items.reduce((s, i) => s + i.total, 0);
  const itemRows = order.items
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
<title>Objednávka ${order.orderNumber}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: 'Helvetica','Arial',sans-serif; color:#1C1917; font-size:12px; line-height:1.5; }
  .header { display:flex; justify-content:space-between; margin-bottom:28px; padding-bottom:16px; border-bottom:2px solid #6366F1; }
  .header h1 { font-size:20px; margin:0; }
  .muted { color:#78716C; }
  .grid { display:flex; gap:24px; margin-bottom:24px; }
  .box { flex:1; background:#F5F5F4; border-radius:8px; padding:12px 16px; }
  .box label { font-size:10px; color:#78716C; text-transform:uppercase; letter-spacing:.04em; }
  .box p { margin:4px 0; }
  table { width:100%; border-collapse:collapse; margin:16px 0 24px; }
  th { background:#F5F5F4; text-align:left; padding:8px 12px; font-size:11px; color:#78716C; }
  td { padding:8px 12px; border-bottom:1px solid #E7E5E4; }
  .right { text-align:right; }
  .totals { margin-left:auto; width:260px; }
  .totals td { border:none; padding:4px 0; }
  .totals .grand { font-size:16px; font-weight:700; border-top:2px solid #1C1917; padding-top:6px; }
</style></head><body>
<div class="header">
  <div><h1>OBJEDNÁVKA ${order.orderNumber}</h1>
  <p class="muted">Zakázka: ${order.project.jobNumber || ""} - ${order.project.name}</p></div>
  <div class="muted" style="text-align:right">
    <p>Datum: <strong>${format(order.date, "d.M.yyyy", { locale: cs })}</strong></p>
    ${order.dueDate ? `<p>Termín dodání: <strong>${format(order.dueDate, "d.M.yyyy", { locale: cs })}</strong></p>` : ""}
  </div>
</div>
<div class="grid">
  <div class="box"><label>Objednatel</label>
    <p><strong>${COMPANY.name}</strong></p>
    <p>${COMPANY.address}</p>
    <p>IČ: ${COMPANY.ico} | DIČ: ${COMPANY.dic}</p>
    <p>${COMPANY.email}</p>
  </div>
  <div class="box"><label>Dodavatel</label>
    <p><strong>${order.supplier}</strong></p>
    ${order.supplierContact ? `<p>${order.supplierContact}</p>` : ""}
  </div>
</div>
<table>
  <thead><tr><th>Položka</th><th class="right">Množství</th><th>MJ</th><th class="right">Cena/MJ</th><th class="right">Celkem</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>
<table class="totals">
  <tr class="grand"><td>Celkem</td><td class="right">${czk(total)}</td></tr>
</table>
${order.note ? `<p class="muted" style="margin-top:24px">${order.note}</p>` : ""}
<script>window.onload = () => window.print();</script>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
