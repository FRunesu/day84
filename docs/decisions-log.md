# Day84 — Decisions Log

A chronological record of every significant decision made while designing and building this app, and why. Useful as a single reference if you (or another developer) inherit this project later and wonder "why was it built this way?"

## Naming

The app was originally specced as "The 12 Week Year." That name was dropped: it's an actively commercialized trademark/brand (a NYT-bestselling book, a coaching business, and a line of planners all currently operating under that exact name). The 12-week-cycle *methodology* isn't ownable — only the specific brand name is — so the mechanic was kept and the name changed. A follow-up suggestion of "3 Month Year" was also rejected: it copies the same `[time period] + "Year"` branding structure applied to the identical concept, which plausibly increases trademark risk rather than avoiding it. Landed on **Day84** — distinctive, ownable, and tied to a real fact (a 2009 UCL habit-formation study tracked behavior over exactly 84 days) rather than an arbitrary number.

## Technical stack overrides

The original brief specified pure vanilla JS, `localStorage` everywhere, and a "simulated" (fake) invite send. All three were deliberately overridden:

1. **Vanilla JS → Svelte.** The app's cross-screen reactive state (one task check-off affects a streak, a completion ring, and a heatmap simultaneously) is exactly the kind of shared-state problem vanilla JS handles poorly at scale. Svelte was chosen over heavier alternatives (React, Vue) because it compiles to small, dependency-light JS with no virtual-DOM runtime — keeping the spirit of "lightweight" while solving the actual problem.
2. **`localStorage` everywhere → Capacitor Preferences on native, `localStorage` only as a web fallback, plus manual export/import.** Raw `localStorage` inside a Capacitor webview isn't durable — it can be cleared under iOS storage pressure and never survives a reinstall. For an app whose value is months of habit history, that's not an acceptable risk.
3. **Simulated invite → a real email send.** This is the one place the app gained a genuine backend dependency, scoped as narrowly as possible (one small Express service, four endpoints) rather than restructuring the whole app around it.

## The accountability/sync feature — scope expansion and the privacy model

What started as "send a real invite email" grew, across the conversation, into a fuller feature once two more requirements were added: the invite should include a download link so the recipient can get the app too, and the two users' progress should actually sync — but with a privacy toggle, since not everyone wants to disclose what they're working toward.

This changed the architecture meaningfully: it's no longer just "send one email," it now requires lightweight account identity (enough to link two users together), a small synced-data store, and — critically — **server-side enforcement of privacy choices.** A client-side-only filter (fetch everything, hide what's marked private in the UI) would let anyone with basic technical curiosity see "private" fields just by inspecting network traffic. `backend/src/routes/sync.js` filters by the *owner's* `sharePrefs` before a partner's payload is ever constructed — the field is absent from the JSON entirely, not hidden after the fact.

**This was verified directly, not just asserted in a comment.** A test run pushed one user's full data (streaks: 12, cycleProgress: 34.5, plus private goalText/visionText) with `shareGoalText` and `shareVisionText` set to `false`. The partner's fetch returned `{"streaks":12,"cycleProgress":34.5}` — the private fields were completely absent from the response, confirmed via direct HTTP calls against the running backend.

Defaults were set deliberately: streaks and cycle progress default to shared (the "fun," low-stakes numbers); goal text and vision text default to **private** (the personal, sensitive content) — the user opts in to sharing those, rather than opting out.

## Account deletion cascade

Decided explicitly, rather than left as an implicit technical side effect: **deleting an account or unlinking from a partner immediately removes everything that partner could see, in the same operation.** No orphaned "ghost" data lingers after someone leaves. This was also verified directly: a test sequence linked two accounts, pushed shared data, confirmed the partner could read it, deleted the sharing account, then confirmed the partner's next fetch returned an empty object.

## Monetization

Freemium was chosen over alternatives (ads, one-time purchase) for a specific structural reason: the app's only feature with a real recurring cost is the accountability/sync layer (server hosting, email sending). Gating exactly that feature behind a subscription means revenue and cost are aligned — free users never need to be cross-subsidized by paying ones. One-time purchase was rejected for the paid tier specifically because it doesn't cover an ongoing server cost over time. Ads were rejected as working against the product's own identity (a focus/urgency app interrupted by ad units undermines its pitch) and because data export was explicitly kept free — paywalling someone's access to their own data was flagged as a trust-eroding move worth avoiding even though it's a common pattern elsewhere.

## Chart redesign

The original spec called for three charts: a doughnut (today), a 7-day line chart, and a 12-week bar chart. After being asked for design alternatives, four directions were proposed (restyled-but-same charts; a single calendar heatmap; a single focal ring + momentum score; an urgency/depletion metaphor). **Doughnut + heatmap** was selected: keep the doughnut for today's binary completed-vs-not question (it's genuinely the right chart for that), and replace both the line chart and bar chart with one 84-cell heatmap, since the last 7 cells already are the weekly view and the full grid already is the cycle aggregate — while additionally surfacing consistency *patterns* (gaps, streak runs) that an averaged line or bar chart can't show.

## Legal & security checklist (informational, not legal advice)

Compiled in conversation, implemented where it affects architecture (privacy enforcement location, deletion cascade, rate limiting, the 13+ age gate in onboarding, data minimization — sensitive text fields stay device-local by default) and otherwise captured as templates (`legal/`) flagged clearly as needing actual lawyer review before publishing, since neither this build process nor the underlying model is a substitute for one.

## What was verified, concretely, during the build

- Full onboarding → home → tasks → metrics → partner → settings flow, clicked through end-to-end via an automated browser (Playwright), not just read as code.
- A genuine bug was caught and fixed this way: an infinite reactive-update loop in the Home screen (reading a `$state` value back immediately after writing it inside the same effect, which Svelte correctly flags as a read/write cycle).
- The streak engine: checking a task off moved its streak from 0 → 1 and updated the heatmap and completion ring live, with no manual refresh.
- The freemium gate: the Partner screen correctly shows a paywall before any subscription, and unlocks the real invite form after a (simulated) purchase.
- The full invite round-trip against the real backend: send → dev-mode console log of the actual email content (recipient, subject, accept link, download link) → "Invite sent" confirmation rendered in the UI → entry appended to invite history.
- The privacy filter and the deletion cascade, both via direct HTTP requests against the running backend (see above).
- A production build (`npm run build`) with zero warnings, and both native platforms (`npx cap add ios` / `android`) generated successfully with the correct plugins and app identity propagated into `AndroidManifest`/`strings.xml` and `Info.plist`.
