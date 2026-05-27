import { Config, ShiftInfo } from '../types'

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function getWeekDays(startMonday: Date, weeksAhead: number): Date[] {
  const days: Date[] = []
  for (let i = 0; i < weeksAhead * 7; i++) {
    days.push(addDays(startMonday, i))
  }
  return days
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatWeekRange(startMonday: Date, weeks: number): string {
  const end = addDays(startMonday, weeks * 7 - 1)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${startMonday.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

export function getShiftsForDate(date: Date, config: Config): ShiftInfo[] {
  if (isWeekend(date)) {
    return [
      { start: config.weekend_shift_1_start, end: config.weekend_shift_1_end },
      { start: config.weekend_shift_2_start, end: config.weekend_shift_2_end },
    ]
  }
  return [
    { start: config.weekday_shift_1_start, end: config.weekday_shift_1_end },
    { start: config.weekday_shift_2_start, end: config.weekday_shift_2_end },
  ]
}

export function slotKey(date: string, shiftIndex: number): string {
  return `${date}:${shiftIndex}`
}
