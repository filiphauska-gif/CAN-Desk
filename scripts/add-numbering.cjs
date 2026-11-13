/* Add numbering + invoice items + orders to both prisma schemas */
const fs = require("fs");

function patch(file) {
  let c = fs.readFileSync(file, "utf-8");

  // Project: jobNumber + orders relation
  if (!c.includes("jobNumber")) {
    c = c.replace(
      /model Project \{\n/,
      "model Project {\n  jobNumber    String?       @unique\n"
    );
    c = c.replace(
      /  budgetDocuments BudgetDocument\[\]/,
      "  budgetDocuments BudgetDocument[]\n  orders          Order[]"
    );
  }

  // Invoice: extra fields + items
  if (!c.includes("model InvoiceItem")) {
    c = c.replace(
      /model Invoice \{/,
      `model Invoice {
  dueDate        DateTime?
  status         String    @default("VYSTAVENA")
  clientSnapshot String?
  items          InvoiceItem[]`
    );
    c += `
model InvoiceItem {
  id          String  @id @default(cuid())
  invoiceId   String
  invoice     Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description String
  quantity    Float   @default(1)
  unit        String  @default("ks")
  unitPrice   Float   @default(0)
  total       Float   @default(0)
  vatRate     Float   @default(21)
  sortOrder   Int     @default(0)
}

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique
  projectId       String
  project         Project     @relation(fields: [projectId], references: [id])
  supplier        String
  supplierContact String?
  date            DateTime    @default(now())
  dueDate         DateTime?
  status          String      @default("VYSTAVENA")
  note            String?
  items           OrderItem[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  description String
  quantity    Float   @default(1)
  unit        String  @default("ks")
  unitPrice   Float   @default(0)
  total       Float   @default(0)
  sortOrder   Int     @default(0)
}

model Counter {
  key   String @id
  value Int    @default(0)
}
`;
  }

  fs.writeFileSync(file, c);
  console.log("patched", file);
}

patch("prisma/schema.prisma");
patch("prisma/postgres-schema.prisma");
