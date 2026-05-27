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

  const availCoords = available
    .filter((s) => roleMap.get(s.memberName) === 'coordinator')
    .map((s) => s.memberName)

  const availMembers = available
    .filter((s) => roleMap.get(s.memberName) === 'member')
    .map((s) => s.memberName)

  const total = availCoords.length + availMembers.length
  const numTeams = Math.min(availCoords.length, Math.floor(total / minTeamSize))
  if (numTeams === 0) return []

  const leaders = availCoords.slice(0, numTeams)
  const spareCoords = availCoords.slice(numTeams)

  const teams: TeamAssignment[] = leaders.map((coord, i) => ({
    date,
    shiftIndex,
    teamNumber: i + 1,
    coordinatorName: coord,
    members: [],
    coordinatorFilledIn: false,
  }))

  // Distribute regular members round-robin
  for (let i = 0; i < availMembers.length; i++) {
    const teamIdx = i % numTeams
    if (teams[teamIdx].members.length < maxTeamSize - 1) {
      teams[teamIdx].members.push(availMembers[i])
    }
  }

  // Fill short teams with spare coordinators
  const sparePool = [...spareCoords]
  for (const team of teams) {
    while (team.members.length < minTeamSize - 1 && sparePool.length > 0) {
      team.members.push(sparePool.shift()!)
      team.coordinatorFilledIn = true
    }
  }

  return teams
}
