import { PrismaClient, AccountType, CategoryKind, FieldType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFrom(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

async function main() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("ledgerly-demo", 10);
  const user = await prisma.user.create({
    data: {
      email: "demo@ledgerly.app",
      passwordHash,
    },
  });

  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Checking",
      type: AccountType.checking,
    },
  });

  const savings = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Savings",
      type: AccountType.savings,
    },
  });

  const rent = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Rent",
      kind: CategoryKind.expense,
    },
  });

  const groceries = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Groceries",
      kind: CategoryKind.expense,
    },
  });

  const gas = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Gas",
      kind: CategoryKind.expense,
    },
  });

  const dining = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Dining",
      kind: CategoryKind.expense,
    },
  });

  const salary = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Salary",
      kind: CategoryKind.income,
    },
  });

  await prisma.fieldDefinition.create({
    data: {
      userId: user.id,
      name: "Merchant",
      fieldType: FieldType.text,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: salary.id,
        amount: 350000,
        date: daysFrom(monthStart, 0),
        description: "Monthly salary",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: rent.id,
        amount: 140000,
        date: daysFrom(monthStart, 2),
        description: "Rent payment",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: groceries.id,
        amount: 8650,
        date: daysFrom(monthStart, 5),
        description: "Whole Foods",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: gas.id,
        amount: 4200,
        date: daysFrom(monthStart, 8),
        description: "Fuel stop",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: dining.id,
        amount: 3200,
        date: daysFrom(monthStart, 11),
        description: "Dinner with friends",
      },
      {
        userId: user.id,
        accountId: savings.id,
        categoryId: null,
        amount: 50000,
        date: daysFrom(monthStart, 12),
        description: "Transfer to savings",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: salary.id,
        amount: 350000,
        date: daysFrom(lastMonthStart, 0),
        description: "Monthly salary",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: rent.id,
        amount: 140000,
        date: daysFrom(lastMonthStart, 2),
        description: "Rent payment",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: groceries.id,
        amount: 7400,
        date: daysFrom(lastMonthStart, 6),
        description: "Trader Joe's",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: gas.id,
        amount: 3900,
        date: daysFrom(lastMonthStart, 10),
        description: "Gas station",
      },
      {
        userId: user.id,
        accountId: checking.id,
        categoryId: dining.id,
        amount: 2800,
        date: daysFrom(lastMonthStart, 13),
        description: "Cafe brunch",
      },
    ],
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
