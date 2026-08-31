# Platform Link Patterns

URL templates for GitHub and GitLab. The assembler script builds all links from
these templates using the platform descriptors in the assembler input.

A platform descriptor has this shape:

```json
{ "type": "github", "owner": "acme", "repo": "my-app", "branch": "main" }
{ "type": "gitlab", "host": "gitlab.example.com", "owner": "acme", "repo": "my-app", "branch": "main" }
```

`host` is only used for GitLab. GitHub always uses `github.com`.

---

## GitHub

Base: `https://github.com/<owner>/<repo>`

| Resource | Template                    | Display text                  |
| -------- | --------------------------- | ----------------------------- |
| Commit   | `/commit/<full-sha>`        | `<short-sha>` (first 7 chars) |
| Pull     | `/pull/<N>`                 | `#<N>`                        |
| Issue    | `/issues/<N>`               | `#<N>`                        |
| Release  | `/releases/tag/<version>`   | — (link line)                 |
| Compare  | `/compare/<from>...<to>`    | — (link line)                 |
| Profile  | `https://github.com/<user>` | `@<user>`                     |

### Rendered

```
GitHub Commit: [<short-sha>](https://github.com/<owner>/<repo>/commit/<full-sha>) by [@<user>](https://github.com/<user>).
GitHub PR: [#<N>](https://github.com/<owner>/<repo>/pull/<N>) by [@<user>](https://github.com/<user>).
GitHub Issue: [#<N>](https://github.com/<owner>/<repo>/issues/<N>).
```

Unreleased / release link lines:

```
- GitHub: https://github.com/<owner>/<repo>/compare/<previousVersion>...<branch>
- GitHub: https://github.com/<owner>/<repo>/releases/tag/<version>
```

---

## GitLab

Base: `https://<host>/<owner>/<repo>`

| Resource | Template                 | Display text                  |
| -------- | ------------------------ | ----------------------------- |
| Commit   | `/commit/<full-sha>`     | `<short-sha>` (first 7 chars) |
| MR       | `/-/merge_requests/<N>`  | `!<N>`                        |
| Issue    | `/-/issues/<N>`          | `#<N>`                        |
| Release  | `/-/releases/<version>`  | — (link line)                 |
| Compare  | `/compare/<from>...<to>` | — (link line)                 |
| Profile  | `https://<host>/<user>`  | `@<user>`                     |

> Note: the reference changelogs use the legacy compare path
> `/<owner>/<repo>/compare/<from>...<to>` (without `/-/`). We keep that form to
> match the examples. Commit/MR/Issue/Release paths **do** use `/-/`.

### Rendered

```
GitLab Commit: [<short-sha>](https://<host>/<owner>/<repo>/commit/<full-sha>) by [@<user>](https://<host>/<user>).
GitLab MR: [!<N>](https://<host>/<owner>/<repo>/-/merge_requests/<N>) by [@<user>](https://<host>/<user>).
GitLab Issue: [#<N>](https://<host>/<owner>/<repo>/-/issues/<N>).
```

Unreleased / release link lines:

```
- GitLab: https://<host>/<owner>/<repo>/compare/<previousVersion>...<branch>
- GitLab: https://<host>/<owner>/<repo>/-/releases/<version>
```

---

## Detecting the Platform from `git remote`

Run `git remote get-url origin` (or `git remote -v`). Parse the URL:

- `https://github.com/<owner>/<repo>.git` → GitHub, `owner`, `repo` (strip `.git`).
- `git@github.com:<owner>/<repo>.git` → GitHub, same.
- `https://gitlab.com/<owner>/<repo>.git` → GitLab, `host=gitlab.com`.
- `https://<host>/<owner>/<repo>.git` (self-hosted GitLab, e.g.
  `https://gitlab.example.com/...`) → GitLab with that `host`.
- `git@<host>:<owner>/<repo>.git` → GitLab with that `host`.

If unsure whether a self-hosted host is GitLab, ask the user. For dual-platform
repos (mirrored to both GitHub and GitLab), the user supplies both descriptors;
the skill cannot reliably infer the second remote from git alone.

---

## Resolving Author Usernames

Git commit author email is **not** the platform username. To get `@<user>`:

1. **GitHub**: query the commit/PR via the GitHub API
   (`https://api.github.com/repos/<owner>/<repo>/commits/<sha>` or
   `/pulls/<N>`) and read `author.login`. If a GitHub MCP server is available,
   prefer it. Fallback: `webfetch` the commit/PR HTML page.
2. **GitLab**: query
   `https://<host>/api/v4/projects/<owner>%2F<repo>/merge_requests/<N>` and read
   `author.username`. For commits, `/repository/commits/<sha>` gives
   `author_name` but not username — prefer resolving via the MR that introduced
   the commit.
3. If the username cannot be resolved, fall back to the git author name and flag
   the entry for the user to correct during review.

The agent does this resolution during the gather step; the assembler only
renders what it is given.
