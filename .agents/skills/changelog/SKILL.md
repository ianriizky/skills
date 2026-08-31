---
name: changelog
description: >-
  Generate a project-specific CHANGELOG.md from changesets and git history in a
  custom conventional-commit-grouped format with platform links (GitHub and/or
  GitLab) and author attribution. Uses `changeset version` to bump and consume
  changesets, then a Bun assembler script renders the final file. Use this
  skill whenever the user wants to generate, regenerate, or reformat a
  changelog from changesets — even if they just say "update changelog",
  "cut a release", or "version the package".
---

# Changelog Generator

Generate `CHANGELOG.md` in the project's own format from pending changesets and
git history. The output is grouped by conventional-commit type (`### feat`,
`### fix`, `### ci`, `### refactor`, …) with per-entry links to commits, PRs/MRs,
issues, and author profiles on GitHub and/or GitLab.

## Why a custom pipeline (not just `changeset version`)

`@changesets/cli` hardcodes `### Major/Minor/Patch Changes` grouping and a
`## <version>` header with no date or release/compare links (see
`@changesets/apply-release-plan/dist/index.mjs`). A custom `getReleaseLine`
generator cannot change that structure. So this skill uses a two-stage pipeline:

1. **`changeset version`** — bumps `package.json`, consumes `.changeset/*.md`,
   and writes a minimal CHANGELOG. A custom generator
   (`scripts/changelog-custom.mjs`) returns empty strings so the default
   GitHub-API-calling, Major/Minor/Patch output is not produced.
2. **`scripts/assemble-changelog.ts`** (run via Bun) — renders the real
   `CHANGELOG.md` in the project's format from a structured JSON the agent
   builds. This script is the source of truth for the final file.

---

## Workflow

### Step 1 — Gather Inputs

Collect from the user (ask only what you cannot infer):

1. **Platform(s)** — run `git remote get-url origin` and parse it per
   `references/platform-links.md`. Confirm with the user:
   - GitHub only, GitLab only, or both (dual-mirror)?
   - For GitLab: confirm the `host` (e.g. `gitlab.com`, a self-hosted instance).
   - For dual: get the second platform's `owner`/`repo`/`host` — it cannot be
     inferred from a single remote.
2. **Project name** — for the title line
   `All notable changes to \`<name>\`…`. Default to the `name`field in`package.json`. Confirm if unclear.
3. **Integration branch** — for the `## Unreleased` compare link. Default
   `main`; ask if the repo uses `develop`/`master`/etc.
4. **`includeUnreleased`** — default `true` (emit a `## Unreleased` section with
   a compare link from the new version to the branch).
5. **`includeReleaseLinks`** — default `true` (emit release-tag link bullets
   under each version header). Set `false` to match `CHANGELOG-1.md` style.

### Step 2 — Determine the New Version

1. Read every file in `.changeset/*.md` (excluding `README.md` and
   `config.json`). Each has a YAML-ish frontmatter block:
   ```
   ---
   "<package-name>": minor
   ---
   <summary>
   ```
2. Compute the highest bump type across all changesets
   (`major` > `minor` > `patch`). Bump the current `package.json` version
   accordingly to get the **new version**. (This must match what
   `changeset version` will compute — use semver rules.)
3. Determine the **previous version**:
   - From the top `## <version>` header in the existing `CHANGELOG.md`, or
   - From the most recent `git tag` (`git tag --sort=-v:refname | head -1`),
     stripping a leading `v`.
     If this is the first release, there is no previous version; set
     `includeUnreleased: false` and skip the Unreleased section.

### Step 3 — Gather Git History

Run, from the repo root:

```sh
git log <previousVersion>..HEAD --no-merges --format='%H%x09%an%x09%ae%x09%s%n%b%n---END---'
```

If there is no previous version, use `git log --root` style (all commits). For
each commit:

- **Full SHA** and **short SHA** (first 7 chars) from `%H`.
- **Conventional commit type** — parse from the subject `%s`:
  `^(feat|fix|ui|refactor|perf|docs|ci|chore|build|test|style)(\(.+\))?:\s*(.+)$`.
  The type is the first group; the description is the third group (after the
  colon). If a commit does not follow the convention, ask the user which type
  it belongs to, or default `chore`.
- **Description** — the part after `type(scope):`. Strip trailing `(#123)` /
  `!117` trailer references from the description (they become link refs, not
  prose). Lowercase the first letter if it starts a sentence, ensure a trailing
  period.
- **Issue / PR / MR references** — scan subject and body for:
  - GitHub: `#123` (issue or PR — resolve via API), `gh-123`.
  - GitLab: `#123` (issue), `!123` (MR).
  - Also check merge commits if `--no-merges` was relaxed; a merge commit's
    subject often contains the MR/PR number.
