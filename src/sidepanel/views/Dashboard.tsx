import { useEffect, useState } from 'react'
import type { PageContext } from '../../shared/pageContext'
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

  useEffect(() => {
    const load = () =>
      chrome.storage.local.get(STORAGE_KEYS.savedJobs).then((data) => {
        setJobs((data[STORAGE_KEYS.savedJobs] as SavedJob[] | undefined) ?? [])
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

  const removeJob = async (key: string) => {
    const data = await chrome.storage.local.get(STORAGE_KEYS.savedJobs)
    const existing = (data[STORAGE_KEYS.savedJobs] as SavedJob[] | undefined) ?? []
    const next = existing.filter(
      (j) => (j.cipherId ?? j.jobUrl) !== key,
    )
    await chrome.storage.local.set({ [STORAGE_KEYS.savedJobs]: next })
  }

  const contextColor =
    context.kind === 'job'
      ? 'bg-upwork-500/15 text-upwork-300'
      : context.kind === 'profile'
        ? 'bg-sky-500/15 text-sky-300'
        : 'bg-neutral-700/50 text-neutral-400'

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${contextColor}`}
          >
            {context.kind}
          </span>
          <span className="truncate text-right text-[11px] text-neutral-500">
            {context.kind !== 'unknown' ? context.url : 'no upwork tab active'}
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          <strong className="text-neutral-300">job</strong> enables Scan Job.{' '}
          <strong className="text-neutral-300">profile</strong> enables Sync Profile.
        </p>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-100">
            Recent Jobs {jobs.length > 0 && <span className="text-neutral-500">({jobs.length})</span>}
          </p>
          {context.kind === 'job' && (
            <button
              onClick={onOpenJob}
              className="rounded-md bg-upwork-500/20 px-2 py-1 text-[11px] font-medium text-upwork-300 hover:bg-upwork-500/30"
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
            {jobs.slice(0, 12).map((j) => {
              const key = j.cipherId ?? j.jobUrl
              return (
                <li
                  key={key}
                  className="flex items-start gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-2"
                >
                  <button
                    onClick={() => removeJob(key)}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-neutral-600 hover:bg-red-500/15 hover:text-red-400"
                    aria-label={`Remove ${j.title ?? 'job'} from list`}
                    title="Remove from list"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      className="size-3.5"
                      aria-hidden="true"
                    >
                      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <a
                      href={j.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-1 text-xs font-medium text-neutral-100 hover:text-upwork-300"
                    >
                      {j.title ?? '(untitled)'}
                    </a>
                    <p className="mt-0.5 text-[10px] text-neutral-500">
                      {[j.jobType, j.workload, j.duration]
                        .filter(Boolean)
                        .join(' · ') || '—'}{' '}
                      · {new Date(j.savedAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              )
            })}
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
