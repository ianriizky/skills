/**
 * Custom Changeset changelog generator (minimal).
 *
 * Why this exists: `@changesets/cli` hardcodes the `### Major/Minor/Patch
 * Changes` grouping and the `## <version>` header (see
 * `@changesets/apply-release-plan/dist/index.mjs`, `generateMarkdownForVersion`
 * and `getChangelogEntry`). A custom `getReleaseLine` cannot change that
 * structure, so we cannot produce the project's conventional-commit-grouped
 * format (### feat / ### fix / ...) through the generator alone.
 *
 * Instead, this generator returns empty strings so `changeset version` does not
 * write the default `@changesets/changelog-github` output (which would call the
 * GitHub API and emit Major/Minor/Patch sections). The real CHANGELOG.md is
 * assembled afterwards by `scripts/assemble-changelog.ts` (run via Bun), which
 * is the source of truth for the final format.
 *
 * Wire it up in `.changeset/config.json`:
 *
 *   "changelog": ["../.agents/skills/changelog/scripts/changelog-custom.mjs", {}]
 *
 * (The path is resolved relative to the `.changeset` directory by the CLI.)
 *
 * `changeset version` runs under Node (`#!/usr/bin/env node`), so this file is
 * `.mjs` — Node cannot import `.ts` without a loader. The assembler script is
 * run via `bun`, so it may be `.ts`.
 */

/**
 * @typedef {import("@changesets/types").ChangelogFunctions} ChangelogFunctions
 * @typedef {import("@changesets/types").VersionType} VersionType
 * @typedef {import("@changesets/types").NewChangesetWithCommit} NewChangesetWithCommit
 */

/**
 * @param {NewChangesetWithCommit} _changeset
 * @param {VersionType} _type
 * @returns {string}
 */
function getReleaseLine(_changeset, _type) {
  return ''
}

/**
 * @param {NewChangesetWithCommit[]} _changesets
 * @param {any[]} _dependenciesUpdated
 * @returns {string}
 */
function getDependencyReleaseLine(_changesets, _dependenciesUpdated) {
  return ''
}

/** @type {ChangelogFunctions} */
const functions = {
  getReleaseLine,
  getDependencyReleaseLine,
}

export default functions
