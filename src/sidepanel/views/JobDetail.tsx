import { useEffect, useState } from 'react'
import type { PageContext } from '../../shared/pageContext'
import type { SavedJob, ScrapedJobPage } from '../../shared/jobTypes'
import {
  buildPrompt,
  DEFAULT_PROMPT_OPTIONS,
  type PromptOptions,
} from '../../shared/prompt'
import { MAX_SAVED_JOBS, STORAGE_KEYS } from '../../shared/constants'

export function JobDetail({
  context,
  onPromptReady,
}: {
  context: PageContext
  onPromptReady: (prompt: string) => void
}) {
  const [jobInputMode, setJobInputMode] = useState<'scan' | 'paste'>('scan')
  const [pastedJob, setPastedJob] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scraped, setScraped] = useState<ScrapedJobPage | null>(null)
  const [options, setOptions] = useState<PromptOptions>(DEFAULT_PROMPT_OPTIONS)

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.promptOptions).then((data) => {
      const stored = data[STORAGE_KEYS.promptOptions] as PromptOptions | undefined
      if (stored) setOptions({ ...DEFAULT_PROMPT_OPTIONS, ...stored })
    })
  }, [])

  const updateOption = <K extends keyof PromptOptions>(
    key: K,
    value: PromptOptions[K],
  ) => {
    const next = { ...options, [key]: value }
    setOptions(next)
    chrome.storage.local.set({ [STORAGE_KEYS.promptOptions]: next })
  }

  const getActiveProfile = async (): Promise<unknown> => {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.profile,
      STORAGE_KEYS.manualProfile,
      STORAGE_KEYS.profileInputMode,
    ])
    const mode = data[STORAGE_KEYS.profileInputMode] as string | undefined
    if (mode === 'manual') {
      const text = data[STORAGE_KEYS.manualProfile] as string | undefined
      return text?.trim() ? { rawText: text } : null
    }
    return (data[STORAGE_KEYS.profile] as unknown) ?? null
  }

  const scanJob = async () => {
    if (context.kind !== 'job') return
    setBusy(true)
    setError(null)
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'SCRAPE_JOB',
        tabId: context.tabId,
      })
      if (!res?.ok) throw new Error(res?.error ?? 'Scrape failed')
      const job = res.data as ScrapedJobPage
      setScraped(job)
      await saveJob(job)
      const profile = await getActiveProfile()
      onPromptReady(buildPrompt(profile, job, options))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const generateFromPaste = async () => {
    if (!pastedJob.trim()) return
    setBusy(true)
    setError(null)
    try {
      const job: ScrapedJobPage = {
        cipherId: null,
        jobUrl: '',
        title: null,
        description: pastedJob.trim(),
        postedAgo: null,
        jobType: null,
        workload: null,
        rateMin: null,
        rateMax: null,
        fixedBudget: null,
        duration: null,
        experienceLevel: null,
        projectType: null,
        englishLevel: null,
        skillsMandatory: [],
        skillsNiceToHave: [],
        questions: [],
        client: {
          paymentVerified: false,
          phoneVerified: false,
          country: null,
          city: null,
          industry: null,
          companySize: null,
          jobPostingStats: null,
          memberSince: null,
        },
        scrapedAt: Date.now(),
      }
      const profile = await getActiveProfile()
      onPromptReady(buildPrompt(profile, job, options))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onJobPage = context.kind === 'job'

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Prompt options
        </p>
        <div className="space-y-2">
          <ToggleRow
            label="Allow filling the gaps"
            description="LLM may extrapolate adjacent experience beyond strict profile facts. Useful when the client only needs to know I can do the job."
            checked={options.allowFillingGaps}
            onChange={(v) => updateOption('allowFillingGaps', v)}
          />
          <ToggleRow
            label="Differentiation mode"
            description="LLM imagines what 5 other freelancers would write and tries to avoid the median. Higher variance, more original output."
            checked={options.differentiationMode}
            onChange={(v) => updateOption('differentiationMode', v)}
          />
          <ToggleRow
            label="Apply as an agency"
            description="Shifts pronouns to we/our and frames the profile as agency case studies. Requires agency info below."
            checked={options.applyAsAgency}
            onChange={(v) => updateOption('applyAsAgency', v)}
          />
        </div>

        {options.applyAsAgency && (
          <div className="mt-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                Agency info
              </span>
              <textarea
                value={options.agencyInfo}
                onChange={(e) => updateOption('agencyInfo', e.target.value)}
                rows={5}
                placeholder="Agency name, team size, specializations, named experts, past wins. Used verbatim in the proposal."
                className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
              />
            </label>
            {options.applyAsAgency && !options.agencyInfo.trim() && (
              <p className="mt-1 text-[10px] text-amber-400">
                Agency mode is on but agency info is empty. Add details or it won't activate.
              </p>
            )}
          </div>
        )}

        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Custom prompt instructions
              <span className="ml-1 text-neutral-600">(persists across jobs)</span>
            </span>
            <textarea
              value={options.customPrompt}
              onChange={(e) => updateOption('customPrompt', e.target.value)}
              rows={3}
              placeholder='Extra instructions for the LLM, e.g. "emphasize my Stripe work", "keep cover letter under 120 words", "include a one-line cost comparison vs custom build".'
              className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-neutral-600 focus:outline-none"
            />
          </label>
        </div>
      </div>

      <div className="flex rounded-lg border border-neutral-800 bg-neutral-950 p-0.5">
        <button
          onClick={() => setJobInputMode('scan')}
          className={`flex-1 rounded py-1.5 text-[11px] font-medium transition ${
            jobInputMode === 'scan'
              ? 'bg-neutral-800 text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Scan Page
        </button>
        <button
          onClick={() => setJobInputMode('paste')}
          className={`flex-1 rounded py-1.5 text-[11px] font-medium transition ${
            jobInputMode === 'paste'
              ? 'bg-neutral-800 text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Paste Job
        </button>
      </div>

      {jobInputMode === 'scan' ? (
        <>
          {onJobPage ? (
            <>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Detected job
                </p>
                <p className="mt-1 break-all text-xs text-neutral-300">{context.url}</p>
              </div>
              <button
                disabled={busy}
                onClick={scanJob}
                className="w-full rounded-md bg-upwork-500 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-upwork-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Scanning…' : 'Scan Job'}
              </button>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-800 p-4 text-center">
              <p className="text-xs font-medium text-neutral-300">No job page detected</p>
              <p className="mt-1 text-[11px] text-neutral-500">
                Open an Upwork job posting to enable Scan Job, or switch to{' '}
                <button
                  onClick={() => setJobInputMode('paste')}
                  className="text-upwork-400 underline-offset-2 hover:underline"
                >
                  Paste Job
                </button>{' '}
                to paste a description from any platform.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Job description
          </p>
          <p className="mb-2 text-[11px] text-neutral-500">
            Paste the full job posting from any platform — Upwork, Freelancer, Toptal, LinkedIn, or
            anywhere else.
          </p>
          <textarea
            value={pastedJob}
            onChange={(e) => setPastedJob(e.target.value)}
            rows={10}
            placeholder="Paste the job description here. Include the title, requirements, budget, and any screening questions if present."
            className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
          <button
            disabled={busy || !pastedJob.trim()}
            onClick={generateFromPaste}
            className="mt-2 w-full rounded-md bg-upwork-500 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-upwork-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Generating…' : 'Generate Prompt'}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {scraped && jobInputMode === 'scan' && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Last scrape</p>
          <p className="mt-1 font-medium text-neutral-100">{scraped.title ?? '(no title)'}</p>
          <p className="mt-0.5 text-[10px] text-neutral-500">
            {[scraped.jobType, scraped.workload, scraped.duration].filter(Boolean).join(' · ')}
          </p>
          {(scraped.rateMin || scraped.rateMax) && (
            <p className="mt-0.5 text-[11px] text-neutral-300">
              Rate: {scraped.rateMin}
              {scraped.rateMax ? ` – ${scraped.rateMax}` : ''}
            </p>
          )}
          {scraped.skillsMandatory.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {scraped.skillsMandatory.map((s) => (
                <span
                  key={s}
                  className="rounded bg-upwork-500/15 px-1.5 py-0.5 text-[10px] text-upwork-300"
                >
                  {s}
                </span>
              ))}
              {scraped.skillsNiceToHave.map((s) => (
                <span
                  key={s}
                  className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

async function saveJob(job: ScrapedJobPage) {
  const key = STORAGE_KEYS.savedJobs
  const stored = (await chrome.storage.local.get(key))[key] as SavedJob[] | undefined
  const existing = stored ?? []
  const matchKey = (j: SavedJob) =>
    j.cipherId ? j.cipherId === job.cipherId : j.jobUrl === job.jobUrl
  const prev = existing.find(matchKey)
  const filtered = existing.filter((j) => !matchKey(j))
  const next: SavedJob[] = [
    {
      ...job,
      savedAt: Date.now(),
      status: prev?.status,
      notes: prev?.notes,
    },
    ...filtered,
  ].slice(0, MAX_SAVED_JOBS)
  await chrome.storage.local.set({ [key]: next })
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md p-1 hover:bg-neutral-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-3.5 accent-upwork-500"
      />
      <span className="flex-1">
        <span className="block text-xs font-medium text-neutral-100">{label}</span>
        <span className="mt-0.5 block text-[10px] text-neutral-500">{description}</span>
      </span>
    </label>
  )
}
