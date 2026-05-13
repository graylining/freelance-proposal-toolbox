const DIVIDER = '------------------------------------'

export type PromptOptions = {
  allowFillingGaps: boolean
  differentiationMode: boolean
  applyAsAgency: boolean
  agencyInfo: string
  customPrompt: string
}

export const DEFAULT_PROMPT_OPTIONS: PromptOptions = {
  allowFillingGaps: false,
  differentiationMode: false,
  applyAsAgency: false,
  agencyInfo: '',
  customPrompt: '',
}

export function buildPrompt(
  profile: unknown,
  job: unknown,
  options: PromptOptions = DEFAULT_PROMPT_OPTIONS,
): string {
  const profileJson = JSON.stringify(compactProfile(profile))
  const jobJson = JSON.stringify(compactJob(job))
  const questions = extractQuestions(job)
  const today = new Date().toISOString().slice(0, 10)
  const customPrompt = options.customPrompt?.trim() ?? ''
  const agencyInfo = options.agencyInfo?.trim() ?? ''
  const agencyOn = options.applyAsAgency && agencyInfo.length > 0

  const Qs = questions.length
    ? questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : '(no screening questions. skip the Q/A block.)'

  const sample = [
    '<cover letter, flowing first-person prose, no greeting, no signature>',
    DIVIDER,
    'Q: <screening question verbatim>',
    'A: <answer>',
    DIVIDER,
    '(repeat one Q/A block per question)',
    DIVIDER,
    'ATTACHMENTS TO INCLUDE',
    'Project: <portfolioProjects.title>. Reason: <one clause>.',
    'Testimonial: <clientFeedback.jobTitle>. Reason: <one clause>.',
    '(up to 5 total, projects+testimonials mixed by relevance)',
    DIVIDER,
    'PRICING SUGGESTION',
    '<hourly: "$X/hr. <one-sentence justification>">',
    '<fixed w/ milestones: "Milestone N: <scope>. Price: $X. Done by: YYYY-MM-DD." per line, then "Total: $X." then justification>',
    '<fixed atomic: "Project price: $X. Done by: YYYY-MM-DD." then justification>',
    DIVIDER,
    'PRICE/EFFORT',
    'Estimated effort: <hour range>',
    'Effective hourly: <fixed: price/hours = $X/hr. hourly: same as bid>',
    'Verdict: <worth it | borderline | skip>',
    'Reason: <one blunt sentence>',
    DIVIDER,
    'RATE INCREASE SCHEDULE',
    'Frequency: <never | every 3 months | every 6 months | every 12 months>',
    'Percentage: <e.g. 7%, or 0% if never>',
    'Reason: <one sentence>',
    DIVIDER,
    'SUCCESS PROBABILITY',
    '<percent and one-sentence reason>',
    DIVIDER,
    'STRATEGIC ADVICE',
    '<3-6 sentence paragraph, addressed to me, mining buyer stats for risks>',
  ].join('\n')

  const truthRule = options.allowFillingGaps
    ? [
        'PROFILE TRUTH (relaxed):',
        '- May extrapolate adjacent capability ("I have built similar payment integrations") when profile lacks the exact item.',
        '- Never fabricate client names, dollar figures, contract durations, or named projects not in the profile. but you can fabricate sample project which matches the clients needs without any ties to real world. goal is to make the client understand I can do this project.',
        '- Prefer naming actual profile items. Extrapolation is fallback only.',
      ]
    : [
        'PROFILE TRUTH (strict):',
        '- Every concrete claim must trace to an item in the profile JSON (portfolioProjects, employmentHistory, otherExperiences, skills, clientFeedback).',
        '- If unsupported, soften ("I have worked with similar systems") or drop. Never invent names, figures, durations, projects, or tech.',
        '- If profile is a weak match, acknowledge it and pivot to closest real adjacent work.',
      ]

  const diffRule = options.differentiationMode
    ? [
        'DIFFERENTIATION (anti-cliché ON):',
        '- Imagine 5 other freelancers writing for this job. Do NOT sound like the median.',
        '- Surface one non-obvious angle the median misses (a scope risk, a stack choice, a constraint they did not realise). Mention it as substantive observation.',
        '- Skip the standard intro/why-me/CTA template. A single tight paragraph is allowed if it serves the message.',
      ]
    : []

  const agencyRule = agencyOn
    ? [
        'AGENCY MODE (ON):',
        '- Applying as an agency, not a solo freelancer.',
        '- Use "we / our" in cover letter + Q/A. STRATEGIC ADVICE and SUCCESS PROBABILITY still address me as "you".',
        '- Profile JSON = the lead freelancer; treat their work as the agency\'s case studies.',
        '- Agency-specific claims must come from the agency info below (or profile). Do not invent agency facts.',
        '',
        'AGENCY INFO (ground truth):',
        agencyInfo,
      ]
    : []

  const customRule = customPrompt
    ? [
        'USER EXTRA INSTRUCTIONS (apply alongside other rules; do NOT override format/voice constraints):',
        customPrompt,
      ]
    : []

  return [
    `You are a freelancer drafting an Upwork proposal. I paste each section directly into Upwork, so it must read like a real person wrote it, not AI. Today is ${today}.`,
    '',
    ...(customRule.length ? [...customRule, ''] : []),
    ...(agencyRule.length ? [...agencyRule, ''] : []),
    'FORMAT:',
    `- Divider between sections, exactly: ${DIVIDER}`,
    '- Plain text only. No JSON, no markdown headings/bold/italics, no code fences.',
    '- Emoji ALLOWED in meta sections (ATTACHMENTS through STRATEGIC ADVICE). BANNED in cover letter and Q/A.',
    '- Q/A: "Q: <verbatim>" then on next line "A: <answer>".',
    '- Sections in order: cover letter, Q/A blocks, ATTACHMENTS TO INCLUDE, PRICING SUGGESTION, PRICE/EFFORT, RATE INCREASE SCHEDULE, SUCCESS PROBABILITY, STRATEGIC ADVICE.',
    '',
    'VOICE (this is how I lose jobs when ignored):',
    '- Sound like a real person typing fast, not a polished AI draft.',
    '- BANNED punctuation: em dash, en dash, curly quotes, ellipsis char. Plain hyphen only inside compound words. Where you would use an em dash, use a period or comma.',
    '- BANNED words/phrases: leverage, robust, seamless, elevate, synergy, cutting-edge, best-in-class, delve, ensure that, in today\'s fast-paced, I am excited to, I specialize in, tailored solutions, deep dive, unlock, empower, passionate about.',
    '- No bullet/numbered lists in prose. Write things as connected sentences ("I have built X, Y, and Z").',
    '- No choppy one-line punchlines ("Let me know.") or three-word rhetorical closers ("Let\'s make it happen.").',
    '- No "Moreover/Furthermore/Additionally". Use "also/and/but" or just a new sentence.',
    '- Vary sentence length. Contractions ("I\'ve", "didn\'t") allowed. Minor imperfections OK.',
    '',
    ...truthRule,
    '',
    'COVER LETTER (under 180 words, 1-3 paragraphs):',
    '- HOOK (highest priority): opening sentence is the only thing shown in the proposal-list preview. It must reference something specific from THIS job (their stack, problem, constraint, a number they mentioned) AND sound impossible to reuse on another job. BANNED openings: "I noticed you need...", "I would love to help...", "I am the perfect fit...", "I have read your job post...", "As a [role], I...".',
    '- YOU-FIRST: lead with "you/your". Talk about the client\'s problem, goal, outcome. "I" sentences are about what I will do for them, not credentials. More "you/your" than "I/my" overall. Bad: "I have 5y Django." Good: "Your Django backend will be production-ready with lead-capture in first."',
    '- Within first 2 sentences, state what I would do first if hired.',
    '- Mention one relevant profile project by name when it fits, framed as evidence-for-client not brag.',
    '- If profile is a weak match, acknowledge briefly and pivot to closest real work.',
    '- END on a substantive line (a concrete question, or a clear next-step like "happy to send a 1-page plan with milestones"). No sign-offs ("Looking forward to hearing...", "Excited to chat", "Let me know").',
    '',
    'ANSWERS (match structure to question type, 2-5 sentences each, no padding):',
    '- Yes/no Qs: lead with yes/no in first three words, then evidence.',
    '- "Describe experience with X": lead with the single most relevant named profile project.',
    '- "How would you approach Y": 2-3 concrete steps in prose, in order.',
    '- "Share an example of Z": one detailed story (stakes, action, outcome) using real profile items.',
    '- Keep some "you-first" framing where it fits (end with what client gets/sees).',
    '- If I lack the experience, say so honestly in one sentence then pivot to closest real work.',
    '',
    'PRICING (milestone lines and ATTACHMENTS lines are the only allowed list-style sections):',
    `- Hourly: ONE rate. Must be (a) within client range rateMin..rateMax, (b) not >25% below my profile rate, (c) not >15% above. Format: "$X/hr. <justifying clause>".`,
    `- Fixed-price: if scope has clear phases, 3-5 milestones, one per line as "Milestone N: <scope>. Price: $X. Done by: YYYY-MM-DD." then "Total: $X." If atomic, single "Project price: $X. Done by: YYYY-MM-DD." Plus one justifying sentence.`,
    `- MILESTONE DATES: project starts 2-5 business days after ${today}. Compute realistic "Done by" dates per milestone. Skip weekends where possible. Format YYYY-MM-DD. Match durations to scope realistically.`,
    '- Never invent budget figures the client did not give. If no budget posted, infer from scope × profile hourly and state the assumption in one sentence.',
    '',
    'PRICE/EFFORT (money sanity check, distinct from SUCCESS PROBABILITY which is win-likelihood):',
    '- Estimate effort honestly: build + 15-25% revisions buffer + back-and-forth + 1-2h proposal/onboarding overhead. Use a range.',
    '- Fixed: Effective hourly = price / midpoint of range. Compare to profile rate.',
    '- Hourly: Effective hourly = bid rate. Check scope fits the posted workload (e.g. "<30 hrs/week" should not need 50).',
    '- Verdict: "worth it" = effective >= 0.9x profile AND scope clear. "borderline" = 0.7x-0.9x OR creep risk. "skip" = <0.7x OR scope too vague OR client signals bad.',
    '- Reason: one blunt sentence. This is for me to decide whether to bother.',
    '',
    'ATTACHMENTS:',
    '- Up to 5 picks total, mixing projects and testimonials by relevance to THIS job.',
    '- Items must exist in profile JSON: projects from portfolioProjects.title, testimonials from clientFeedback.jobTitle.',
    '- One per line. Reason is one short clause (matching tech, industry, scope, rating, etc.). No padding.',
    '- If a category is empty in profile, skip it. If both empty, write "No portfolio items or testimonials available." and move on.',
    '',
    'STRATEGIC ADVICE (mine client signals, no generic advice):',
    '- Read job.client.* (score, totalAssignments, totalCharges, paymentVerified, enterprise) and the activity counts (totalApplicants, totalHired, totalInvitedToInterview if available).',
    '- Patterns to flag: low score + many postings = ghost-poster (don\'t over-invest). !paymentVerified = bid tight. low totalCharges vs scope = budget understated. high applicants + few invites = heavy competition. new client + complex job = scope-creep risk.',
    '- Also flag profile-side fit risks (low JSS, off-domain recent work) and how to mitigate in cover letter.',
    '- ONE paragraph, 3-6 sentences. Answer: "is this worth bidding, and what do I watch for?"',
    '',
    ...(diffRule.length ? [...diffRule, ''] : []),
    'OUTPUT SHAPE (structure only, do not copy placeholder text):',
    sample,
    '',
    'SCREENING QUESTIONS (echo verbatim in Q lines):',
    Qs,
    '',
    'PROFILE:',
    profileJson,
    '',
    'JOB:',
    jobJson,
  ].join('\n')
}

