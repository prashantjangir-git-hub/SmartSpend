import { Router } from "express";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { isNull, or } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month: string) {
  const [year, mon] = month.split("-");
  const start = `${year}-${mon}-01`;
  const endDate = new Date(Number(year), Number(mon), 0);
  const end = `${year}-${mon}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

router.get("/analytics/summary", async (req, res) => {
  const authReq = req as AuthRequest;
  const month = (req.query["month"] as string) || getCurrentMonth();
  const { start, end } = getMonthRange(month);

  const txns = await db.select().from(transactionsTable).where(
    and(
      eq(transactionsTable.userId, authReq.user.userId),
      gte(transactionsTable.date, start),
      lte(transactionsTable.date, end)
    )
  );

  const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  const catMap = new Map<string, number>();
  for (const t of txns.filter(t => t.type === "expense")) {
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
  }

  const categories = await db.select().from(categoriesTable).where(
    or(isNull(categoriesTable.userId), eq(categoriesTable.userId, authReq.user.userId))
  );
  const catInfo = new Map(categories.map(c => [c.name, { icon: c.icon, color: c.color }]));

  const topCategories = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      count: txns.filter(t => t.category === cat).length,
      icon: catInfo.get(cat)?.icon ?? "tag",
      color: catInfo.get(cat)?.color ?? "#6B7280",
    }));

  res.json({ totalIncome, totalExpense, savings, savingsRate, month, transactionCount: txns.length, topCategories });
});

router.get("/analytics/monthly", async (req, res) => {
  const authReq = req as AuthRequest;
  const months = Math.min(Number(req.query["months"] ?? 6), 12);

  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const { start, end } = getMonthRange(month);

    const txns = await db.select().from(transactionsTable).where(
      and(
        eq(transactionsTable.userId, authReq.user.userId),
        gte(transactionsTable.date, start),
        lte(transactionsTable.date, end)
      )
    );

    const income = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    result.push({ month, income, expense, savings: income - expense });
  }

  res.json(result);
});

router.get("/analytics/categories", async (req, res) => {
  const authReq = req as AuthRequest;
  const month = (req.query["month"] as string) || getCurrentMonth();
  const { start, end } = getMonthRange(month);

  const txns = await db.select().from(transactionsTable).where(
    and(
      eq(transactionsTable.userId, authReq.user.userId),
      eq(transactionsTable.type, "expense"),
      gte(transactionsTable.date, start),
      lte(transactionsTable.date, end)
    )
  );

  const categories = await db.select().from(categoriesTable).where(
    or(isNull(categoriesTable.userId), eq(categoriesTable.userId, authReq.user.userId))
  );
  const catInfo = new Map(categories.map(c => [c.name, { icon: c.icon, color: c.color }]));

  const catMap = new Map<string, { amount: number; count: number }>();
  for (const t of txns) {
    const prev = catMap.get(t.category) ?? { amount: 0, count: 0 };
    catMap.set(t.category, { amount: prev.amount + Number(t.amount), count: prev.count + 1 });
  }

  const totalExpense = txns.reduce((s, t) => s + Number(t.amount), 0);

  const result = Array.from(catMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([cat, { amount, count }]) => ({
      category: cat,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      count,
      icon: catInfo.get(cat)?.icon ?? "tag",
      color: catInfo.get(cat)?.color ?? "#6B7280",
    }));

  res.json(result);
});

export default router;
