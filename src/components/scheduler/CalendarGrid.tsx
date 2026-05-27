import { Config, SaveStatus } from '../../types'
import {
  addDays,
  formatDisplayDate,
  getMondayOf,
  getShiftsForDate,
  getWeekDays,
  slotKey,
  toISODate,
} from '../../utils/dateUtils'
import ShiftCell from './ShiftCell'

interface Props {
  weekOffset: number
  config: Config
  availability: Map<string, boolean>
  saveStatus: SaveStatus
  onToggle: (date: string, shiftIndex: 0 | 1) => void
}

export default function CalendarGrid({
  weekOffset,
  config,
  availability,
  saveStatus,
  onToggle,
}: Props) {
  const startMonday = addDays(getMondayOf(new Date()), weekOffset * 7)
  const days = getWeekDays(startMonday, config.scheduling_weeks_ahead)

  // Group into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="space-y-6">
      {weeks.map((week, wi) => (
        <div key={wi}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Week of {formatDisplayDate(week[0])}
          </h3>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((day) => {
              const iso = toISODate(day)
              const shifts = getShiftsForDate(day, config)
              return (
                <div key={iso} className="space-y-1">
                  <div className="text-center text-xs text-gray-500 font-medium pb-0.5 border-b border-gray-100">
                    {formatDisplayDate(day)}
                  </div>
                  {shifts.map((shift, si) => (
                    <ShiftCell
                      key={si}
                      shift={shift}
                      available={availability.get(slotKey(iso, si)) ?? false}
                      saving={saveStatus === 'saving'}
                      onToggle={() => onToggle(iso, si as 0 | 1)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
