# Changelog

All notable changes to HomeKeeper so far, in roughly chronological order.

## App build (sandbox / Claude Artifact)

### Core structure

- Built HomeKeeper (originally "Hearth Log"), a home maintenance, project, contractor, and warranty tracker for multi-property homeowners.
- Data model: properties (`homes`), each with maintenance `tasks`, `projects`, and `warranties`; a global `contractors` list shared across all properties; global reference data (`tradeOptions`, `taskLibrary`).

### Maintenance

- Recurring maintenance tasks with category, repeat interval, due-date status (overdue / due soon / ok).
- "Add task" flow is library-first: choose from a shared task library by default, with an escape hatch to add a custom task (which can optionally be saved back to the library for reuse).
- Optional "first due date" for tasks that have never been completed but are due on a known future date; once completed, the normal repeat-interval calculation takes over.
- Duplicate-task prevention: a property can't have two tasks with the same name (case-insensitive).
- "Mark done" flow: date completed, next due date (auto-calculated but editable), contractor multi-select, notes, photo uploads, itemized expenses.
- Per-task completion history: every completion is logged (date, contractors, notes, photos, expenses), viewable via an expandable history panel on each task row.
- Ability to remove a task from a property's list (with confirmation).
- Task row layout iterated to a clean 3-row format: title + action buttons (history / mark done / delete) on top, meta info (category, frequency, contractor, cost, notes) in the middle, due/overdue status badge on its own line at the bottom.

### Projects & Paint

- Project log with title, date, notes, paint colors/swatches, multi-contractor selection, photo uploads, and itemized expenses with receipt photos and running totals.
- Edit/delete support with confirm-before-delete pattern.

### Warranties

- Warranty records: name, manufacturer, model, serial number, purchased from/price, install/expiration dates, warranty provider + contact, linked contractor, notes, photos.
- Expiration badge that flags as "Expired" once past due.
- Initially added under Manage, then moved to the main page as a property-scoped tab (alongside Maintenance, Projects & Paint, History) since warranty data is property-specific.

### History (formerly "Activity")

- Property-wide, reverse-chronological activity feed combining all task completions and projects.
- Shows a "Total recorded spend" summary across all logged expenses.
- Tab renamed from "Activity" to "History".

### Contractors

- Contractor records: name, company, trade, mobile/office phone, email, license number, rating, notes.
- Insurance section: provider, policy number, expiration date, and Certificate of Insurance (COI) photo upload, with an expiration badge.
- Phone numbers are clickable `tel:` links; email addresses are clickable `mailto:` links.
- Restructured from per-property to a single **global** list shared across all properties (a contractor is the same person/business regardless of which house they work on).
- Moved into the Manage (gear icon) area as its own tab, consistent with other global reference data (Trades, Tasks, Properties).
- "Properties worked at" is computed automatically per contractor by scanning tasks, projects, and warranties across all homes — no manual tagging needed.
- Deleting a contractor cleans up all references to them across every property's tasks, projects, and warranties.

### Properties (Manage)

- Add/edit/delete properties (name, address, color tag, single photo upload).
- Property photo displays next to the property name on the main page and in the Properties list under Manage.
- Removed the old "+ Add home" button and modal from the main screen — adding/editing properties now lives entirely under Manage.
- Home/property switcher changed from a tab strip to a dropdown, tinted with the property's color tag.

### Manage area (gear icon)

- Reorganized into four tabs: Trades, Tasks (task library), Properties, Contractors — all global/cross-property reference data.
- Main page tabs reserved for property-specific data: Maintenance, Projects & Paint, Warranties, History.

### UI / UX polish

- Light/dark theme toggle (sun/moon icon) next to the gear icon, using CSS custom properties for all structural colors (backgrounds, text, borders) while keeping category/trade/status accent colors constant across themes.
- Removed the "maintenance & project records" subtitle.
- Fixed view tabs overflowing off-screen: tabs now flex equally, wrap to multiple rows on narrow screens, and have consistent sizing.
- Removed record-count badges from all main tabs except Maintenance, which now shows the count of **overdue** tasks.
- All dropdowns (contractors, trades, categories, task library, properties) sort alphabetically; catch-all options ("Other", "General") stay pinned last.
- Removed the redundant property dropdown next to "Add contractor" (property context comes from the global contractor list + "Properties worked at").

## Deployment

- Set up local development environment (Node.js, npm, Git) — reused from a prior project on the same machine.
- Scaffolded a new Vite + React project (`homekeeper`).
- Installed dependencies: `lucide-react`.
- Replaced the default `src/App.jsx` with the HomeKeeper component; cleared out default Vite/React CSS files (`index.css`, `App.css`) since HomeKeeper manages its own styling via CSS variables.
- Confirmed the app runs locally via `npm run dev` (Vite dev server on `localhost:5173`).
- Verified `.gitignore` (Vite default) and added `.env` to it in preparation for future Supabase environment variables.
- Initialized git, committed, created a private GitHub repository, and pushed the project.
- Deployed to Vercel by importing the GitHub repo (auto-detected as a Vite project) — app is now live at a `.vercel.app` URL.
- Confirmed auto-deploy: future pushes to `main` will trigger automatic Vercel rebuilds.

## Current state

- Fully functional UI with mock/in-memory data — all changes reset on page refresh (no backend yet).
- Live and deployed, viewable on desktop and mobile (can be added to phone home screen as a PWA-style shortcut).

## Planned next steps

- Set up Supabase project: schema for `homes`, `tasks`, `task_completions`, `projects`, `contractors`, `warranties`, `trades`, `task_library`, each with Row Level Security policies scoped to `auth.uid()`.
- Add Supabase Auth (email login) so each user only sees their own data.
- Move image uploads (property photos, task/project photos, COI images, receipts) from in-memory base64 to Supabase Storage with per-user policies.
- Replace in-memory React state with Supabase reads/writes, likely feature-by-feature starting with properties + auth.
- Add Supabase environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) to `.env` (gitignored) and to Vercel project settings.
- Optional polish: custom domain, multi-user/shared-property access model.

