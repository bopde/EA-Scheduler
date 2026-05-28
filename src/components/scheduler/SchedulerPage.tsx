import { useState } from 'react'
import { useAvailability } from '../../hooks/useAvailability'
import { Config } from '../../types'
import {
  addDays,
  getMondayOf,
  formatWeekRange,
  toISODate,
} from '../../utils/dateUtils'
import CalendarGrid from './CalendarGrid'
import WeekNavigator from './WeekNavigator'
import CoordinatorPage from '../coordinator/CoordinatorPage'

interface Props {
  scriptUrl: string
  memberName: string
  memberRole: 'member' | 'coordinator' | ''
  config: Config
  onLogout: () => void
}

export default function SchedulerPage({ scriptUrl, memberName, memberRole, config, onLogout }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState<'schedule' | 'teams'>('schedule')

  const startMonday = addDays(getMondayOf(new Date()), weekOffset * 7)
  const endDate = addDays(startMonday, config.scheduling_weeks_ahead * 7 - 1)
  const from = toISODate(startMonday)
  const to = toISODate(endDate)

  const { availability, loading, saveStatus, toggleSlot } = useAvailability(
    scriptUrl,
    memberName,
    from,
    to,
  )

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved'
    : saveStatus === 'error' ? 'Error saving'
    : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900">EA Scheduler</h1>
            <span className="text-sm text-gray-500">
              {memberName}
              {memberRole === 'coordinator' && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                  Coordinator
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {saveLabel && (
              <span className={`text-xs ${saveStatus === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                {saveLabel}
              </span>
            )}
            {memberRole === 'coordinator' && (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  onClick={() => setView('schedule')}
                  className={`px-3 py-1.5 ${view === 'schedule' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  My Schedule
                </button>
                <button
                  onClick={() => setView('teams')}
                  className={`px-3 py-1.5 ${view === 'teams' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Teams
                </button>
              </div>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Switch user
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {view === 'schedule' && (
          <>
            <div className="flex items-center justify-between">
              <WeekNavigator
                label={formatWeekRange(startMonday, config.scheduling_weeks_ahead)}
                onPrev={() => setWeekOffset((o) => o - 1)}
                onNext={() => setWeekOffset((o) => o + 1)}
              />
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 inline-block" />
                  Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />
                  Unavailable
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading schedule…</div>
            ) : (
              <CalendarGrid
                weekOffset={weekOffset}
                config={config}
                availability={availability}
                saveStatus={saveStatus}
                onToggle={toggleSlot}
              />
            )}
          </>
        )}

        {view === 'teams' && memberRole === 'coordinator' && (
          <CoordinatorPage
            scriptUrl={scriptUrl}
            from={toISODate(getMondayOf(new Date()))}
            to={toISODate(addDays(getMondayOf(new Date()), config.scheduling_weeks_ahead * 7 - 1))}
          />
        )}
      </main>
    </div>
  )
}
