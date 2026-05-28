import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Config, Member } from '../types'

interface SessionState {
  scriptUrl: string
  selectedMember: string
  memberRole: 'member' | 'coordinator' | ''
  config: Config | null
  members: Member[]
  setConnection: (url: string, config: Config, members: Member[]) => void
  setSelectedMember: (name: string, role: 'member' | 'coordinator') => void
  clearMember: () => void
  disconnect: () => void
}

const defaultConfig: Config = {
  weekday_shift_1_start: '10:30',
  weekday_shift_1_end: '13:30',
  weekday_shift_2_start: '14:30',
  weekday_shift_2_end: '17:30',
  weekend_shift_1_start: '10:30',
  weekend_shift_1_end: '13:30',
  weekend_shift_2_start: '13:30',
  weekend_shift_2_end: '16:30',
  scheduling_weeks_ahead: 4,
  min_team_size: 4,
  max_team_size: 6,
  max_teams: 3,
}

export { defaultConfig }

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      scriptUrl: '',
      selectedMember: '',
      memberRole: '',
      config: null,
      members: [],
      setConnection: (url, config, members) =>
        set({ scriptUrl: url, config, members }),
      setSelectedMember: (name, role) =>
        set({ selectedMember: name, memberRole: role }),
      clearMember: () =>
        set({ selectedMember: '', memberRole: '' }),
      disconnect: () =>
        set({ scriptUrl: '', selectedMember: '', memberRole: '', config: null, members: [] }),
    }),
    {
      name: 'ea-scheduler-session',
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as SessionState
        if (version < 1 && s.config && (s.config as unknown as Record<string, unknown>).max_team_size === undefined) {
          s.config = { ...s.config, max_team_size: 6 }
        }
        return s
      },
    },
  ),
)
