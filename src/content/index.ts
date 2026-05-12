import selectors from '../shared/selectors.json'
import type { ClientFeedback, ScrapedProfile } from '../shared/profileTypes'
import { fetchPortfolioProjects } from './portfolio'

type ScrapedJob = {
  url: string
  title: string
  description: string
  budget: string | null
  skills: string[]
  clientHistory: string | null
}

const CHROME_PATTERNS: RegExp[] = [
  /^edit\b/i,
  /^add\b/i,
  /^remove\b/i,
  /^reorder\b/i,
  /^more options$/i,
  /^(first|previous|next|last) page$/i,
  /^page \d+$/i,
  /^\d+$/,
  /^promote with ads$/i,
  /^availability badge\b/i,
  /^boost (your )?profile/i,
  /^connects:?\s*\d+/i,
  /^view details/i,
  /^buy connects$/i,
  /^download upwork/i,
  /^get the upwork/i,
  /^one profile, evolved/i,
  /^learn more$/i,
  /^show (you'?re|you are) a match$/i,
  /^earn \d+ connects/i,
  /^your testimonial request/i,
  /^request sent/i,
  /partner verification/i,
]

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SCRAPE_JOB_REQUEST') {
    waitForElement(selectors.job.title)
      .then(() => sendResponse(scrapeJob()))
      .catch(() => sendResponse(scrapeJob()))
    return true
  }
  if (msg?.type === 'SCRAPE_PROFILE_REQUEST') {
    waitForElement('h2')
      .then(() => scrapeProfile())
      .catch(() => scrapeProfile())
      .then((profile) => sendResponse(profile))
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

async function scrapeProfile(): Promise<ScrapedProfile> {
  const upworkId = extractUpworkId(location.pathname) ?? ''
  const personId = scrapePersonId()
  const sectionMap = buildSectionMap()

  let portfolioProjects: ScrapedProfile['portfolioProjects'] = []
  let portfolioFetchError: string | null = null
  if (personId) {
    try {
      portfolioProjects = await fetchPortfolioProjects(personId)
    } catch (err) {
      portfolioFetchError = err instanceof Error ? err.message : String(err)
    }
  } else {
    portfolioFetchError = 'personId not found on page'
  }

  return {
    upworkId,
    personId,
    profileUrl: location.href,
    name: textOf(document.querySelector('h2')),
    headline: scrapeHeadline(),
    hourlyRate: scrapeHourlyRate(),
    location: scrapeLocation(),
    description: scrapeDescription(),
    jobSuccessScore: matchInBody(/(\d{1,3}%)\s*Job Success/i),
    totalEarnings: statValue('Total earnings'),
    totalJobs: statValue('Total jobs'),
    totalHours: statValue('Total hours'),
    hoursPerWeek: scrapeHoursPerWeek(),
    languages: scrapeLanguages(),
    skills: dedupe(allText('.skill-name')).filter(notChrome),
    softSkills: dedupe(
      allText(
        '[data-test="soft-skill-tags"] .air3-token, [data-test="soft-skills-token-container"] .air3-token',
      ),
    ).filter(notChrome),
    employmentHistory: scrapeListSection(sectionMap, 'Employment history'),
    otherExperiences: scrapeListSection(sectionMap, 'Other experiences'),
    certifications: scrapeListSection(sectionMap, 'Certifications'),
    testimonials: scrapeTestimonials(sectionMap),
    clientFeedback: scrapeClientFeedback(),
    portfolioProjects,
    portfolioFetchError,
    scrapedAt: Date.now(),
  }
}

function scrapePersonId(): string | null {
  const el = document.querySelector('[data-qa-profile-viewer-uid]')
  const id = el?.getAttribute('data-qa-profile-viewer-uid')
  return id && /^\d+$/.test(id) ? id : null
}

function scrapeClientFeedback(): ClientFeedback[] {
  const items = document.querySelectorAll('.assignments-item')
  const seen = new Set<string>()
  const out: ClientFeedback[] = []
  for (const item of items) {
    const jobTitle = textOf(item.querySelector('h5 a, h5'))
    const ratingEl = item.querySelector('.air3-rating-value-text')
    const rating = textOf(ratingEl)
    const period = textOf(item.querySelector('.text-base-sm.text-stone'))
    const feedbackEl =
      item.querySelector('.feedback .highlighted-truncation-content') ??
      item.querySelector('.feedback .highlighted-truncation') ??
      item.querySelector('.feedback > p')
    let feedback = feedbackEl ? clean(stripButtons(feedbackEl)) : null
    if (feedback) feedback = feedback.replace(/^"|"$/g, '').trim() || null
    const responseEl = item.querySelector('.feedback-response .air3-truncation')
    let freelancerResponse = responseEl ? clean(stripButtons(responseEl)) : null
    if (freelancerResponse)
      freelancerResponse = freelancerResponse.replace(/^"|"$/g, '').trim() || null

    const key = `${jobTitle ?? ''}|${period ?? ''}|${rating ?? ''}`
    if (seen.has(key)) continue
    if (!jobTitle && !feedback) continue
    seen.add(key)
    out.push({ jobTitle, rating, period, feedback, freelancerResponse })
  }
  return out
}

function extractUpworkId(pathname: string): string | null {
  const m = pathname.match(/\/freelancers\/(~[a-z0-9]+)/i)
  return m ? m[1] : null
}

function scrapeHeadline(): string | null {
  const candidates = Array.from(document.querySelectorAll('h3'))
  for (const el of candidates) {
    const t = clean(el.textContent ?? '')
    if (!t) continue
    if (/^\$[\d.,]+\s*\/\s*hr/i.test(t)) continue
    if (t.length < 8 || t.length > 200) continue
    return t
  }
  return null
}

function scrapeHourlyRate(): string | null {
  const m = document.body.innerText.match(/\$[\d.,]+\s*\/\s*hr/i)
  return m ? m[0] : null
}

function scrapeLocation(): string | null {
  const m = document.body.innerText.match(
    /\b(?:Lives in|Located in|Based in|Location:)\s+([^\n,]{2,80})/i,
  )
  return m ? clean(m[1]!) : null
}

function scrapeDescription(): string | null {
  const candidates = document.querySelectorAll('.air3-line-clamp .text-pre-line, .air3-line-clamp .break')
  for (const el of candidates) {
    const t = clean(el.textContent ?? '')
    if (t.length >= 100) return t
  }
  return null
}

function statValue(label: string): string | null {
  const labels = Array.from(document.querySelectorAll('span'))
  for (const el of labels) {
    const t = clean(el.textContent ?? '')
    if (t !== label) continue
    const wrap = el.closest('.col-compact, [class*="stat"]') ?? el.parentElement?.parentElement
    const amount = wrap?.querySelector('.stat-amount, h5, .h5')
    const value = textOf(amount)
    if (value) return value
  }
  return null
}

function scrapeHoursPerWeek(): string | null {
  const heading = findHeading('Hours per week')
  if (!heading) return null
  const wrapper = heading.parentElement?.parentElement
  if (!wrapper) return null
  const nodes = Array.from(wrapper.children).filter(
    (c) => !c.contains(heading) && c.tagName !== 'BUTTON',
  )
  const parts: string[] = []
  for (const n of nodes) {
    const t = clean(stripButtons(n))
    if (!t) continue
    parts.push(t)
  }
  return parts.length ? parts.join(' · ') : null
}

function scrapeLanguages(): string[] {
  const heading = findHeading('Languages')
  if (!heading) return []
  const wrapper = heading.parentElement?.parentElement
  if (!wrapper) return []
  const list = wrapper.querySelector('ul')
  if (!list) return []
  return Array.from(list.querySelectorAll('li'))
    .map((li) => clean(stripButtons(li)).replace(/\s*:\s*/g, ': '))
    .filter((t) => t && notChrome(t))
}

function scrapeListSection(
  map: Map<string, Element>,
  label: string,
): string[] {
  const section = map.get(label)
  if (!section) return []
  const items = section.querySelectorAll(
    ':scope > div > .air3-card-section, :scope > div > div > .air3-card-section, :scope .air3-card-section',
  )
  const target = items.length > 0 ? Array.from(items) : Array.from(section.querySelectorAll(':scope > div, :scope > section'))
  return dedupe(
    target
      .map((el) => clean(stripButtons(el)))
      .filter((t) => t.length > 5 && notChrome(t) && t !== label),
  )
}

function scrapeTestimonials(map: Map<string, Element>): string[] {
  const section = map.get('Testimonials')
  if (!section) return []
  const items = section.querySelectorAll('section.testimonial-item:not(.status-pending)')
  return Array.from(items)
    .map((el) => clean(stripButtons(el)))
    .filter((t) => t.length > 10 && notChrome(t))
}

function buildSectionMap(): Map<string, Element> {
  const map = new Map<string, Element>()
  const all = document.querySelectorAll(
    'h2, h3, h4, h5, section.air3-card-sections',
  )
  let lastLabel: string | null = null
  for (const el of all) {
    if (/^H[2-5]$/.test(el.tagName)) {
      lastLabel = clean(el.textContent ?? '') || null
    } else if (lastLabel && !map.has(lastLabel)) {
      map.set(lastLabel, el)
    }
  }
  return map
}

function findHeading(label: string): Element | null {
  const headings = Array.from(document.querySelectorAll('h2, h3, h4, h5'))
  return (
    headings.find((h) => clean(h.textContent ?? '') === label) ?? null
  )
}

function stripButtons(el: Element): string {
  const clone = el.cloneNode(true) as Element
  for (const b of clone.querySelectorAll('button, svg, .sr-only, [aria-hidden="true"]')) {
    b.remove()
  }
  return clone.textContent ?? ''
}

function clean(s: string): string {
  return s
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function notChrome(t: string): boolean {
  return !CHROME_PATTERNS.some((re) => re.test(t))
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr))
}

function matchInBody(re: RegExp): string | null {
  const m = document.body.innerText.match(re)
  return m ? (m[1] ?? m[0]) : null
}

function textOf(el: Element | null | undefined): string | null {
  if (!el) return null
  const t = clean(el.textContent ?? '')
  return t === '' ? null : t
}

function allText(selector: string): string[] {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => clean(el.textContent ?? ''))
    .filter(Boolean)
}

function text(selector: string): string {
  return clean(document.querySelector(selector)?.textContent ?? '')
}

function optional(selector: string): string | null {
  const value = text(selector)
  return value === '' ? null : value
}

function all(selector: string): string[] {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => clean(el.textContent ?? ''))
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
