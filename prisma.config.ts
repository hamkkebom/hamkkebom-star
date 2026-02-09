import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js uses .env.local, load it explicitly
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct connection (port 5432) for Prisma CLI (migrate, introspect)
    // Runtime uses DATABASE_URL (Supavisor pooler, port 6543) via PrismaPg adapter
    url: env("DIRECT_URL"),
  },
});
