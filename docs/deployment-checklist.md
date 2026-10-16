# Day84 — Deployment Checklist

Concrete steps to take this from "runs on my machine" to "live on the App Store and Play Store." Roughly in the order you'd actually do them.

## 1. Backend — get it running somewhere real

- [ ] Swap `backend/src/lib/db.js`'s JSON-file storage for a real Postgres database. `backend/schema.sql` is the matching schema — every function in `db.js` is already a small, named async unit, so this is a mechanical swap (or use Prisma/Drizzle if you'd rather not hand-write SQL).
- [ ] Deploy the backend somewhere that gives you a stable URL — Railway, Render, Fly.io, or a small VPS all work fine for this size of service. It's a single Express app with no exotic dependencies.
- [ ] Confirm your database provider encrypts data at rest (most managed Postgres — RDS, Supabase, Neon — do this by default; just check the box exists and is on).
- [ ] Set up HTTPS (virtually every PaaS above does this automatically via their own domain or a custom domain + Let's Encrypt).

## 2. Email — make invites actually send

- [ ] Sign up for [Resend](https://resend.com) (or swap `backend/src/lib/email.js` for SendGrid/Postmark — the function signature is small and isolated).
- [ ] Verify your sending domain with Resend (required before they'll deliver to real inboxes, not just your own test addresses).
- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM` in your deployed backend's environment variables (see `backend/.env.example`).
- [ ] Set `APP_DOWNLOAD_URL` to your real App Store / Play Store listing (or a landing page that links to both) once those exist.
- [ ] Set `APP_WEB_BASE` to a real domain you control — this is what builds the "tap here to link" URL inside the invite email. For native deep-linking (so tapping the link opens the app directly instead of a browser), configure iOS Universal Links / Android App Links pointing at this same domain.

## 3. Subscriptions — replace the simulated purchase

The Paywall screen (`app/src/screens/Paywall.svelte`) currently calls `simulatePurchase()`, which just flips a local flag. Replace this with a real payment integration:

- [ ] The simplest path for a cross-platform Capacitor app is **RevenueCat** — it wraps both StoreKit (iOS) and Play Billing (Android) behind one SDK and webhook system.
- [ ] Install `@revenuecat/purchases-capacitor`, configure your product IDs in App Store Connect and Google Play Console, and replace `simulatePurchase()` with a real `Purchases.purchasePackage()` call.
- [ ] Point RevenueCat's webhook at a new backend endpoint (e.g. `POST /webhooks/revenuecat`) that updates each user's entitlement state in your database.
- [ ] Replace `backend/src/routes/subscription.js`'s stubbed `{ active: false }` response with a real lookup against that entitlement state.
- [ ] Update `setSubscriptionActive()` in `app/src/stores/partner.svelte.js` to be driven by that real entitlement check on app load, not just the local simulated flag.

## 4. App icons & splash screens — generate the full set

Icons in this project were hand-generated for the essential sizes using `rsvg-convert`. For a polished, complete icon/splash set across every required size and idiom (including iOS's various App Store/Settings/Spotlight sizes and Android's adaptive-icon layers), run Capacitor's official generator **on your own machine** (it depends on `sharp`, which needs to download a prebuilt binary — this failed inside the sandboxed environment this project was built in, but will work normally on a typical dev machine or CI runner with open network access):

```bash
cd app
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0d1117' --splashBackgroundColor '#0d1117'
```

Source artwork to feed it: `app/public/icons/icon.svg` (full icon) and `icon-foreground.svg` (transparent foreground layer, for Android adaptive icons).

- [ ] Note: the current iOS icon (`AppIcon-512@2x.png`) has its corners pre-rounded in the source SVG. iOS applies its own corner mask automatically — regenerating from a perfect square (no pre-rounded corners) via the command above will look slightly cleaner than the current placeholder.

## 5. Native build & store submission

- [ ] `cd app && npm run build && npx cap sync` after any frontend change, to push the latest web build into `ios/` and `android/`.
- [ ] iOS: open `app/ios/App/App.xcworkspace` in Xcode (on a Mac), set your Team/signing, and archive for App Store Connect.
- [ ] Android: open `app/android` in Android Studio, generate a signed release bundle (`.aab`), and upload via Google Play Console.
- [ ] Both stores will require your Privacy Policy URL at submission — host `legal/privacy-policy-template.md` (after legal review and converting to your final copy) at a public URL, e.g. `https://yourdomain.com/privacy`.

## 6. Legal review

- [ ] Get `legal/privacy-policy-template.md` and `legal/terms-of-service-template.md` reviewed (or rewritten) by a lawyer familiar with app/SaaS privacy law — especially the GDPR/CCPA data-rights section and the COPPA-adjacent age-gate language, before either is published.
- [ ] Once finalized, replace the placeholder content build step: regenerate `app/public/legal/*.html` from the final markdown (see the conversion approach used during this build, or just hand-author the final HTML directly).

## 7. Monitoring & ops (not built, worth adding before real users arrive)

- [ ] Replace the basic `console.log` request logging in `backend/src/index.js` with a real logger (pino/winston) and ship logs somewhere durable.
- [ ] Add error tracking (Sentry or similar) to both the frontend and backend.
- [ ] If you outgrow the single-instance in-memory rate limiter in `backend/src/lib/rateLimit.js`, swap it for a shared store (Redis) so limits hold across multiple backend instances.
