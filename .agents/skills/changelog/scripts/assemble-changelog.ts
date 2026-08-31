/**
 * Assemble CHANGELOG.md in the project's custom format.
 *
 * Usage:
 *   bun <skill-root>/scripts/assemble-changelog.ts <input.json> [changelog.md]
 *
 * `input.json` schema:
 * {
 *   "projectName": "My App",
 *   "includeUnreleased": true,
 *   "includeReleaseLinks": true,
 *   "platforms": [
 *     { "type": "github", "owner": "acme", "repo": "my-app", "branch": "main" },
 *     { "type": "gitlab", "host": "gitlab.example.com", "owner": "acme", "repo": "my-app", "branch": "main" }
 *   ],
 *   "version": "1.1.0",
 *   "date": "2026-08-31",
 *   "previousVersion": "1.0.0",
 *   "groups": [
 *     {
 *       "type": "feat",
 *       "entries": [
 *         {
 *           "description": "add changelog skill",
 *           "commits":    [ { "platform": "github", "sha": "abcdef1234567...", "author": "alice" } ],
 *           "prs":        [ { "platform": "github", "number": 5, "author": "alice" } ],
 *           "issues":     [ { "platform": "github", "number": 3 } ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * `platform` on a commit/pr/issue must match the `type` of one of the entries
 * in `platforms` ("github" or "gitlab"). GitLab platforms require `host`.
 *
 * The script preserves previously-released version sections from the existing
 * CHANGELOG.md (anything below the newest version). Only `## Unreleased` and
 * the newest `## <version>` section are (re)written.
 */

import { existsSync } from 'node:fs'
import { readFileSync, writeFileSync } from 'node:fs'

/* ---------------------------------- types --------------------------------- */

type PlatformType = 'github' | 'gitlab'

interface Platform {
  type: PlatformType
  owner: string
  repo: string
  branch: string
  host?: string // gitlab only
}

interface CommitRef {
  platform: PlatformType
  sha: string // full sha; short form = first 7 chars
  author?: string
}

interface PrRef {
  platform: PlatformType
  number: number
  author?: string
}

interface IssueRef {
  platform: PlatformType
  number: number
}

interface Entry {
  description: string
  commits?: CommitRef[]
  prs?: PrRef[]
  issues?: IssueRef[]
}

interface Group {
  type: string
  entries: Entry[]
}

interface AssemblerInput {
  projectName: string
  includeUnreleased?: boolean
  includeReleaseLinks?: boolean
  platforms: Platform[]
  version: string
  date: string // YYYY-MM-DD
  previousVersion?: string
  groups: Group[]
}

/* ------------------------------- URL builders ------------------------------ */

function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

function platformBase(p: Platform): string {
  if (p.type === 'github') return `https://github.com/${p.owner}/${p.repo}`
  return `https://${p.host}/${p.owner}/${p.repo}`
}

function commitUrl(p: Platform, sha: string): string {
  return `${platformBase(p)}/commit/${sha}`
}

function prUrl(p: Platform, n: number): string {
  if (p.type === 'github') return `${platformBase(p)}/pull/${n}`
  return `${platformBase(p)}/-/merge_requests/${n}`
}

function issueUrl(p: Platform, n: number): string {
  if (p.type === 'github') return `${platformBase(p)}/issues/${n}`
  return `${platformBase(p)}/-/issues/${n}`
}

function releaseUrl(p: Platform, version: string): string {
  if (p.type === 'github') return `${platformBase(p)}/releases/tag/${version}`
  return `${platformBase(p)}/-/releases/${version}`
}

function compareUrl(p: Platform, from: string, to: string): string {
  // Match the reference changelogs: legacy compare path without `/-/`.
  return `${platformBase(p)}/compare/${from}...${to}`
}

function profileUrl(p: Platform, user: string): string {
  if (p.type === 'github') return `https://github.com/${user}`
  return `https://${p.host}/${user}`
}

