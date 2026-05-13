import { useEffect, useMemo, useState } from 'react'
import {
  buildSearchUrl,
  countActiveFilters,
  DEFAULT_FILTERS,
  type AmountBracket,
  type ClientHires,
  type ContractorTier,
  type Duration,
  type JobFilters,
  type JobType,
  type Location,
  type ProposalsBracket,
  type Sort,
  type Workload,
} from '../../shared/jobFilters'
import { STORAGE_KEYS } from '../../shared/constants'

const JOB_TYPE_OPTIONS: Array<{ value: JobType; label: string }> = [
  { value: '0', label: 'Hourly' },
  { value: '1', label: 'Fixed-price' },
]

const TIER_OPTIONS: Array<{ value: ContractorTier; label: string }> = [
  { value: '1', label: 'Entry' },
  { value: '2', label: 'Intermediate' },
  { value: '3', label: 'Expert' },
]

const AMOUNT_OPTIONS: Array<{ value: AmountBracket; label: string }> = [
  { value: '0-99', label: '$0–99' },
  { value: '100-499', label: '$100–499' },
  { value: '500-999', label: '$500–999' },
  { value: '1000-4999', label: '$1k–5k' },
  { value: '5000-', label: '$5k+' },
]

const CLIENT_HIRES_OPTIONS: Array<{ value: ClientHires; label: string }> = [
  { value: '0', label: 'No hires' },
  { value: '1-9', label: '1–9 hires' },
  { value: '10-', label: '10+ hires' },
]

const PROPOSALS_OPTIONS: Array<{ value: ProposalsBracket; label: string }> = [
  { value: '0-4', label: '< 5' },
  { value: '5-9', label: '5–10' },
  { value: '10-14', label: '10–15' },
  { value: '15-19', label: '15–20' },
  { value: '20-49', label: '20–50' },
]

const DURATION_OPTIONS: Array<{ value: Duration; label: string }> = [
  { value: 'week', label: '< 1 week' },
  { value: 'month', label: '1–3 months' },
  { value: 'semester', label: '3–6 months' },
  { value: 'ongoing', label: 'Ongoing' },
]

const WORKLOAD_OPTIONS: Array<{ value: Workload; label: string }> = [
  { value: 'as_needed', label: 'As needed' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'full_time', label: 'Full-time' },
]

const LOCATION_OPTIONS: Array<{ value: Location; label: string }> = [
  { value: '', label: 'Any' },
  { value: 'Americas', label: 'Americas' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Africa', label: 'Africa' },
  { value: 'Oceania', label: 'Oceania' },
]

const SORT_OPTIONS: Array<{ value: Sort; label: string }> = [
  { value: 'recency', label: 'Most recent' },
  { value: 'relevance', label: 'Most relevant' },
]

export function Filters() {
  const [draft, setDraft] = useState<JobFilters>(DEFAULT_FILTERS)
  const [saved, setSaved] = useState<JobFilters>(DEFAULT_FILTERS)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.jobFilters).then((data) => {
      const stored = (data[STORAGE_KEYS.jobFilters] as JobFilters | undefined) ?? DEFAULT_FILTERS
      const merged = { ...DEFAULT_FILTERS, ...stored }
      setDraft(merged)
      setSaved(merged)
      setLoaded(true)
    })
  }, [])

  const url = useMemo(() => buildSearchUrl(draft), [draft])
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  )
  const activeCount = useMemo(() => countActiveFilters(draft), [draft])

  const update = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const toggle = <T extends string>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const save = async () => {
    setStatus(null)
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.jobFilters]: draft })
      setSaved(draft)
      setStatus({ kind: 'ok', msg: 'Saved' })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : String(e) })
    }
  }

  const reset = () => {
    setDraft(saved)
    setStatus(null)
  }

  const openInUpwork = () => chrome.tabs.create({ url })

  if (!loaded) return null

  return (
    <div className="space-y-4 pb-20">
      <Section title={`URL Preview (${activeCount} active filter${activeCount === 1 ? '' : 's'})`}>
        <p className="break-all rounded-md border border-neutral-800 bg-neutral-950 p-2 font-mono text-[10px] leading-relaxed text-neutral-300">
          {url}
        </p>
        <button
          onClick={openInUpwork}
          className="mt-2 w-full rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
        >
          Open in Upwork →
        </button>
      </Section>

      <Section title="Search">
        <Field label="Search query (q)">
          <input
            type="text"
            value={draft.q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="e.g. python, react, ai"
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
          />
        </Field>
        <Field label="Sort">
          <select
            value={draft.sort}
            onChange={(e) => update('sort', e.target.value as Sort)}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Job">
        <ChipGroup
          label="Type"
          options={JOB_TYPE_OPTIONS}
          selected={draft.jobType}
          onToggle={(v) => update('jobType', toggle(draft.jobType, v))}
        />
        <ChipGroup
          label="Experience level"
          options={TIER_OPTIONS}
          selected={draft.contractorTier}
          onToggle={(v) => update('contractorTier', toggle(draft.contractorTier, v))}
        />
        <Field label="Hourly rate ($/hr)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={draft.hourlyRateMin ?? ''}
              onChange={(e) =>
                update('hourlyRateMin', e.target.value === '' ? null : Number(e.target.value))
              }
              placeholder="min"
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
            />
            <span className="text-xs text-neutral-500">to</span>
            <input
              type="number"
              min={0}
              value={draft.hourlyRateMax ?? ''}
              onChange={(e) =>
                update('hourlyRateMax', e.target.value === '' ? null : Number(e.target.value))
              }
              placeholder="max"
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
            />
          </div>
        </Field>
        <ChipGroup
          label="Fixed-price budget"
          options={AMOUNT_OPTIONS}
          selected={draft.amount}
          onToggle={(v) => update('amount', toggle(draft.amount, v))}
        />
        <ChipGroup
          label="Project length"
          options={DURATION_OPTIONS}
          selected={draft.duration}
          onToggle={(v) => update('duration', toggle(draft.duration, v))}
        />
        <ChipGroup
          label="Hours per week"
          options={WORKLOAD_OPTIONS}
          selected={draft.workload}
          onToggle={(v) => update('workload', toggle(draft.workload, v))}
        />
        <ChipGroup
          label="Proposals"
          options={PROPOSALS_OPTIONS}
          selected={draft.proposals}
          onToggle={(v) => update('proposals', toggle(draft.proposals, v))}
        />
      </Section>

      <Section title="Client">
        <ChipGroup
          label="Hire history"
          options={CLIENT_HIRES_OPTIONS}
          selected={draft.clientHires}
          onToggle={(v) => update('clientHires', toggle(draft.clientHires, v))}
        />
        <label className="flex items-center gap-2 text-xs text-neutral-300">
          <input
            type="checkbox"
            checked={draft.paymentVerified}
            onChange={(e) => update('paymentVerified', e.target.checked)}
            className="size-3.5 accent-emerald-500"
          />
          Payment verified only
        </label>
        <Field label="Location">
          <select
            value={draft.location}
            onChange={(e) => update('location', e.target.value as Location)}
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
          >
            {LOCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
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
            disabled={!dirty}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
          <button
            onClick={save}
            disabled={!dirty}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  selected: T[]
  onToggle: (value: T) => void
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                on
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
