# Plan 002: Fix empty read-more link in PostCard.astro

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5a36df8..HEAD -- src/components/PostCard.astro`
> If the file has changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `5a36df8`, 2026-07-27
- **Issue**: (none)

## Why this matters

`src/components/PostCard.astro` renders every post card on the homepage and tag pages. It contains an empty `<a>` tag (the "read more" button at line 49) with no visible or accessible text content. This creates a focusable but invisible element that:
- Screen readers encounter a link with no accessible name (WCAG 2.1 Failure F89)
- Keyboard users tab to an invisible target with no affordance
- Sighted users see nothing (the link has no inner text)

Adding a text label ("Read more →") makes the link meaningful and accessible.

## Current state

In `src/components/PostCard.astro`, lines 48–51:

```astro
  <div>
    <a href={postUrl} class="read-more button inline" target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener" : undefined}>
    </a>
  </div>
```

The `<a>` element at line 49 has no content between the opening tag and `</a>`. The `>` on line 50 closes the tag immediately.

**Repo conventions** (match these):
- Inline elements use standard Astro templating with `{...}` for dynamic attributes
- Component props use TypeScript interfaces with `export interface Props`
- The project uses Astro's `class` attribute (not `className`)
- See `src/components/FormattedDate.astro` as a simple component exemplar

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run check` | exit 0, no errors |
| Build | `npm run build` | exit 0, site builds |

## Scope

**In scope** (the only file you should modify):
- `src/components/PostCard.astro` — add link text to the read-more anchor

**Out of scope**:
- The PostCard component's structure (keep the `<div>` wrapper, classes, and dynamic attributes)
- The `read-more` CSS class styling
- Any other component or page

## Git workflow

- Branch: `advisor/002-empty-read-more-link`
- One commit with message: `fix: add accessible text to read-more link in PostCard`
- Do NOT push or open a PR unless the operator instructed it

## Steps

### Step 1: Add text to the read-more link

In `src/components/PostCard.astro`, add the text content between `<a ...>` and `</a>`:

```astro
  <div>
    <a href={postUrl} class="read-more button inline" target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener" : undefined}>Read more →</a>
  </div>
```

The text should be `Read more →` (with the Unicode rightwards arrow `→` as a single character, `\u2192`). The entire tag may fit on a single line or be wrapped — either is fine as long as text appears between the tag attributes and `</a>`.

**Verify**: Open `src/components/PostCard.astro` and confirm lines 48–51 now contain text between the opening `<a>` and closing `</a>`.

### Step 2: Run typecheck

```bash
npm run check
```

Expected: exit 0, no type errors.

### Step 3: Run build

```bash
npm run build
```

Expected: exit 0. The site builds without errors.

## Test plan

No new tests. Verify by inspecting a post card on the rendered homepage at `dist/index.html` — the anchor with class `read-more` should contain visible text.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `grep -c 'Read more' src/components/PostCard.astro` returns at least 1
- [ ] No files outside `src/components/PostCard.astro` are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The code at lines 48–51 of `src/components/PostCard.astro` does not match the excerpts above.
- The `<a>` tag already has text content in your version (verify with a fresh read of the file).
- `npm run build` fails with an error unrelated to the change.

## Maintenance notes

- If a future change replaces this button with a different pattern, ensure the replacement also has accessible text.
- The `→` arrow is decorative — consider a CSS `::after` approach instead if internationalization is ever needed, but for now inline text is the simplest fix.
