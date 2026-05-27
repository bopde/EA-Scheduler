import { AvailSlot, Member, TeamAssignment } from '../types'

export function computeTeams(
  date: string,
  shiftIndex: 0 | 1,
  allAvailability: AvailSlot[],
  members: Member[],
  previousTeams: TeamAssignment[],
  minTeamSize: number,
  maxTeams: number,
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

  // Day-before check: if a team from the previous assignment was short, move
  // that coordinator into the member pool for this slot.
  const coordinatorFilledInSet = new Set<string>()
  for (const prev of previousTeams) {
    if (prev.members.length < minTeamSize) {
      const coordIdx = availCoords.indexOf(prev.coordinatorName)
      if (coordIdx !== -1) {
        availCoords.splice(coordIdx, 1)
        availMembers.push(prev.coordinatorName)
        coordinatorFilledInSet.add(prev.coordinatorName)
      }
    }
  }

  const teamCount = Math.min(availCoords.length, maxTeams, 3)
  if (teamCount === 0) return []

  const teams: TeamAssignment[] = []
  let memberPool = [...availMembers]

  for (let i = 0; i < teamCount; i++) {
    const assigned = memberPool.splice(0, minTeamSize)
    teams.push({
      date,
      shiftIndex,
      teamNumber: i + 1,
      coordinatorName: availCoords[i],
      members: assigned,
      coordinatorFilledIn: coordinatorFilledInSet.has(availCoords[i]),
    })
  }

  return teams
}
