export const STORAGE_KEYS = {
  autoScrape: 'autoScrapeEnabled',
  savedJobs: 'savedJobs',
  profile: 'profile',
  profileSyncedAt: 'profileSyncedAt',
  lastScrapedPage: 'lastScrapedPageIndex',
} as const

export const ALARM_NAME = 'auto-scrape-tick'
export const AUTO_SCRAPE_COOLDOWN_MIN = 7
