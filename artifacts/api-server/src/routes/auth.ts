import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken, requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body as { email: string; password: string; name: string };

  if (!email || !password || !name) {
    res.status(400).json({ error: "Email, password and name are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    name: name.trim(),
  }).returning();

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
  });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
  });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const authReq = req as AuthRequest;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authReq.user.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
});

export default router;
