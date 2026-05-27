import { useState } from 'react'
import { Member } from '../../types'

interface Props {
  members: Member[]
  onSelect: (name: string, role: 'member' | 'coordinator') => void
}

export default function MemberSelector({ members, onSelect }: Props) {
  const [selected, setSelected] = useState('')

  const active = members.filter((m) => m.name)

  function handleGo() {
    const found = active.find((m) => m.name === selected)
    if (!found) return
    onSelect(found.name, found.role)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Who are you?
      </label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">Select your name…</option>
        {active.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}{m.role === 'coordinator' ? ' (Coordinator)' : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleGo}
        disabled={!selected}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        Continue
      </button>
    </div>
  )
}
