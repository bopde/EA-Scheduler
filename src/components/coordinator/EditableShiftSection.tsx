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
}

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

  const scheduleSave = useCallback((updatedTeams: TeamAssignment[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      setSaveError(null)
      try {
        await saveTeamSlot(scriptUrl, date, shiftIndex, updatedTeams)
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : 'Save failed')
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [scriptUrl, date, shiftIndex])

  function onDragStart(e: React.DragEvent, data: DragData) {
    e.dataTransfer.setData('application/json', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, target: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== target) setDragOver(target)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
  }

  function onDrop(e: React.DragEvent, target: number | 'unassigned') {
    e.preventDefault()
    setDragOver(null)
    let data: DragData
    try { data = JSON.parse(e.dataTransfer.getData('application/json')) }
    catch { return }
    const { memberName, source } = data
    if (source === target) return

    const isCoordRole = (name: string) =>
      roleMap.get(name) === 'coordinator' || roleMap.get(name) === 'project_lead'

    const newTeams = teams.map(t => {
      if (t.teamNumber === source) {
        const members = t.members.filter(m => m !== memberName)
        return { ...t, members, coordinatorFilledIn: members.some(isCoordRole) }
      }
      if (t.teamNumber === target) {
        const members = [...t.members, memberName]
        return { ...t, members, coordinatorFilledIn: members.some(isCoordRole) }
      }
      return t
    })

    const newUnassigned =
      source === 'unassigned' ? unassigned.filter(m => m !== memberName) :
      target === 'unassigned' ? [...unassigned, memberName] :
      unassigned

    setTeams(newTeams)
    setUnassigned(newUnassigned)
    scheduleSave(newTeams)
  }

  const dropClass = (id: string) =>
    dragOver === id ? 'ring-2 ring-indigo-400 bg-indigo-50/30' : ''

  return (
    <div>
      {saving && <span className="text-xs text-indigo-400 mb-2 inline-block">Saving…</span>}
      {saveError && <span className="text-xs text-red-500 mb-2 inline-block ml-2">{saveError}</span>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {teams.map(team => (
          <div
            key={team.teamNumber}
            onDragOver={(e) => onDragOver(e, `team-${team.teamNumber}`)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, team.teamNumber)}
            className={`rounded-lg border bg-white p-4 space-y-2 transition-all ${dropClass(`team-${team.teamNumber}`)}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Team {team.teamNumber}</span>
              <span className="text-xs text-gray-400">{team.members.length + 1}p</span>
            </div>

            {/* Coordinator — not draggable */}
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-indigo-50/50">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1">{team.coordinatorName}</span>
              <span className="text-xs text-indigo-500 font-medium">coordinator</span>
            </div>

            {/* Draggable members */}
            {team.members.length === 0 && (
              <p className="text-xs text-gray-400 italic px-1">Drop members here</p>
            )}
            {team.members.map(name => {
              const isCoordRole = roleMap.get(name) === 'coordinator' || roleMap.get(name) === 'project_lead'
              return (
                <div
                  key={name}
                  draggable
                  onDragStart={(e) => onDragStart(e, { memberName: name, source: team.teamNumber })}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-50 cursor-grab hover:bg-gray-100 select-none"
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCoordRole ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span className="text-sm text-gray-700 flex-1">{name}</span>
                  {isCoordRole && <span className="text-xs text-amber-600">filling in</span>}
                  <span className="text-gray-300 text-xs select-none">⠿</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Unassigned drop zone */}
      <div
        onDragOver={(e) => onDragOver(e, 'unassigned')}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, 'unassigned')}
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
                  onDragStart={(e) => onDragStart(e, { memberName: name, source: 'unassigned' })}
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
