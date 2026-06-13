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
import MyTeamsView from './MyTeamsView'
import TeamAvailabilityView from '../coordinator/TeamAvailabilityView'

interface Props {
  scriptUrl: string
  memberName: string
  memberRole: 'member' | 'coordinator' | 'project_lead' | ''
  config: Config
  onLogout: () => void
}

export default function SchedulerPage({ scriptUrl, memberName, memberRole, config, onLogout }: Props) {
  const isProjectLead = memberRole === 'project_lead'

  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState<'schedule' | 'my-teams' | 'teams' | 'team-availability'>(
    isProjectLead ? 'team-availability' : 'schedule'
  )

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
              {(memberRole === 'coordinator' || memberRole === 'project_lead') && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                  {memberRole === 'project_lead' ? 'Project Lead' : 'Coordinator'}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isProjectLead && saveLabel && (
              <span className={`text-xs ${saveStatus === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                {saveLabel}
              </span>
            )}

            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {isProjectLead ? (
                <>
                  <button
                    onClick={() => setView('team-availability')}
                    className={`px-3 py-1.5 ${view === 'team-availability' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Team Availability
                  </button>
                  <button
                    onClick={() => setView('teams')}
                    className={`px-3 py-1.5 ${view === 'teams' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    All Teams
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setView('schedule')}
                    className={`px-3 py-1.5 ${view === 'schedule' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    My Schedule
                  </button>
                  <button
                    onClick={() => setView('my-teams')}
                    className={`px-3 py-1.5 ${view === 'my-teams' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    My Teams
                  </button>
                  {memberRole === 'coordinator' && (
                    <button
                      onClick={() => setView('teams')}
                      className={`px-3 py-1.5 ${view === 'teams' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      All Teams
                    </button>
                  )}
                </>
              )}
            </div>

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
        {view === 'team-availability' && isProjectLead && (
          <TeamAvailabilityView
            scriptUrl={scriptUrl}
            config={config}
          />
        )}

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

        {view === 'my-teams' && (
          <MyTeamsView
            scriptUrl={scriptUrl}
            memberName={memberName}
            memberRole={memberRole}
            config={config}
          />
        )}

        {view === 'teams' && (memberRole === 'coordinator' || memberRole === 'project_lead') && (
          <CoordinatorPage
            scriptUrl={scriptUrl}
            from={toISODate(new Date())}
            to={toISODate(addDays(new Date(), 6))}
            memberRole={memberRole}
          />
        )}
      </main>
    </div>
  )
}
