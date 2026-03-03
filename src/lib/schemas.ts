import { z } from 'zod';

export const tradeSchema = z.object({
    id: z.string().optional(),
    accountId: z.string(),
    pair: z.string().min(1, "Pair is required"),
    position: z.enum(["BUY", "SELL"]),
    entryPrice: z.number().min(0),
    exitPrice: z.number().nullable(),
    lotSize: z.number().min(0),
    stopLoss: z.number().nullable(),
    takeProfit: z.number().nullable(),
    timeframe: z.string(),
    session: z.enum(["Asia", "London", "New York", "Overlap", "Off Session"]),
    strategy: z.string(),
    confluence: z.array(z.string()),
    riskPlanned: z.object({
        mode: z.enum(["percent", "currency"]),
        value: z.number().min(0)
    }),
    rewardPlanned: z.object({
        mode: z.enum(["percent", "currency"]),
        value: z.number().min(0)
    }),
    plannedRR: z.number(),
    actualRR: z.number().nullable(),
    result: z.enum(["TP", "SL", "BE", "Partial", "Manual Close", "Running"]),
    pnl: z.number().nullable(),
    commission: z.number(),
    netPnl: z.number().nullable(),
    emotionBefore: z.enum(["Confident", "Neutral", "Anxious", "FOMO", "Revenge", "Bored"]).nullable(),
    emotionAfter: z.enum(["Satisfied", "Frustrated", "Regret", "Calm", "Excited"]).nullable(),
    tradeGrade: z.enum(["A+", "A", "B", "C", "F"]).nullable(),
    tags: z.array(z.string()),
    notes: z.string(),
    setupBeforeUrl: z.string(),
    setupAfterUrl: z.string(),
    checklistSnapshot: z.array(z.object({
        itemId: z.string(),
        label: z.string(),
        checked: z.boolean()
    })),
    openedAt: z.string(),
    closedAt: z.string().nullable(),
    duration: z.number().nullable(),
    externalId: z.string().optional().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

export type Trade = z.infer<typeof tradeSchema>;

export const debriefSchema = z.object({
    id: z.string().optional(),
    accountId: z.string(),
    date: z.string(), // YYYY-MM-DD
    htfBias: z.enum(["Bullish", "Bearish", "Neutral", "No Bias"]),
    narrative: z.string(),
    keyLevels: z.string(),
    chartUrls: z.array(z.string()),
    marketRespectedPlan: z.enum(["Yes", "No", "Partial"]),
    mistakes: z.string(),
    goodActions: z.string(),
    lessonsLearned: z.string(),
    emotionalState: z.enum(["Focused", "Distracted", "Stressed", "Calm", "Overconfident"]),
    dayRating: z.number().min(1).max(5),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

export type Debrief = z.infer<typeof debriefSchema>;
