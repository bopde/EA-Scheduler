import { AvailSlot, Member, TeamAssignment } from '../types'

export function computeTeams(
  date: string,
  shiftIndex: 0 | 1,
  allAvailability: AvailSlot[],
  members: Member[],
  minTeamSize: number,
  maxTeamSize: number,
  prevShiftTeams: TeamAssignment[] | null = null,
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
    const role = roleMap.get(s.memberName)
    if (role === 'coordinator' || role === 'project_lead') availCoords.push(s.memberName)
    else availMembers.push(s.memberName)
  }

  const total = availCoords.length + availMembers.length
  const numTeams = Math.min(availCoords.length, Math.floor(total / minTeamSize))
  if (numTeams === 0) return []

  // For shift 1: sort coordinators so those who led in shift 0 come first
  if (shiftIndex === 1 && prevShiftTeams && prevShiftTeams.length > 0) {
    const prevLeaderOrder = new Map(prevShiftTeams.map((t, i) => [t.coordinatorName, i]))
    availCoords.sort((a, b) => {
      const ai = prevLeaderOrder.has(a) ? prevLeaderOrder.get(a)! : 9999
      const bi = prevLeaderOrder.has(b) ? prevLeaderOrder.get(b)! : 9999
      return ai - bi
    })
  }

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

  const pool = [...availMembers, ...spareCoords]
  const assigned = new Set<string>()

  // For shift 1: pre-populate teams with their shift-0 members who are still available
  if (shiftIndex === 1 && prevShiftTeams && prevShiftTeams.length > 0) {
    const availNow = new Set(available.map((s) => s.memberName))
    const leaderToIdx = new Map(teams.map((t, i) => [t.coordinatorName, i]))

    for (const prevTeam of prevShiftTeams) {
      const teamIdx = leaderToIdx.get(prevTeam.coordinatorName)
      if (teamIdx === undefined) continue
      for (const prevMember of prevTeam.members) {
        if (availNow.has(prevMember) && !assigned.has(prevMember) && teams[teamIdx].members.length < maxTeamSize - 1) {
          teams[teamIdx].members.push(prevMember)
          assigned.add(prevMember)
          if (spareSet.has(prevMember)) teams[teamIdx].coordinatorFilledIn = true
        }
      }
    }
  }

  // Distribute remaining pool round-robin
  const remaining = pool.filter((p) => !assigned.has(p))
  for (let rp = 0; rp < remaining.length; rp++) {
    const ti = rp % numTeams
    if (teams[ti].members.length < maxTeamSize - 1) {
      teams[ti].members.push(remaining[rp])
      if (spareSet.has(remaining[rp])) teams[ti].coordinatorFilledIn = true
    }
  }

  return teams
}