function platformLabel(p: Platform, kind: 'Commit' | 'PR' | 'MR' | 'Issue'): string {
  const name = p.type === 'github' ? 'GitHub' : 'GitLab'
  // GitLab merge requests are labelled "MR"; GitHub pull requests "PR".
  if (kind === 'PR') return p.type === 'github' ? 'GitHub PR' : 'GitLab MR'
  return `${name} ${kind}`
}

/* ------------------------------- rendering -------------------------------- */

function renderAuthorSuffix(p: Platform, author?: string): string {
  if (!author) return '.'
  return ` by [@${author}](${profileUrl(p, author)}).`
}

function renderCommitLine(p: Platform, c: CommitRef): string {
  const label = platformLabel(p, 'Commit')
  return `  - ${label}: [${shortSha(c.sha)}](${commitUrl(p, c.sha)})${renderAuthorSuffix(p, c.author)}`
}

function renderPrLine(p: Platform, pr: PrRef): string {
  const label = platformLabel(p, 'PR')
  const display = p.type === 'github' ? `#${pr.number}` : `!${pr.number}`
  return `  - ${label}: [${display}](${prUrl(p, pr.number)})${renderAuthorSuffix(p, pr.author)}`
}

function renderIssueBlock(p: Platform, issues: IssueRef[]): string {
  const label = platformLabel(p, 'Issue')
  const items = issues.map((i) => `    - [#${i.number}](${issueUrl(p, i.number)}).`).join('\n')
  return `  - ${label}:\n${items}`
}

function renderIssuesForPlatform(p: Platform, issues: IssueRef[]): string[] {
  if (issues.length === 0) return []

  if (issues.length <= 2) {
    // inline: one line, joined by " and "
    const label = platformLabel(p, 'Issue')
    const parts = issues.map((i) => `[#${i.number}](${issueUrl(p, i.number)})`).join(' and ')
    return [`  - ${label}: ${parts}.`]
  }

  return [renderIssueBlock(p, issues)]
}

/** Render all nested reference lines for one entry, in order: Issue → Commit → PR/MR. */
function renderEntryRefs(entry: Entry, platforms: Platform[]): string[] {
  const lines: string[] = []

  // Issues, grouped per platform (in platform order).
  for (const p of platforms) {
    const issues = (entry.issues ?? []).filter((i) => i.platform === p.type)
    if (issues.length > 0) lines.push(...renderIssuesForPlatform(p, issues))
  }
  // Commits, per platform.
  for (const p of platforms) {
    const commits = (entry.commits ?? []).filter((c) => c.platform === p.type)
    for (const c of commits) lines.push(renderCommitLine(p, c))
  }
  // PRs / MRs, per platform.
  for (const p of platforms) {
    const prs = (entry.prs ?? []).filter((pr) => pr.platform === p.type)
    for (const pr of prs) lines.push(renderPrLine(p, pr))
  }

  return lines
}

function renderEntry(entry: Entry, platforms: Platform[]): string {
  // ensure a single trailing period
  const desc = entry.description.replace(/\.+$/, '') + '.'
  const refs = renderEntryRefs(entry, platforms)
  if (refs.length === 0) return `- ${desc}`
  return `- ${desc}\n${refs.join('\n')}`
}

function renderGroup(group: Group, platforms: Platform[]): string {
  // Entries are consecutive list items (no blank line between them), matching
  // the reference changelogs. Nested ref lines keep each entry self-contained.
  const body = group.entries.map((e) => renderEntry(e, platforms)).join('\n')
  return `### ${group.type}\n\n${body}`
}

function renderUnreleased(input: AssemblerInput): string | null {
  if (!input.includeUnreleased) return null
  // The Unreleased compare link goes from the version just released (the newest
  // version section below it) to the integration branch. That is `input.version`,
  // NOT `input.previousVersion` (which is the version prior to the one being
  // released). See references/changelog-format.md "Unreleased Section".
  if (!input.version) return null

  const bullets = input.platforms.map(
    (p) =>
      `- ${p.type === 'github' ? 'GitHub' : 'GitLab'}: ${compareUrl(p, input.version, p.branch)}`,
  )

  return `## Unreleased\n\n${bullets.join('\n')}`
}

