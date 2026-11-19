"""Extract project data from the two exported xlsx files into JSON."""
import json
from pathlib import Path

import openpyxl

DOWNLOADS = Path.home() / "Downloads"


def rows(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    header = [c.value for c in ws[1]]
    out = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        out.append(dict(zip(header, row)))
    return out


def num(v):
    if v in (None, ""):
        return 0.0
    return float(v)


projects = {r["Číslo zakázky"]: r for r in rows(DOWNLOADS / "Zakázky 2026-11-19.xlsx")}
report = {r["Číslo"]: r for r in rows(DOWNLOADS / "Report vlastních zakázek 2026-11-19.xlsx")}

merged = []
for job, p in projects.items():
    r = report.get(job, {})
    merged.append(
        {
            "jobNumber": job,
            "name": p["Předmět"],
            "client": p["Klient"],
            "owner": p.get("Vlastník"),
            "volume": p.get("Název svazku"),
            "start": p.get("Počáteční datum"),
            "end": p.get("Koncové datum"),
            "status": p.get("Stav"),
            "revenuePlanned": num(r.get("Tržby rozpočtované")),
            "revenueDirect": num(r.get("Přímé tržby")),
            "costsPlanned": num(r.get("Náklady rozpočtované")),
            "costsDirect": num(r.get("Přímé náklady")),
            "hoursPlanned": num(r.get("Hodiny rozpočtované")),
            "hoursReported": num(r.get("Vykázané hodiny")),
            "laborPlanned": num(r.get("Práce rozpočtovaná")),
            "laborCost": num(r.get("Pracovní náklady")),
        }
    )

# newest first by job number (desc)
merged.sort(key=lambda x: x["jobNumber"], reverse=True)

Path("scripts/import-data.json").write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"projects: {len(merged)}")
print("clients:", sorted({m["client"] for m in merged}))
print("with budget:", sum(1 for m in merged if m["revenuePlanned"] > 0))
print("with direct revenue:", sum(1 for m in merged if m["revenueDirect"] > 0))
print("with direct costs:", sum(1 for m in merged if m["costsDirect"] > 0))
print("dates sample:", merged[0]["start"], type(merged[0]["start"]))
