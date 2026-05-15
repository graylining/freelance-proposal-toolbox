import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Dashboard } from './views/Dashboard'
import { JobDetail } from './views/JobDetail'
import { PromptOutput } from './views/PromptOutput'
import { ProfileEditor } from './views/ProfileEditor'
import { Filters } from './views/Filters'
import { About } from './views/About'
import { Settings } from './views/Settings'
import { detectPageContext, type PageContext } from '../shared/pageContext'
import { DEFAULT_THEME, STORAGE_KEYS, type Theme } from '../shared/constants'

type View = 'dashboard' | 'profile' | 'filters' | 'job' | 'prompt' | 'settings' | 'about'

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

  useEffect(() => {
    const applyTheme = (t: Theme) => {
      document.documentElement.classList.toggle('light', t === 'light')
      document.documentElement.classList.toggle('dark', t === 'dark')
    }

    chrome.storage.local.get(STORAGE_KEYS.theme).then((data) => {
      applyTheme((data[STORAGE_KEYS.theme] as Theme | undefined) ?? DEFAULT_THEME)
    })

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.theme in changes) {
        applyTheme(
          (changes[STORAGE_KEYS.theme]?.newValue as Theme | undefined) ?? DEFAULT_THEME,
        )
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <Header view={view} onNavigate={setView} />
      <main className="flex-1 overflow-y-auto p-4">
        {view === 'dashboard' && (
          <Dashboard
            context={context}
            onOpenJob={() => setView('job')}
          />
        )}
        {view === 'profile' && <ProfileEditor context={context} />}
        {view === 'filters' && <Filters />}
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
        {view === 'settings' && <Settings />}
        {view === 'about' && <About />}
      </main>
    </div>
  )
}

const TABS: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profile', label: 'Profile' },
  { id: 'filters', label: 'Filters' },
  { id: 'job', label: 'Job' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'settings', label: 'Settings' },
  { id: 'about', label: 'About' },
]

const TAB_GAP_PX = 4
const DOTS_BTN_PX = 32

function Header({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const version = chrome.runtime.getManifest().version
  const navRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const dotsWrapRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(TABS.length)
  const [menuOpen, setMenuOpen] = useState(false)

  useLayoutEffect(() => {
    if (!navRef.current || !measureRef.current) return

    const measureBtns = Array.from(
      measureRef.current.querySelectorAll<HTMLButtonElement>('button'),
    )

    const recompute = () => {
      const containerWidth = navRef.current!.clientWidth
      const widths = measureBtns.map((b) => b.offsetWidth)

      // can all tabs fit without dots?
      const totalAll =
        widths.reduce((a, b) => a + b, 0) + TAB_GAP_PX * Math.max(0, widths.length - 1)
      if (totalAll <= containerWidth) {
        setVisibleCount(widths.length)
        return
      }

      // need dots; reserve room for it
      const reserved = DOTS_BTN_PX + TAB_GAP_PX
      let used = 0
      let count = 0
      for (let i = 0; i < widths.length; i++) {
        const w = widths[i] + (i > 0 ? TAB_GAP_PX : 0)
        if (used + w + reserved > containerWidth) break
        used += w
        count += 1
      }
      setVisibleCount(count)
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (!dotsWrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  const visibleTabs = TABS.slice(0, visibleCount)
  const overflowTabs = TABS.slice(visibleCount)
  const activeIsOverflow = overflowTabs.some((t) => t.id === view)

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-tight text-neutral-100">
          Freelance Proposal Sidekick
        </h1>
        <button
          onClick={() => onNavigate('about')}
          className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
          title="About"
        >
          v{version}
        </button>
      </div>

      {/* Hidden measurement layer: same classes as visible tabs so widths match */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute -left-2499.75 top-0 flex gap-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap"
          >
            {t.label}
          </button>
        ))}
      </div>

      <nav ref={navRef} className="relative mt-3 flex items-center gap-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
              view === t.id
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
            }`}
          >
            {t.label}
          </button>
        ))}

        {overflowTabs.length > 0 && (
          <div ref={dotsWrapRef} className="relative ml-auto shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="More tabs"
              className={`flex h-7 w-7 items-center justify-center rounded-md text-base font-bold leading-none transition ${
                activeIsOverflow || menuOpen
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
              }`}
            >
              ⋯
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-35 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 shadow-lg"
              >
                {overflowTabs.map((t) => (
                  <button
                    key={t.id}
                    role="menuitem"
                    onClick={() => {
                      onNavigate(t.id)
                      setMenuOpen(false)
                    }}
                    className={`block w-full px-3 py-2 text-left text-xs font-medium transition ${
                      view === t.id
                        ? 'bg-neutral-800 text-neutral-100'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
