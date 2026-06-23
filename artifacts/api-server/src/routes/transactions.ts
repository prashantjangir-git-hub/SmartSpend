import { Router } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/transactions", async (req, res) => {
  const authReq = req as AuthRequest;
  const { month, category, type, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const conditions = [eq(transactionsTable.userId, authReq.user.userId)];

  if (month) {
    const [year, mon] = month.split("-");
    const start = `${year}-${mon}-01`;
    const endDate = new Date(Number(year), Number(mon), 0);
    const end = `${year}-${mon}-${String(endDate.getDate()).padStart(2, "0")}`;
    conditions.push(gte(transactionsTable.date, start));
    conditions.push(lte(transactionsTable.date, end));
  }

  if (category) conditions.push(eq(transactionsTable.category, category));
  if (type) conditions.push(eq(transactionsTable.type, type as "income" | "expense"));

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  res.json(rows.map(formatTx));
});

router.post("/transactions", async (req, res) => {
  const authReq = req as AuthRequest;
  const { amount, type, category, note, date, isRecurring, recurringPeriod } = req.body;

  if (!amount || !type || !category || !date) {
    res.status(400).json({ error: "amount, type, category, and date are required" });
    return;
  }

  const [row] = await db.insert(transactionsTable).values({
    userId: authReq.user.userId,
    amount: String(amount),
    type,
    category,
    note: note ?? null,
    date,
    isRecurring: isRecurring ?? false,
    recurringPeriod: recurringPeriod ?? null,
  }).returning();

  res.status(201).json(formatTx(row));
});

router.get("/transactions/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const id = Number(req.params["id"]);
  const [row] = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.id, id), eq(transactionsTable.userId, authReq.user.userId))
  ).limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatTx(row));
});

router.patch("/transactions/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const id = Number(req.params["id"]);
  const { amount, type, category, note, date, isRecurring, recurringPeriod } = req.body;

  const updates: Record<string, unknown> = {};
  if (amount !== undefined) updates["amount"] = String(amount);
  if (type !== undefined) updates["type"] = type;
  if (category !== undefined) updates["category"] = category;
  if (note !== undefined) updates["note"] = note;
  if (date !== undefined) updates["date"] = date;
  if (isRecurring !== undefined) updates["isRecurring"] = isRecurring;
  if (recurringPeriod !== undefined) updates["recurringPeriod"] = recurringPeriod;

  const [row] = await db.update(transactionsTable)
    .set(updates)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, authReq.user.userId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatTx(row));
});

router.delete("/transactions/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const id = Number(req.params["id"]);
  const deleted = await db.delete(transactionsTable)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, authReq.user.userId)))
    .returning();

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

function formatTx(row: typeof transactionsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    note: row.note ?? null,
    date: row.date,
    isRecurring: row.isRecurring,
    recurringPeriod: row.recurringPeriod ?? null,
    createdAt: row.createdAt,
  };
}

export default router;
