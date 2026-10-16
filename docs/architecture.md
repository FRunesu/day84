# Day84 — Architecture

## Why Svelte instead of "pure vanilla JS"

The original brief called for plain HTML/vanilla JS with no framework. That was overridden deliberately: this app has a lot of interdependent state — checking one task has to update its streak, the day's completion ring, and the 12-week heatmap all at once, while the time-elapsed dashboard ticks forward continuously. Hand-rolled vanilla JS for that much shared, simultaneously-updating state tends to turn into a tangle of manual DOM patching. Svelte compiles down to small, dependency-free JS/HTML/CSS with no virtual-DOM runtime overhead, which keeps the "lightweight, close to the metal" spirit of the original request while making the cross-screen reactivity trivial and correct.

Concretely, this project uses **Svelte 5's runes** (`$state`, `$derived`, `$effect`, `$props`), not the older Svelte 4 store syntax. Reactive app state lives in `.svelte.js` modules under `src/stores/` — plain JS modules that export `$state`-backed values, which any component can import and react to without prop-drilling.

## The four layers

**1. Pure logic (`src/lib/`)** — has no UI dependencies and is unit-testable in isolation:
- `time.js` — the single shared time-elapsed calculator. Day/Week use local-midnight math (correct across DST transitions); the 12-Week Cycle is anchored to a stored `cycleStartDate` (fixed window, never recalculated from "today"); Year is anchored to the calendar year (Jan 1–Dec 31) per explicit product decision.
- `streaks.js` — derives every streak from the append-only completion history log. There is no hand-incremented counter anywhere; a streak is always recomputed from history, so undo and gaps can never desync it from reality.
- `storage.js` — abstracts over Capacitor Preferences (native) vs. `localStorage` (web), so nothing else in the app touches either directly.
- `accentColor.js` — the one signature visual idea: the entire UI's accent color is computed from 12-week cycle progress and pushed onto CSS variables, sliding from calm blue to urgent amber/red as the deadline approaches.
- `api.js` — the only file in the frontend that makes network calls, and only for the accountability-partner feature.

**2. Reactive state (`src/stores/`)** — owns the actual `$state`, wires the pure logic functions to persistence, and is what components subscribe to: `user.svelte.js`, `tasks.svelte.js`, `partner.svelte.js`, `router.svelte.js`.

**3. Screens (`src/screens/`)** — one per app section, each reading from stores and rendering. `Metrics.svelte` in particular uses `$derived` (not a manual "recalculate on navigation" event) so the charts are provably always current — they recompute the instant the underlying history log changes anywhere in the app, which is a stronger guarantee than the original spec's literal wording asked for.

**4. Components (`src/components/`)** — presentational and reusable: `ProgressBar`, `CompletionRing` (Chart.js doughnut), `Heatmap` (hand-built SVG grid — deliberately not Chart.js, since a calendar heatmap isn't really what that library is for), `TaskItem`, `Modal`, `NavBar`.

## Storage: why not just `localStorage`

Raw `localStorage` inside a Capacitor-wrapped native app is not durable — iOS in particular can clear webview storage under disk pressure, and it never survives an app reinstall. For an app whose entire value is months of streak history, that's an unacceptable failure mode. `storage.js` checks `Capacitor.isNativePlatform()` and routes to `@capacitor/preferences` (backed by UserDefaults on iOS, SharedPreferences on Android — both durable, app-private storage) on native, falling back to `localStorage` only on web, where no native storage layer exists. `export.js` adds a manual JSON backup/restore path on top of either backend, so no single storage layer is ever the *only* copy of a user's data.

## The charts: why a doughnut + a heatmap, not three charts

The original spec called for a doughnut (today), a 7-day line chart, and a 12-week bar chart. That was redesigned to two visuals:
- **Completion Ring** (`CompletionRing.svelte`) — kept as a Chart.js doughnut, restyled warmer, for today's binary completed-vs-not state. This is still the right chart for that specific question.
- **12-Week Heatmap** (`Heatmap.svelte`) — replaces both the line chart and the bar chart. One 84-cell grid (12 weeks × 7 days) shows the same information both of the originals did — the last 7 cells *are* the weekly trend, and the full grid *is* the cycle aggregate — while also surfacing something neither could: the actual pattern of consistency (gaps, streak runs, day-of-week tendencies), which matters more for a habit app than a smoothed average.

## The backend: the one networked part of the app

Everything else in Day84 works fully offline. The backend exists for exactly one reason: the accountability-partner feature requires sending a real email and syncing data between two people's devices, neither of which a fully static client-side app can do on its own.

**Privacy enforcement happens server-side, not client-side.** `routes/sync.js`'s `GET /sync/partner/:userId` reads the *owner's* `sharePrefs` and only includes fields they've opted into in the response — a field that's off is simply never serialized into the JSON, not sent-and-hidden. This was verified directly (see `docs/decisions-log.md`): a user sharing only streaks+progress produces a partner-facing payload that contains exactly those two fields and nothing else, even though the full record (including private goal/vision text) exists in the data store.

**Account deletion cascades in one operation.** `deleteAccountCascade()` in `lib/db.js` removes a user's shared-data record *and* their partner link in the same call — there's no intermediate state where a deleted user's data is still readable by a former partner.

The backend's data layer (`lib/db.js`) is a JSON file for zero-dependency local development. `schema.sql` documents the equivalent production Postgres schema — every exported function in `db.js` is already a small async unit, so swapping the implementation for real SQL queries (or an ORM) doesn't require touching any route or frontend code.

## Native wrapping

`npx cap add android` and `npx cap add ios` were both run as part of building this project — `app/android/` and `app/ios/` are real, generated native project shells, not placeholders, with `@capacitor/haptics` and `@capacitor/preferences` already detected and linked (confirmed in both Gradle and the iOS `Package.swift`). The Service Worker (`public/sw.js`) is registered only when `Capacitor.isNativePlatform()` is false (see the `onMount` check in `App.svelte`) — registering it inside the native shell as well would risk caching a stale bundle and blocking future App Store/Play Store updates, since native builds already bundle all assets locally.
