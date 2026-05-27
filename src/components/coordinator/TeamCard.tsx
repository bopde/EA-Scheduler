import { TeamAssignment } from '../../types'

interface Props {
  team: TeamAssignment
}

export default function TeamCard({ team }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Team {team.teamNumber}</span>
        {team.coordinatorFilledIn && (
          <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
            Coordinator filling in
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500">
        Coordinator:{' '}
        <span className="font-medium text-gray-700">
          {team.coordinatorName}
          {team.coordinatorFilledIn ? ' (as member)' : ''}
        </span>
      </div>
      <div className="space-y-1">
        {team.members.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No members assigned</p>
        ) : (
          team.members.map((m) => (
            <div key={m} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">{m}</span>
            </div>
          ))
        )}
      </div>
      <div className="pt-1 text-xs text-gray-400">
        {team.members.length} member{team.members.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
