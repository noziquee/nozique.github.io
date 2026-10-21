# Nozique — Build Plan (Public Site + Admin Website Builder)

Living document. Every step has a checkbox; the tracker table and changelog at the
top are updated after each step is tested. Nothing gets ticked until you have tested it.

**Status legend:** ⬜ not started · 🟦 in progress · ✅ done and tested · ⏸ blocked / waiting on a decision

---

## 0. Progress tracker

| Phase | Name | Steps | Status |
|---|---|---|---|
| 0 | Foundations: repo, tooling, deploy | 5 | ✅ |
| 1 | Database and connection | 4 | ✅ |
| 2 | Public site in TypeScript | 6 | 🟦 2 of 6 done |
| 3 | Admin shell and login | 4 | ⬜ |
| 4 | Project manager (posts, categories, uploads) | 7 | ⬜ |
| 5 | Design engine: data model, renderer, element registry | 6 | ⬜ |
| 6 | Visual editor core | 8 | ⬜ |
| 7 | More elements, one at a time | 8 | ⬜ |
| 8 | Editor power tools | 8 | ⬜ |
| 9 | Design system: colors, text styles, templates | 5 | ⬜ |
| 10 | Versions, preview and responsive layouts | 5 | ⬜ |
| 11 | Animation and interaction | 5 | ⬜ |
| 12 | Hardening: security, accessibility, performance | 6 | ⬜ |

**Current step:** 2.3

### Changelog
- 2026-10-18: Plan drafted.
- 2026-10-20: D1, D2 (separate desktop/mobile layouts), D3, D4, D5 approved (recommended defaults).
- 2026-10-20: Phase 0 done and tested (scaffold, lint/format/tests, baseline page split, env config, CI + Pages deploy).
- 2026-10-20: Phase 1: database live (1.1), types and client (1.3), security smoke test 12/12 passing (1.4). 1.2: admin row added; sign-up switch-off pending confirmation.
- 2026-10-20: Phase 2.1: typed hash router (src/site/router) with tests; old single script split into data, helpers, state, one module per page and a shell. Verified identical to the old page in a browser comparison.
- 2026-10-21: Phase 2.2: typed data layer (src/site/data): placeholders as fallback, database loader with 4s timeout, safe links/escaping. Page code reads through a temporary adapter until each page is rewritten (2.3-2.6). Note: 2.3 is now mostly verification, since the loader already reads categories and published projects.
- Live site: https://noziquee.github.io/nozique.github.io/ (project-site address, not nozique.github.io).

---

## 1. Goals

1. **Public site (`index`)** shows exactly what you build in the admin: projects from the database, plus website sections designed in the editor.
2. **Admin** is a Carrd/Figma/Canva-style builder: manage projects and categories, and visually edit page sections with elements, layers, properties, undo/redo, alignment and more.
3. **Extensible:** new tools and elements are added by writing one new file, not by growing one giant HTML file.
4. **Built gradually:** one or a few features at a time, each tested and ticked before the next begins.

---

## 2. Technology decisions

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Types catch mistakes in complex editor state (elements, layouts, saved designs) and make adding features safer. |
| Build tool | **Vite** (two entry points: public site and admin) | Fast dev server, splits code into small modules, outputs static files for GitHub Pages. |
| Admin UI | **React** | Panels, layers list and property forms are state-driven UI, which React handles well. |
| Admin state | **Zustand + Immer** | Simple store; Immer patches give clean undo/redo. |
| Lists drag and drop | **dnd-kit** | Reordering layers, project images, categories. |
| Public site | **Vanilla TypeScript** (no framework) | Small and fast; keeps your current design and code style. |
| Canvas rendering | **Plain DOM, framework-free renderer shared by site and admin** | The admin canvas and public site run the same code, so what you edit is what visitors see. Konva was rejected because it would need a second renderer for the public site. |
| Data validation | **Zod** | One schema validates saved designs in the editor, on load, and in tests. |
| Backend | **Supabase** (already written: `supabase_setup.sql`) | Auth, Postgres, Storage. |
| Tests | **Vitest** for logic, a manual checklist per UI step, **Playwright** later for critical flows | |
| Quality | ESLint + Prettier + `tsc --noEmit` | |
| Hosting | **GitHub Pages**, deployed by GitHub Actions (build, then publish `dist/`) | Same host as now. The existing workflow uploads the raw repo, so it must change to upload the build output. |

**What changes for you:** you will need Node.js installed and will run `npm run dev` to work locally. You can no longer double-click an HTML file to open it. In return, the code is split into many small, typed files.