function renderReleaseLinks(input: AssemblerInput): string | null {
  if (!input.includeReleaseLinks) return null

  const bullets = input.platforms.map(
    (p) => `- ${p.type === 'github' ? 'GitHub' : 'GitLab'}: ${releaseUrl(p, input.version)}`,
  )

  return bullets.join('\n')
}

function renderVersionSection(input: AssemblerInput): string {
  const header = `## ${input.version} - ${input.date}`
  const releaseLinks = renderReleaseLinks(input)

  const groups = input.groups
    .filter((g) => g.entries.length > 0)
    .map((g) => renderGroup(g, input.platforms))

  const parts = [header]
  if (releaseLinks) parts.push(releaseLinks)
  parts.push(...groups)
  return parts.join('\n\n')
}

/* ----------------------- preserve old version sections -------------------- */

interface Section {
  header: string // the `## ...` line
  body: string // full section text including header
}

function parseSections(content: string): { intro: string; sections: Section[] } {
  // Split into lines; find first line starting with "## ".
  const lines = content.split('\n')
  let firstSectionIdx = lines.findIndex((l) => l.startsWith('## '))

  if (firstSectionIdx === -1) {
    return { intro: content.trim(), sections: [] }
  }

  const intro = lines.slice(0, firstSectionIdx).join('\n').trim()
  const sections: Section[] = []
  let current: string[] = []

  for (let i = firstSectionIdx; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ') && current.length > 0) {
      sections.push({ header: current[0], body: current.join('\n') })
      current = [line]
    } else {
      current.push(line)
    }
  }

  if (current.length > 0) {
    sections.push({ header: current[0], body: current.join('\n') })
  }
  // trim trailing blank lines of each section body
  for (const s of sections) {
    s.body = s.body.replace(/\n+$/, '')
  }

  return { intro, sections }
}

function versionOfHeader(header: string): string | null {
  // "## 1.2.0 - 2026-08-31" -> "1.2.0"; "## Unreleased" -> null
  const m = /^## (\S+)/.exec(header)
  if (!m) return null
  if (m[1] === 'Unreleased') return null
  return m[1]
}

/* --------------------------------- main ----------------------------------- */

function fail(msg: string): never {
  console.error(`assemble-changelog: ${msg}`)
  process.exit(1)
}

function main() {
  const inputPath = process.argv[2]
  const changelogPath = process.argv[3] ?? './CHANGELOG.md'
  if (!inputPath) fail('missing input json path argument')
  if (!existsSync(inputPath)) fail(`input file not found: ${inputPath}`)

  const input = JSON.parse(readFileSync(inputPath, 'utf8')) as AssemblerInput
  if (!input.projectName) fail('input.projectName is required')
  if (!input.version) fail('input.version is required')
  if (!input.date) fail('input.date is required (YYYY-MM-DD)')

  if (!Array.isArray(input.platforms) || input.platforms.length === 0)
    fail('input.platforms must be a non-empty array')

  for (const p of input.platforms) {
    if (p.type === 'gitlab' && !p.host) fail(`gitlab platform missing "host": ${JSON.stringify(p)}`)
  }

  const titleBlock = `# Changelog\n\nAll notable changes to \`${input.projectName}\` will be documented in this file.`
  const unreleased = renderUnreleased(input)
  const newVersionSection = renderVersionSection(input)

  // Preserve old sections from existing CHANGELOG.md.
  let oldSections: Section[] = []

  if (existsSync(changelogPath)) {
    const existing = readFileSync(changelogPath, 'utf8')
    const { sections } = parseSections(existing)

    oldSections = sections.filter((s) => {
      const v = versionOfHeader(s.header)
      // drop Unreleased and the version we are (re)writing
      if (v === null) return false
      if (v === input.version) return false
      return true
    })
  }

  const parts: string[] = [titleBlock]
  if (unreleased) parts.push(unreleased)
  parts.push(newVersionSection)
  for (const s of oldSections) parts.push(s.body)

  const output = `${parts.join('\n\n')}\n`
  writeFileSync(changelogPath, output)
  console.log(`wrote ${changelogPath} (${input.version}, ${input.groups.length} group(s))`)
}

main()
