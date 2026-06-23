import { Router } from "express";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, budgetsTable, transactionsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/budgets", async (req, res) => {
  const authReq = req as AuthRequest;
  const { month = getCurrentMonth() } = req.query as Record<string, string>;

  const budgets = await db.select().from(budgetsTable).where(
    and(eq(budgetsTable.userId, authReq.user.userId), eq(budgetsTable.month, month))
  );

  const [year, mon] = month.split("-");
  const start = `${year}-${mon}-01`;
  const endDate = new Date(Number(year), Number(mon), 0);
  const end = `${year}-${mon}-${String(endDate.getDate()).padStart(2, "0")}`;

  const spending = await db
    .select({
      category: transactionsTable.category,
      total: sql<string>`COALESCE(SUM(${transactionsTable.amount}::numeric), 0)`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, authReq.user.userId),
        eq(transactionsTable.type, "expense"),
        gte(transactionsTable.date, start),
        lte(transactionsTable.date, end)
      )
    )
    .groupBy(transactionsTable.category);

  const spendMap = new Map(spending.map(s => [s.category, Number(s.total)]));

  const result = budgets.map(b => {
    const spent = spendMap.get(b.category) ?? 0;
    const amount = Number(b.amount);
    return {
      id: b.id,
      userId: b.userId,
      category: b.category,
      amount,
      month: b.month,
      spent,
      percentage: amount > 0 ? Math.round((spent / amount) * 100) : 0,
      createdAt: b.createdAt,
    };
  });

  res.json(result);
});

router.post("/budgets", async (req, res) => {
  const authReq = req as AuthRequest;
  const { category, amount, month } = req.body as { category: string; amount: number; month: string };

  if (!category || !amount || !month) {
    res.status(400).json({ error: "category, amount, and month are required" });
    return;
  }

  const existing = await db.select().from(budgetsTable).where(
    and(
      eq(budgetsTable.userId, authReq.user.userId),
      eq(budgetsTable.category, category),
      eq(budgetsTable.month, month)
    )
  ).limit(1);

  if (existing.length > 0) {
    const [row] = await db.update(budgetsTable)
      .set({ amount: String(amount) })
      .where(eq(budgetsTable.id, existing[0].id))
      .returning();
    res.status(201).json(formatBudget(row));
    return;
  }

  const [row] = await db.insert(budgetsTable).values({
    userId: authReq.user.userId,
    category,
    amount: String(amount),
    month,
  }).returning();

  res.status(201).json(formatBudget(row));
});

router.patch("/budgets/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const id = Number(req.params["id"]);
  const { amount } = req.body as { amount?: number };

  const updates: Record<string, unknown> = {};
  if (amount !== undefined) updates["amount"] = String(amount);

  const [row] = await db.update(budgetsTable)
    .set(updates)
    .where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, authReq.user.userId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatBudget(row));
});

router.delete("/budgets/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const id = Number(req.params["id"]);
  const deleted = await db.delete(budgetsTable)
    .where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, authReq.user.userId)))
    .returning();

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatBudget(row: typeof budgetsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    amount: Number(row.amount),
    month: row.month,
    createdAt: row.createdAt,
  };
}

export default router;
