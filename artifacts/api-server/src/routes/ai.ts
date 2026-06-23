import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, transactionsTable, categoriesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { isNull, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireAuth);

const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];

function getAI() {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

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

const CATEGORIES = [
  "Food & Mess", "Transport", "Entertainment", "Shopping", "Education",
  "Society Fees", "Rent", "Health", "UPI Transfer", "Salary",
  "Pocket Money", "Freelance", "Subscriptions", "Other"
];

router.post("/ai/categorize", async (req, res) => {
  const { description, amount } = req.body as { description: string; amount?: number };

  if (!description) { res.status(400).json({ error: "description is required" }); return; }

  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a financial transaction categorizer for Indian college students.
Categorize this transaction into exactly one of these categories:
${CATEGORIES.join(", ")}

Transaction: "${description}"${amount ? ` for ₹${amount}` : ""}

Consider Indian college student context: mess food, canteen, auto/bus/metro, OTT subscriptions, hostel fees, society events, etc.

Respond with ONLY valid JSON in this exact format:
{"category": "<category name>", "confidence": <0.0-1.0>, "reasoning": "<brief reason>"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response");

    const parsed = JSON.parse(jsonMatch[0]) as { category: string; confidence: number; reasoning: string };

    if (!CATEGORIES.includes(parsed.category)) {
      parsed.category = "Other";
      parsed.confidence = 0.5;
    }

    res.json(parsed);
  } catch (err) {
    logger.error({ err }, "AI categorize error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/ai/query", async (req, res) => {
  const authReq = req as AuthRequest;
  const { query, month } = req.body as { query: string; month?: string };

  if (!query) { res.status(400).json({ error: "query is required" }); return; }

  try {
    const targetMonth = month || getCurrentMonth();
    const { start, end } = getMonthRange(targetMonth);

    const txns = await db.select().from(transactionsTable).where(
      and(
        eq(transactionsTable.userId, authReq.user.userId),
        gte(transactionsTable.date, start),
        lte(transactionsTable.date, end)
      )
    );

    const allMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      allMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const allTxns = await db.select().from(transactionsTable).where(
      and(
        eq(transactionsTable.userId, authReq.user.userId),
        gte(transactionsTable.date, `${allMonths[0]}-01`),
        lte(transactionsTable.date, end)
      )
    );

    const summary = {
      currentMonth: targetMonth,
      totalIncome: txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      totalExpense: txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      transactionCount: txns.length,
      categoryBreakdown: {} as Record<string, number>,
      recentTransactions: txns.slice(0, 10).map(t => ({
        amount: Number(t.amount),
        type: t.type,
        category: t.category,
        note: t.note,
        date: t.date,
      })),
    };

    for (const t of txns.filter(t => t.type === "expense")) {
      summary.categoryBreakdown[t.category] = (summary.categoryBreakdown[t.category] ?? 0) + Number(t.amount);
    }

    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a personal finance assistant for an Indian college student using SmartSpend.
Here is their financial data for ${targetMonth}:
${JSON.stringify(summary, null, 2)}

Answer this question concisely and helpfully (2-4 sentences max, use ₹ for amounts):
"${query}"

Be specific with numbers. Give actionable advice if relevant. Be friendly and encouraging.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    res.json({ answer, dataUsed: `${txns.length} transactions from ${targetMonth}` });
  } catch (err) {
    logger.error({ err }, "AI query error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.get("/ai/summary", async (req, res) => {
  const authReq = req as AuthRequest;
  const month = (req.query["month"] as string) || getCurrentMonth();
  const { start, end } = getMonthRange(month);

  try {
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

    const catBreakdown: Record<string, number> = {};
    for (const t of txns.filter(t => t.type === "expense")) {
      catBreakdown[t.category] = (catBreakdown[t.category] ?? 0) + Number(t.amount);
    }

    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a financial advisor for an Indian college student.
Analyze their ${month} spending:
- Total Income: ₹${totalIncome}
- Total Expense: ₹${totalExpense}  
- Savings: ₹${savings}
- Category breakdown: ${JSON.stringify(catBreakdown)}
- Transaction count: ${txns.length}

Provide:
1. A 2-3 sentence overall summary in a friendly, encouraging tone
2. 3-4 specific actionable insights as bullet points

Format your response as JSON:
{
  "summary": "<2-3 sentence summary>",
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"]
}

Use ₹ for amounts. Be specific and practical for an Indian college student.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response");

    const parsed = JSON.parse(jsonMatch[0]) as { summary: string; insights: string[] };

    res.json({ ...parsed, month, generatedAt: new Date() });
  } catch (err) {
    logger.error({ err }, "AI summary error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

export default router;
