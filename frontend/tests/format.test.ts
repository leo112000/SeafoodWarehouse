import { describe, it, expect } from 'vitest';
import { formatCurrency, formatWeight, formatDate } from '../src/utils/format';

describe('formatCurrency', () => {
  it('formats number to VND currency string', () => {
    // Note: vi-VN locale usually uses non-breaking space (Unicode \u00a0) or regular space.
    // We can replace spaces to do a robust comparison.
    const result = formatCurrency(1500000).replace(/\s/g, ' ');
    expect(result).toContain('1.500.000');
    expect(result).toContain('₫');
  });
});

describe('formatWeight', () => {
  it('formats weight in kg', () => {
    expect(formatWeight(120)).toBe('120 kg');
    expect(formatWeight(1250)).toContain('1.250 kg');
  });
});

describe('formatDate', () => {
  it('formats ISO date string to vi-VN format', () => {
    const isoString = '2026-08-12T09:00:00.000Z';
    const result = formatDate(isoString);
    // Since local timezone might affect the exact hour, we check for date parts
    expect(result).toContain('2026');
    expect(result).toContain('12/08');
  });
});
