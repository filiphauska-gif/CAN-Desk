import re

IDX = {
    "Project": ["clientId", "status"],
    "Task": ["projectId", "status"],
    "TimeEntry": ["projectId", "userId"],
    "BudgetDocument": ["projectId", "clientId"],
    "BudgetLine": ["budgetDocumentId"],
    "Invoice": ["projectId"],
    "Order": ["projectId"],
    "Cost": ["projectId"],
    "Comment": ["projectId"],
    "Attachment": ["projectId", "taskId"],
    "TaskAssignment": ["taskId", "userId"],
}

for path in ("prisma/schema.prisma", "prisma/postgres-schema.prisma"):
    src = open(path, encoding="utf-8").read()
    for model, fields in IDX.items():
        m = re.search(r"model %s \{\n(.*?)\n\}" % model, src, re.S)
        if not m:
            print("missing model", model)
            continue
        body = m.group(1)
        if "@@index" in body:
            continue
        add = "".join("\n  @@index([%s])" % f for f in fields)
        new = "model %s {\n%s%s\n}" % (model, body, add)
        src = src.replace(m.group(0), new, 1)
    open(path, "w", encoding="utf-8").write(src)
    print("patched", path)
