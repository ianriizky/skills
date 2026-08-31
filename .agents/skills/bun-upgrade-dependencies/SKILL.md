---
name: bun-upgrade-dependencies
description: Use when the user wants to upgrade all dependencies and devDependencies by removing bun.lock and node_modules, cleaning bun cache, and reinstalling. Compares installed versions from `bun list -a` with package.json and README.md Tech stack section, then syncs them. Commits with user confirmation.
---

# Upgrade All Dependencies

This skill handles upgrading all dependencies and devDependencies by forcing a clean reinstall (removing `bun.lock` and `node_modules`), cleaning the bun cache, and running `bun install`. After install, it compares the actual installed versions from `bun list -a` with `package.json` and the `## Tech stack` section in `README.md`, then updates them to match `bun list -a` as the source of truth.

## When to Use

Trigger this skill when the user requests a dependency upgrade, for example:

- "upgrade all dependencies"
- "upgrade all deps"
- "update dependencies"
- "reinstall dependencies"

## Prerequisites

- The project must use Bun as the package manager.
- `bun.lock` and `node_modules` must exist (if they don't, the skill still works but the deletion step is a no-op).

## Steps

### 1. Warn the User and Ask for Confirmation

**This step is mandatory. Do NOT skip it.**

Before making any changes, warn the user that this process will **forcefully delete** the following:

- `bun.lock` — the lockfile will be regenerated from scratch.
- `node_modules/` — the entire dependency tree will be reinstalled.

Ask the user for confirmation:

> "This will delete `bun.lock` and `node_modules/` folder, then clean the bun cache and reinstall all dependencies. Do you want to proceed?"

**If the user declines, STOP immediately.** Do not perform any further steps.

### 2. Delete `bun.lock` and `node_modules`

Run the following commands:

```bash
rm -f bun.lock
rm -rf node_modules
```

### 3. Clean Bun Cache

Run the following command to clear the bun package cache:

```bash
bun pm cache rm
```

### 4. Install Dependencies

Run the following command to reinstall all dependencies:

```bash
bun install
```

If `bun install` fails, STOP and report the error to the user. Do not proceed to the comparison step.

### 5. Re-run `bun install` to Ensure Lockfile Sync

Sometimes `bun.lock` is not fully in sync with the installed dependencies after the first install. Run `bun install` once more to ensure the lockfile and `node_modules` are consistent:

```bash
bun install
```

If this second `bun install` fails, STOP and report the error to the user.

### 6. Get All Installed Dependencies

Run the following command to get the full list of installed dependencies:

```bash
bun list -a
```

Store the output. This is the **source of truth** for all version comparisons.

### 7. Compare and Update `package.json`

Parse the output of `bun list -a` and extract the actual installed versions for:

- All packages listed under `dependencies` in `package.json`
- All packages listed under `devDependencies` in `package.json`

For each package in `package.json`:

1. Find the package name in the `bun list -a` output.
2. Extract the actual installed version (e.g., `1.5.0`).
3. Compare it with the version range in `package.json` (e.g., `^1.0.0`).
4. If the version number (ignoring the `^` or `~` prefix) does not match the installed version, update the version range in `package.json` to use the actual installed version while preserving the original prefix (`^` or `~`).

**Example:**

- `package.json` has `"react": "^19.2.8"`
- `bun list -a` shows `react 19.2.10`
- Update `package.json` to `"react": "^19.2.10"`

**Special cases:**

- If the version in `package.json` has no prefix (exact version, e.g., `"19.2.14"`), keep it as an exact version and update the number.
- If the version in `package.json` uses `~` prefix, preserve `~` and update the number.
- If a package in `package.json` is not found in `bun list -a` output, leave it unchanged and warn the user.
- Do NOT change the `engines` or `packageManager` fields — those refer to the Bun runtime, not dependencies.
- Do NOT change the `overrides` field.

### 8. Compare and Update `README.md` — Tech Stack Section

The `## Tech stack` section in `README.md` contains shield.io badges with embedded version numbers. Update **only the version numbers** in the existing badges to match the actual installed versions from `bun list -a`.

The following table maps README badges to `package.json` dependency names:

| Badge label in README | package.json key   |
| --------------------- | ------------------ |
| React                 | `react`            |
| NextJS                | `next`             |
| TypeScript            | `typescript`       |
| Payload CMS           | `payload`          |
| Drizzle ORM           | `drizzle-orm`      |
| Better Auth           | `better-auth`      |
| TailwindCSS           | `tailwindcss`      |
| Dotenvx               | `@dotenvx/dotenvx` |

For each badge:

1. Find the corresponding package in the `bun list -a` output.
2. Extract the actual installed version.
3. Update the version number in the badge URL.

**Example:**

- README has: `[![React](https://img.shields.io/badge/React%2019.2.8-61DAFB?logo=react&logoColor=white 'React')](https://reactjs.org)`
- `bun list -a` shows `react 19.2.10`
- Update to: `[![React](https://img.shields.io/badge/React%2019.2.10-61DAFB?logo=react&logoColor=white 'React')](https://reactjs.org)`

**Rules:**

- Do NOT add new badges.
- Do NOT remove existing badges.
- Do NOT change the badge color, logo, or link — only the version number.
- If a mapped package is not found in `bun list -a`, leave the badge unchanged and warn the user.

### 9. Git Commit (with user confirmation)

After all files are updated, **ask the user for confirmation** before committing. Present a summary of the changes — including the full list of updated packages with their old and new versions — and ask:

> "All dependencies have been upgraded and synced. Would you like me to commit these changes?"

**ONLY PROCEED WITH THE COMMIT IF THE USER CONFIRMS**. If the user declines, stop and let them know the files have been updated but not committed.

If confirmed, construct a commit message with a detailed list of all updated dependencies. The commit message format is:

```
chore: upgrade all dependencies version

<package-name> <old-version> → <new-version>
<package-name> <old-version> → <new-version>
...
```

Rules for the commit message body:

- List **only packages whose version actually changed** (skip packages that stayed the same).
- Use the full version range including prefix (`^` or `~`) as it appears in `package.json`.
- Group by `dependencies` first, then `devDependencies`.
- Within each group, sort alphabetically by package name.
- If no packages changed (all versions were already up to date), use a simpler message: `chore: reinstall all dependencies (no version changes)`.

**Example commit message:**

```
chore: upgrade all dependencies version

@dotenvx/dotenvx ^2.17.2 → ^2.18.1
@next/third-parties ^16.2.11 → ^16.2.12
@radix-ui/react-checkbox ^1.3.9 → ^1.3.11
@radix-ui/react-label ^2.1.13 → ^2.1.15
@radix-ui/react-select ^2.3.5 → ^2.3.7
@radix-ui/react-slot ^1.3.1 → ^1.3.3
lucide-react ^1.26.0 → ^1.27.0
next ^16.2.11 → ^16.2.12

@next/eslint-plugin-next ^16.2.11 → ^16.2.12
@playwright/test ^1.61.1 → ^1.62.0
postcss ^8.5.22 → ^8.5.23
```

Then run:

```bash
git add package.json README.md bun.lock
git commit -m "chore: upgrade all dependencies version" -m "<detailed list as shown above>"
```

Alternatively, use a HEREDOC for multi-line commit messages:

```bash
git add package.json README.md bun.lock
git commit -F- <<'EOF'
chore: upgrade all dependencies version

@dotenvx/dotenvx ^2.17.2 → ^2.18.1
@next/third-parties ^16.2.11 → ^16.2.12
...
EOF
```

## Summary of Files Changed

| File            | What changes                                                                           |
| --------------- | -------------------------------------------------------------------------------------- |
| `bun.lock`      | Deleted and regenerated by `bun install`                                               |
| `node_modules/` | Deleted and reinstalled by `bun install`                                               |
| `package.json`  | Version numbers in `dependencies` and `devDependencies` updated to match `bun list -a` |
| `README.md`     | Version numbers in `## Tech stack` badges updated to match `bun list -a`               |

## Example

**User request:** "upgrade all dependencies"

**Flow:**

1. Warn user → user confirms
2. `rm -f bun.lock && rm -rf node_modules`
3. `bun pm cache rm`
4. `bun install`
5. `bun install` (second run to ensure lockfile sync)
6. `bun list -a` → capture output
7. Compare and update `package.json`:
   - `"react": "^19.2.8"` → `"react": "^19.2.10"` (if `bun list -a` shows `19.2.10`)
   - `"typescript": "~6.0.3"` → `"typescript": "~6.0.5"` (if `bun list -a` shows `6.0.5`)
8. Compare and update `README.md`:
   - `React%2019.2.8` → `React%2019.2.10`
   - `TypeScript%206.0.3` → `TypeScript%206.0.5`
9. Ask user → user confirms → `git commit` with detailed list of updated packages in the message body
