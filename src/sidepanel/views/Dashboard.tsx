import { useEffect, useState } from 'react'
import type { PageContext } from '../../shared/pageContext'
import type { ScrapedProfile } from '../../shared/profileTypes'
import type { ScrapedJobPage } from '../../shared/jobTypes'
import { STORAGE_KEYS } from '../../shared/constants'

type SavedJob = ScrapedJobPage & { savedAt: number }

export function Dashboard({
  context,
  onOpenJob,
}: {
  context: PageContext
  onOpenJob: () => void
}) {
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [profile, setProfile] = useState<ScrapedProfile | null>(null)
  const [profileSyncedAt, setProfileSyncedAt] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    const load = () =>
      chrome.storage.local
        .get([
          STORAGE_KEYS.savedJobs,
          STORAGE_KEYS.profile,
          STORAGE_KEYS.profileSyncedAt,
        ])
        .then((data) => {
          setJobs((data[STORAGE_KEYS.savedJobs] as SavedJob[] | undefined) ?? [])
          setProfile(
            (data[STORAGE_KEYS.profile] as ScrapedProfile | null | undefined) ??
              null,
          )
          setProfileSyncedAt(
            (data[STORAGE_KEYS.profileSyncedAt] as number | null | undefined) ??
              null,
          )
        })
    load()
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.savedJobs in changes) load()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const syncProfile = async () => {
    if (context.kind !== 'profile') return
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'SYNC_PROFILE',
        tabId: context.tabId,
      })
      if (!res?.ok) throw new Error(res?.error ?? 'Sync failed')
      setProfile(res.profile as ScrapedProfile)
      setProfileSyncedAt(res.syncedAt as number)
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-100">Profile Sync</p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {profileSyncedAt
                ? `Last synced ${new Date(profileSyncedAt).toLocaleString()}`
                : 'Never synced'}
            </p>
            {profile?.name && (
              <p className="mt-2 truncate text-xs text-neutral-300">
                <span className="text-neutral-500">Stored:</span> {profile.name}
                {profile.headline ? ` — ${profile.headline}` : ''}
              </p>
            )}
            {syncError && (
              <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-300">
                {syncError}
              </p>
            )}
          </div>
          <button
            onClick={syncProfile}
            disabled={context.kind !== 'profile' || syncing}
            className="shrink-0 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            title={
              context.kind !== 'profile'
                ? 'Open an Upwork freelancer profile page first'
                : 'Scrape this profile and save it locally'
            }
          >
            {syncing ? 'Syncing…' : 'Sync Profile'}
          </button>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-100">
            Recent Jobs {jobs.length > 0 && <span className="text-neutral-500">({jobs.length})</span>}
          </p>
          {context.kind === 'job' && (
            <button
              onClick={onOpenJob}
              className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30"
            >
              Scan current
            </button>
          )}
        </div>
        {jobs.length === 0 ? (
          <p className="text-xs text-neutral-500">
            No jobs scanned yet. Open an Upwork job page and click Scan Job.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.slice(0, 12).map((j) => (
              <li
                key={j.cipherId ?? j.jobUrl}
                className="rounded-md border border-neutral-800 bg-neutral-900 p-2"
              >
                <a
                  href={j.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-1 text-xs font-medium text-neutral-100 hover:text-emerald-300"
                >
                  {j.title ?? '(untitled)'}
                </a>
                <p className="mt-0.5 text-[10px] text-neutral-500">
                  {[j.jobType, j.workload, j.duration]
                    .filter(Boolean)
                    .join(' · ') || '—'}{' '}
                  · {new Date(j.savedAt).toLocaleString()}
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