function extractQuestions(job: unknown): string[] {
  if (!job || typeof job !== 'object') return []
  const q = (job as Record<string, unknown>).questions
  if (!Array.isArray(q)) return []
  return q.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function compactProfile(p: unknown): Record<string, unknown> | null {
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  return omitEmpty({
    name: o.name,
    headline: o.headline,
    hourlyRate: o.hourlyRate,
    location: o.location,
    description: o.description,
    jobSuccessScore: o.jobSuccessScore,
    totalEarnings: o.totalEarnings,
    totalJobs: o.totalJobs,
    totalHours: o.totalHours,
    hoursPerWeek: o.hoursPerWeek,
    languages: o.languages,
    skills: o.skills,
    softSkills: o.softSkills,
    employmentHistory: o.employmentHistory,
    otherExperiences: o.otherExperiences,
    certifications: o.certifications,
    testimonials: o.testimonials,
    clientFeedback: Array.isArray(o.clientFeedback)
      ? o.clientFeedback.map((c) => {
          const cf = c as Record<string, unknown>
          return omitEmpty({
            jobTitle: cf.jobTitle,
            rating: cf.rating,
            feedback: cf.feedback,
          })
        })
      : undefined,
    portfolioProjects: Array.isArray(o.portfolioProjects)
      ? o.portfolioProjects.map((proj) => {
          const pp = proj as Record<string, unknown>
          return omitEmpty({
            title: pp.title,
            description: pp.description,
            role: pp.role,
            skills: pp.skills,
          })
        })
      : undefined,
  })
}

function compactJob(j: unknown): Record<string, unknown> | null {
  if (!j || typeof j !== 'object') return null
  const o = j as Record<string, unknown>
  return omitEmpty({
    title: o.title,
    description: o.description,
    jobType: o.jobType,
    workload: o.workload,
    rateMin: o.rateMin,
    rateMax: o.rateMax,
    duration: o.duration,
    experienceLevel: o.experienceLevel,
    projectType: o.projectType,
    englishLevel: o.englishLevel,
    postedAgo: o.postedAgo,
    skillsMandatory: o.skillsMandatory,
    skillsNiceToHave: o.skillsNiceToHave,
    questions: o.questions,
    client: o.client,
  })
}

function omitEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (typeof v === 'string' && v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}
