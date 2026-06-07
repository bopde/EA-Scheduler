export interface Config {
  weekday_shift_1_start: string
  weekday_shift_1_end: string
  weekday_shift_2_start: string
  weekday_shift_2_end: string
  weekend_shift_1_start: string
  weekend_shift_1_end: string
  weekend_shift_2_start: string
  weekend_shift_2_end: string
  scheduling_weeks_ahead: number
  min_team_size: number
  max_team_size: number
  max_teams: number
}

export interface Member {
  name: string
  role: 'member' | 'coordinator' | 'project_lead'
}

export interface AvailSlot {
  memberName: string
  date: string        // YYYY-MM-DD
  shiftIndex: 0 | 1
  available: boolean
}

export interface TeamAssignment {
  date: string
  shiftIndex: 0 | 1
  teamNumber: number
  coordinatorName: string
  members: string[]
  coordinatorFilledIn: boolean
}

export interface ShiftInfo {
  start: string
  end: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
