export type PageContext =
  | { kind: 'job'; tabId: number; url: string }
  | { kind: 'profile'; tabId: number; url: string }
  | { kind: 'unknown' }

export async function detectPageContext(): Promise<PageContext> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url || !tab.id) return { kind: 'unknown' }

  if (/upwork\.com\/(jobs|nx\/proposals\/job)/.test(tab.url)) {
    return { kind: 'job', tabId: tab.id, url: tab.url }
  }
  if (/upwork\.com\/freelancers/.test(tab.url)) {
    return { kind: 'profile', tabId: tab.id, url: tab.url }
  }
  return { kind: 'unknown' }
}
