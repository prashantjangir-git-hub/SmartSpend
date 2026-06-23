import { boolean, date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  category: text("category").notNull(),
  note: text("note"),
  date: date("date", { mode: "string" }).notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPeriod: text("recurring_period", { enum: ["daily", "weekly", "monthly"] }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
