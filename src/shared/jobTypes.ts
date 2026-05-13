export type JobBudget =
  | { kind: 'fixed'; amount: number | null; currency: string | null }
  | { kind: 'hourly'; min: number | null; max: number | null }
  | { kind: 'unknown' }

export type JobBuyerStats = {
  totalAssignments: number | null
  hoursCount: number | null
  feedbackCount: number | null
  score: number | null
  totalJobsWithHires: number | null
  totalCharges: number | null
}

export type JobBuyer = {
  country: string | null
  city: string | null
  paymentVerified: boolean | null
  enterprise: boolean | null
  stats: JobBuyerStats
}

export type JobDetails = {
  cipherId: string
  jobUrl: string
  title: string | null
  description: string | null
  type: string | null // HOURLY / FIXED
  contractorTier: string | null // 1=Entry / 2=Intermediate / 3=Expert
  postedOn: string | null
  workload: string | null
  category: string | null
  skills: string[]
  budget: JobBudget
  durationLabel: string | null
  durationWeeks: number | null
  buyer: JobBuyer
  questions: string[]
  applicantsBids: {
    avg: number | null
    min: number | null
    max: number | null
  } | null
  totalApplicants: number | null
  totalHired: number | null
  totalInvitedToInterview: number | null
  rawCapturedAt: number
}

export type ScrapedJobPage = {
  cipherId: string | null
  jobUrl: string
  title: string | null
  description: string | null
  postedAgo: string | null
  jobType: string | null
  workload: string | null
  rateMin: string | null
  rateMax: string | null
  fixedBudget: string | null
  duration: string | null
  experienceLevel: string | null
  projectType: string | null
  englishLevel: string | null
  skillsMandatory: string[]
  skillsNiceToHave: string[]
  questions: string[]
  client: {
    paymentVerified: boolean
    phoneVerified: boolean
    country: string | null
    city: string | null
    industry: string | null
    companySize: string | null
    jobPostingStats: string | null
    memberSince: string | null
  }
  scrapedAt: number
}
