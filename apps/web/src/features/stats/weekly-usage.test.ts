import { describe, expect, it } from 'vitest'
import { aggregateMonthlyUsage, aggregateWeeklyUsage } from './weekly-usage'
import type { StatsCache } from '@/lib/parsers/types'

const stats = {
  version: 1,
  lastComputedDate: '2026-10-22T00:00:00.000Z',
  dailyActivity: [],
  dailyModelTokens: [
    { date: '2026-10-19', tokensByModel: { sonnet: 100 } },
    { date: '2026-10-20', tokensByModel: { sonnet: 200, haiku: 50 } },
    { date: '2026-10-25', tokensByModel: { opus: 300 } },
    { date: '2026-10-26', tokensByModel: { opus: 999 } },
  ],
  modelUsage: {},
  totalSessions: 1,
  totalMessages: 1,
  longestSession: { sessionId: 's', duration: 1, messageCount: 1, timestamp: '2026-10-20' },
  firstSessionDate: '2026-10-19',
  hourCounts: {},
} as StatsCache

describe('aggregateWeeklyUsage', () => {
  it('aggregates only the current Monday-Sunday week', () => {
    const result = aggregateWeeklyUsage(stats, new Date('2026-10-22T12:00:00Z'), 'Work', 'machine-id')
    expect(result.weekStart).toBe('2026-10-19')
    expect(result.weekEnd).toBe('2026-10-25')
    expect(result.machineTotal).toBe(650)
    expect(result.accountTotal).toBe(650)
    expect(result.daily).toHaveLength(7)
    expect(result.daily[1]).toEqual({ date: '2026-10-20', tokens: 250 })
  })

  it('aggregates month-to-date across month boundaries', () => {
    const result = aggregateMonthlyUsage(
      {
        ...stats,
        dailyModelTokens: [
          { date: '2026-09-30', tokensByModel: { sonnet: 999 } },
          { date: '2026-10-01', tokensByModel: { sonnet: 100 } },
          { date: '2026-10-31', tokensByModel: { sonnet: 900 } },
          { date: '2026-11-01', tokensByModel: { sonnet: 800 } },
        ],
      } as StatsCache,
      new Date('2026-10-22T12:00:00Z'),
      'Work',
      'machine-id',
    )
    expect(result.monthStart).toBe('2026-10-01')
    expect(result.monthEnd).toBe('2026-10-31')
    expect(result.daily).toHaveLength(31)
    expect(result.machineTotal).toBe(100)
    expect(result.accountSharePercent).toBe(100)
  })
})
