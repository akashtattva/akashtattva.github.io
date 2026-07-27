# Plan 004: Extract shared base URL utility

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5a36df8..HEAD -- src/`
> If any source file has changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but Plan 003 verification baseline recommended before this)
- **Category**: tech-debt
- **Planned at**: commit `5a36df8`, 2026-07-27
- **Issue**: (none)

## Why this matters

The base URL normalization logic (`import.meta.env.BASE_URL` with trailing-slash guarantee) is duplicated across at least 7 files. If the `base` config in `astro.config.mjs` ever changes (it's currently `/`), or if the normalization logic needs updating, every copy must be found and edited. This is fragile and has already caused bugs in the past (the `AGENTS.md` notes the theme was originally ported from Hugo with a `/astro-theme-terminal` base path). Extracting it to a single shared module eliminates the drift risk.

## Current state

The duplicated pattern appears in these locations:

**`src/layouts/BaseLayout.astro:14-16`**
```astro
const base = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : import.meta.env.BASE_URL + "/";
```

**`src/layouts/PostLayout.astro:24-26`** — identical pattern:
```astro
const base = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : import.meta.env.BASE_URL + "/";
```

**`src/pages/posts/[...slug].astro:22-24`** — identical pattern.

**`src/components/PostCard.astro:10`** — same logic, one line:
```astro
const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
```

**`src/pages/404.astro:5`** — same logic, one line.

**`src/pages/tags/index.astro:18`** — same logic, one line.

**`src/pages/sitemap.xml.js:13-17`** — same logic as a function:
```js
function absoluteUrl(path, site) {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  ...
}
```

**Repo conventions** (match these):
- Source modules use `export` / `import` ESM syntax (the project has `"type": "module"`)
- Utility files go in `src/` (no `lib/` directory exists yet — create one)
- Import paths are relative, no path aliases configured in `tsconfig.json`
- String literals use double quotes (`"`) in `.astro` files and single quotes (`'`) in `.js` files — match the surrounding file style

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run check` | exit 0, no errors |
| Build | `npm run build` | exit 0 |
| Test | `npm test` | exit 0 (after Plan 003) |

## Scope

**In scope**:
- `src/lib/base-url.ts` — create a shared utility module
- The 7 files listed above — update imports

**Out of scope**:
- The `absoluteUrl` function in `sitemap.xml.js` — it composes the base URL with a path to produce an absolute URL; the extracted utility provides only the normalized base, and `sitemap.xml.js` should also use it
- CSS files
- Content files (`.md` posts)
- Config files

## Git workflow

- Branch: `advisor/004-base-url-utility`
- Two commits preferred:
  1. `refactor: extract base URL normalization to shared utility`
  2. `refactor: update all imports to use shared baseUrl function`
- Do NOT push or open a PR unless the operator instructed it

## Steps

### Step 1: Create the utility module

Create `src/lib/base-url.ts`:

```ts
/**
 * Returns the normalized base URL with a guaranteed trailing slash.
 * Uses Astro's import.meta.env.BASE_URL under the hood.
 */
export function baseUrl(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
}
```

Note: `import.meta.env.BASE_URL` is available at both build time (in `.astro` / `.ts` files processed by Astro) and in `.js` endpoint files. This utility works in all contexts.

**Verify**: The file exists and TypeScript accepts it. Run `npx tsc --noEmit src/lib/base-url.ts` to check for type errors.

### Step 2: Update all files

For each of the 7 files, replace the inline base URL normalization with an import of `baseUrl`. The replacements are:

---

**`src/layouts/BaseLayout.astro`** — add import, replace `const base = ...`:
```astro
import { baseUrl } from '../lib/base-url';
```
Replace lines 14-16 with:
```astro
const base = baseUrl();
```

---

**`src/layouts/PostLayout.astro`** — add import, replace lines 24-26:
```astro
import { baseUrl } from '../lib/base-url';
```
Replace with:
```astro
const base = baseUrl();
```

---

**`src/pages/posts/[...slug].astro`** — add import, replace lines 22-24:
```astro
import { baseUrl } from '../../lib/base-url';
```
Replace with:
```astro
const base = baseUrl();
```

---

**`src/components/PostCard.astro`** — add import, replace line 10:
```astro
import { baseUrl } from '../lib/base-url';
```
Replace line 10 with:
```astro
const base = baseUrl();
```

---

**`src/pages/404.astro`** — add import, replace line 5:
```astro
import { baseUrl } from '../lib/base-url';
```
Replace line 5 with:
```astro
const base = baseUrl();
```

---

**`src/pages/tags/index.astro`** — add import, replace line 18:
```astro
import { baseUrl } from '../lib/base-url';
```
Replace line 18 with:
```astro
const base = baseUrl();
```

---

**`src/pages/sitemap.xml.js`** — add import, replace the `absoluteUrl` function body:
```js
import { baseUrl } from '../lib/base-url';
```
Replace the `absoluteUrl` function (lines 12-18) with:
```js
function absoluteUrl(path, site) {
  const base = baseUrl();
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(`${base}${normalizedPath}`, site).toString();
}
```

**Verify after each file**: Check the file still parses correctly. Do a final bulk verify with `npm run build`.

### Step 3: Run build

```bash
npm run build
```

Expected: exit 0.

### Step 4: Run tests

```bash
npm test
```

Expected: exit 0 (requires Plan 003's smoke test). If Plan 003 hasn't been executed yet, skip this step and note it.

## Test plan

If Plan 003's smoke test is in place, it should still pass — the site builds and produces the same pages. The existing test in `src/__tests__/build.test.ts` covers this.

No new tests needed for this refactor (it's a mechanical extraction with no behavior change).

## Done criteria

- [ ] `npm run build` exits 0
- [ ] The inline pattern `import.meta.env.BASE_URL.endsWith` does not appear in any `src/` file outside of `src/lib/base-url.ts`
- [ ] All 7 files import from `src/lib/base-url.ts` and use `baseUrl()`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Any file has drifted from the excerpts above (import paths may be wrong if the directory structure has changed).
- `npm run build` fails with import resolution errors — verify relative import paths are correct (count `../` segments from the importing file to `src/lib/`).
- A file you find uses a *different* pattern for base URL handling and the replacement would break it — inspect carefully.

## Maintenance notes

- If `astro.config.mjs` ever changes the `base` setting, this is the single file to update behavior.
- If a future contributor adds a new page or component, they should import `baseUrl` from `src/lib/base-url.ts` instead of inlining the logic.
- The `import.meta.env.BASE_URL` value is a compile-time constant in Astro — the function call is inlined by the bundler, so there's zero runtime cost to this abstraction.
