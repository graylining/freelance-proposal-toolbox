import { useEffect, useState } from 'react'
import { Dashboard } from './views/Dashboard'
import { JobDetail } from './views/JobDetail'
import { PromptOutput } from './views/PromptOutput'
import { ProfileEditor } from './views/ProfileEditor'
import { detectPageContext, type PageContext } from '../shared/pageContext'

type View = 'dashboard' | 'profile' | 'job' | 'prompt'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [context, setContext] = useState<PageContext>({ kind: 'unknown' })
  const [prompt, setPrompt] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const ctx = await detectPageContext()
      if (!cancelled) setContext(ctx)
    }

    refresh()
    const onTabChange = () => refresh()
    chrome.tabs.onActivated.addListener(onTabChange)
    chrome.tabs.onUpdated.addListener(onTabChange)
    return () => {
      cancelled = true
      chrome.tabs.onActivated.removeListener(onTabChange)
      chrome.tabs.onUpdated.removeListener(onTabChange)
    }
  }, [])

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <Header view={view} onNavigate={setView} context={context} />
      <main className="flex-1 overflow-y-auto p-4">
        {view === 'dashboard' && (
          <Dashboard
            context={context}
            onOpenJob={() => setView('job')}
          />
        )}
        {view === 'profile' && <ProfileEditor />}
        {view === 'job' && (
          <JobDetail
            context={context}
            onPromptReady={(p) => {
              setPrompt(p)
              setView('prompt')
            }}
          />
        )}
        {view === 'prompt' && (
          <PromptOutput
            prompt={prompt}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>
    </div>
  )
}

function Header({
  view,
  onNavigate,
  context,
}: {
  view: View
  onNavigate: (v: View) => void
  context: PageContext
}) {
  const tabs: { id: View; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'Profile' },
    { id: 'job', label: 'Job' },
    { id: 'prompt', label: 'Prompt' },
  ]
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-tight text-neutral-100">
          Upwork Sidekick
        </h1>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            context.kind === 'job'
              ? 'bg-emerald-500/15 text-emerald-300'
              : context.kind === 'profile'
              ? 'bg-sky-500/15 text-sky-300'
              : 'bg-neutral-700/50 text-neutral-400'
          }`}
        >
          {context.kind}
        </span>
      </div>
      <nav className="mt-3 flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              view === t.id
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
