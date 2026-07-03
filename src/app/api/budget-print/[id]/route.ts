import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      account: { select: { name: true } },
      budgetItems: { orderBy: { order: "asc" } },
    },
  });

  if (!project) {
    return new Response("Not found", { status: 404 });
  }

  const revenueItems = project.budgetItems.filter((i) => i.type === "REVENUE");
  const costItems = project.budgetItems.filter((i) => i.type === "COST");
  const totalRevenue = revenueItems.reduce((s, i) => s + i.total, 0);
  const totalCosts = costItems.reduce((s, i) => s + i.total, 0);
  const discount = (totalRevenue * (project.discountPercent || 0)) / 100;
  const netRevenue = totalRevenue - discount;
  const vatRate = project.vatRate || 21;
  const vatAmount = (netRevenue * vatRate) / 100;
  const totalWithVat = netRevenue + vatAmount;
  const margin = netRevenue > 0 ? Math.round(((netRevenue - totalCosts) / netRevenue) * 100) : 0;

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<title>Rozpočet - ${project.name}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1C1917; font-size: 12px; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #6366F1; }
  .header h1 { font-size: 22px; margin: 0; color: #1C1917; }
  .header p { color: #78716C; margin: 4px 0 0; }
  .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .info-box { background: #F5F5F4; padding: 12px 16px; border-radius: 8px; }
  .info-box label { font-size: 10px; color: #78716C; display: block; }
  .info-box value { font-size: 14px; font-weight: 600; display: block; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #F5F5F4; text-align: left; padding: 8px 12px; font-size: 11px; color: #78716C; font-weight: 600; }
  td { padding: 8px 12px; border-bottom: 1px solid #E7E5E4; }
  .revenue { color: #059669; }
  .cost { color: #DC2626; }
  .text-right { text-align: right; }
  .total-row { font-weight: 600; background: #FAF8F5; }
  .summary { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .summary-card { border: 1px solid #E7E5E4; border-radius: 8px; padding: 12px; }
  .summary-card label { font-size: 10px; color: #78716C; }
  .summary-card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .green { color: #059669; }
  .red { color: #DC2626; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #E7E5E4; font-size: 10px; color: #A8A29E; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>Rozpočet: ${project.name}</h1>
    <p>${project.client.name} ${project.account?.name ? "• " + project.account.name : ""}</p>
    <p>Vytvořeno: ${format(new Date(), "d. MMMM yyyy", { locale: cs })}</p>
  </div>

  <div class="info">
    <div class="info-box"><label>Číslo nabídky</label><value>N-${project.id.slice(-6).toUpperCase()}</value></div>
    <div class="info-box"><label>Klient</label><value>${project.client.name}</value></div>
    <div class="info-box"><label>Datum</label><value>${format(new Date(), "d.M.yyyy")}</value></div>
    <div class="info-box"><label>Account</label><value>${project.account?.name || "—"}</value></div>
  </div>

  <h3 style="margin-bottom:8px;">Položky rozpočtu</h3>
  <table>
    <thead>
      <tr>
        <th>Položka</th>
        <th class="text-right">Množství</th>
        <th class="text-right">Cena/jedn.</th>
        <th class="text-right">Celkem</th>
      </tr>
    </thead>
    <tbody>
      ${project.budgetItems.map((item) => `
        <tr class="${item.type === "REVENUE" ? "revenue" : "cost"}">
          <td>${item.name} <span style="font-size:10px;color:#A8A29E;">/${item.unit}</span></td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unitPrice.toLocaleString("cs-CZ")} Kč</td>
          <td class="text-right">${item.total.toLocaleString("cs-CZ")} Kč</td>
        </tr>
      `).join("")}
      ${project.budgetItems.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#A8A29E;">Žádné položky</td></tr>' : ""}
    </tbody>
    ${revenueItems.length > 0 ? `
    <tfoot>
      <tr class="total-row"><td colspan="3">Výnosy celkem (bez DPH)</td><td class="text-right green">${totalRevenue.toLocaleString("cs-CZ")} Kč</td></tr>
      ${discount > 0 ? `<tr class="total-row"><td colspan="3">Sleva (${project.discountPercent}%)</td><td class="text-right red">-${discount.toLocaleString("cs-CZ")} Kč</td></tr>` : ""}
      <tr class="total-row"><td colspan="3">Celkem po slevě</td><td class="text-right">${netRevenue.toLocaleString("cs-CZ")} Kč</td></tr>
      <tr class="total-row"><td colspan="3">DPH (${vatRate}%)</td><td class="text-right">${vatAmount.toLocaleString("cs-CZ")} Kč</td></tr>
      <tr style="font-size:16px;font-weight:700;"><td colspan="3">Celkem s DPH</td><td class="text-right">${totalWithVat.toLocaleString("cs-CZ")} Kč</td></tr>
    </tfoot>
    ` : ""}
  </table>

  <div class="summary">
    <div class="summary-card">
      <label>Výnosy (bez DPH)</label>
      <div class="value green">${totalRevenue.toLocaleString("cs-CZ")} Kč</div>
    </div>
    <div class="summary-card">
      <label>Náklady</label>
      <div class="value red">${totalCosts.toLocaleString("cs-CZ")} Kč</div>
    </div>
    <div class="summary-card">
      <label>Marže</label>
      <div class="value ${margin >= 0 ? "green" : "red"}">${margin}%</div>
    </div>
    <div class="summary-card">
      <label>Celkem s DPH (${vatRate}%)</label>
      <div class="value">${totalWithVat.toLocaleString("cs-CZ")} Kč</div>
    </div>
  </div>

  <div class="footer">
    CAN Desk • Can Agency • Vygenerováno automaticky • ${format(new Date(), "d.M.yyyy HH:mm")}
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
