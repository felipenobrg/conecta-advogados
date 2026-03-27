import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
        throw new Error("DATABASE_URL nao configurada.");
      },
    }
  ) as PrismaClient);

if (process.env.NODE_ENV !== "production" && prismaClient) {
  global.prisma = prismaClient;
}
