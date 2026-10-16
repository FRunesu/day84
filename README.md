# Day84

Break your year into 12-week cycles. Feel exactly how much time is left.

Day84 is a mobile-first habit and goal-tracking app built around a single idea: a year is too long to feel urgent, but a 12-week (84-day) cycle isn't. The app tracks daily tasks, derives real streaks from a completion history log, and keeps four "how much time is already gone" readouts in constant view — for the day, the week, the current 84-day cycle, and the calendar year. Everything works fully offline. An optional paid tier lets you link with one accountability partner, with privacy controls enforced on the server, not just hidden in the UI.

This was built end-to-end and verified working — every screen was actually rendered and clicked through with Playwright, the backend's privacy filter and account-deletion cascade were tested against real HTTP requests (not just asserted in comments), and both native (iOS/Android) project shells were generated and confirmed to contain the right plugins and bundle identifiers. See `docs/decisions-log.md` for the full reasoning trail behind every architectural choice, and `docs/architecture.md` for how the pieces fit together.

## Project structure

```
day84/
├── app/          The actual application — Svelte + Vite, wrapped by Capacitor for iOS/Android,
│                 also deployable as a standalone installable PWA for the web.
│   ├── src/
│   │   ├── lib/        Pure logic: time math, streak derivation, storage, haptics, accent color
│   │   ├── stores/     Reactive app state (Svelte 5 runes): user, tasks, partner, router
│   │   ├── screens/    The 7 screens: Onboarding, Home, Tasks, Metrics, Partner, Settings, Paywall
│   │   └── components/ Reusable UI: ProgressBar, CompletionRing, Heatmap, TaskItem, Modal, NavBar
│   ├── android/  Generated native Android project (via `npx cap add android`)
│   ├── ios/      Generated native Xcode project (via `npx cap add ios`)
│   └── public/   PWA manifest, service worker (web-only), icons, legal pages
├── backend/      The ONE server Day84 needs — invite emails, partner linking, privacy-filtered
│                 sync, and cascading account deletion. Everything else works with no server at all.
├── legal/        Privacy Policy & Terms of Service TEMPLATES — need a lawyer's review before use
└── docs/         architecture.md, deployment-checklist.md, decisions-log.md
```

## Quickstart (web/dev)

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env.example .env   # optional — without it, invite emails just log to console instead of sending
npm run dev

# Terminal 2 — frontend
cd app
npm install
npm run dev
npm run test            # runs the unit test suite (38 tests) for the time/streak engines
```

Open the printed `localhost` URL. The app forces onboarding on first run (no stored data), then walks you through the 12-week dashboard, tasks, metrics, and the (subscription-gated) accountability partner feature. The Paywall screen's "purchase" is simulated locally — see `docs/deployment-checklist.md` for wiring a real payment provider.

## Quickstart (native iOS/Android)

```bash
cd app
npm run build
npx cap sync
npx cap open ios       # opens Xcode — needs a Mac with Xcode installed
npx cap open android    # opens Android Studio
```

The `ios/` and `android/` folders in this project are already-generated, real native project shells (not just config) — `npx cap add` was run as part of building this, and both plugins this app needs (`@capacitor/haptics`, `@capacitor/preferences`) are already wired in. You still need Xcode (Mac only) or Android Studio installed locally to actually compile and run them — that step can't happen inside a generic dev sandbox, only on your own machine.

## What's real vs. what's a documented stub

Built and verified working:
- The entire frontend — all 7 screens, fully wired to real reactive state
- The time-urgency math (DST-safe, calendar-year-anchored, single shared calculation function) — covered by 26 automated unit tests
- The streak engine (derived from history, not a naive counter — handles undo and gaps correctly) — covered by 12 automated unit tests
- Both redesigned charts (completion ring + 12-week heatmap), reactively live
- What happens when a 12-week cycle actually ends: the dashboard detects 100% elapsed and offers a "start a new cycle" flow that resets `cycleStartDate` and captures a fresh goal, without touching identity/vision data
- The full backend: invite emails (logs to console without an API key, sends for real with one), partner linking, **server-side privacy filtering** (verified: a field a user hasn't opted to share is never included in the API response their partner receives), and **cascading account deletion** (verified: deleting an account immediately empties what a partner can see)
- Native Android + iOS project scaffolding, with both required plugins detected and the app name/bundle ID correctly propagated

Deliberately stubbed, with the real integration point documented in `docs/deployment-checklist.md`:
- Subscription purchases (Paywall screen simulates success locally — wire RevenueCat/StoreKit/Play Billing)
- The backend's data store (JSON file for zero-setup dev/demo — swap for Postgres using `backend/schema.sql`)
- Push notifications for task reminders (not in the original spec, but a natural next addition — not built)

## Legal — read this before launching

`legal/` contains a Privacy Policy and Terms of Service. **These are templates, not finished legal documents.** They cover every point raised while designing this app (data collected, the account-deletion cascade, the 13+ age gate, third-party services used) in plain language, but need an actual lawyer's review — especially around GDPR/CCPA and COPPA — before this goes live. This is flagged clearly inside both files too.
