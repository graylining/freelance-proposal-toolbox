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

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-neutral-400 hover:text-neutral-100"
        >
          ← Back
        </button>
        <button
          onClick={copy}
          className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
      <textarea
        readOnly
        value={prompt}
        className="min-h-[60vh] flex-1 resize-none rounded-md border border-neutral-800 bg-neutral-900 p-3 font-mono text-[11px] leading-relaxed text-neutral-200 focus:outline-none"
      />
    </div>
  )
}
