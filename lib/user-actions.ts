"use server";

import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

const DEFAULT_CATEGORIES = [
  { name: "Turmeric Purchase", icon: "🌿", color: "#F59E0B" },
  { name: "Turmeric Sale", icon: "💰", color: "#10B981" },
  { name: "Maize Purchase", icon: "🌽", color: "#F59E0B" },
  { name: "Maize Sale", icon: "💰", color: "#10B981" },
  { name: "Transport", icon: "🚛", color: "#6366F1" },
  { name: "Labour", icon: "👷", color: "#8B5CF6" },
  { name: "Loan Repayment", icon: "💳", color: "#EF4444" },
  { name: "Interest Payment", icon: "📊", color: "#EC4899" },
  { name: "Processing", icon: "⚙️", color: "#14B8A6" },
  { name: "Storage", icon: "🏠", color: "#64748B" },
  { name: "Other Income", icon: "📈", color: "#22C55E" },
  { name: "Other Expense", icon: "📉", color: "#EF4444" },
];

interface CreateUserInput {
  username: string;
  password: string;
  name: string;
}

export async function createUser(input: CreateUserInput) {
  const { username, password, name } = input;

  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new Error("Username already exists");
  }

  // Validate password
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Hash password
  const passwordHash = await hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      name,
    },
  });

  // Create default categories for the user
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
      userId: user.id,
    })),
  });

  // Create a default cash account for the user
  await prisma.account.create({
    data: {
      name: "Cash",
      type: "CASH",
      currentBalance: 0,
      description: "Default cash account",
      userId: user.id,
    },
  });

  return {
    id: user.id,
    username: user.username,
    name: user.name,
  };
}

export async function checkUsernameAvailable(username: string) {
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  return !existingUser;
}
