import { useEffect, useState } from 'react'
import type { PageContext } from '../../shared/pageContext'
import type { SavedJob } from '../../shared/types'
import { STORAGE_KEYS } from '../../shared/constants'

export function Dashboard({
  context,
  onOpenJob,
}: {
  context: PageContext
  onOpenJob: () => void
}) {
  const [autoScrape, setAutoScrape] = useState(false)
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [profileSyncedAt, setProfileSyncedAt] = useState<number | null>(null)

  useEffect(() => {
    chrome.storage.local
      .get([
        STORAGE_KEYS.autoScrape,
        STORAGE_KEYS.savedJobs,
        STORAGE_KEYS.profileSyncedAt,
      ])
      .then((data) => {
        setAutoScrape(Boolean(data[STORAGE_KEYS.autoScrape]))
        setJobs((data[STORAGE_KEYS.savedJobs] as SavedJob[] | undefined) ?? [])
        setProfileSyncedAt(
          (data[STORAGE_KEYS.profileSyncedAt] as number | null | undefined) ??
            null,
        )
      })
  }, [])

  const toggleAutoScrape = async () => {
    const next = !autoScrape
    setAutoScrape(next)
    await chrome.storage.local.set({ [STORAGE_KEYS.autoScrape]: next })
    chrome.runtime.sendMessage({ type: 'AUTO_SCRAPE_TOGGLE', enabled: next })
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-100">
              Auto-Scrape Mode
            </p>
            <p className="text-xs text-neutral-400">
              Background scrape on a randomized cooldown.
            </p>
          </div>
          <Toggle checked={autoScrape} onChange={toggleAutoScrape} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-100">Profile Sync</p>
            <p className="text-xs text-neutral-400">
              {profileSyncedAt
                ? `Last synced ${new Date(profileSyncedAt).toLocaleString()}`
                : 'Never synced'}
            </p>
          </div>
          <button
            disabled={context.kind !== 'profile'}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            Sync Profile
          </button>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-100">Recent Jobs</p>
          {context.kind === 'job' && (
            <button
              onClick={onOpenJob}
              className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30"
            >
              Capture current
            </button>
          )}
        </div>
        {jobs.length === 0 ? (
          <p className="text-xs text-neutral-500">No jobs captured yet.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.slice(0, 8).map((j) => (
              <li
                key={j.id}
                className="rounded-md border border-neutral-800 bg-neutral-900 p-2"
              >
                <p className="line-clamp-1 text-xs font-medium text-neutral-100">
                  {j.title}
                </p>
                <p className="text-[10px] text-neutral-500">
                  {new Date(j.savedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
      {children}
    </section>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-5 w-9 rounded-full transition ${
        checked ? 'bg-emerald-500' : 'bg-neutral-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}
