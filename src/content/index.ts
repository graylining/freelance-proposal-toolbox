import type { ClientFeedback, ScrapedProfile } from '../shared/profileTypes'
import { fetchPortfolioProjects } from './portfolio'
import type { ScrapedJobPage } from '../shared/jobTypes'

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
    waitForElement('h4, [data-test="Description"]')
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

function scrapeJob(): ScrapedJobPage {
  const cipherId = extractJobCipher(location.pathname)

  return {
    cipherId,
    jobUrl: location.href,
    title: scrapeJobTitle(),
    description: scrapeJobDescription(),
    postedAgo: scrapePostedAgo(),
    jobType: scrapeSiblingText('[data-cy="clock-hourly"], [data-cy="clock-fixed"]', '.description'),
    workload: scrapeSiblingText('[data-cy="clock-hourly"], [data-cy="clock-fixed"]', 'strong'),
    rateMin: scrapeRateAt(0),
    rateMax: scrapeRateAt(1),
    duration: scrapeDuration(),
    experienceLevel: scrapeSiblingText('[data-cy="expertise"]', 'strong'),
    projectType: scrapeSegmentation('Project Type'),
    englishLevel: scrapeEnglishLevel(),
    skillsMandatory: scrapeSkillsForGroup('Mandatory skills'),
    skillsNiceToHave: scrapeSkillsForGroup('Nice-to-have skills'),
    questions: scrapeQuestions(),
    client: scrapeClient(),
    scrapedAt: Date.now(),
  }
}

function extractJobCipher(pathname: string): string | null {
  const m = pathname.match(/\/jobs\/(~[a-z0-9]+)/i)
  return m ? m[1] : null
}

function scrapeJobTitle(): string | null {
  const wrapper = document.querySelector('[job-uid]')?.closest('h4')
  if (wrapper) {
    const span = wrapper.querySelector('.text-base.flex-1, span:first-child')
    const t = textOf(span ?? wrapper)
    if (t) return t
  }
  const h4 = document.querySelector('h4 .text-base.flex-1, h4 .text-base')
  return textOf(h4) ?? textOf(document.querySelector('h4'))
}

function scrapeJobDescription(): string | null {
  const root = document.querySelector('[data-test="Description"]')
  if (!root) return null
  const para = root.querySelector('.multiline-text, .text-body-sm')
  return textOf(para) ?? clean(stripButtons(root))
}

function scrapePostedAgo(): string | null {
  const el = Array.from(document.querySelectorAll('.posted-on-line *, [class*="posted"]')).find((n) =>
    /^Posted\b/i.test(clean(n.textContent ?? '')),
  )
  return textOf(el)
}

function scrapeRateAt(index: 0 | 1): string | null {
  // The clock-timelog div is a sibling of the rate container; walk up to the <li>.
  const icon = document.querySelector('[data-cy="clock-timelog"]')
  const li = icon?.closest('li') ?? icon?.parentElement ?? null
  if (!li) return null
  const amounts = Array.from(li.querySelectorAll('strong'))
    .map((s) => clean(s.textContent ?? ''))
    .filter((t) => /^\$[\d.,]+/.test(t))
  return amounts[index] ?? null
}

function scrapeSiblingText(iconSelector: string, valueSelector: string): string | null {
  const icon = document.querySelector(iconSelector)
  const li = icon?.closest('li') ?? icon?.parentElement ?? null
  if (!li) return null
  const v = li.querySelector(valueSelector)
  return textOf(v)
}

function scrapeDuration(): string | null {
  const icon = document.querySelector('[data-cy="duration4"], [data-cy^="duration"]')
  const li = icon?.closest('li') ?? icon?.parentElement ?? null
  if (!li) return null
  const strong = li.querySelector('strong')
  if (!strong) return null
  // Prefer the desktop label if both desktop/mobile spans are present
  const desktop = strong.querySelector('span:first-child')
  return textOf(desktop) ?? textOf(strong)
}

function scrapeSegmentation(label: string): string | null {
  for (const li of document.querySelectorAll('.segmentations li')) {
    const strong = li.querySelector('strong')
    if (strong && clean(strong.textContent ?? '').replace(/:$/, '') === label) {
      const span = li.querySelector('span')
      return textOf(span)
    }
  }
  return null
}

function scrapeEnglishLevel(): string | null {
  const li = document.querySelector('[data-cy="english"]')
  if (!li) return null
  const span = li.querySelector('span')
  return textOf(span)
}

function scrapeSkillsForGroup(label: string): string[] {
  for (const group of document.querySelectorAll('.span-md-12')) {
    const strong = group.querySelector(':scope > strong')
    if (strong && clean(strong.textContent ?? '') === label) {
      const list = group.querySelector('.skills-list')
      if (list) {
        return Array.from(list.querySelectorAll('a'))
          .map((a) => clean(a.textContent ?? ''))
          .filter(Boolean)
      }
    }
  }
  return []
}

function scrapeQuestions(): string[] {
  for (const ol of document.querySelectorAll('ol.list-styled')) {
    const items = Array.from(ol.querySelectorAll('li'))
      .map((li) => clean(li.textContent ?? ''))
      .filter(Boolean)
    if (items.length) return items
  }
  return []
}

function scrapeClientStats(): string | null {
  const li = document.querySelector('[data-qa="client-job-posting-stats"]')
  if (!li) return null
  const strong = textOf(li.querySelector('strong'))
  const div = textOf(li.querySelector('div'))
  return [strong, div].filter(Boolean).join(' — ') || null
}

function scrapeClient(): ScrapedJobPage['client'] {
  const container = document.querySelector('[data-test="about-client-container"]')
  const text = container ? container.textContent ?? '' : ''
  return {
    paymentVerified: /Payment method verified/i.test(text),
    phoneVerified: /Phone number verified/i.test(text),
    country: textOf(document.querySelector('[data-qa="client-location"] strong')),
    city: textOf(
      document.querySelector('[data-qa="client-location"] .nowrap:first-of-type'),
    ),
    industry: textOf(document.querySelector('[data-qa="client-company-profile-industry"]')),
    companySize: textOf(document.querySelector('[data-qa="client-company-profile-size"]')),
    jobPostingStats: scrapeClientStats(),
    memberSince: textOf(document.querySelector('[data-qa="client-contract-date"]')),
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
