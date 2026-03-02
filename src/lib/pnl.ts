import type { Trade } from './schemas';
import { differenceInMinutes } from 'date-fns';

export function calculatePnL(trade: Trade): Trade {
    const t = { ...trade };

    if (t.result === 'Running') {
        t.pnl = null;
        t.netPnl = null;
        t.closedAt = null;
        t.duration = null;
    } else if (t.exitPrice && t.entryPrice && t.lotSize) {
        let pnl = 0;
        if (t.position === 'BUY') {
            pnl = (t.exitPrice - t.entryPrice) * t.lotSize;
        } else {
            pnl = (t.entryPrice - t.exitPrice) * t.lotSize;
        }
        // Assume user entered absolute pnl if lotSize is considered 1 in absolute currency.
        // If not, we still do the calculation.
        t.pnl = pnl;
        t.netPnl = pnl - (t.commission || 0);
    }

    // Duration
    if (t.openedAt && t.closedAt) {
        t.duration = differenceInMinutes(new Date(t.closedAt), new Date(t.openedAt));
    } else {
        t.duration = null;
    }

    // Actual RR
    if (t.pnl !== null && t.riskPlanned && t.riskPlanned.value > 0) {
        if (t.result === 'TP' || t.result === 'Partial' || t.result === 'Manual Close') {
            // Only absolute if we consider absolute risk
            // Simplification: |pnl| / risk value
            t.actualRR = Math.abs(t.pnl) / t.riskPlanned.value;
        } else if (t.result === 'SL') {
            // Usually negative
            t.actualRR = -Math.abs(t.pnl) / t.riskPlanned.value;
        } else if (t.result === 'BE') {
            t.actualRR = 0;
        }
    }

    t.updatedAt = new Date().toISOString();
    return t;
}
