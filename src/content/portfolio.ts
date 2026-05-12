import type { PortfolioProject } from '../shared/profileTypes'

const ENDPOINT = 'https://www.upwork.com/api/graphql/v1?alias=getPortfolioProjects'
const PAGE_SIZE = 3
const MAX_PAGES = 30

// Upwork caps each sorted query at ~10 results. Different sorts return different
// 10-item subsets, so we union across variants to reach the true total.
const SORT_VARIANTS: Array<{ sortFields: string[]; sortDirection: 'DESC' | 'ASC' }> = [
  { sortFields: ['rank'], sortDirection: 'DESC' },
  { sortFields: [], sortDirection: 'DESC' },
]

const QUERY = `query (
  $personId: ID!,
  $page: Int,
  $pageSize: Int,
  $published: Boolean,
  $sortDirection: SortDirection,
  $sortFields: [String],
  $fullData: Boolean,
  $public: Boolean,
  $filterOutNotAcceptedLinks: Boolean,
  $jobProposalId: ID
) {
  talentPortfolioProjects(
    filter: {
      personId: $personId,
      page: $page,
      pageSize: $pageSize,
      published: $published,
      sortDirection: $sortDirection,
      sortFields: $sortFields,
      fullData: $fullData,
      public: $public,
      filterOutNotAcceptedLinks: $filterOutNotAcceptedLinks,
      jobProposalId: $jobProposalId
    }
  ) {
    projects {
      id
      title
      description
      projectUrl
      completionDate: completionDateTime
      isPublic: public
      rank
      highlighted
      videoUrl
      role
      thumbnail
      attachments {
        id
        link
        title
        rank
        attachmentName: fileName
        type
      }
      tags {
        freeText
        ontologySkill: skillEdge { node { prefLabel: preferredLabel } }
      }
    }
    totalProjects
    pageNumber
    pageSize
    totalPages
  }
}`

type GraphqlResponse = {
  data?: {
    talentPortfolioProjects?: {
      projects?: RawProject[]
      totalProjects?: number
      totalPages?: number
    }
  }
  errors?: Array<{ message?: string }>
}

type RawProject = {
  id: string
  title?: string | null
  description?: string | null
  projectUrl?: string | null
  completionDate?: string | null
  highlighted?: boolean
  role?: string | null
  attachments?: Array<{
    id: string
    attachmentName?: string | null
    type?: string | null
    link?: string | null
  }>
  tags?: Array<{
    freeText?: string | null
    ontologySkill?: { node?: { prefLabel?: string | null } | null } | null
  }>
}

export async function fetchPortfolioProjects(
  personId: string,
): Promise<PortfolioProject[]> {
  const token = readApiToken()
  const tenantId = readCookie('current_organization_uid')
  if (!token)
    throw new Error('No *_api_token found in localStorage — please log into Upwork')
  if (!tenantId)
    throw new Error('current_organization_uid cookie missing — open www.upwork.com first')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `bearer ${token}`,
    'x-upwork-api-tenantid': tenantId,
    'x-upwork-accept-language': 'en-US',
  }

  const all: PortfolioProject[] = []
  const seen = new Set<string>()
  let totalProjects = Infinity

  for (const variant of SORT_VARIANTS) {
    if (all.length >= totalProjects) break
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          query: QUERY,
          variables: {
            personId,
            page,
            pageSize: PAGE_SIZE,
            published: true,
            sortDirection: variant.sortDirection,
            sortFields: variant.sortFields,
            fullData: true,
            public: null,
            filterOutNotAcceptedLinks: false,
            jobProposalId: '',
          },
        }),
      })
      if (!res.ok) {
        throw new Error(
          `portfolio graphql ${res.status}: ${await res.text().catch(() => '')}`,
        )
      }
      const json = (await res.json()) as GraphqlResponse
      if (json.errors?.length) {
        throw new Error(
          `portfolio graphql errors: ${json.errors.map((e) => e.message).join('; ')}`,
        )
      }
      const block = json.data?.talentPortfolioProjects
      if (!block) break
      if (typeof block.totalProjects === 'number') totalProjects = block.totalProjects
      const projects = block.projects ?? []
      if (projects.length === 0) break
      const before = all.length
      for (const raw of projects) {
        if (seen.has(raw.id)) continue
        seen.add(raw.id)
        all.push(distill(raw))
      }
      // entire page was duplicates — sort variant is exhausted
      if (all.length === before) break
      if (all.length >= totalProjects) break
    }
  }
  return all
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const c = part.trim()
    const i = c.indexOf('=')
    if (i < 0) continue
    if (c.slice(0, i) === name) return decodeURIComponent(c.slice(i + 1))
  }
  return null
}

function readApiToken(): string | null {
  // Upwork stores the elevated GraphQL bearer in localStorage as `<nid>_api_token`
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && /_api_token$/.test(key)) {
      const v = localStorage.getItem(key)
      if (v) return v
    }
  }
  return null
}

function distill(p: RawProject): PortfolioProject {
  const skills = (p.tags ?? [])
    .map((t) => t.ontologySkill?.node?.prefLabel ?? t.freeText ?? null)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)

  const attachments = (p.attachments ?? []).map((a) => ({
    id: a.id,
    name: a.attachmentName ?? null,
    type: a.type ?? null,
    link: a.link ?? null,
  }))

  return {
    id: p.id,
    title: p.title ?? null,
    description: p.description ?? null,
    role: p.role ?? null,
    completionDate: p.completionDate ?? null,
    projectUrl: p.projectUrl ?? null,
    highlighted: Boolean(p.highlighted),
    skills,
    attachments,
  }
}
