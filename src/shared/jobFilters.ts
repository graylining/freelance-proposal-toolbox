export type JobType = '0' | '1'
export type ContractorTier = '1' | '2' | '3'
export type ClientHires = '0' | '1-9' | '10-'
export type AmountBracket = '0-99' | '100-499' | '500-999' | '1000-4999' | '5000-'
export type ProposalsBracket = '0-4' | '5-9' | '10-14' | '15-19' | '20-49'
export type Duration = 'week' | 'month' | 'semester' | 'ongoing'
export type Workload = 'as_needed' | 'part_time' | 'full_time'
export type Location =
  | ''
  | 'Americas'
  | 'Europe'
  | 'Asia'
  | 'Africa'
  | 'Oceania'
export type Sort = 'recency' | 'relevance' | ''

export type JobFilters = {
  q: string
  jobType: JobType[] // t
  contractorTier: ContractorTier[]
  hourlyRateMin: number | null
  hourlyRateMax: number | null
  amount: AmountBracket[]
  clientHires: ClientHires[]
  paymentVerified: boolean
  proposals: ProposalsBracket[]
  duration: Duration[] // duration_v3
  workload: Workload[]
  location: Location
  sort: Sort
}

export const DEFAULT_FILTERS: JobFilters = {
  q: '',
  jobType: [],
  contractorTier: [],
  hourlyRateMin: null,
  hourlyRateMax: null,
  amount: [],
  clientHires: [],
  paymentVerified: false,
  proposals: [],
  duration: [],
  workload: [],
  location: '',
  sort: 'recency',
}

const SEARCH_BASE = 'https://www.upwork.com/nx/search/jobs/'

export function buildSearchUrl(f: JobFilters): string {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.jobType.length) p.set('t', f.jobType.join(','))
  if (f.contractorTier.length) p.set('contractor_tier', f.contractorTier.join(','))
  if (f.hourlyRateMin !== null || f.hourlyRateMax !== null) {
    const lo = f.hourlyRateMin ?? 5
    const hi = f.hourlyRateMax ?? 1000
    p.set('hourly_rate', `${lo}-${hi}`)
  }
  if (f.amount.length) p.set('amount', f.amount.join(','))
  if (f.clientHires.length) p.set('client_hires', f.clientHires.join(','))
  if (f.paymentVerified) p.set('payment_verified', '1')
  if (f.proposals.length) p.set('proposals', f.proposals.join(','))
  if (f.duration.length) p.set('duration_v3', f.duration.join(','))
  if (f.workload.length) p.set('workload', f.workload.join(','))
  if (f.location) p.set('location', f.location)
  if (f.sort) p.set('sort', f.sort)
  const qs = p.toString()
  return qs ? `${SEARCH_BASE}?${qs}` : SEARCH_BASE
}

export function countActiveFilters(f: JobFilters): number {
  let n = 0
  if (f.q.trim()) n++
  if (f.jobType.length) n++
  if (f.contractorTier.length) n++
  if (f.hourlyRateMin !== null || f.hourlyRateMax !== null) n++
  if (f.amount.length) n++
  if (f.clientHires.length) n++
  if (f.paymentVerified) n++
  if (f.proposals.length) n++
  if (f.duration.length) n++
  if (f.workload.length) n++
  if (f.location) n++
  if (f.sort && f.sort !== 'recency') n++
  return n
}