### Hybrid section model (recommended)
- **Canvas sections** (hero, about, contact, banners): freely designed in the visual editor.
- **System sections** (project grid with filters, category carousel, lightbox): built in code so they stay reliable; the editor controls their content, spacing, colors and where they sit.
- A **gallery-grid element** lets a canvas section embed live projects.

---

## 3. Architecture

```
nozique/
├─ index.html                    public entry
├─ admin/index.html              admin entry
├─ supabase/migrations/          SQL files (0001 = supabase_setup.sql)
├─ src/
│  ├─ shared/                    used by BOTH site and admin
│  │  ├─ supabase/               client, generated DB types, queries
│  │  ├─ design/                 types, zod schema, version migrations, tokens
│  │  ├─ elements/               ONE FILE PER ELEMENT TYPE (see below)
│  │  └─ render/                 renderDesign(), scaling, hover/animation runtime
│  ├─ site/                      public site: router, pages, components, styles
│  └─ admin/
│     ├─ auth/                   login, session guard
│     ├─ features/projects/      project + category manager
│     └─ features/editor/        canvas, tools, panels, history, store
├─ tests/
└─ .github/workflows/deploy.yml
```

### Element registry (how new elements get added)
Each element type is one module that exports a single definition:

```
export const buttonElement: ElementDefinition = {
  type: 'button',
  label: 'Button',
  defaults(),            // starting size, style, content
  schema,                // zod schema for its content/style
  render(el, ctx),       // framework-free DOM output (site + admin canvas)
  panel: [ ...fields ],  // declarative property fields; the admin builds the form from this
}
```

Register it in `registry.ts` and it appears in the Elements panel, renders on the
public site, validates on save, and gets a properties form automatically.
**Adding an element later = one new file + one registry line.**

### Tool registry (same idea for editor tools)
Select, move, text-edit, crop, etc. are small modules with `onPointerDown/Move/Up`
handlers, so new tools do not touch existing ones.

### Saved design format
Versioned JSON stored in `site_sections.content`:
`{ version, canvas, elements[] }` with explicit migrations between versions, so
old designs never break when the format evolves.

### Reused from your existing admin (ported to TypeScript, not rewritten from scratch)
Undo/redo snapshot idea, alignment/distribute math, resize/rotate math, color
picker + palettes, layers behavior, image crop model, design validation rules, and
the lessons recorded in your comments (shadow-DOM preview, anchor links, gallery
auto-height). **Dropped:** Nica-specific parts (belt swatches, crochet sections, hard-coded Nica SVGs).

---

## 4. How we work (progress check protocol)

For every step below:

1. I state the step and what "done" means.
2. I implement only that step (or a small related group).
3. I run the automated checks (`tsc`, lint, unit tests, build).
4. I give you a short **"test this" checklist** (what to click, what you should see).
5. You reply ✅ or ❌ with notes. Failures are fixed before moving on.
6. I tick the box, update the tracker table and changelog, and name the next step.

**Definition of done (every step):** works in the browser, no console errors,
types and lint pass, build succeeds, tested by you, tracker updated.

**Size tags:** S = small, M = medium, L = large.

---

## 5. Phases and steps

### Phase 0 — Foundations
- [x] **0.1 (S)** Scaffold Vite + TypeScript project with the folder structure above. *Done when:* `npm run dev` shows a blank page for both `/` and `/admin/`.
- [x] **0.2 (S)** ESLint, Prettier, `tsc`, Vitest wired up with one sample test. *Done when:* `npm run check` passes.
- [x] **0.3 (M)** Move the current `index.html` look in as the baseline (split CSS into files, keep the design). *Done when:* the page looks the same as today.
- [x] **0.4 (S)** Environment config for Supabase URL and anon key (`.env`, with `.env.example` committed). *Done when:* values load in code, no keys hard-coded.
- [x] **0.5 (M)** Replace `static.yml` with a build-and-deploy workflow. *Done when:* a push to `main` publishes the built site to GitHub Pages.

### Phase 1 — Database and connection
- [x] **1.1 (S)** Create the new Supabase project and run `supabase_setup.sql`. *Done when:* tables, policies and buckets exist.
- [x] **1.2 (S)** Create your admin user and add it to `admins`; disable public sign-ups. *Done when:* `select public.is_admin()` is true for you.
- [x] **1.3 (M)** Supabase client + generated DB types in `src/shared/supabase`. *Done when:* a typed query for groups works.
- [x] **1.4 (M)** Security smoke test: automated script proves an anonymous visitor can read published content and cannot write or upload anything. *Done when:* test passes and fails if a policy is removed.

