import { Router } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

const DEFAULT_CATEGORIES = [
  { name: "Food & Mess", icon: "utensils", color: "#F97316" },
  { name: "Transport", icon: "train", color: "#3B82F6" },
  { name: "Entertainment", icon: "film", color: "#A855F7" },
  { name: "Shopping", icon: "shopping-bag", color: "#EC4899" },
  { name: "Education", icon: "book-open", color: "#10B981" },
  { name: "Society Fees", icon: "users", color: "#6366F1" },
  { name: "Rent", icon: "home", color: "#F59E0B" },
  { name: "Health", icon: "heart", color: "#EF4444" },
  { name: "UPI Transfer", icon: "smartphone", color: "#14B8A6" },
  { name: "Salary", icon: "briefcase", color: "#22C55E" },
  { name: "Pocket Money", icon: "gift", color: "#8B5CF6" },
  { name: "Freelance", icon: "code", color: "#06B6D4" },
  { name: "Subscriptions", icon: "repeat", color: "#F43F5E" },
  { name: "Other", icon: "tag", color: "#6B7280" },
];

async function seedDefaultCategories(userId: number) {
  const existing = await db.select().from(categoriesTable).where(isNull(categoriesTable.userId)).limit(1);
  if (existing.length > 0) return;

  await db.insert(categoriesTable).values(
    DEFAULT_CATEGORIES.map(c => ({
      userId: null,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: true,
    }))
  ).onConflictDoNothing();
}

router.get("/categories", async (req, res) => {
  const authReq = req as AuthRequest;
  await seedDefaultCategories(authReq.user.userId);

  const rows = await db.select().from(categoriesTable).where(
    or(isNull(categoriesTable.userId), eq(categoriesTable.userId, authReq.user.userId))
  );

  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    isDefault: r.isDefault,
  })));
});

router.post("/categories", async (req, res) => {
  const authReq = req as AuthRequest;
  const { name, icon = "tag", color = "#6B7280" } = req.body as { name: string; icon?: string; color?: string };

  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const existing = await db.select().from(categoriesTable).where(
    and(
      eq(categoriesTable.name, name),
      or(isNull(categoriesTable.userId), eq(categoriesTable.userId, authReq.user.userId))
    )
  ).limit(1);

  if (existing.length > 0) { res.status(409).json({ error: "Category already exists" }); return; }

  const [row] = await db.insert(categoriesTable).values({
    userId: authReq.user.userId,
    name: name.trim(),
    icon,
    color,
    isDefault: false,
  }).returning();

  res.status(201).json({ id: row.id, name: row.name, icon: row.icon, color: row.color, isDefault: row.isDefault });
});

router.delete("/categories/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const id = Number(req.params["id"]);

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  if (cat.isDefault) { res.status(403).json({ error: "Cannot delete default categories" }); return; }
  if (cat.userId !== authReq.user.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

export default router;
