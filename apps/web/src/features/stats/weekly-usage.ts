import type { StatsCache } from '@/lib/parsers/types'

export interface WeeklyUsageDay {
  date: string
  tokens: number
}

export interface WeeklyUsage {
  weekStart: string
  weekEnd: string
  accountTotal: number
  machineTotal: number
  daily: WeeklyUsageDay[]
  accountLabel: string
  machineId: string
}

export interface MonthlyUsage {
  monthStart: string
  monthEnd: string
  accountTotal: number
  machineTotal: number
  accountSharePercent: number
  daily: WeeklyUsageDay[]
  accountLabel: string
  machineId: string
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getUTCDay()
  const offset = day === 0 ? -6 : 1 - day
  result.setUTCDate(result.getUTCDate() + offset)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function tokenTotalsByDate(stats: StatsCache): Map<string, number> {
  return new Map(stats.dailyModelTokens.map((entry) => [
    entry.date,
    Object.values(entry.tokensByModel).reduce((sum, tokens) => sum + tokens, 0),
  ]))
}

export function aggregateWeeklyUsage(
  stats: StatsCache,
  now: Date,
  accountLabel: string,
  machineId: string,
): WeeklyUsage {
  const weekStartDate = startOfWeek(now)
  const weekStart = toDateString(weekStartDate)
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
  const weekEnd = toDateString(weekEndDate)
  const byDate = tokenTotalsByDate(stats)
  const daily: WeeklyUsageDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartDate)
    date.setUTCDate(date.getUTCDate() + i)
    const dateString = toDateString(date)
    daily.push({ date: dateString, tokens: byDate.get(dateString) ?? 0 })
  }

  const machineTotal = daily.reduce((sum, day) => sum + day.tokens, 0)
  return {
    weekStart,
    weekEnd,
    accountTotal: machineTotal,
    machineTotal,
    daily,
    accountLabel,
    machineId,
  }
}

export function aggregateMonthlyUsage(
  stats: StatsCache,
  now: Date,
  accountLabel: string,
  machineId: string,
): MonthlyUsage {
  const monthStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEndDate = endOfMonth(now)
  const monthStart = toDateString(monthStartDate)
  const monthEnd = toDateString(monthEndDate)
  const byDate = tokenTotalsByDate(stats)
  const daily: WeeklyUsageDay[] = []

  for (let day = 1; day <= monthEndDate.getUTCDate(); day++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day))
    const dateString = toDateString(date)
    daily.push({ date: dateString, tokens: byDate.get(dateString) ?? 0 })
  }

  const machineTotal = daily
    .filter((day) => day.date <= toDateString(now))
    .reduce((sum, day) => sum + day.tokens, 0)

  return {
    monthStart,
    monthEnd,
    accountTotal: machineTotal,
    machineTotal,
    accountSharePercent: machineTotal > 0 ? 100 : 0,
    daily,
    accountLabel,
    machineId,
  }
}
