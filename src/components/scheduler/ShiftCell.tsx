import { ShiftInfo } from '../../types'

interface Props {
  available: boolean
  saving: boolean
  shift: ShiftInfo
  onToggle: () => void
}

export default function ShiftCell({ available, saving, shift, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      disabled={saving}
      title={`${shift.start}–${shift.end}`}
      className={[
        'w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors border',
        available
          ? 'bg-emerald-100 border-emerald-400 text-emerald-800 hover:bg-emerald-200'
          : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200',
        saving ? 'opacity-60 cursor-wait' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className="truncate">{shift.start}–{shift.end}</div>
      {available && <div className="text-emerald-600 font-bold text-xs">✓</div>}
    </button>
  )
}
