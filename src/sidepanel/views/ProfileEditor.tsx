import { useEffect, useMemo, useState } from 'react'
import type { ScrapedProfile } from '../../shared/profileTypes'
import { STORAGE_KEYS } from '../../shared/constants'
import { API_BASE } from '../../shared/api'

const TEXT_FIELDS: Array<{
  key: keyof ScrapedProfile
  label: string
  multiline?: boolean
}> = [
  { key: 'name', label: 'Name' },
  { key: 'headline', label: 'Headline' },
  { key: 'hourlyRate', label: 'Hourly Rate' },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description', multiline: true },
  { key: 'jobSuccessScore', label: 'Job Success Score' },
  { key: 'totalEarnings', label: 'Total Earnings' },
  { key: 'totalJobs', label: 'Total Jobs' },
  { key: 'totalHours', label: 'Total Hours' },
  { key: 'hoursPerWeek', label: 'Hours per Week' },
]

const LIST_FIELDS: Array<{ key: keyof ScrapedProfile; label: string }> = [
  { key: 'languages', label: 'Languages' },
  { key: 'skills', label: 'Skills' },
  { key: 'softSkills', label: 'Soft Skills' },
  { key: 'employmentHistory', label: 'Employment History' },
  { key: 'otherExperiences', label: 'Other Experiences' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'testimonials', label: 'Testimonials' },
]

export function ProfileEditor() {
  const [profile, setProfile] = useState<ScrapedProfile | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.profile).then((data) => {
      const p = data[STORAGE_KEYS.profile] as ScrapedProfile | undefined
      if (!p) return
      setProfile(p)
      setDraft(initialDraft(p))
    })
  }, [])

  const dirty = useMemo(
    () => profile && JSON.stringify(initialDraft(profile)) !== JSON.stringify(draft),
    [profile, draft],
  )

  const reset = () => {
    if (profile) setDraft(initialDraft(profile))
    setStatus(null)
  }

  const save = async () => {
    if (!profile) return
    setSaving(true)
    setStatus(null)
    try {
      const patch = draftToPatch(draft)
      const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(profile.upworkId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
      const json = (await res.json()) as { profile: ScrapedProfile; syncedAt: number }
      setProfile(json.profile)
      setDraft(initialDraft(json.profile))
      await chrome.storage.local.set({
        [STORAGE_KEYS.profile]: json.profile,
        [STORAGE_KEYS.profileSyncedAt]: json.syncedAt,
      })
      setStatus({ kind: 'ok', msg: 'Saved' })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-center">
        <p className="text-sm font-medium text-neutral-200">No profile saved yet</p>
        <p className="mt-1 text-xs text-neutral-500">
          Open your Upwork profile and click Sync Profile from the Dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-16">
      <header className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-100">
            {profile.name ?? '(unnamed)'}
          </p>
          <p className="truncate text-[11px] text-neutral-500">
            {profile.upworkId} · personId {profile.personId ?? '—'}
          </p>
        </div>
      </header>

      <Section title="Basics">
        {TEXT_FIELDS.map((f) => (
          <Field
            key={f.key as string}
            label={f.label}
            value={draft[f.key as string] ?? ''}
            onChange={(v) => setDraft({ ...draft, [f.key as string]: v })}
            multiline={f.multiline}
          />
        ))}
      </Section>

      <Section title="Lists (one per line)">
        {LIST_FIELDS.map((f) => (
          <Field
            key={f.key as string}
            label={f.label}
            value={draft[f.key as string] ?? ''}
            onChange={(v) => setDraft({ ...draft, [f.key as string]: v })}
            multiline
            rows={Math.min(8, Math.max(3, (draft[f.key as string] ?? '').split('\n').length))}
          />
        ))}
      </Section>

      <Section title={`Client Feedback (${profile.clientFeedback?.length ?? 0})`}>
        {(profile.clientFeedback ?? []).length === 0 ? (
          <Empty>No client feedback captured.</Empty>
        ) : (
          <ul className="space-y-2">
            {profile.clientFeedback.map((f, i) => (
              <li key={i} className="rounded-md border border-neutral-800 bg-neutral-900 p-2">
                <p className="text-xs font-medium text-neutral-100">{f.jobTitle}</p>
                <p className="mt-0.5 text-[10px] text-neutral-500">
                  {f.rating ? `★ ${f.rating}` : ''} {f.period ? `· ${f.period}` : ''}
                </p>
                {f.feedback && (
                  <p className="mt-1 text-[11px] leading-snug text-neutral-300">{f.feedback}</p>
                )}
                {f.freelancerResponse && (
                  <p className="mt-1 border-l-2 border-emerald-500/40 pl-2 text-[11px] italic text-neutral-400">
                    {f.freelancerResponse}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Portfolio (${profile.portfolioProjects?.length ?? 0})`}>
        {profile.portfolioFetchError && (
          <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
            {profile.portfolioFetchError}
          </p>
        )}
        {(profile.portfolioProjects ?? []).length === 0 ? (
          <Empty>No portfolio projects.</Empty>
        ) : (
          <ul className="space-y-2">
            {profile.portfolioProjects.map((p) => (
              <li key={p.id} className="rounded-md border border-neutral-800 bg-neutral-900 p-2">
                <p className="text-xs font-medium text-neutral-100">{p.title ?? '(untitled)'}</p>
                {p.role && <p className="text-[10px] text-neutral-500">{p.role}</p>}
                {p.description && (
                  <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-neutral-300">
                    {p.description}
                  </p>
                )}
                {p.skills.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-2 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        {status && (
          <span
            className={`text-[11px] ${
              status.kind === 'ok' ? 'text-emerald-400' : 'text-red-300'
            }`}
          >
            {status.msg}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={reset}
            disabled={!dirty || saving}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function initialDraft(p: ScrapedProfile): Record<string, string> {
  const d: Record<string, string> = {}
  for (const f of TEXT_FIELDS) d[f.key as string] = (p[f.key] as string | null) ?? ''
  for (const f of LIST_FIELDS) {
    const list = (p[f.key] as string[] | undefined) ?? []
    d[f.key as string] = list.join('\n')
  }
  return d
}

function draftToPatch(d: Record<string, string>): Partial<ScrapedProfile> {
  const out: Record<string, unknown> = {}
  for (const f of TEXT_FIELDS) {
    const v = d[f.key as string]?.trim() ?? ''
    out[f.key as string] = v === '' ? null : v
  }
  for (const f of LIST_FIELDS) {
    out[f.key as string] = (d[f.key as string] ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return out as Partial<ScrapedProfile>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-neutral-500">{children}</p>
}

function Field({
  label,
  value,
  onChange,
  multiline,
  rows,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          rows={rows ?? 3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
        />
      )}
    </label>
  )
}
