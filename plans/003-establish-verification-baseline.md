# Plan 003: Establish verification baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5a36df8..HEAD -- src/ package.json tsconfig.json`
> If any of these have changed since this plan was written, compare the
> excerpts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests, dx
- **Planned at**: commit `5a36df8`, 2026-07-27
- **Issue**: (none)

## Why this matters

The project has zero tests and the typecheck command (`npm run check`, which runs `astro check`) either times out or takes impractically long. This means:
1. There is no fast way to verify that a change works correctly.
2. The build is the only gate — if a bug survives the build, it reaches production.
3. `npm run build` itself runs `astro check && astro build`, so a slow typecheck blocks the entire pipeline.
4. Future plans (especially 004 which refactors shared utilities) need a safety net.

This plan establishes a minimal verification baseline: a working typecheck, a test framework installed, and one smoke test.

## Current state

**`package.json`** scripts section:
```json
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
```

No `"test"` script exists. No test dependencies are installed — only these devDependencies:
```json
  "devDependencies": {
    "@astrojs/check": "^0.9.5",
    "@astrojs/rss": "^4.0.13",
    "@astrojs/sitemap": "^3.6.0",
    "typescript": "^5.9.3"
  }
```

**Repo conventions** (match these):
- Package manager: npm
- TypeScript strict mode enabled (`tsconfig.json` extends `astro/tsconfigs/strict`)
- No existing tests to pattern-match — this plan creates the first test
- The project uses ES module syntax (`"type": "module"` in `package.json`)

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install deps | `npm install` | exit 0 |
| Typecheck | `npm run check` | exit 0, no errors |
| Build | `npm run build` | exit 0 |
| Test (after setup) | `npm test` | exit 0, "1 passed" |
| Lint (if added) | `npx astro check` | exit 0 |

## Scope

**In scope**:
- `package.json` — add test script and devDependencies
- `.gitignore` — may need to add coverage directory patterns
- `src/__tests__/` — create directory for smoke test
- Configuration files for test framework (if needed, e.g., `vitest.config.ts`)

**Out of scope**:
- Adding a linter or formatter (tracked separately)
- Writing tests for individual components/pages beyond the smoke test
- Changing source code
- CI configuration changes

## Git workflow

- Branch: `advisor/003-verification-baseline`
- Multiple commits recommended: one per step below, with messages like:
  - `chore: add vitest and configure test runner`
  - `test: add smoke test for site build`
  - `fix: resolve astro check timeout or document workaround`
- Do NOT push or open a PR unless the operator instructed it

## Steps

### Step 1: Install test framework (Vitest)

Astro projects commonly use Vitest. Install it:

```bash
npm install --save-dev vitest
```

Add a test script to `package.json`:

```json
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "astro check && astro build",
    "test": "vitest run",
    "preview": "astro preview",
    "astro": "astro"
  },
```

Create a minimal Vitest config at the project root (`vitest.config.ts`):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

**Verify**: Run `npx vitest --version` and confirm it outputs a version string. Run `npm test` — should exit 0 with "No test files found" (expected, since no tests exist yet).

### Step 2: Write a build smoke test

Create `src/__tests__/build.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('site build', () => {
  it('should build without errors', () => {
    // Run the build command (excluding typecheck for speed in tests)
    const result = execSync('npx astro build', {
      encoding: 'utf-8',
      cwd: resolve(__dirname, '../..'),
    });
    expect(result).toContain('completed');
  });

  it('should produce index.html', () => {
    const distIndex = resolve(__dirname, '../../dist/index.html');
    expect(existsSync(distIndex)).toBe(true);
    const html = readFileSync(distIndex, 'utf-8');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Akash');
  });
});
```

**Verify**: Run `npm test`. Expected output shows `PASS` or ✓ for both tests. Exit code 0.

### Step 3: Diagnose and fix `astro check` timeout

Run `npm run check` with a stopwatch (or check how long it takes). If it takes over 60 seconds:

1. Check if `.astro/types.d.ts` is very large (generated type declarations for content collections).
2. Try running `astro check --minimumFailingSeverity error` to reduce noise.
3. If no clear fix emerges, document the timeout as a known issue and proceed.

The goal is not necessarily to fix the timeout — it's to establish whether the currently checked-in code has type errors. If `astro check` never completes, the build still blocks on it (since `npm run build` runs `astro check && astro build`). Options:

- If the timeout is from Cold Start (first run generates `.astro/types.d.ts`), running it once and waiting may fix subsequent runs.
- If it's consistently broken, note it and proceed; the smoke test is the fallback gate.

**Verify**: After any fix attempt, run `npm run check` and increase timeout to 120s. Record success or the blocker.

### Step 4: Update build command (optional)

If `astro check` remains broken / too slow, you may decouple it from build by updating `package.json`:

```json
  "scripts": {
    "check": "astro check",
    "build": "astro build",
    "test": "vitest run"
  },
```

Only do this if Step 3 confirms `astro check` doesn't complete. Document why in the commit message.

**Verify**: `npm run build` exits 0 and writes to `dist/`. `npm test` still passes.

## Test plan

The plan creates the first test file: `src/__tests__/build.test.ts` with two tests:
1. Build smoke test — verifies the Astro build completes without error
2. Output check — verifies `dist/index.html` exists and contains expected content

Pattern for future tests: any new `.test.ts` file inside `src/` will be auto-discovered by Vitest.

## Done criteria

- [ ] `npm test` exits 0 with at least 1 passing test
- [ ] `npm run build` exits 0 (even if `astro check` is skipped)
- [ ] `src/__tests__/build.test.ts` exists and contains the smoke tests above
- [ ] No source files outside `package.json`, `vitest.config.ts`, and `src/__tests__/` are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `npm install` fails or resolves with missing peer dependencies.
- `vitest` cannot run `npx astro build` in a child process (path issues on Windows — the above use of `resolve(__dirname, '../..')` and `cwd` should handle this; if not, use `process.cwd()` instead).
- The smoke test's build step (`npx astro build`) hangs forever (unlikely, but possible on memory-constrained systems — try adding `{ timeout: 120000 }` to exec options).
- You discover that `vitest` doesn't work with the project for a fundamental reason (e.g., Node version incompatibility) — try `jest` as an alternative.

## Maintenance notes

- If the project structure changes (e.g., `dist/` path moves), update the smoke test accordingly.
- If more tests are added later, keep the smoke test lightweight — it's a canary, not a coverage tool.
- The `astro check` timeout is the most likely ongoing pain point. If it remains broken, the build command (`"astro build"`) still produces valid output without it — the only loss is static type checking of `.astro` files.
