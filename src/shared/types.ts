export type SavedJob = {
  id: string
  url: string
  title: string
  description: string
  budget: string | null
  skills: string[]
  clientHistory: string | null
  savedAt: number
}

export type Profile = {
  title: string
  skills: string[]
  workHistory: string[]
}
