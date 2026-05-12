export type ClientFeedback = {
  jobTitle: string | null
  rating: string | null
  period: string | null
  feedback: string | null
  freelancerResponse: string | null
}

export type PortfolioAttachment = {
  id: string
  name: string | null
  type: string | null
  link: string | null
}

export type PortfolioProject = {
  id: string
  title: string | null
  description: string | null
  role: string | null
  completionDate: string | null
  projectUrl: string | null
  highlighted: boolean
  skills: string[]
  attachments: PortfolioAttachment[]
}

export type ScrapedProfile = {
  upworkId: string
  personId: string | null
  profileUrl: string
  name: string | null
  headline: string | null
  hourlyRate: string | null
  location: string | null
  description: string | null
  jobSuccessScore: string | null
  totalEarnings: string | null
  totalJobs: string | null
  totalHours: string | null
  hoursPerWeek: string | null
  languages: string[]
  skills: string[]
  softSkills: string[]
  employmentHistory: string[]
  otherExperiences: string[]
  certifications: string[]
  testimonials: string[]
  clientFeedback: ClientFeedback[]
  portfolioProjects: PortfolioProject[]
  portfolioFetchError: string | null
  scrapedAt: number
}
