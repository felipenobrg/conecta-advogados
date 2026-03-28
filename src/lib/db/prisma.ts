import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prismaClient = global.prisma ?? createPrismaClient();

export const prisma =
  prismaClient ??
  (new Proxy(
    {},
    {
      get() {
        throw new Error("DATABASE_URL/SUPABASE_DB_URL nao configurada.");
      },
    }
  ) as PrismaClient);

if (process.env.NODE_ENV !== "production" && prismaClient) {
  global.prisma = prismaClient;
}
