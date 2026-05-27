import { useState } from 'react'
import { getConfig, getMembers } from '../../api/gasClient'
import { Config, Member } from '../../types'

interface Props {
  onConnected: (url: string, config: Config, members: Member[]) => void
}

export default function ScriptUrlInput({ onConnected }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const [config, members] = await Promise.all([
        getConfig(trimmed),
        getMembers(trimmed),
      ])
      onConnected(trimmed, config, members)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Check the URL and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Apps Script URL
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://script.google.com/macros/s/..."
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleConnect}
        disabled={loading || !url.trim()}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  )
}
