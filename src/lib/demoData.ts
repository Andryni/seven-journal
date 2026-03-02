import { nanoid } from 'nanoid';
import type { Trade } from './schemas';

export function getDemoTrades(): Trade[] {
    const today = new Date();
    const trades: Trade[] = [];

    const pairs = ['EUR/USD', 'GBP/JPY', 'BTC/USDT', 'XAU/USD', 'NASDAQ'];
    const results: Trade['result'][] = ['TP', 'SL', 'BE', 'Partial', 'Manual Close'];

    for (let i = 0; i < 20; i++) {
        const openedAtDate = new Date();
        openedAtDate.setDate(today.getDate() - (20 - i));
        openedAtDate.setHours(Math.floor(Math.random() * 12) + 8);

        const closedAtDate = new Date(openedAtDate);
        closedAtDate.setHours(openedAtDate.getHours() + Math.floor(Math.random() * 4) + 1);

        const result = results[Math.floor(Math.random() * results.length)];
        const pnl = result === 'TP' ? 500 : result === 'SL' ? -250 : result === 'BE' ? 0 : 150;

        trades.push({
            id: nanoid(),
            accountId: 'demo-account',
            pair: pairs[Math.floor(Math.random() * pairs.length)],
            position: Math.random() > 0.5 ? 'BUY' : 'SELL',
            entryPrice: 1.1000,
            exitPrice: result === 'TP' ? 1.1050 : 1.0975,
            lotSize: 1,
            stopLoss: 1.0975,
            takeProfit: 1.1050,
            timeframe: 'M15',
            session: 'London',
            strategy: 'Price Action',
            riskPlanned: { mode: 'percent', value: 1 },
            rewardPlanned: { mode: 'percent', value: 2 },
            plannedRR: 2,
            actualRR: result === 'TP' ? 2 : -1,
            result: result,
            confluence: ['Trendline', 'Fvg'],
            pnl: pnl,
            netPnl: pnl - 5,
            commission: 5,
            emotionBefore: 'Neutral',
            emotionAfter: result === 'TP' ? 'Satisfied' : 'Frustrated',
            tradeGrade: result === 'TP' ? 'A' : 'C',
            tags: ['Demo'],
            notes: 'Sample demo trade for demonstration purposes.',
            setupBeforeUrl: 'https://images.unsplash.com/photo-1611974717482-58a2d2c1dc88?w=800',
            setupAfterUrl: 'https://images.unsplash.com/photo-1611974717482-58a2d2c1dc88?w=800',
            checklistSnapshot: [],
            openedAt: openedAtDate.toISOString(),
            closedAt: closedAtDate.toISOString(),
            duration: 120,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    return trades;
}
