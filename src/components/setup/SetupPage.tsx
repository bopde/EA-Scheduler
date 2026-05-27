import { useState } from 'react'
import { Config, Member } from '../../types'
import { useSessionStore } from '../../store/sessionStore'
import ScriptUrlInput from './ScriptUrlInput'
import MemberSelector from './MemberSelector'

interface Props {
  onReady: (url: string, config: Config, members: Member[], name: string, role: 'member' | 'coordinator') => void
}

export default function SetupPage({ onReady }: Props) {
  const { scriptUrl: cachedUrl, config: cachedConfig, members: cachedMembers } = useSessionStore()

  const [step, setStep] = useState<'url' | 'name'>(cachedUrl ? 'name' : 'url')
  const [connectedUrl, setConnectedUrl] = useState(cachedUrl)
  const [connectedMembers, setConnectedMembers] = useState<Member[]>(cachedMembers)
  const [connectedConfig, setConnectedConfig] = useState<Config | null>(cachedConfig)

  function handleConnected(url: string, config: Config, members: Member[]) {
    setConnectedUrl(url)
    setConnectedConfig(config)
    setConnectedMembers(members)
    setStep('name')
  }

  function handleSelect(name: string, role: 'member' | 'coordinator') {
    onReady(connectedUrl, connectedConfig!, connectedMembers, name, role)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EA Scheduler</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === 'url'
              ? "Paste your team's Apps Script URL to get started."
              : 'Select your name to view and edit your schedule.'}
          </p>
        </div>

        {step === 'url' && (
          <ScriptUrlInput onConnected={handleConnected} />
        )}

        {step === 'name' && (
          <>
            <MemberSelector members={connectedMembers} onSelect={handleSelect} />
            <button
              onClick={() => setStep('url')}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Use a different URL
            </button>
          </>
        )}
      </div>
    </div>
  )
}