### Phase 2 — Public site in TypeScript
- [x] **2.1 (M)** Hash router and page shell (Home, Work, Project, About, Contact) as modules. *Done when:* navigation works as today.
- [x] **2.2 (M)** Data layer with the placeholder projects as fallback when the database is empty. *Done when:* the site works with an empty database.
- [ ] **2.3 (M)** Work page reads projects and categories from Supabase (filtering, draft projects hidden). *Done when:* a project added in the SQL editor appears; a draft does not.
- [ ] **2.4 (M)** Project page: gallery, lightbox, prev/next, video, details from the database.
- [ ] **2.5 (M)** Home page: featured projects and category carousel from the database.
- [ ] **2.6 (S)** About and Contact pages (existing contact validation kept). *Done when:* all pages match the current design on desktop and mobile.

### Phase 3 — Admin shell and login
- [ ] **3.1 (M)** React app scaffold, admin layout (sidebar: Projects, Website, Settings), route guard.
- [ ] **3.2 (M)** Login/logout with Supabase Auth; non-admin accounts are shown "no access". *Done when:* only your account gets in.
- [ ] **3.3 (S)** Session expiry handling and friendly error/loading/empty states (shared components).
- [ ] **3.4 (S)** Admin styling that matches the Nozique palette (dark, red accent).

### Phase 4 — Project manager
- [ ] **4.1 (M)** Categories (groups): create, rename, delete, drag to reorder.
- [ ] **4.2 (M)** Projects list with category filter, search, status badges.
- [ ] **4.3 (L)** Project editor: title, description, category, year, tools, role, cover aspect.
- [ ] **4.4 (L)** Image upload (multiple), drag to reorder, first image is the thumbnail, alt text and captions.
- [ ] **4.5 (M)** Video: upload or link for animation projects.
- [ ] **4.6 (S)** Draft/published toggle and "Featured" toggle. *Done when:* changes show on the public site correctly.
- [ ] **4.7 (S)** Delete project (also removes its files from storage) and drag to reorder projects.

> After Phase 4 you can run your real portfolio from the admin, before the visual editor exists.

### Phase 5 — Design engine
- [ ] **5.1 (M)** Design types + Zod schema + versioning + migration framework. *Done when:* unit tests validate good and bad designs.
- [ ] **5.2 (M)** Element registry + shared framework-free `renderDesign()`. *Done when:* a hand-written design renders.
- [ ] **5.3 (M)** Text and Shape elements (first two definitions). *Done when:* both render identically in a test page.
- [ ] **5.4 (M)** **Responsive strategy decision implemented** (see decision D2). *Done when:* a design renders correctly at desktop and phone width.
- [ ] **5.5 (M)** Migration `0002`: draft vs published content for sections (`draft_content`, publish timestamp). *Done when:* saving a draft does not change the live site.
- [ ] **5.6 (M)** Public site renders sections from `site_sections` (hero first) with fallback to the built-in version. *Done when:* editing JSON in Supabase changes the hero.

### Phase 6 — Visual editor core
- [ ] **6.1 (M)** Website page in admin: section list (enable/disable, reorder, pinned header/footer).
- [ ] **6.2 (L)** Canvas with zoom/pan and the shared renderer; select one element.
- [ ] **6.3 (L)** Move, resize, rotate with handles (Shift to constrain).
- [ ] **6.4 (M)** Elements panel (add Text, Shape) and Delete.
- [ ] **6.5 (L)** Properties panel generated from each element's declarative fields.
- [ ] **6.6 (M)** Layers panel: select, show/hide, lock, drag to reorder, bring forward/back.
- [ ] **6.7 (M)** Undo/redo (Ctrl+Z / Ctrl+Shift+Z) with a unit-tested history engine.
- [ ] **6.8 (M)** Save draft / Publish / Discard, unsaved-changes warning, validation messages. *Done when:* publish updates the public hero.

### Phase 7 — More elements (one per step)
- [ ] **7.1 (M)** Image (upload, fit, opacity, radius, alt text) + crop mode
- [ ] **7.2 (M)** Button (colors, border, hover styles, link)
- [ ] **7.3 (M)** Link and social icons (circular icons, accessible labels, internal anchors)
- [ ] **7.4 (M)** SVG / icon (library + upload, safe sanitizing, recolor that actually works)
- [ ] **7.5 (S)** Dividers (dashed, scalloped, line/arrow)
- [ ] **7.6 (M)** Video / animation embed (uses the project-videos bucket)
- [ ] **7.7 (M)** Gallery-grid / project showcase element (live projects, columns, gap, category filter)
- [ ] **7.8 (M)** Form element (contact / newsletter, validated, writes to `newsletter_subscribers`)

