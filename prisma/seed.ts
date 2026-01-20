import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default admin user
  const adminPassword = await hash("admin123", 12);
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: adminPassword,
        name: "Administrator",
        isAdmin: true,
      },
    });
    console.log("Created admin user (username: admin, password: admin123)");
  }

  // Create default categories
  const categories = [
    { name: "Turmeric Purchase", icon: "package", color: "#f59e0b" },
    { name: "Turmeric Sale", icon: "truck", color: "#10b981" },
    { name: "Processing Cost", icon: "cog", color: "#6366f1" },
    { name: "Transport", icon: "truck", color: "#8b5cf6" },
    { name: "Labour", icon: "users", color: "#ec4899" },
    { name: "Loan Disbursement", icon: "banknote", color: "#f97316" },
    { name: "Loan Repayment", icon: "credit-card", color: "#14b8a6" },
    { name: "Interest Received", icon: "trending-up", color: "#22c55e" },
    { name: "Interest Paid", icon: "trending-down", color: "#ef4444" },
    { name: "Other Expense", icon: "receipt", color: "#64748b" },
    { name: "Other Income", icon: "wallet", color: "#0ea5e9" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { ...cat, isDefault: true },
    });
  }

  // Create default accounts
  const accounts = [
    {
      name: "Cash",
      type: "CASH" as const,
      description: "Cash in hand",
      currentBalance: 0,
    },
    {
      name: "HDFC Bank",
      type: "BANK" as const,
      description: "HDFC Current Account",
      currentBalance: 0,
    },
    {
      name: "SBI Bank",
      type: "BANK" as const,
      description: "SBI Savings Account",
      currentBalance: 0,
    },
  ];

  for (const account of accounts) {
    const existing = await prisma.account.findFirst({
      where: { name: account.name },
    });
    if (!existing) {
      await prisma.account.create({ data: account });
    }
  }

  // Create sample parties (typical for turmeric business)
  const parties = [
    {
      name: "Priya Exports",
      type: "VENDOR" as const,
      phone: "9876543210",
      notes: "Major buyer - takes 22 ton shipments",
    },
    {
      name: "Ramesh (Farmer)",
      type: "CUSTOMER" as const,
      phone: "9123456789",
      notes: "Regular turmeric supplier from Erode",
    },
    {
      name: "Suresh (Farmer)",
      type: "CUSTOMER" as const,
      phone: "9234567890",
      notes: "Supplies maize and turmeric",
    },
    {
      name: "Krishna Traders",
      type: "VENDOR" as const,
      phone: "9345678901",
      notes: "Buys powder in bulk",
    },
  ];

  for (const party of parties) {
    const existing = await prisma.party.findFirst({
      where: { name: party.name },
    });
    if (!existing) {
      await prisma.party.create({ data: party });
    }
  }

  // Create initial stock items
  const stocks = [
    {
      commodityType: "TURMERIC_RAW" as const,
      name: "Turmeric Finger (Raw)",
      quantity: 0,
      unit: "KG",
      location: "Godown 1",
    },
    {
      commodityType: "TURMERIC_POWDER" as const,
      name: "Turmeric Powder (Grade A)",
      quantity: 0,
      unit: "KG",
      location: "Godown 1",
    },
    {
      commodityType: "TURMERIC_POWDER" as const,
      name: "Turmeric Powder (Grade B)",
      quantity: 0,
      unit: "KG",
      location: "Godown 1",
    },
    {
      commodityType: "MAIZE" as const,
      name: "Maize",
      quantity: 0,
      unit: "KG",
      location: "Godown 2",
    },
  ];

  for (const stock of stocks) {
    const existing = await prisma.stock.findFirst({
      where: {
        name: stock.name,
        commodityType: stock.commodityType,
        location: stock.location,
      },
    });
    if (!existing) {
      await prisma.stock.create({ data: stock });
    }
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
