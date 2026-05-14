import { useState } from 'react'

export function PromptOutput({
  prompt,
  onBack,
}: {
  prompt: string
  onBack: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19)
    a.href = url
    a.download = `upwork-prompt-${ts}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!prompt.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-center">
        <p className="text-sm font-medium text-neutral-200">No prompt generated yet</p>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          To generate one:
        </p>
        <ol className="mt-2 space-y-1 text-left text-[11px] leading-relaxed text-neutral-400">
          <li>
            <span className="font-medium text-neutral-300">1.</span> Open an Upwork job page (e.g.{' '}
            <code className="text-neutral-400">/jobs/~cipher</code>).
          </li>
          <li>
            <span className="font-medium text-neutral-300">2.</span> Switch to the{' '}
            <span className="font-medium text-neutral-200">Job</span> tab.
          </li>
          <li>
            <span className="font-medium text-neutral-300">3.</span> Click{' '}
            <span className="font-medium text-neutral-200">Scan Job</span>.
          </li>
          <li>
            <span className="font-medium text-neutral-300">4.</span> Come back here to copy or download the generated prompt.
          </li>
        </ol>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="text-xs text-neutral-400 hover:text-neutral-100"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={download}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
            title="Download the prompt as a .txt file"
          >
            Download
          </button>
          <button
            onClick={copy}
            className="rounded-md bg-upwork-500 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-upwork-400"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={prompt}
        className="min-h-[60vh] flex-1 resize-none rounded-md border border-neutral-800 bg-neutral-900 p-3 font-mono text-[11px] leading-relaxed text-neutral-200 focus:outline-none"
      />
    </div>
  )
}
