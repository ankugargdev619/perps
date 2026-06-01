import { MARKET_SEEDS } from "./seed-data/markets";
import { Prisma, PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter })


async function main() {
  for (const m of MARKET_SEEDS) {
    await prisma.market.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        baseAsset: m.baseAsset,
        quoteAsset: m.quoteAsset,
        tickSize: new Prisma.Decimal(m.tickSize),
        lotSize: new Prisma.Decimal(m.lotSize),
        maxLeverage: m.maxLeverage,
        initialMargin: new Prisma.Decimal(m.initialMargin),
        maintenanceMargin: new Prisma.Decimal(m.maintenanceMargin),
        fundingInterval: m.fundingInterval,
        isActive: m.isActive,
      },
      update: {
        baseAsset: m.baseAsset,
        quoteAsset: m.quoteAsset,
        tickSize: new Prisma.Decimal(m.tickSize),
        lotSize: new Prisma.Decimal(m.lotSize),
        maxLeverage: m.maxLeverage,
        initialMargin: new Prisma.Decimal(m.initialMargin),
        maintenanceMargin: new Prisma.Decimal(m.maintenanceMargin),
        fundingInterval: m.fundingInterval,
        isActive: m.isActive,
      },
    });
    console.log(`Seeded market : ${m.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit();
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
