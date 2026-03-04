import { z } from 'zod';

export const userSchema = z.object({
    id: z.string(),
    username: z.string().min(3).max(20),
    email: z.string().email(),
    passwordHash: z.string(),
    preferredLanguage: z.enum(["fr", "en"]).default("en"),
    theme: z.enum(["dark", "light"]).default("dark"),
    activeAccountId: z.string().nullable(),
    createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const tradingAccountSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    initialCapital: z.number(),
    currentBalance: z.number(),
    currency: z.enum(["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"]),
    type: z.enum(["Demo", "Real", "Propfirm", "Funded"]),
    broker: z.string(),
    metaapiAccountId: z.string().optional().nullable(),
    connectionMethod: z.enum(["metaapi", "mql5"]).default("mql5"),
    createdAt: z.string(),
});

export type TradingAccount = z.infer<typeof tradingAccountSchema>;

export const userGoalsSchema = z.object({
    accountId: z.string(),
    monthlyPnlTarget: z.number().nullable(),
    maxDailyLoss: z.number().nullable(),
    maxDailyTrades: z.number().nullable(),
    minRR: z.number().nullable(),
    weeklyReviewDay: z.enum(["Monday", "Friday", "Sunday"]).nullable(),
});

export type UserGoals = z.infer<typeof userGoalsSchema>;

export const tradingPlanChecklistSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    items: z.array(z.object({
        id: z.string(),
        label: z.string(),
        category: z.string(),
        isActive: z.boolean(),
        order: z.number()
    })),
    updatedAt: z.string(),
});

export type TradingPlanChecklist = z.infer<typeof tradingPlanChecklistSchema>;

// Adding this to existing tradeSchema logic if needed, but since it's already there we're good.
