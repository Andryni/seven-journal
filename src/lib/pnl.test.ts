import { describe, it, expect } from 'vitest';
import { calculatePnL } from './pnl';
import type { Trade } from './schemas';

describe('calculatePnL', () => {
    it('should calculate PnL correctly for a BUY trade', () => {
        const trade = {
            position: 'BUY',
            entryPrice: 100,
            exitPrice: 110,
            lotSize: 2,
            commission: 5,
            result: 'TP'
        } as Trade;

        const result = calculatePnL(trade);
        expect(result.pnl).toBe(20); // (110 - 100) * 2
        expect(result.netPnl).toBe(15); // 20 - 5
    });

    it('should calculate PnL correctly for a SELL trade', () => {
        const trade = {
            position: 'SELL',
            entryPrice: 100,
            exitPrice: 90,
            lotSize: 2,
            commission: 2,
            result: 'TP'
        } as Trade;

        const result = calculatePnL(trade);
        expect(result.pnl).toBe(20); // (100 - 90) * 2
        expect(result.netPnl).toBe(18); // 20 - 2
    });

    it('should calculate RR correctly for a winning trade', () => {
        const trade = {
            position: 'BUY',
            entryPrice: 100,
            exitPrice: 120,
            lotSize: 1,
            result: 'TP',
            riskPlanned: { type: '$', value: 10 }
        } as Trade;

        const result = calculatePnL(trade);
        expect(result.pnl).toBe(20);
        expect(result.actualRR).toBe(2); // 20 / 10
    });

    it('should nullify PnL for Running trades', () => {
        const trade = {
            position: 'BUY',
            entryPrice: 100,
            exitPrice: 120,
            lotSize: 1,
            result: 'Running',
            pnl: 20,
            netPnl: 20
        } as Trade;

        const result = calculatePnL(trade);
        expect(result.pnl).toBeNull();
        expect(result.netPnl).toBeNull();
    });
});
