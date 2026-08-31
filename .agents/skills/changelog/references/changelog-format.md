# Changelog Format Reference

This document defines the exact markdown format the assembler script must produce.
It is derived from `examples/changelog/CHANGELOG-1.md` (GitLab-only) and
`examples/changelog/CHANGELOG-2.md` (dual GitHub + GitLab). Read this before
assembling the final `CHANGELOG.md`.

---

## File Layout

```
# Changelog

All notable changes to `<Project Name>` will be documented in this file.

## Unreleased

- <Platform>: <compare-url-from-previous-version-to-branch>
  (one bullet per configured platform)

## <version> - <YYYY-MM-DD>

- <Platform>: <release-url>            (only when includeReleaseLinks is true)
  (one bullet per configured platform)

### <type>

- <description>.
  - <Platform> Commit: [<short-sha>](<commit-url>) by [@<user>](<profile-url>).
  - <Platform> Issue: [#<N>](<issue-url>).
  - <Platform> PR: [#<N>](<pr-url>) by [@<user>](<profile-url>).        (GitHub)
  - <Platform> MR: [!<N>](<mr-url>) by [@<user>](<profile-url>).        (GitLab)

## <previous-version> - <YYYY-MM-DD>

### <type>
...
```

Sections are separated by **one blank line**. Within an entry, nested link
lines are indented **2 spaces**; a multi-value issue block uses a label line at
2 spaces and each value at **4 spaces**.

---

## Title Block

Always exactly:

```
# Changelog

All notable changes to `<Project Name>` will be documented in this file.
```

`<Project Name>` is the human-readable project name (e.g. `My App`, or the
package name `@acme/my-app`). It comes from the assembler input's `projectName`
field.

---

## Unreleased Section

Present when `includeUnreleased` is true. Placed immediately after the title
block, before the newest version section.

```
## Unreleased

- GitHub: https://github.com/<owner>/<repo>/compare/<previousVersion>...<branch>
- GitLab: https://<host>/<owner>/<repo>/compare/<previousVersion>...<branch>
```

- `<previousVersion>` is the version just released (the newest version section
  below it).
- `<branch>` is the integration branch (e.g. `main`, `develop`).
- One bullet per configured platform, in the order the platforms were given.

---

## Version Section Header

```
## <version> - <YYYY-MM-DD>
```

- `<version>` has no `v` prefix (e.g. `1.2.0`, not `v1.2.0`).
- Date is `YYYY-MM-DD` (ISO), separated from version by `-`.

### Release / compare links (optional)

When `includeReleaseLinks` is true, immediately under the version header (before
any `### <type>` section) add one bullet per platform linking to the release:

```
- GitHub: https://github.com/<owner>/<repo>/releases/tag/<version>
- GitLab: https://<host>/<owner>/<repo>/-/releases/<version>
```

---

## Type Sections

Each version section contains one `### <type>` subsection per conventional
commit type present in that release, in the order supplied by the assembler
input's `groups` array. Common types, in the suggested default order:

1. `feat`
2. `fix`
3. `ui`
4. `refactor`
5. `perf`
6. `docs`
7. `ci`
8. `chore`
9. `build`
10. `test`

The agent may reorder to emphasize significance, but `feat` and `fix` typically
come first. Omit types that have no entries.

---

## Entry Format

Each entry is a bullet with the description on the first line and nested
reference lines below it, indented 2 spaces.

### Single commit, single author

```
- refactor integration tests to use direct API calls.
  - GitLab Commit: [abcdef0](https://gitlab.example.com/acme/my-app/commit/abcdef0123456789abcdef0123456789abcdef0) by [@alice](https://gitlab.example.com/alice).
```

### Commit + Issue + MR

```
- add cookie consent banner for EU/UK regions.
  - GitLab Issue: [#42](https://gitlab.example.com/acme/my-app/-/issues/42).
  - GitLab MR: [!57](https://gitlab.example.com/acme/my-app/-/merge_requests/57) by [@alice](https://gitlab.example.com/alice).
```

### Multiple issues (block form)

When an entry references several issues, use a label line followed by 4-space
indented bullets:

```
- improve SEO with structured data and alt text.
  - GitLab Issue:
    - [#51](https://gitlab.example.com/acme/my-app/-/issues/51).
    - [#52](https://gitlab.example.com/acme/my-app/-/issues/52).
    - [#53](https://gitlab.example.com/acme/my-app/-/issues/53).
  - GitLab MR: [!60](https://gitlab.example.com/acme/my-app/-/merge_requests/60) by [@alice](https://gitlab.example.com/alice).
```

