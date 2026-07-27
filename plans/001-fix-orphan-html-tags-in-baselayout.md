# Plan 001: Fix orphan HTML tags in BaseLayout.astro

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5a36df8..HEAD -- src/layouts/BaseLayout.astro`
> If the file has changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `5a36df8`, 2026-07-27
- **Issue**: (none)

## Why this matters

`src/layouts/BaseLayout.astro` wraps every page on the site. It contains orphaned `</li>` and `</ul>` closing tags (lines 86–89) that don't match any open element. These produce invalid HTML on every page — browsers may render menus incorrectly, and assistive technologies (screen readers) can misinterpret the document structure. Removing them is a trivial, zero-risk fix that corrects the document outline for all pages.

## Current state

In `src/layouts/BaseLayout.astro`, after the desktop navigation menu's `<ul>` closes properly, four phantom closing tags remain:

```astro
        <nav class="navigation-menu">
          <ul class="navigation-menu__inner menu--desktop">
            <li><a href={`${base}about/`}>About</a></li>
            <li><a href={`${base}lists/`}>Inspiration</a></li>
            <li><a href={`${base}til/`}>Reading List</a></li>
            <li><a href={`${base}posts/`}>Posts</a></li>
            <li><a href={`${base}tags/`}>Tags</a></li>
          </ul>
                </li>      <!-- ← ORPHAN: no matching <li> -->
              </ul>         <!-- ← ORPHAN: no matching <ul> -->
            </li>           <!-- ← ORPHAN: no matching <li> -->
          </ul>             <!-- ← ORPHAN: no matching <ul> -->
        </nav>
```

The four lines (86–89 in the file as of commit `5a36df8`) are a leftover from a previous nested-menu structure that was partially removed. They serve no function.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run check` | exit 0, no errors (may take up to 120s on first run) |
| Build | `npm run build` | exit 0, site written to `dist/` |

## Scope

**In scope** (the only file you should modify):
- `src/layouts/BaseLayout.astro` — remove 4 orphan closing tags

**Out of scope** (do NOT touch):
- Any other layout, page, or component
- The mobile menu section (`.menu--mobile`) — it is fine
- The navigation menu items themselves
- CSS styles

## Git workflow

- Branch: `advisor/001-orphan-html-tags`
- One commit with message: `fix: remove orphan HTML closing tags in BaseLayout.astro`
- Do NOT push or open a PR unless the operator instructed it

## Steps

### Step 1: Remove the orphan closing tags

Open `src/layouts/BaseLayout.astro` and delete lines 86–89 (the four orphan lines shown above). After removal, the closing `</nav>` at line 91 (originally line 90) should immediately follow the `</ul>` that closes the desktop menu. The final `<nav>` block should look like this:

```astro
        <nav class="navigation-menu">
          <ul class="navigation-menu__inner menu--desktop">
            <li><a href={`${base}about/`}>About</a></li>
            <li><a href={`${base}lists/`}>Inspiration</a></li>
            <li><a href={`${base}til/`}>Reading List</a></li>
            <li><a href={`${base}posts/`}>Posts</a></li>
            <li><a href={`${base}tags/`}>Tags</a></li>
          </ul>
        </nav>
```

**Verify**: Open `src/layouts/BaseLayout.astro` and confirm no `</li>` or `</ul>` appears between the desktop `</ul>` and `</nav>`. The lines between `</ul>` and `</nav>` should be empty or whitespace only.

### Step 2: Run typecheck

```bash
npm run check
```

Expected: exit 0, no type errors. (If this times out or hangs, note it but do not block — this is tracked separately in Plan 003.)

### Step 3: Run build

```bash
npm run build
```

Expected: exit 0. The site builds without errors.

## Test plan

No new tests to write. The fix is purely structural — if the build succeeds, the HTML structure is valid. The existing visual appearance should be unchanged (the orphan tags had no visible styling effect since no CSS targeted the non-existent parent).

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `grep -n '</li>\|</ul>' src/layouts/BaseLayout.astro` returns no lines between the desktop `</ul>` and `</nav>`
- [ ] No files outside `src/layouts/BaseLayout.astro` are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The code at lines 79–91 of `src/layouts/BaseLayout.astro` doesn't match the excerpts above (the file has drifted since plan was written).
- Deleting the orphan lines removes part of a legitimate nested structure you can confirm is needed.
- `npm run build` fails and the error is not related to the tag removal (pre-existing issue).

## Maintenance notes

- The mobile menu structure (`.menu--mobile`) is perfectly fine — do not touch it.
- If the navigation menu is ever restructured in the future, ensure the nesting tree is valid (every `<ul>` and `<li>` fully closed).
