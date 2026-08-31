---
name: bun-upgrade-runtimes
description: Use when the user wants to upgrade the Bun runtime version (e.g. "upgrade bun to 1.3.15", "update bun version to 1.3.15"). Updates version references across package.json, Dockerfile, CI/CD configs, and README.md, runs bun install to sync the lockfile, then commits with user confirmation.
---

# Upgrade Runtime Versions (Bun)

This skill handles upgrading the Bun runtime version across all files that reference it.

## When to Use

Trigger this skill when the user requests a Bun runtime version upgrade, for example:

- "upgrade bun to 1.3.15"
- "update bun version to 1.3.15"
- "bump bun to 1.3.15"

## Prerequisites

- The target Bun version must be provided in the conversation context.
- If no target version is found, ask the user before proceeding.

## Steps

### 1. Determine the Target Version

Extract the target Bun version from the user's message.

- Bun version format: `1.3.15` (no `v` prefix, no `^` or `~`).

If a target version is not mentioned, ask:

> "What version would you like to upgrade Bun to? (e.g. 1.3.15)"

### 2. Read Current Version

Read the current Bun version from `package.json` line 16: `"packageManager": "bun@1.3.14"` → current version is `1.3.14`.

Store this as `CURRENT_BUN_VERSION` for the commit message.

### 3. Update Bun Version

Update **all** of the following files:

#### a. `package.json` — `engines.bun` (line 14)

**Before:**

```json
"engines": {
  "bun": "^1.3.14"
},
```

**After (example for 1.3.15):**

```json
"engines": {
  "bun": "^1.3.15"
},
```

#### b. `package.json` — `packageManager` (line 16)

**Before:**

```json
"packageManager": "bun@1.3.14",
```

**After (example for 1.3.15):**

```json
"packageManager": "bun@1.3.15",
```

#### c. `package.json` — `bun-types` devDependency (line 141)

Update the `bun-types` version in `devDependencies` to match the target Bun version, preserving the `^` prefix.

**Before:**

```json
"bun-types": "^1.3.14",
```

**After (example for 1.3.15):**

```json
"bun-types": "^1.3.15",
```

#### d. `docker/Dockerfile.app` — base image (line 5)

Update the Bun version in the base image tag. This image is used by all build stages (deps, builder, runner).

**Before:**

```dockerfile
FROM oven/bun:1.3.14-alpine AS base
```

**After (example for 1.3.15):**

```dockerfile
FROM oven/bun:1.3.15-alpine AS base
```

#### e. `.gitlab-ci.yml` — base image (line 6)

Update the Bun version in the job image tag.

**Before:**

```yaml
image: oven/bun:1.3.14-alpine
```

**After (example for 1.3.15):**

```yaml
image: oven/bun:1.3.15-alpine
```

#### f. `.github/workflows/ci-cd.yml` — `BUN_VERSION` env (line 10)

**Before:**

```yaml
BUN_VERSION: 1.3.14
```

**After (example for 1.3.15):**

```yaml
BUN_VERSION: 1.3.15
```

#### g. `README.md` — Bun badge (line 45)

Update the version number in the Bun badge URL only. Do NOT change the badge color, logo, or link.

**Before:**

```markdown
[![Bun](https://img.shields.io/badge/Bun%201.3.14-000000?logo=bun&logoColor=white 'Bun')](https://bun.sh)
```

**After (example for 1.3.15):**

```markdown
[![Bun](https://img.shields.io/badge/Bun%201.3.15-000000?logo=bun&logoColor=white 'Bun')](https://bun.sh)
```

### 4. Run `bun install`

Since the Bun version update changes `package.json` (`engines`, `packageManager`, and `bun-types`), run the following to sync the lockfile:

```bash
bun install
```

If `bun install` fails, STOP and report the error to the user. Do not proceed to the commit step.

### 5. Git Commit (with user confirmation)

After all files are updated and `bun install` has succeeded, **ASK THE USER FOR CONFIRMATION** before committing. Present a summary of the changes and ask:

> "All runtime versions have been updated. Would you like me to commit these changes?"

**ONLY PROCEED WITH THE COMMIT IF THE USER CONFIRMS**. If the user declines, stop and let them know the files have been updated but not committed.

If confirmed, construct the commit message:

```
chore: upgrade bun from <CURRENT_BUN_VERSION> to <TARGET_BUN_VERSION>
```

Then run:

```bash
git add package.json docker/Dockerfile.app .gitlab-ci.yml .github/workflows/ci-cd.yml README.md bun.lock
git commit -m "<commit message>"
```

## Summary of Files Changed

| File                          | Line | What changes                            |
| ----------------------------- | ---- | --------------------------------------- |
| `package.json`                | 14   | `engines.bun` → `^<target>`             |
| `package.json`                | 16   | `packageManager` → `bun@<target>`       |
| `package.json`                | 141  | `bun-types` devDep → `^<target>`        |
| `docker/Dockerfile.app`       | 5    | base image → `oven/bun:<target>-alpine` |
| `.gitlab-ci.yml`              | 6    | base image → `oven/bun:<target>-alpine` |
| `.github/workflows/ci-cd.yml` | 10   | `BUN_VERSION` → `<target>`              |
| `README.md`                   | 45   | Bun badge version → `<target>`          |
| `bun.lock`                    | —    | Regenerated by `bun install`            |

## Example

**User request:** "upgrade bun to 1.3.15"

**Current Bun version:** 1.3.14
**Target Bun version:** 1.3.15

Changes:

1. `package.json` line 14: `"bun": "^1.3.14"` → `"bun": "^1.3.15"`
2. `package.json` line 16: `"packageManager": "bun@1.3.14"` → `"packageManager": "bun@1.3.15"`
3. `package.json` line 141: `"bun-types": "^1.3.14"` → `"bun-types": "^1.3.15"`
4. `docker/Dockerfile.app` line 5: `oven/bun:1.3.14-alpine` → `oven/bun:1.3.15-alpine`
5. `.gitlab-ci.yml` line 6: `oven/bun:1.3.14-alpine` → `oven/bun:1.3.15-alpine`
6. `.github/workflows/ci-cd.yml` line 10: `BUN_VERSION: 1.3.14` → `BUN_VERSION: 1.3.15`
7. `README.md` line 45: `Bun%201.3.14` → `Bun%201.3.15`
8. Run `bun install`
9. Git commit (with user confirmation): `chore: upgrade bun from 1.3.14 to 1.3.15`
