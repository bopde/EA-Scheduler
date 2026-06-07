import { useCallback, useEffect, useRef, useState } from 'react'
import { saveTeamSlot } from '../../api/gasClient'
import { useRoleMap } from '../../hooks/useRoleMap'
import { TeamAssignment } from '../../types'

interface Props {
  date: string
  shiftIndex: 0 | 1
  teams: TeamAssignment[]
  unassigned: string[]
  scriptUrl: string
}

type DragData = {
  memberName: string
  source: number | 'unassigned'
  isLeader: boolean
}

type DropTarget =
  | { kind: 'coord'; teamNumber: number }
  | { kind: 'members'; teamNumber: number }
  | { kind: 'unassigned' }

export default function EditableShiftSection({
  date, shiftIndex, teams: initTeams, unassigned: initUnassigned, scriptUrl,
}: Props) {
  const roleMap = useRoleMap()
  const [teams, setTeams] = useState<TeamAssignment[]>(initTeams)
  const [unassigned, setUnassigned] = useState<string[]>(initUnassigned)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTeams(initTeams)
    setUnassigned(initUnassigned)
  }, [initTeams, initUnassigned])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  const isCoordRole = (name: string) =>
    roleMap.get(name) === 'coordinator' || roleMap.get(name) === 'project_lead'

  const scheduleSave = useCallback((updatedTeams: TeamAssignment[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      setSaveError(null)
      try {
        await saveTeamSlot(scriptUrl, date, shiftIndex, updatedTeams.filter(t => t.coordinatorName !== ''))
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : 'Save failed')
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [scriptUrl, date, shiftIndex])

  function addTeam() {
    const nextNum = teams.length > 0 ? Math.max(...teams.map(t => t.teamNumber)) + 1 : 1
    setTeams(prev => [...prev, {
      date, shiftIndex, teamNumber: nextNum, coordinatorName: '', members: [], coordinatorFilledIn: false,
    }])
  }

  function removeTeam(teamNumber: number) {
    const team = teams.find(t => t.teamNumber === teamNumber)
    if (!team) return
    const returning: string[] = []
    if (team.coordinatorName) returning.push(team.coordinatorName)
    returning.push(...team.members)
    const newTeams = teams.filter(t => t.teamNumber !== teamNumber)
    const newUnassigned = [...unassigned, ...returning.filter(n => !unassigned.includes(n))]
    setTeams(newTeams)
    setUnassigned(newUnassigned)
    scheduleSave(newTeams)
  }

  function onDragStart(e: React.DragEvent, data: DragData) {
    e.dataTransfer.setData('application/json', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, key: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== key) setDragOver(key)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
  }

  function onDrop(e: React.DragEvent, target: DropTarget) {
    e.preventDefault()
    setDragOver(null)
    let data: DragData
    try { data = JSON.parse(e.dataTransfer.getData('application/json')) }
    catch { return }
    const { memberName, source, isLeader } = data

    // No-ops
    if (target.kind === 'unassigned' && source === 'unassigned') return
    if (target.kind === 'members' && source === target.teamNumber && !isLeader) return
    if (target.kind === 'coord' && source === target.teamNumber && isLeader) return

    let newTeams = teams.map(t => ({ ...t, members: [...t.members] }))
    let newUnassigned = [...unassigned]

    // Remove from source
    if (source === 'unassigned') {
      newUnassigned = newUnassigned.filter(m => m !== memberName)
    } else {
      newTeams = newTeams.map(t => {
        if (t.teamNumber !== source) return t
        if (isLeader) return { ...t, coordinatorName: '' }
        return { ...t, members: t.members.filter(m => m !== memberName) }
      })
    }

    // Add to target
    if (target.kind === 'unassigned') {
      newUnassigned = [...newUnassigned, memberName]
    } else if (target.kind === 'members') {
      newTeams = newTeams.map(t => {
        if (t.teamNumber !== target.teamNumber) return t
        return { ...t, members: [...t.members, memberName] }
      })
    } else if (target.kind === 'coord') {
      newTeams = newTeams.map(t => {
        if (t.teamNumber !== target.teamNumber) return t
        // Demote old coordinator to members if there was one
        const members = t.coordinatorName ? [...t.members, t.coordinatorName] : [...t.members]
        return { ...t, coordinatorName: memberName, members }
      })
    }

    // Recompute coordinatorFilledIn for all teams
    newTeams = newTeams.map(t => ({
      ...t,
      coordinatorFilledIn: t.members.some(m => isCoordRole(m)),
    }))

    setTeams(newTeams)
    setUnassigned(newUnassigned)
    scheduleSave(newTeams)
  }

  const dropClass = (key: string) =>
    dragOver === key ? 'ring-2 ring-indigo-400 bg-indigo-50/30' : ''

  return (
    <div>
      {saving && <span className="text-xs text-indigo-400 mb-2 inline-block">Saving…</span>}
      {saveError && <span className="text-xs text-red-500 mb-2 inline-block ml-2">{saveError}</span>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {teams.map(team => (
          <div key={team.teamNumber} className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Team {team.teamNumber}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {team.members.length + (team.coordinatorName ? 1 : 0)}p
                </span>
                <button
                  onClick={() => removeTeam(team.teamNumber)}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                  title="Remove team"
                >✕</button>
              </div>
            </div>

            <div className="p-3 space-y-1.5">
              {/* Coordinator slot — draggable if filled, drop zone always */}
              {team.coordinatorName ? (
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, { memberName: team.coordinatorName, source: team.teamNumber, isLeader: true })}
                  onDragOver={(e) => { e.stopPropagation(); onDragOver(e, `coord-${team.teamNumber}`) }}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => { e.stopPropagation(); onDrop(e, { kind: 'coord', teamNumber: team.teamNumber }) }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 bg-indigo-50/50 cursor-grab hover:bg-indigo-50 select-none transition-all ${dropClass(`coord-${team.teamNumber}`)}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{team.coordinatorName}</span>
                  <span className="text-xs text-indigo-500 font-medium">coordinator</span>
                  <span className="text-gray-300 text-xs select-none">⠿</span>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.stopPropagation(); onDragOver(e, `coord-${team.teamNumber}`) }}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => { e.stopPropagation(); onDrop(e, { kind: 'coord', teamNumber: team.teamNumber }) }}
                  className={`flex items-center justify-center rounded-lg px-3 py-2 border border-dashed border-indigo-200 text-xs text-indigo-300 min-h-[38px] transition-all ${dropClass(`coord-${team.teamNumber}`)}`}
                >
                  Drop coordinator here
                </div>
              )}

              {/* Members drop zone */}
              <div
                onDragOver={(e) => onDragOver(e, `members-${team.teamNumber}`)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, { kind: 'members', teamNumber: team.teamNumber })}
                className={`rounded-lg space-y-1 p-1 min-h-[32px] transition-all ${dropClass(`members-${team.teamNumber}`)}`}
              >
                {team.members.length === 0 && (
                  <p className="text-xs text-gray-400 italic px-2 py-1">Drop members here</p>
                )}
                {team.members.map(name => {
                  const isCoord = isCoordRole(name)
                  return (
                    <div
                      key={name}
                      draggable
                      onDragStart={(e) => onDragStart(e, { memberName: name, source: team.teamNumber, isLeader: false })}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-50 cursor-grab hover:bg-gray-100 select-none"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCoord ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="text-sm text-gray-700 flex-1">{name}</span>
                      {isCoord && <span className="text-xs text-amber-600">filling in</span>}
                      <span className="text-gray-300 text-xs select-none">⠿</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Add Team button */}
        <button
          onClick={addTeam}
          className="rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30 p-4 flex flex-col items-center justify-center gap-1.5 transition-colors min-h-[100px] text-gray-400 hover:text-indigo-500"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-xs font-medium">Add Team</span>
        </button>
      </div>

      {/* Unassigned drop zone */}
      <div
        onDragOver={(e) => onDragOver(e, 'unassigned')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, { kind: 'unassigned' })}
        className={`rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 mt-3 min-h-[52px] transition-all ${dropClass('unassigned')}`}
      >
        {unassigned.length === 0 ? (
          <p className="text-xs text-gray-400">Drop members here to remove from a team</p>
        ) : (
          <>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Available but not assigned ({unassigned.length}) — drag to a team to assign
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unassigned.map(name => (
                <span
                  key={name}
                  draggable
                  onDragStart={(e) => onDragStart(e, { memberName: name, source: 'unassigned', isLeader: false })}
                  className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 cursor-grab hover:border-gray-400 select-none"
                >
                  {name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
