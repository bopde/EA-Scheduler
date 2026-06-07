import { useSessionStore } from './store/sessionStore'
import SetupPage from './components/setup/SetupPage'
import SchedulerPage from './components/scheduler/SchedulerPage'
import { Config, Member } from './types'

export default function App() {
  const { scriptUrl, selectedMember, memberRole, config, setConnection, setSelectedMember, clearMember } =
    useSessionStore()

  const isReady = Boolean(scriptUrl && selectedMember && config)

  function handleReady(
    url: string,
    cfg: Config,
    members: Member[],
    name: string,
    role: 'member' | 'coordinator' | 'project_lead',
  ) {
    setConnection(url, cfg, members)
    setSelectedMember(name, role)
  }

  if (!isReady) {
    return <SetupPage onReady={handleReady} />
  }

  return (
    <SchedulerPage
      scriptUrl={scriptUrl}
      memberName={selectedMember}
      memberRole={memberRole}
      config={config!}
      onLogout={clearMember}
    />
  )
}
