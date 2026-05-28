import { useRoleMap } from '../../hooks/useRoleMap'
import { TeamAssignment } from '../../types'

interface Props {
  team: TeamAssignment
}

export default function TeamCard({ team }: Props) {
  const roleMap = useRoleMap()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Team {team.teamNumber}</span>
        <span className="text-xs text-gray-400">
          {team.members.length + 1} person{team.members.length !== 0 ? 's' : ''}
        </span>
      </div>

      {/* Coordinator */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
        <span className="text-sm text-gray-700">{team.coordinatorName}</span>
        <span className="ml-auto text-xs text-indigo-500 font-medium">coordinator</span>
      </div>

      {/* Members */}
      {team.members.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No members assigned</p>
      ) : (
        <div className="space-y-1">
          {team.members.map((m) => {
            const isCoordRole = roleMap.get(m) === 'coordinator'
            return (
              <div key={m} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCoordRole ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-sm text-gray-700">{m}</span>
                {isCoordRole && (
                  <span className="ml-auto text-xs text-amber-600">filling in</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