Rule: 3 or more issues → block form. 2 issues may be inline:
`- GitLab Issue: [#41](...) and [#42](...).`.

### MR / PR only (no commit, no issue)

```
- redirect legacy route to unified page.
  - GitLab MR: [!64](https://gitlab.example.com/acme/my-app/-/merge_requests/64) by [@alice](https://gitlab.example.com/alice).
```

### Dual platform (GitHub + GitLab)

Each reference kind gets one line per platform. Commits typically share the same
SHA across mirrors:

```
- upgrade boilerplate dependencies.
  - GitHub Commit: [abcdef0](https://github.com/acme/my-app/commit/abcdef0123456789abcdef0123456789abcdef0) by [@alice](https://github.com/alice).
  - GitLab Commit: [abcdef0](https://gitlab.example.com/acme/my-app/commit/abcdef0123456789abcdef0123456789abcdef0) by [@alice](https://gitlab.example.com/alice).
```

For PRs/MRs the numbers may differ between platforms; render each independently.

---

## Reference Line Syntax per Platform

### GitHub

| Kind   | Label           | Display       | URL                                                   |
| ------ | --------------- | ------------- | ----------------------------------------------------- |
| Commit | `GitHub Commit` | `<short-sha>` | `https://github.com/<owner>/<repo>/commit/<full-sha>` |
| PR     | `GitHub PR`     | `#<N>`        | `https://github.com/<owner>/<repo>/pull/<N>`          |
| Issue  | `GitHub Issue`  | `#<N>`        | `https://github.com/<owner>/<repo>/issues/<N>`        |
| Author | (suffix)        | `@<user>`     | `https://github.com/<user>`                           |

### GitLab

| Kind   | Label           | Display       | URL                                                  |
| ------ | --------------- | ------------- | ---------------------------------------------------- |
| Commit | `GitLab Commit` | `<short-sha>` | `https://<host>/<owner>/<repo>/commit/<full-sha>`    |
| MR     | `GitLab MR`     | `!<N>`        | `https://<host>/<owner>/<repo>/-/merge_requests/<N>` |
| Issue  | `GitLab Issue`  | `#<N>`        | `https://<host>/<owner>/<repo>/-/issues/<N>`         |
| Author | (suffix)        | `@<user>`     | `https://<host>/<user>`                              |

`<short-sha>` is the first 7 characters of the full SHA.

Author suffix form: `by [@<user>](<profile-url>).` — appended to Commit, PR, and
MR lines. Issue lines are **not** followed by an author suffix.

---

## Writing Rules

- **Description**: lowercase, imperative or declarative, ends with a period.
  Strip any conventional-commit prefix (`feat:`, `fix(scope):`, etc.) from the
  description — the type is already conveyed by the `### <type>` header.
- **Order of nested lines within an entry**: Issue(s) first, then Commit, then
  PR/MR. (The examples vary; when both commit and MR exist, commit may come
  first. Prefer: Issue → Commit → PR/MR, matching the `ci` entry which uses
  commit-only, and `feat` entries which use Issue → MR.)
- **No trailing whitespace**. One blank line between sections and between
  version blocks.
- **Preserve history**: when regenerating, keep all previously-released version
  sections intact. Only the `## Unreleased` and the newest `## <version>`
  sections are (re)written; older sections are carried over from the existing
  `CHANGELOG.md`.

---

## Worked Example (abridged)

```
# Changelog

All notable changes to `My App` will be documented in this file.

## Unreleased

- GitLab: https://gitlab.example.com/acme/my-app/compare/1.2.0...main

## 1.2.0 - 2026-08-31

### feat

- add cookie consent banner for EU/UK regions.
  - GitLab Issue: [#42](https://gitlab.example.com/acme/my-app/-/issues/42).
  - GitLab MR: [!57](https://gitlab.example.com/acme/my-app/-/merge_requests/57) by [@alice](https://gitlab.example.com/alice).

### fix

- remove hardcoded decimal suffix from price formatting.
  - GitLab MR: [!63](https://gitlab.example.com/acme/my-app/-/merge_requests/63) by [@alice](https://gitlab.example.com/alice).

## 1.1.0 - 2026-08-28

### ui

- replace partner logo on homepage.
  - GitLab MR: [!50](https://gitlab.example.com/acme/my-app/-/merge_requests/50) by [@alice](https://gitlab.example.com/alice).
```
