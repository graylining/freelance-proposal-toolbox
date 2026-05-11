import selectors from '../shared/selectors.json'

type ScrapedJob = {
  url: string
  title: string
  description: string
  budget: string | null
  skills: string[]
  clientHistory: string | null
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SCRAPE_JOB_REQUEST') {
    waitForElement(selectors.job.title)
      .then(() => sendResponse(scrapeJob()))
      .catch(() => sendResponse(scrapeJob()))
    return true
  }
  return false
})

function scrapeJob(): ScrapedJob {
  return {
    url: location.href,
    title: text(selectors.job.title),
    description: text(selectors.job.description),
    budget: optional(selectors.job.budget),
    skills: all(selectors.job.skills),
    clientHistory: optional(selectors.job.clientHistory),
  }
}

function text(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? ''
}

function optional(selector: string): string | null {
  const value = text(selector)
  return value === '' ? null : value
}

function all(selector: string): string[] {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean)
}

function waitForElement(selector: string, timeoutMs = 4000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(selector)
    if (found) return resolve(found)
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => {
      observer.disconnect()
      reject(new Error('selector timeout'))
    }, timeoutMs)
  })
}
