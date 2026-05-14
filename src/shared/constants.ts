export const STORAGE_KEYS = {
  savedJobs: 'savedJobs',
  profile: 'profile',
  profileSyncedAt: 'profileSyncedAt',
  jobFilters: 'jobFilters',
  promptOptions: 'promptOptions',
  theme: 'theme',
} as const

export type Theme = 'dark' | 'light'
export const DEFAULT_THEME: Theme = 'dark'

export const MAX_SAVED_JOBS = 500
