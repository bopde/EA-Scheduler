interface Props {
  label: string
  onPrev: () => void
  onNext: () => void
}

export default function WeekNavigator({ label, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
      >
        ← Prev
      </button>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        onClick={onNext}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
      >
        Next →
      </button>
    </div>
  )
}
