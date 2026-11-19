"""Parse all .msg files from the user's exported mailbox into a compact JSON dataset."""
import json
import re
from pathlib import Path

import extract_msg

SRC = Path.home() / "OneDrive - COMTECH CAN s.r.o" / "Plocha" / "emaily"
OUT = Path("scripts/emails.json")

TAG_RE = re.compile(r"<[^>]+>")


def clean(text: str | None) -> str:
    if not text:
        return ""
    t = re.sub(r"<(br|/p|/div|/tr|/li|/h[1-6])[^>]*>", "\n", text, flags=re.I)
    t = TAG_RE.sub(" ", t)
    t = (
        t.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
    )
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def norm(addr: str | None) -> str:
    if not addr:
        return ""
    m = re.search(r"[\w.+-]+@[\w.-]+", addr)
    return m.group(0).lower() if m else addr.strip().lower()


rows = []
errors = 0
for path in sorted(SRC.glob("*.msg")):
    try:
        m = extract_msg.Message(str(path))
        headers = {}
        try:
            headers = {k.lower(): v for k, v in m.header.items()}
        except Exception:
            headers = {}
        body = m.body or ""
        if not body and m.htmlBody:
            html = m.htmlBody.decode("utf-8", "ignore") if isinstance(m.htmlBody, bytes) else str(m.htmlBody)
            body = html
        rows.append(
            {
                "file": path.name,
                "date": m.date.isoformat() if m.date else None,
                "from_addr": norm(m.sender),
                "from_name": clean(m.sender).split("<")[0].strip(' "'),
                "to": clean(m.to) if m.to else "",
                "cc": clean(m.cc) if m.cc else "",
                "subject": m.subject or "",
                "message_id": (headers.get("message-id") or "").strip(),
                "in_reply_to": (headers.get("in-reply-to") or "").strip(),
                "references": (headers.get("references") or "").strip(),
                "body": clean(str(body))[:8000],
                "attachments": len(m.attachments or []),
                "size": path.stat().st_size,
            }
        )
        m.close()
    except Exception as e:  # noqa: BLE001
        errors += 1
        print("skip", path.name, str(e)[:60])

OUT.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")

dated = [r for r in rows if r["date"]]
print(f"parsed: {len(rows)} / errors: {errors}")
print("date range:", min(r["date"] for r in dated)[:10], "->", max(r["date"] for r in dated)[:10])
print("with JOB number in subject:", sum(1 for r in rows if re.search(r"job[-\s]?\d{4,5}", r["subject"], re.I)))
from collections import Counter

domains = Counter(r["from_addr"].split("@")[-1] for r in rows if "@" in r["from_addr"])
print("top sender domains:", domains.most_common(5))