- **Author platform username** — git author email is not the platform username.
  Resolve per `references/platform-links.md` (GitHub/GitLab API or MCP). If
  unresolvable, use the git author name and flag it for the user in review.

Group commits by conventional-commit type. Multiple commits that belong to the
same logical change (same MR/PR) should be merged into a single entry sharing
the MR/PR/issue links; keep distinct commits as separate `Commit:` lines under
that entry.

### Step 4 — Build the Draft JSON

Construct the assembler input JSON (schema in
`scripts/assemble-changelog.ts` header comment). Save it to a temp file, e.g.
`/tmp/changelog-input.json`. Then render a **readable markdown preview** of the
new version section in the chat (not the raw JSON) so the user can review.

### Step 5 — Present Draft for Review

Show the rendered new version section and `## Unreleased` section to the user.
Ask:

- Are the conventional-commit groupings correct? Any commits in the wrong type?
- Are descriptions accurate and well-worded?
- Are all PR/MR/issue numbers and authors correct? Any missing?
- Should any entries be merged or split?
- Is the platform set (GitHub/GitLab/dual) correct?
- Are `includeUnreleased` / `includeReleaseLinks` settings as desired?

### Step 6 — Iterate

Apply feedback, rebuild the JSON, re-render, and re-present. Repeat until the
user confirms.

### Step 7 — Finalize

Once approved:

1. **Ensure the custom generator is configured.** Read `.changeset/config.json`.
   If `changelog` is not already
   `["../.agents/skills/changelog/scripts/changelog-custom.mjs", {}]`, update
   it. The path is relative to the `.changeset` directory. Show the user the
   diff before writing. (If the project does not use changesets at all, skip
   this and the `changeset version` step — assemble directly from git history
   using the version the user specifies.)

2. **Run `changeset version`** to bump `package.json` and consume the
   changesets:

   ```sh
   bun run version
   ```

   This also runs `scripts/sync-plugin-version.mjs` if present. Verify
   `package.json` version matches the agreed new version.

3. **Run the assembler:**

   ```sh
   bun {skill-root}/scripts/assemble-changelog.ts /tmp/changelog-input.json ./CHANGELOG.md
   ```

   The assembler preserves previously-released version sections from the
   existing `CHANGELOG.md` and writes the final file.

4. **Verify** — read the resulting `CHANGELOG.md` and show the user the new
   version section. Confirm the file looks right (title, Unreleased, new
   version, old sections intact).

5. **Clean up** — remove the temp input JSON. Do not commit unless asked.

---

## Reference Files

| File                             | When to Read                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `references/changelog-format.md` | Before rendering the draft (Step 4) and before finalizing. Exact format spec with worked examples. |
| `references/platform-links.md`   | During Step 1 (detect platform from `git remote`) and Step 3 (URL templates, author resolution).   |
| `scripts/changelog-custom.mjs`   | Reference for what the custom changeset generator does (Step 7.1). Do not modify unless extending. |
| `scripts/assemble-changelog.ts`  | The assembler. Read its header comment for the exact input JSON schema (Step 4).                   |

---

## Tips

- **Do not run `changeset version` before approval.** It consumes (deletes) the
  `.changeset/*.md` files and bumps `package.json`. Build the draft from the
  changeset files + git log first; only run it in Step 7 once the user approves.
- **Match `changeset version`'s version math.** The draft's new version must
  equal what `changeset version` will produce, or the assembler will write a
  different version than `package.json` ends up with. When unsure, the highest
  bump type among changesets wins (`major` > `minor` > `patch`).
- **Merge commits**: `git log --no-merges` keeps the history clean, but merge
  commits often carry the MR/PR number. If you need MR/PR numbers and they
  aren't in the non-merge commit messages, run a second
  `git log --merges --format='%H %s'` to find them, or query the platform API
  for commits in the range.
- **Author resolution is the slow part.** Batch API calls where possible. If a
  GitHub or GitLab MCP server is available, prefer it over `webfetch`. Fall
  back to git author name and flag for review rather than blocking.
- **First release**: no previous version → no `## Unreleased` compare link, and
  `git log <prev>..HEAD` becomes `git log --root`. Set `includeUnreleased`
  false unless the user wants an empty Unreleased placeholder.
- **Keep old sections intact.** The assembler handles this automatically, but
  if the existing `CHANGELOG.md` is in a different format (e.g. the default
  changeset format), tell the user — the first run will replace the top section
  only; older sections are preserved verbatim even if they look different.
