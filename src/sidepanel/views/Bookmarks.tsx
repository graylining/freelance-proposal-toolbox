import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../../shared/constants'

type Bookmark = {
  url: string
  savedAt: number
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

async function loadBookmarks(): Promise<Bookmark[]> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.bookmarks)
  return (data[STORAGE_KEYS.bookmarks] as Bookmark[] | undefined) ?? []
}

async function persistBookmarks(list: Bookmark[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.bookmarks]: list })
}

export function Bookmarks() {
  const [urlInput, setUrlInput] = useState('')
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [inputError, setInputError] = useState<string | null>(null)

  useEffect(() => {
    loadBookmarks().then(setBookmarks)
  }, [])

  const addBookmark = async (url: string) => {
    const trimmed = url.trim()
    const fresh: Bookmark = { url: trimmed, savedAt: Date.now() }
    const next = [fresh, ...bookmarks.filter((b) => b.url !== trimmed)]
    setBookmarks(next)
    await persistBookmarks(next)
  }

  const saveCurrentPage = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = tabs[0]?.url
    if (!url || !isValidUrl(url)) return
    await addBookmark(url)
  }

  const saveFromInput = async () => {
    setInputError(null)
    if (!isValidUrl(urlInput)) {
      setInputError('Enter a valid http/https URL.')
      return
    }
    await addBookmark(urlInput.trim())
    setUrlInput('')
  }

  const remove = async (url: string) => {
    const next = bookmarks.filter((b) => b.url !== url)
    setBookmarks(next)
    await persistBookmarks(next)
  }

  const visit = (url: string) => chrome.tabs.create({ url })

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="space-y-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value)
            setInputError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && saveFromInput()}
          placeholder="Paste a job URL from any platform…"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:border-neutral-600 focus:outline-none"
        />

        {inputError && (
          <p className="text-[10px] text-red-400">{inputError}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={saveCurrentPage}
            className="flex-1 rounded-md border border-neutral-700 px-2 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800"
          >
            Save Current Page
          </button>
          <button
            onClick={saveFromInput}
            disabled={!urlInput.trim()}
            className="flex-1 rounded-md bg-upwork-500 px-2 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-upwork-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            Add Bookmark
          </button>
        </div>
      </div>

      <div className="border-t border-neutral-800" />

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Bookmarks
        </p>
        {bookmarks.length > 0 && (
          <span className="text-[10px] text-neutral-600">{bookmarks.length}</span>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-center">
          <p className="text-xs font-medium text-neutral-400">No bookmarks yet</p>
          <p className="mt-1 text-[11px] text-neutral-600">
            Save the current page or paste any job URL above.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto pb-4">
          {bookmarks.map((b) => (
            <li
              key={b.url}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-2.5"
            >
              <p className="break-all text-[11px] leading-snug text-neutral-200">{b.url}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-neutral-600">{relativeTime(b.savedAt)}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => visit(b.url)}
                    className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  >
                    Visit
                  </button>
                  <button
                    onClick={() => remove(b.url)}
                    className="rounded border border-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-500 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                    title="Remove bookmark"
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
