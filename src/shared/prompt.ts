export function buildPrompt(profile: unknown, job: unknown): string {
  const profileJson = JSON.stringify(profile ?? {}, null, 2)
  const jobJson = JSON.stringify(job ?? {}, null, 2)

  return [
    'Act as a specialist freelancer. Using my profile:',
    profileJson,
    'and this job:',
    jobJson,
    'output a JSON object containing: cover_letter (markdown), question_answers (array), success_probability (percentage), and strategic_advice (string).',
  ].join('\n\n')
}
