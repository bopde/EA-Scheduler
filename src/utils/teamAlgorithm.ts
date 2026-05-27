import { AvailSlot, Member, TeamAssignment } from '../types'

export function computeTeams(
  date: string,
  shiftIndex: 0 | 1,
  allAvailability: AvailSlot[],
  members: Member[],
  minTeamSize: number,
  maxTeamSize: number,
): TeamAssignment[] {
  const roleMap = new Map(members.map((m) => [m.name, m.role]))

  const available = allAvailability.filter(
    (s) => s.date === date && s.shiftIndex === shiftIndex && s.available,
  )

  const seen = new Set<string>()
  const availCoords: string[] = []
  const availMembers: string[] = []
  for (const s of available) {
    if (seen.has(s.memberName)) continue
    seen.add(s.memberName)
    if (roleMap.get(s.memberName) === 'coordinator') availCoords.push(s.memberName)
    else availMembers.push(s.memberName)
  }

  const total = availCoords.length + availMembers.length
  const numTeams = Math.min(availCoords.length, Math.floor(total / minTeamSize))
  if (numTeams === 0) return []

  const leaders = availCoords.slice(0, numTeams)
  const spareCoords = availCoords.slice(numTeams)
  const spareSet = new Set(spareCoords)

  const teams: TeamAssignment[] = leaders.map((coord, i) => ({
    date,
    shiftIndex,
    teamNumber: i + 1,
    coordinatorName: coord,
    members: [],
    coordinatorFilledIn: false,
  }))

  // Distribute everyone round-robin: regular members first, spare coordinators after.
  // Spare coordinators land wherever they land — all available people get assigned.
  const pool = [...availMembers, ...spareCoords]
  for (let p = 0; p < pool.length; p++) {
    const teamIdx = p % numTeams
    if (teams[teamIdx].members.length < maxTeamSize - 1) {
      teams[teamIdx].members.push(pool[p])
      if (spareSet.has(pool[p])) teams[teamIdx].coordinatorFilledIn = true
    }
  }

  return teams
}
