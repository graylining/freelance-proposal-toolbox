import { useState } from 'react'
import type { PageContext } from '../../shared/pageContext'
import { buildPrompt } from '../../shared/prompt'

export function JobDetail({
  context,
  onPromptReady,
}: {
  context: PageContext
  onPromptReady: (prompt: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (context.kind !== 'job') {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-center">
        <p className="text-sm font-medium text-neutral-200">
          No job page detected
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Open an Upwork job posting to capture it.
        </p>
      </div>
    )
  }

  const generate = async () => {
    setBusy(true)
    setError(null)
    try {
      const job = await chrome.runtime.sendMessage({
        type: 'SCRAPE_JOB',
        tabId: context.tabId,
      })
      if (!job?.ok) throw new Error(job?.error ?? 'Scrape failed')
      const profile = (
        await chrome.storage.local.get('profile')
      ).profile as unknown
      onPromptReady(buildPrompt(profile ?? null, job.data))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
          Detected URL
        </p>
        <p className="mt-1 break-all text-xs text-neutral-300">{context.url}</p>
      </div>
      <button
        disabled={busy}
        onClick={generate}
        className="w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Generating…' : 'Generate Prompt'}
      </button>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
