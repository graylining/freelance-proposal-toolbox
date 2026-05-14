import { useEffect, useState } from 'react'
import { DEFAULT_THEME, STORAGE_KEYS, type Theme } from '../../shared/constants'

export function Settings() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [stats, setStats] = useState<{ jobs: number; profileSyncedAt: number | null }>({
    jobs: 0,
    profileSyncedAt: null,
  })

  useEffect(() => {
    const load = () =>
      chrome.storage.local
        .get([STORAGE_KEYS.theme, STORAGE_KEYS.savedJobs, STORAGE_KEYS.profileSyncedAt])
        .then((data) => {
          setTheme((data[STORAGE_KEYS.theme] as Theme | undefined) ?? DEFAULT_THEME)
          const jobs = (data[STORAGE_KEYS.savedJobs] as unknown[] | undefined) ?? []
          setStats({
            jobs: jobs.length,
            profileSyncedAt:
              (data[STORAGE_KEYS.profileSyncedAt] as number | undefined) ?? null,
          })
        })
    load()
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area !== 'local') return
      if (
        STORAGE_KEYS.savedJobs in changes ||
        STORAGE_KEYS.profileSyncedAt in changes ||
        STORAGE_KEYS.theme in changes
      )
        load()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const updateTheme = (next: Theme) => {
    setTheme(next)
    chrome.storage.local.set({ [STORAGE_KEYS.theme]: next })
  }

  const [confirmingClear, setConfirmingClear] = useState(false)
  const clearJobs = async () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      setTimeout(() => setConfirmingClear(false), 3000)
      return
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.savedJobs]: [] })
    setConfirmingClear(false)
  }

  return (
    <div className="space-y-4">
      <Card title="Appearance">
        <div className="flex gap-2">
          <ThemeButton
            label="Dark"
            active={theme === 'dark'}
            onClick={() => updateTheme('dark')}
          />
          <ThemeButton
            label="Light"
            active={theme === 'light'}
            onClick={() => updateTheme('light')}
          />
        </div>
      </Card>

      <Card title="Storage">
        <p className="text-[11px] text-neutral-300">
          Saved jobs: <span className="font-medium text-neutral-100">{stats.jobs}</span>
        </p>
        <p className="mt-1 text-[11px] text-neutral-300">
          Profile synced:{' '}
          <span className="font-medium text-neutral-100">
            {stats.profileSyncedAt
              ? new Date(stats.profileSyncedAt).toLocaleString()
              : 'never'}
          </span>
        </p>
        <p className="mt-2 text-[10px] text-neutral-500">
          Everything lives in <code className="text-neutral-400">chrome.storage.local</code>. No backend.
        </p>
        <button
          onClick={clearJobs}
          disabled={stats.jobs === 0}
          className={`mt-3 w-full rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            confirmingClear
              ? 'border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25'
              : 'border-neutral-700 text-neutral-300 hover:border-red-500/40 hover:text-red-300'
          }`}
          title="Wipe the saved jobs cache"
        >
          {confirmingClear ? 'Click again to confirm' : 'Clear all jobs cache'}
        </button>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ThemeButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-upwork-500/50 bg-upwork-500/15 text-upwork-300'
          : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
      }`}
    >
      {label}
    </button>
  )
}
