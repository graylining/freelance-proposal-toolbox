import { useEffect, useState } from 'react'
import type { PageContext } from '../../shared/pageContext'
import type { JobStatus, SavedJob } from '../../shared/jobTypes'
import { STORAGE_KEYS } from '../../shared/constants'

const STATUS_CONFIG: Record<JobStatus, { label: string; active: string }> = {
  drafted:    { label: 'Drafted',    active: 'border-neutral-600 bg-neutral-800 text-neutral-300' },
  submitted:  { label: 'Submitted',  active: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  'in-talks': { label: 'In Talks',   active: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  won:        { label: 'Won',        active: 'border-upwork-500/40 bg-upwork-500/10 text-upwork-300' },
  passed:     { label: 'Passed',     active: 'border-neutral-700 bg-neutral-900 text-neutral-500' },
}

const STATUSES = Object.keys(STATUS_CONFIG) as JobStatus[]

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

  const patchJob = async (
    jobKey: string,
    patch: Partial<Pick<SavedJob, 'status' | 'notes'>>,
  ) => {
    setJobs((prev) =>
      prev.map((j) => ((j.cipherId ?? j.jobUrl) === jobKey ? { ...j, ...patch } : j)),
    )
    const data = await chrome.storage.local.get(STORAGE_KEYS.savedJobs)
    const existing = (data[STORAGE_KEYS.savedJobs] as SavedJob[] | undefined) ?? []
    const next = existing.map((j) =>
      (j.cipherId ?? j.jobUrl) === jobKey ? { ...j, ...patch } : j,
    )
    await chrome.storage.local.set({ [STORAGE_KEYS.savedJobs]: next })
  }

  const removeJob = async (key: string) => {
    const data = await chrome.storage.local.get(STORAGE_KEYS.savedJobs)
    const existing = (data[STORAGE_KEYS.savedJobs] as SavedJob[] | undefined) ?? []
    await chrome.storage.local.set({
      [STORAGE_KEYS.savedJobs]: existing.filter((j) => (j.cipherId ?? j.jobUrl) !== key),
    })
  }

  const toggleStatus = (jobKey: string, status: JobStatus, current: JobStatus | undefined) =>
    patchJob(jobKey, { status: current === status ? undefined : status })

  const contextColor =
    context.kind === 'job'
      ? 'bg-upwork-500/15 text-upwork-300'
      : context.kind === 'profile'
        ? 'bg-sky-500/15 text-sky-300'
        : 'bg-neutral-700/50 text-neutral-400'

  const statusCounts = STATUSES.reduce<Partial<Record<JobStatus, number>>>((acc, s) => {
    const n = jobs.filter((j) => j.status === s).length
    if (n > 0) acc[s] = n
    return acc
  }, {})
  const hasPipeline = Object.keys(statusCounts).length > 0

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
            Recent Jobs{' '}
            {jobs.length > 0 && <span className="text-neutral-500">({jobs.length})</span>}
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

        {hasPipeline && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {STATUSES.filter((s) => statusCounts[s]).map((s) => (
              <span
                key={s}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[s].active}`}
              >
                {STATUS_CONFIG[s].label} {statusCounts[s]}
              </span>
            ))}
          </div>
        )}

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
                  className="rounded-md border border-neutral-800 bg-neutral-900 p-2"
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => removeJob(key)}
                      className="mt-0.5 shrink-0 rounded p-0.5 text-neutral-600 hover:bg-red-500/15 hover:text-red-400"
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
                        {[j.jobType, j.workload, j.duration].filter(Boolean).join(' · ') || '—'}
                        {' · '}
                        {new Date(j.savedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {STATUSES.map((s) => {
                      const active = j.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => toggleStatus(key, s, j.status)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                            active
                              ? STATUS_CONFIG[s].active
                              : 'border-neutral-800 text-neutral-600 hover:border-neutral-700 hover:text-neutral-400'
                          }`}
                        >
                          {STATUS_CONFIG[s].label}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    key={key}
                    defaultValue={j.notes ?? ''}
                    onBlur={(e) => {
                      const val = e.target.value.trim()
                      if (val !== (j.notes ?? '').trim()) {
                        patchJob(key, { notes: val || undefined })
                      }
                    }}
                    rows={1}
                    placeholder="Add a note…"
                    className="mt-2 w-full resize-y rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-[11px] text-neutral-300 placeholder-neutral-700 focus:border-neutral-600 focus:outline-none"
                  />
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
