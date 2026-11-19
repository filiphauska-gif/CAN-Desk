"""Analyze parsed emails: matching to projects + follow-up candidates."""
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

emails = json.loads(Path("scripts/emails.json").read_text(encoding="utf-8"))
projects = json.loads(Path("scripts/projects.json").read_text(encoding="utf-8"))

OUR_DOMAIN = "canagency.cz"

# --- rough client domain map derived from data ---
DOMAIN_CLIENT = {
    "mercedes-benz.com": "Mercedes-Benz",
    "mercedes-benz.cz": "Mercedes-Benz",
    "daimlertruck.com": "Daimler Truck",
    "daimler.com": "Daimler",
    "sagapraha.cz": "SAGA PRAHA",
    "madeta.cz": "LOCOMOTION",
    "brandcomm.agency": "Brandcomm",
    "arkady.cz": "Arkády",
    "wtt.cz": "WTT",
    "commode.cz": "Commode",
    "dhl.com": "DHL",
}


def parse_dt(s):
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


def job_match(text):
    m = re.search(r"job[-\s]?0*(\d{4,5})", text, re.I)
    if not m:
        return None
    want = f"job-{m.group(1).zfill(5)}".lower()
    for p in projects:
        if (p["jobNumber"] or "").lower() == want:
            return p
    return None


def keyword_match(text, client=None):
    text_l = text.lower()
    pool = [p for p in projects if not client or client.lower() in (p["client"] or "").lower()]
    best, score = None, 0
    for p in pool:
        words = [w for w in re.findall(r"[a-z0-9á-ž]{4,}", p["name"].lower()) if w not in ("2026", "pro", "praha")]
        hits = sum(1 for w in words if w in text_l)
        if hits > score:
            best, score = p, hits
    return (best, score) if best and score > 0 else (None, 0)


def client_from_sender(addr):
    dom = addr.split("@")[-1] if "@" in addr else ""
    for d, name in DOMAIN_CLIENT.items():
        if dom.endswith(d):
            return name
    return None


stats = Counter()
examples = []
per_client = Counter()

for e in emails:
    if not e["date"]:
        continue
    h = job_match(e["subject"]) or job_match(e["body"][:1500])
    if h:
        stats["job_number"] += 1
        per_client[h["client"]] += 1
        continue
    cname = client_from_sender(e["from_addr"])
    if cname:
        cands = [p for p in projects if cname.lower() in (p["client"] or "").lower()]
        if len(cands) == 1:
            stats["sender_one_project"] += 1
            per_client[cands[0]["client"]] += 1
            continue
        if len(cands) > 1:
            p, sc = keyword_match(e["subject"] + " " + e["body"][:1500], cname)
            if p and sc > 0:
                stats["sender_keywords"] += 1
                per_client[p["client"]] += 1
                continue
            stats["sender_multi_ambig"] += 1
            per_client[cands[0]["client"]] += 1
            continue
    if e["from_addr"].endswith(OUR_DOMAIN):
        stats["our_outgoing"] += 1
        continue
    p, sc = keyword_match(e["subject"] + " " + e["body"][:1500])
    if p and sc >= 2:
        stats["keyword_only"] += 1
        per_client[p["client"]] += 1
        continue
    stats["unmatched"] += 1

print("=== MATCHING ===")
for k, v in stats.most_common():
    print(f"{k:24s} {v:4d}")
print("per client:", per_client.most_common(10))

# --- threads ---
threads = defaultdict(list)
for e in emails:
    if not e["date"]:
        continue
    key = re.sub(r"^(re|fw|fwd|aw|sv|odp)\s*:\s*", "", (e["subject"] or "").lower(), flags=re.I).strip()
    threads[key].append(e)

now = datetime.now(timezone.utc)


def days(dt):
    return (now - dt.astimezone(timezone.utc)).days


awaiting_reply = []  # last msg inbound from client, no reply
awaiting_client = []  # last msg outbound from us, client silent

for key, msgs in threads.items():
    msgs.sort(key=lambda m: m["date"])
    last = msgs[-1]
    if not key:
        continue
    if not last["from_addr"].endswith(OUR_DOMAIN) and days(parse_dt(last["date"])) >= 2:
        awaiting_reply.append((days(parse_dt(last["date"])), last["from_addr"], last["subject"]))
    if last["from_addr"].endswith(OUR_DOMAIN) and days(parse_dt(last["date"])) >= 4:
        outbound_count = sum(1 for m in msgs if m["from_addr"].endswith(OUR_DOMAIN))
        if outbound_count >= 2 or len(msgs) >= 2:
            awaiting_client.append((days(parse_dt(last["date"])), last["subject"], len(msgs)))

print("\n=== FOLLOW-UP ===")
print("threads:", len(threads))
print("cekaji na nasi odpoved (>=2 dny):", len(awaiting_reply))
for d, frm, subj in sorted(awaiting_reply, reverse=True)[:8]:
    print(f"  {d:3d}d  {frm[:38]:38s} {subj[:56]}")
print("cekaji na klienta (>=4 dny):", len(awaiting_client))
for d, subj, n in sorted(awaiting_client, reverse=True)[:8]:
    print(f"  {d:3d}d  ({n} zprav) {subj[:60]}")