*Future elements (audio, table, embed, container/frame) follow the same one-file recipe.*

### Phase 8 — Editor power tools
- [ ] **8.1 (M)** Multi-select (Shift-click) and marquee selection
- [ ] **8.2 (M)** Move, scale and rotate a multi-selection
- [ ] **8.3 (M)** Align and distribute tools
- [ ] **8.4 (M)** Snapping and smart guides
- [ ] **8.5 (M)** Duplicate, copy/paste (also between sections), keyboard nudge
- [ ] **8.6 (L)** True groups: group, ungroup, nested move/scale
- [ ] **8.7 (S)** Keyboard shortcut set + a shortcuts help panel
- [ ] **8.8 (S)** Fit-to-view, zoom to selection, rulers and grid overlay

### Phase 9 — Design system
- [ ] **9.1 (M)** Color picker (HSV, hex, eyedropper, transparency) and saved palettes
- [ ] **9.2 (S)** Nozique palette seeded (black, greys, white, red accent)
- [ ] **9.3 (M)** Design tokens: site colors/fonts/spacing editable in one place
- [ ] **9.4 (M)** Reusable text styles and element styles (copy/paste style, reset style)
- [ ] **9.5 (M)** Section templates and "save as reusable section"; add/duplicate/delete sections

### Phase 10 — Versions, preview and responsive
- [ ] **10.1 (M)** Preview before publish (desktop/tablet/phone sizes)
- [ ] **10.2 (L)** Version history: snapshots on publish, restore any version
- [ ] **10.3 (M)** Per-breakpoint editing (mobile layout editor), per decision D2
- [ ] **10.4 (S)** Export/import a section design as JSON
- [ ] **10.5 (S)** Page title/description/social-preview settings

### Phase 11 — Animation and interaction
- [ ] **11.1 (M)** Reliable hover states and transitions for all interactive elements
- [ ] **11.2 (M)** Entrance animations (fade, slide, scale) with scroll trigger
- [ ] **11.3 (S)** Animation preview in the editor
- [ ] **11.4 (S)** Reduced-motion support enforced everywhere
- [ ] **11.5 (M)** Page transitions and cursor effects controlled from admin settings

### Phase 12 — Hardening
- [ ] **12.1 (M)** Automated RLS/Storage policy tests in CI
- [ ] **12.2 (M)** Accessibility audit (keyboard, focus, contrast, alt text, labels) for site and admin
- [ ] **12.3 (M)** Image optimization (resized thumbnails/variants, lazy loading)
- [ ] **12.4 (S)** Error reporting and graceful failure of a bad element (never blank the page)
- [ ] **12.5 (S)** Backup and restore procedure documented
- [ ] **12.6 (S)** Developer docs: how to add an element, add a tool, run migrations

---

## 6. Decisions

| # | Decision | Recommended default | Needed by |
|---|---|---|---|
| D1 | Approve the stack: Vite + TypeScript, React for admin, vanilla TS for the public site | Approve as written | Phase 0 |
| D2 | **Responsive approach** for canvas sections: (a) one layout scaled down (simple, but text gets tiny on phones) or (b) separate desktop and mobile layouts per section | **(b)**: build the data model for it in 5.4, add the mobile editor in 10.3 | Phase 5 |
| D3 | Hybrid sections: system sections coded, canvas sections visual | Approve | Phase 5 |
| D4 | Draft/publish from the start (the old admin saved straight to live) | Yes: added in 5.5 and 6.8 | Phase 5 |
| D5 | Public site stays vanilla TS (vs React for both) | Vanilla TS | Phase 0 |

## 7. Risks and how the plan handles them

| Risk | Handling |
|---|---|
| Editor gets slow or buggy as features pile up | Registry pattern, small modules, unit tests for math/history, one feature per step |
| Saved designs break after a format change | Versioned schema + migrations + validation on load (5.1) |
| Mobile layouts retrofitted too late | Decision D2 forced in Phase 5, before elements multiply |
| Security relies on the admin page being hidden | Real enforcement is Supabase RLS + Storage policies; tested automatically (1.4, 12.1) |
| New build workflow is unfamiliar | Step 0.5 documents it; I walk you through running it |
| Scope creep | Feature ideas go to a backlog list; the current step finishes first |

## 8. Backlog (parked ideas)
Audio element, table element, container/frame element, auto-layout, minimap,
collaboration/roles, scheduled publishing, analytics.
