import "dotenv/config";
import { defineConfig } from "prisma/config";

const isPostgres = process.env.DATABASE_URL?.startsWith("postgresql");

export default defineConfig({
  schema: isPostgres ? "prisma/postgres-schema.prisma" : "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] || "file:./prisma/can-desk.db",
  },
});
