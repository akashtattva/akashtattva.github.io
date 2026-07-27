# Plan 005: Fix dependency vulnerabilities

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5a36df8..HEAD -- package.json package-lock.json`
> If these files have changed since this plan was written, proceed with
> caution — the vulnerability profile may have shifted.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `5a36df8`, 2026-07-27
- **Issue**: (none)

## Why this matters

`npm audit` reports 19 vulnerabilities in the dependency tree (1 critical, 11 high, 6 moderate, 1 low). These are mostly in build-time transitive dependencies (vite, esbuild, postcss, rollup, sharp, svgo, fast-xml-parser) used during `astro build`. For a static site with no user authentication or server-side request handling, the runtime risk is near zero. However:

- Supply-chain hygiene: critical/high vulnerabilities in build tooling are still a vector if an attacker compromises the dependency chain.
- `npm audit fix` should resolve most of these automatically via compatible version bumps.
- Stale advisories create noise: every future `npm audit` run will report the same list, masking any *new* issues.

## Current state

`npm audit` output (run on commit `5a36df8`):

| Severity | Count | Notable packages |
|----------|-------|------------------|
| Critical | 1 | fast-xml-parser |
| High | 11 | astro, devalue, esbuild, fast-uri, js-yaml, lodash, picomatch, postcss, rollup, sharp, svgo, vite |
| Moderate | 6 | @astrojs/rss, ajv, yaml |
| Low | 1 | (inferred) |

The project's direct dependencies (`package.json`):
```json
  "dependencies": {
    "astro": "^6.1.9"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.5",
    "@astrojs/rss": "^4.0.13",
    "@astrojs/sitemap": "^3.6.0",
    "typescript": "^5.9.3"
  }
```

All vulnerabilities are in transitive dependencies pulled in by these packages.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Audit | `npm audit` | "found 0 vulnerabilities" |
| Fix | `npm audit fix` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:
- `package-lock.json` — updated by `npm audit fix`
- `package.json` — may be updated if resolved versions require semver bumps

**Out of scope**:
- Manual dependency version changes (let `npm audit fix` handle it)
- Removing or replacing dependencies
- Changes to `node_modules/` (not committed)

## Git workflow

- Branch: `advisor/005-dependency-vulnerabilities`
- One commit with message: `chore: resolve npm audit vulnerabilities`
- Do NOT push or open a PR unless the operator instructed it

## Steps

### Step 1: Run npm audit fix

```bash
npm audit fix
```

This applies compatible semver updates to resolve as many vulnerabilities as possible without breaking changes.

**Verify**: Check the exit code and output. Most advisories should report "fixed". Note any that remain (they may require `--force` or manual intervention).

### Step 2: Check what changed

```bash
git diff --package-lock.json
```

Expected: `package-lock.json` has updates. `package.json` should be unchanged (unless a dependency sub-range was updated).

### Step 3: Run build to confirm nothing broke

```bash
npm run build
```

Expected: exit 0. The site builds without errors.

### Step 4: Re-run audit to verify

```bash
npm audit
```

Expected: "found 0 vulnerabilities" or a significantly reduced count.

If some vulnerabilities remain (marked "requires manual review" or "requires semver-major dependency update"), list them in a comment in the commit message. Do NOT attempt `npm audit fix --force` — that may introduce breaking changes.

### Step 5: Check for deprecation warnings

```bash
npm outdated
```

Expected: any outdated packages are listed. Log the output — if a direct dependency is outdated, note it for awareness, but do not update it unless this plan explicitly says so.

## Test plan

If Plan 003's smoke test is in place, run it:

```bash
npm test
```

Expected: all tests pass (the dependency updates are semver-compatible, no behavior changes).

If Plan 003 hasn't been executed, rely on `npm run build` as the sole verification.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `npm audit` shows zero or significantly fewer vulnerabilities than the initial 19
- [ ] No source files are modified (`git status` shows changes only in `package-lock.json` and possibly `package.json`)
- [ ] Remaining vulnerabilities (if any) are listed in the commit message with a note on why they can't be auto-fixed
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `npm audit fix` errors out or reports a dependency conflict that blocks all fixes.
- `npm run build` fails after the fix — this would indicate a breaking change was applied, which shouldn't happen with `npm audit fix` (without `--force`).
- `npm audit` reports *more* vulnerabilities after running the fix (very unlikely but possible if a fix introduces new deps).

## Maintenance notes

- Run `npm audit` periodically (e.g., monthly) to catch new advisories early.
- If Astro is updated to a new major version, the transitive dependency tree will change significantly and likely resolve many of these automatically.
- The `@astrojs/check` package depends on `@astrojs/language-server` which depends on `volar-service-yaml` which depends on `yaml-language-server` — this chain is the source of several moderate-severity advisories (yaml, js-yaml, lodash). These are not reachable from the blog's runtime; they only affect the IDE language service.
