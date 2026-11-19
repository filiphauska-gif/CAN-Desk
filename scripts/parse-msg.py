"""Parse all .msg files from the user's exported mailbox into a compact JSON dataset."""
import json
import re
from pathlib import Path

import extract_msg

SRC = Path.home() / "OneDrive - COMTECH CAN s.r.o" / "Plocha" / "emaily"
OUT = Path("scripts/emails.json")

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean(text: str | None) -> str:
    if not text:
        return ""
    t = TAG_RE.sub(" ", text)
    t = (
        t.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
    )
    return WS_RE.sub(" ", t).strip()


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
print("threaded (in-reply-to or subject re:):", sum(1 for r in rows if r["in_reply_to"] or r["subject"].lower().startswith(("re:", "fw:", "aw:"))))
from collections import Counter

domains = Counter(r["from_addr"].split("@")[-1] for r in rows if "@" in r["from_addr"])
print("top sender domains:", domains.most_common(8))
