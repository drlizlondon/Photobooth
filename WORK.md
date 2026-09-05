# MyBishBash Photobooth — Implementation Tracker

Canonical plan: [IMPLEMENTATION-SPEC.md](docs/product/IMPLEMENTATION-SPEC.md)
Diagnosis: [AUDIT-2026-08-09.md](docs/product/AUDIT-2026-08-09.md)

Work-package prefix: **PB** (claimed 2026-08-09 in `~/.claude/portfolio.md`). A session seeing a foreign prefix in this repo should stop and ask.

Update this file **in the same commit** as each packet. Keep it terse — reasoning lives in the spec, state lives here.

## Status

- **Current phase:** the consolidated locked product + landing + output pass is implemented and verified. Automated product, Worker and browser gates are green; real iPhone/iPad Safari sign-off remains owed. Production deployment remains a separate action.
- **Completed packets (11):** PB-01 · PB-02 · PB-03 · PB-04 · PB-05 · PB-06 · PB-07 · PB-08 · PB-09 · PB-10 · PB-17 — all pushed to `origin/main`. **P0, P1, P2 and P3 are complete.**
- **Next release gate:** real-device Safari camera/record/share verification, followed separately by Worker/catalogue/Stripe/restore/event-binding migration before billing can open.
- **Programme started:** 2026-08-11.
- **Amendments:** 001 (2026-08-10) — four experiences, event lifecycle, £19/£49 model. 002 (2026-08-10) — lifecycle decisions locked, cancellation governance corrected. 003 (2026-08-11) — reconciles the "we build your photobooth" direction; adds PB-22…PB-28, amends PB-14/18/19/20. Evidence: `docs/product/RECONCILIATION-003.md`. **004 (2026-08-11) — ACCEPTS 003 and resolves all three blocking decisions** (seven event types; lifecycle × entitlement orthogonal; Setup Pass adopted and distinct from entitlement restore), and adds the three-valued event-timing model. **005 (2026-08-11) — the owner's consolidated locked product prompt authorises one coherent integration pass across the EventConfig, lifecycle, entitlement, landing, Strip and real-motion capture boundaries while preserving Magazine/local-first systems. It supersedes older per-packet file freezes for this pass only.** **006 (2026-08-11) — restores one shared three-photo guest session: Strip and Moving Polaroid consume all three, Magazine uses the guest's chosen favourite, Next Guest starts a fresh shared capture, and Retake replaces the current session. This supersedes Amendment 005's experience-first live capture model while preserving its event, renderer and navigation work.**
- **Reconciliation 003 verdict:** the programme survives. The immediate run `PB-17 → PB-10 → PB-05 → PB-07 → PB-09 → PB-03` is unchanged and remains executable now; PB-06 and PB-08 stay closed with no regression found.
- **PB-29 (2026-08-17/18) — branded client booths.** A client is now data (`clients.js`), not a branch in `app.js`: slug → brand, event defaults, consent config, entitlement. First client `david-lloyd`, for cold outreach; owner decisions were live booth (not a gallery), white-label outputs, noindex. `clients.js` is also the single source of **route vocabulary** — `app.js` and `landing.js` previously each carried their own copy of the business-route regex, and a contract test now fails if either reintroduces one. Origin: a Jules session attempted this by hardcoding the customer; reviewed and rejected (4 blockers, 6 bugs), then rebuilt generally.
- **Two live defects found during PB-29, neither in the audit:** (1) **`/business/` has never worked.** `index.html` loads every script by relative `src`, so a trailing-slash URL resolves them against `/business/` and the app boots with zero scripts — a rewrite serves the shell and hides it. Verified in a browser. Fixed for both routes by redirecting trailing-slash forms to the canonical path; a contract test now rejects any trailing-slash *rewrite*. (2) The **SAMPLE draft watermark** applied to a Business-entitled client booth, which has no 48-hour one-event licence for it to protect. `eventIsDraft()` now returns false for a client booth. **Note this is scoped to client routes only — whether a real Business customer should ever see SAMPLE is an open question this packet did not settle.**
- **Live defect found during Amendment 001, not in the audit:** `trimGallery(20)` silently deleted a party's earliest sessions past 20, and `saveSessionToGallery` swallowed write failures with `catch(e){}`. **Fixed by PB-17.**

## Packet checklist (execute strictly in this order)

**The `#` column is execution position. `PB-nn` is identity and never changes.** Amendment 001 inserted five packets and reordered the tail, so the numbers are deliberately out of sequence — follow the `#` column, not the packet number.

Three chains are load-bearing:

- **PB-17 → PB-18 → PB-19** — storage before freedom. Removing the 20-session cap before storage is managed turns a silent trim into a dead booth at a live party.
- **PB-20 → PB-21 → PB-11 → PB-16** — lifecycle before licence before price before sale. PB-11 cannot price `ONE_EVENT` before the entitlement exists; the entitlement cannot bound an event before the lifecycle does. Pricing is still the freezing step and still lands before the billing gate.
- **PB-13 + PB-14 → PB-15** — prerequisite pair; cutting over with only one produces either an unstyled site or stranded users.

| # | Packet | Phase | Status | Commit |
|---|--------|-------|--------|--------|
| 1 | PB-01 Replace the dead Business contact URL | P0 | ☑ | `904bd4f` |
| 2 | PB-02 Make the commerce state honest *(amended 001)* | P0 | ☑ | `db7c64c` |
| 3 | PB-03 Never silently discard a guest's configuration | P0 | ☑ | `0fd9ca1` |
| 4 | PB-04 Publish terms, privacy and cancellation | P1 | ☑ | `1e7f319` |
| 5 | PB-05 Origin constant + complete social metadata | P2 | ☑ | `9197594` |
| 6 | PB-06 Cut the demo contact sheet to under 200 KB | P2 | ☑ | `e690d01` |
| 7 | PB-07 robots.txt, sitemap.xml, branded 404 | P2 | ☑ | `31d15f9` |
| 8 | PB-08 Fix the mobile navigation containing block | P3 | ☑ | `2c47613` |
| 9 | PB-09 Differentiate camera failures, remove the alert | P3 | ☑ | *(pending)* |
| 10 | PB-10 Close the measured accessibility gaps | P3 | ☑ | `ab8ca06` |
| 11 | **PB-17 Make local photo storage survivable** | P3 | ☑ | `69f7dbe` |
| 12 | **PB-18 Persistent Free booth with event-type identity** | P3 | ◐ | — |
| 13 | **PB-19 "Your Photobooth" return access + three entry routes** | P3 | ☑ | *(pending — pb-event-model-gaps branch)* |
| 14 | PB-13 Make the app subpath-ready | P5 | ☐ | — |
| 15 | PB-14 Settings export/import *(amended 001 — now a product feature)* | P5 | ☐ | — |
| 16 | PB-15 Cut over to mybishbash.app/photobooth | P5 | ☐ | — |
| 17 | **PB-20 Event lifecycle domain model** | P4 | ◐ | — |
| 18 | **PB-21 Extend the entitlement model for ONE_EVENT** | P4 | ☐ | — |
| 19 | PB-11 Reprice: FREE £0 / ONE EVENT £19 / ANNUAL £49 *(amended 001)* | P4 | ☐ | — |
| 20 | PB-12 Free-vs-paid comparison + purchase moment *(amended 001)* | P4 | ☐ | — |
| 21 | PB-16 GATE: decide whether to activate billing *(amended 001)* | P6 | ☐ | — |
| 22 | **PB-29 Branded client booth routes (first client: David Lloyd Clubs)** | P2 | ☑ | `ceeabed` |

Record the real commit hash when a packet lands. Placeholders like "this commit" or "pending" stop being meaningful the moment the session ends.

**Ground-truth reconciliation (2026-09-03, pb-event-model-gaps branch):** `◐` marks a packet whose underlying contract already shipped (schemaVersion/eventId/eventType/datePrecision on EventConfig; the seven-value event-type list; DRAFT/LIVE/ENDED lifecycle with activation guards — all present in `event.js`/`app.js`) but whose full acceptance-criteria list was not re-walked line-by-line this session, so it is not ticked outright. Genuinely closed this session, verified against `docs/product/AUDIT-CONSOLIDATED-2026-08-29.md`:
- **C-02** (gallery not event-scoped) — `galleryRecord()` now stamps every session with the active `eventId` (`app.js`); `getGallerySessions()` scopes reads to the current event by default, with an explicit `{scope:"device"}` escape hatch for the genuinely device-wide storage-management functions (`trimGallery`, `dropOldestSessions`); a one-time migration backfills pre-existing eventId-less sessions to the current event so no photo is ever hidden. Verified live: two events on one device now see disjoint galleries.
- **C-08** (free identity hardcoded to "Your Celebration") — `DEFAULTS.eventTitle` (`app.js`) and `EVENT_FIELD_DEFAULTS.eventTitle` (`event.js`) are now blank; `createEventConfig` resolves a blank title to a generic identity keyed by `eventType` (`genericEventTitle()`, `event.js`) — "My Birthday", "My Wedding", "My Baby Shower", "My Anniversary", "My Graduation", "My Party", "My Celebration" (the `other`/catch-all case). Verified live for all seven types.
- **PB-19** ("Your Photobooth" return access) — landing hero now shows exactly one of OPEN MY PHOTOBOOTH (returning owner, straight to Event Home in host view, identity shown) or TRY THE DEMO + CREATE MY FREE PHOTOBOOTH (new visitor, distinct actions). The demo is guarded in `enterGuestBooth()` so Start never reaches `getUserMedia` or writes to storage. Verified live with instrumented `getUserMedia`/`localStorage`.
- **DRAFT/SAMPLE watermark on Magazine + Moving Polaroid MP4 — found already complete, no code changed.** Magazine: `renderMagazine()`/admin preview call `drawDraftPreview()` (`app.js`) after `Covers.render()`, painting the mark onto the same canvas Save/Share export from — `covers.js` itself is untouched, exactly as its "protected" status requires. Moving Polaroid: `polaroidOptions()` passes `draftPreview:eventIsDraft()` into `Polaroid.compose()`, whose `drawFrame()`/`drawAt()` composite the watermark after chrome on every frame; `mp4.js`'s two encoders (`encodeWebCodecs`, `encodeRecorder`) both call that same `renderFrame` callback per frame, so the mark is baked into every encoded frame with zero changes to `mp4.js`. Both paths are covered by existing tests (`tests/integration-contract.test.js` "drawDraftPreview"; `tests/polaroid-live.test.js` "SAMPLE watermark ... every frame").

## Verification requirements (every packet)

1. Preflight green — there is no build step and no root `package.json`, so the preflight is this literal command:
   ```bash
   node --test tests/*.test.js && (cd worker && npm run check)
   ```
   Root suite re-verified 2026-09-03 on `pb-event-model-gaps`: **113 root product/renderer/experience/event tests pass, 0 fail.** (Worker suite not re-run this session — no worker files touched; the prior "84 root / 14 Worker / 98 total" figure from 2026-08-11 is stale for the root count specifically and should not be relied on.)
2. The packet's acceptance criteria checked off in the commit message.
3. Any packet touching `index.html` or `styles.css` confirms all ten landing-page demo canvases still report `data-demo-ready="true"` — the landing page drives the real renderers.
4. Product manually loadable and deployable after the commit. This is a static site with no build step: a broken commit is a broken production deploy.
5. This tracker updated: status ticked, commit hash recorded, decision log appended if a call was made.

## Protected assets — no packet may modify these except where named

- `covers.js`, `polaroid.js`, `mp4.js`, `fonts.js` — the rendering engine. **No packet in this programme touches them.**
- `product.js` — **PB-11 only** for `PLAN_METADATA`, and **PB-21 only** for `ENTITLEMENTS` / `CAPABILITY_MATRIX`. The freeze resumes the moment PB-21 lands. No other packet may touch this file for any reason.
- `FOUNDING_LIFETIME` — **may be retired from sale, never deleted.** Referenced in `worker/src/billing.ts:230,520,563` and asserted 8× in `tests/product.test.js`.
- `worker/` — **no packet modifies it**; PB-16 only reads and reports.
- `sw.js` `ASSETS` — **PB-06 only** (filename), and the list stays finite.
- The capture path in `app.js` — **PB-09 only**, and only its `catch` branch.

**Amendment 005 exception:** the consolidated owner instruction explicitly reopened `polaroid.js`, the canonical Strip path, capture planning and EventConfig/product boundaries for this implementation pass. `covers.js`, the Magazine finish, `mp4.js`, `fonts.js`, storage identities, cancellation safeguards and local-first photo boundary remain protected.

**Storage keys no packet may rename without a specified migration:** `mybishbashPhotoboothVerifiedAccessV1`, `mybishbashPhotoboothGallery`, `mybishbashPhotoboothGalleryMigratedV1`, `mybishbashPhotoboothEditionSequenceV1`, the settings key at `app.js:226`, and the read-only legacy `raePhotoBoothLiveSettings` / `raePhotoBoothGallery`.

## Wave 1 quick wins (2026-08-30)

Executed against `docs/product/AUDIT-CONSOLIDATED-2026-08-29.md`'s Wave 1 row, on the founder's explicit "Go". Scope was exactly the seven findings named there; nothing else. All commits pass `node tests/product.test.js` (19/19) and `node tests/integration-contract.test.js` (38/38) individually — re-run together after this section was written: still 19/19 and 38/38.

| Finding | Status | Commit | Notes |
|---|---|---|---|
| C-01 silent gallery trim | **Done** | `8f8e000` | `trimGallery()` and the emergency `dropOldestSessions(3)` path now both report the real count removed through `#storageNotice`; previously fully silent (`catch(e){}`). |
| C-07 waitlist/contact bridge | **Done** | `65d4bdf` | Two mailto: touchpoints (the static pricing notice and the checkout-status message), both built from the existing `business-contact-email` meta with a distinct subject. Front-end only, no backend, no third-party form service. |
| C-15 Business raw-HTML metadata | **Owed — needs a decision, not a quick win** | — | See "C-15 decision conflict" below. Not implemented this session. |
| C-16 branded catch-all 404 | **Done, with a caveat** | `6ecd979` | Catch-all rewrite to `/404.html` added, last in `vercel.json`'s rewrites array. Modern Vercel `rewrites` cannot set an HTTP status, so an unmatched path will render the branded page's content but return status 200, not a true 404 — a real status-404 page needs a Vercel Function, which was not added (new infrastructure, out of scope for a quick win). Live routing behaviour unverified — no deploy access this session. |
| C-22 390px pricing overflow | **Done, code-level; live retest owed** | `aa8c86c` | See "C-22 retest note" below. |
| C-23 favicon + no-JS notice | **Done** | `f6cdf84` | `<link rel="icon">` added (reuses existing `icons/icon-192.png`/`icon-512.png`, no new asset); `<noscript>` banner added, points at the still-functional static footer links. |
| C-24 three `<h1>` elements | **Done** | `fb5e92b` | `heroTitle` stays `<h1>`; `businessTitle` and `welcomeTitle` demoted to `<h2>` with ids/aria unchanged. Five CSS selectors retargeted; no visual/font-size change. |

**Session-wide caveat:** no browser tooling (real or emulated) was available this session, and push/deploy is out of scope for it. Every "Done" row above is verified by code inspection plus the two allowlisted node test suites, not by rendering the page. Where that matters more than usual, it is called out per-row above and in Owed manual verifications below.

### C-15 decision conflict — recorded instead of improvised

The finding: `/business`'s raw (pre-JavaScript) HTML response is byte-identical to `/` — a crawler or link-preview bot gets Personal title/description/OG tags for a Business link. `applySurfaceMetadata()` (app.js) correctly rewrites them once JavaScript runs, but that is exactly the audience this doesn't reach.

This repo has no build step and no serverless backend on Vercel (the `worker/` Cloudflare Worker is a separate, unrelated deployment). Given that, every route to a real fix carries a cost too large to accept unilaterally as a "quick win":

1. **Duplicate the whole document** (e.g. a `business.html` copy of `index.html` with a different `<head>`) so `vercel.json` can rewrite `/business` to a route-specific static file. Index.html is a ~1,000-line single-page app; the body is identical for both surfaces (`.screen` sections toggle by class), so this would mean maintaining two near-identical ~1,000-line files that will drift the moment either is edited without the other — directly the "mint a sibling instead of extending the concept" failure mode this programme's own guiding principle 6 forbids, for a 15-line `<head>` difference.
2. **A Vercel Function that serves conditional metadata** (dynamic rendering / server-side routing by request). This is new backend infrastructure the whole programme has deliberately avoided (`docs/product/IMPLEMENTATION-SPEC.md` §12: "A build step, framework, bundler... The no-build static architecture is why this product runs offline on an old iPad"). Introducing a Function is a real architecture change, not a quick win.
3. **A Vercel `rewrites` rule conditioned on request headers** (`has: [{type:"header", key:"user-agent", value:"...crawler pattern..."}]`) pointing known bot user agents at a small, purpose-built static metadata shell while every real visitor keeps getting the full interactive app unchanged. This is the standard "dynamic rendering for bots" pattern search engines explicitly endorse, and it avoids both problems above — but it is a Vercel-specific routing feature this session had no way to verify against live infrastructure (no push/deploy access), and a malformed rule risks either silently doing nothing (safe) or, if the `has` condition is broader than intended, misrouting real traffic (not safe). Shipping an unverified routing change to `vercel.json` — the same file C-16 just touched — is a bigger bet than "no decisions needed" implies.

None of the three is a unilateral quick-win call. Recommended next step: option 3, in a session with deploy access to verify the `has` header match actually behaves as documented before it ships, or a founder decision to accept option 1's duplication cost explicitly. Left undone rather than improvised.

### C-22 retest note (code inspection only — no browser available)

The audit's finding (A2-F03, 2026-08-11) was: `.pricing-grid` correctly narrows to 1 column at `max-width:650px`, but a *later, unconditional* declaration elsewhere in `styles.css` restates `grid-template-columns:repeat(3,1fr)` with equal specificity and no media-query guard, so it wins the cascade at every viewport width regardless — the Annual card gets pushed off-screen on a phone.

Re-inspected the current file (2026-08-30, pre-fix): confirmed still present. The base rule at the old line 198 read `repeat(4,1fr)` (stale — the DOM only has 3 `.price-card` elements today, the 4th "Founding" card having been retired from the grid), and a second, unconditional rule at the old line 499 — physically after both the `max-width:1050px` (2-column) and `max-width:650px` (1-column) media blocks — restated `repeat(3,1fr)`. Because it carried no media-query condition, it applied at every width and always won by source order, silently defeating both narrower breakpoints. This is the exact mechanism the audit named, verified by reading cascade order rather than by rendering.

**Fix:** folded the correct value (`repeat(3,1fr)`) into the one base declaration, removed the duplicate unconditional rule entirely. The two media queries (2 columns ≤1050px, 1 column ≤650px) are no longer shadowed by anything appearing after them.

**What this note can and cannot claim:** the cascade-order defect is fixed by static analysis — reading the stylesheet top to bottom, at 390px only the `max-width:650px` rule (`1fr`, single column) now applies, since nothing later overrides it. What it cannot claim is a rendered screenshot or a computed `getBoundingClientRect()`/`scrollWidth` check at 390×844, because no browser (real or emulated) was available this session. **Owed:** load the live page at 390px width (or run the audit's own computed-style check) and confirm the Annual card is on-screen with no horizontal overflow, per `docs/product/AUDIT-2026-08-11-SHARED-THREE.md` F-03's verification method.

## Owed manual verifications

A packet that would "fix" one of these must not run until the behaviour is confirmed to exist — otherwise a working component gets rebuilt to cure a phantom.

- [ ] **C-22 pricing-grid fix, live retest at 390px.** Code-level cascade-order fix landed (`aa8c86c`); no browser was available to confirm the rendered result. See the Wave 1 section above.
- [ ] **C-16 catch-all 404, live routing behaviour.** Confirm on the deployed site that a genuinely unmatched path (e.g. `/nonexistent-page-xyz`) now renders `404.html`'s content (expect HTTP 200, not 404 — see the caveat in the Wave 1 section) rather than Vercel's bare platform 404.
- [ ] **C-07/C-23 mailto and favicon rendering.** Click-test both new mailto: links and confirm the mail client opens with the right prefilled subject; confirm the favicon actually shows in a browser tab.
- [ ] **C-15 Business raw-HTML metadata — needs a decision.** See the Wave 1 section above; not implemented this session.

- [ ] **In-app browser camera behaviour (PB-09 copy confirmation).** PB-09 has landed: the native alert is gone, failures branch on `err.name`, and in-app browsers get a detection-based hint. What is still owed is confirming the *wording matches reality* — open the live link inside WhatsApp and Instagram on a real iPhone **and** a real Android handset, and check whether `getUserMedia` is permitted and which branch fires. This no longer blocks the packet; it validates copy.
- [x] **Automated whole capture flow.** Fake-camera Chromium covers the shared three-photo session, Strip, Magazine favourite selection, three-photo Moving Polaroid, crop guide, MP4, PNG still, Save/Share, Home/Event Home, Back, Retake and Next Guest at phone/iPad viewport sizes.
- [ ] **Real Safari event-device pass.** iPhone/iPad camera permission, front/rear-camera reality, H.264 encoding, native Share/AirDrop, rotation, installed-PWA chrome and background interruption still require HTTPS hardware testing.
- [ ] **Hard navigation to the Business surface (blocks PB-13 sign-off).** One `navigate` to `/business` timed out during the audit while `curl` returned 200 and client-side routing worked. Recorded as instrument noise; confirm under the subpath before cutover.
- [ ] **Booth keyboard and screen-reader path.** Not assessable without the camera.
- [ ] **Skip-link visual reveal on real Tab (PB-10).** The `.skip-link:focus{top:12px}` rule is present with correct specificity, the link is the first focusable element and `#app` is a focusable target — but the audit browser pane was hidden, which stops `:focus` styling being applied, so `top` never left `-64px` in measurement. Press Tab on a real browser and confirm the black "Skip to content" pill appears top-left.
- [ ] **Business mailbox delivery (PB-01, external — does NOT block any packet).** Repository code cannot establish whether `photobooth@mybishbash.app` has a mailbox or forwarding configured with the email provider. Send a test message and confirm it arrives.
- [ ] **Font specimens on the actual booth iPad.** The tuning laptop and the booth are not the same machine.

## Inputs needed from Lizzie

- [x] ~~PB-01 follow-up — a monitored enquiry email.~~ **Done 2026-08-11:** `photobooth@mybishbash.app` wired through the central meta. All four CTAs resolve to `mailto:` with the prefilled subject. **PB-01 is code-complete.**
- [ ] **PB-04:** now draftable per Amendment 004 (must also reconcile cancellation wording against unused paid entitlements; accounting treatment must not be invented in application code). Still needs sign-off on the legal content **and** the cancellation classification — whether the one-event entitlement is treated as digital content, a service, or both, since the consent and acknowledgement checkout must capture differs. The executor drafts and flags; it does not decide this.
- [ ] **PB-15:** approval to cut over, and whether/when to announce the new URL.

**Resolved — no longer inputs:** PB-11 price point (£0 / £19 / £49) · event types (Birthday · Wedding · Baby Shower · Anniversary · Graduation · Party · Other) · PB-20 ENDED behaviour (photos always survive) · PB-20 reactivation (none; new purchase creates a new event) · PB-16 Annual gating (gated, along with One Event).

## Origin locations PB-15 must update at cut-over

Recorded by PB-05 as its criterion requires. All five live in `index.html`; nothing else in the repository hardcodes a hostname.

| # | Location |
|---|---|
| 1 | `<meta name="site-origin">` — the constant itself |
| 2 | `<link rel="canonical">` |
| 3 | `<meta property="og:url">` |
| 4 | `<meta property="og:image">` |
| 5 | `<meta name="twitter:image">` |
| 6 | `robots.txt` — the `Sitemap:` line *(added by PB-07)* |
| 7 | `sitemap.xml` — both `<loc>` values *(added by PB-07)* |

Locations 2–5 are static **by necessity**, not oversight: link-preview crawlers (Facebook, WhatsApp, Slack, iMessage, X) do not execute JavaScript, so a JS-written `og:image` is invisible to precisely the surfaces the metadata exists to serve. `assertOriginConsistency()` runs at boot and warns if any of them stops agreeing with `site-origin`, so the duplication cannot drift silently. `robots.txt` and `sitemap.xml` are static files that cannot read a meta tag, so they carry the origin too — seven locations in total, all listed here.

## Billing switch

`BILLING_LIVE` in `app.js` remains `false`. It must not be flipped by itself: the checked-in Worker still speaks the retired catalogue and does not yet bind `ONE_EVENT` to EventConfig. Opening purchase requires the Worker schema/policy, Stripe products, restore path, event binding, legal checkout wording and `photobooth-api-base` to be migrated and verified together.

It has nothing to do with the 48-hour live event period: purchase time is not event start time, and only a deliberate START EVENT begins the live window.

## Regression caught by the contract suite (PB-04)

PB-04 initially added `"cleanUrls": true` to `vercel.json` so `/privacy` would serve `privacy.html`. **`tests/integration-contract.test.js` rejected it**, with the reason written into the assertion: *"cleanUrls rewrites index.html away before the static root fallback can resolve it"* — the production root-routing bug fixed in `392c645` / `e72e65f`. That commit was pushed before the failure was noticed and was corrected in the next commit; `cleanUrls` is gone and the legal pages use explicit `.html` URLs, so `vercel.json` is byte-identical to before PB-04.

**Process note:** the failure was pushed because the preflight was run but its result did not gate the commit. Every subsequent packet must gate the commit on the preflight's exit status, not on reading its output.

## Open legal question (PB-04)

**Narrow and unresolved: how the paid event is correctly classified under UK consumer law** — digital content, a digital service, another service, or a licence/access right. Each carries different conditions for how the 14-day cancellation right is affected and what must be disclosed and agreed before purchase.

- **What depends on it:** only the cancellation rule itself, and the exact consent/acknowledgement wording at checkout. Nothing else.
- **What does not depend on it:** Privacy, Terms, and the description of purchase/preparation/activation — all published and accurate.
- **Why it was not answered:** the product facts are settled but the classification is a legal question, and picking the commercially convenient category would be inventing an answer. `/refunds` says plainly that nothing is on sale and that the terms will be published before anything is.
- **When it becomes blocking:** before PB-16 can pass, since nothing may go on sale without it. Not before.
- **Also unresolved and deliberately not invented:** governing-law jurisdiction, legal entity name and company registration details. No postcode, town or county was invented — the address is recorded exactly as supplied.

## Decision log

| Date | Decision | Where recorded |
|------|----------|----------------|
| 2026-08-09 | White-box audit accepted in full as the diagnosis | `docs/product/AUDIT-2026-08-09.md` |
| 2026-08-09 | Prefix `PB` claimed for this project | `~/.claude/portfolio.md` registry |
| 2026-08-09 | Billing activated **after** migration, not before | Spec C3, decision 1 |
| 2026-08-09 | Gallery **not** carried across origins; settings are, via export/import | Spec decision 2, PB-14 |
| 2026-08-09 | Legacy grandfathering **ends** at the origin change | Spec C1, decision 3; ADR due in PB-04 |
| 2026-08-09 | Personal repriced **per event**, not per duration; Founding Lifetime unchanged | Spec C4, decision 4, PB-11 |
| 2026-08-09 | Business keeps **no public price**; a qualifying line replaces bare "contact us" | Spec decision 5, PB-01 |
| 2026-08-09 | Client-side entitlement accepted as posture, not engineered around | Spec C1; ADR due in PB-04 |
| 2026-08-09 | Live Stripe deployment is **out of scope** for this programme | Spec §12, PB-16 |
| 2026-08-10 | **Amendment 001** accepted: four distinct experiences; pricing becomes FREE £0 / ONE EVENT £19 / ANNUAL £49 | Spec Amendment 001 |
| 2026-08-10 | Lifetime tier **retired from sale**; `FOUNDING_LIFETIME` constant **retained** (Worker D1 + 8 test assertions depend on it) | Spec A1.2.7, A1.4 |
| 2026-08-10 | Free becomes a **persistent** booth with generic event-type identity; full custom identity is the paid lever | Spec A1.3, PB-18 |
| 2026-08-10 | Event lifecycle (DRAFT/PREVIEW/LIVE/ENDED, 48h from explicit activation) modelled as a **domain concept**, not a boolean | Spec PB-20 |
| 2026-08-10 | `CAPABILITY_MATRIX` freeze widened **exactly once**, by PB-21, on the record — not by an exception to PB-11 | Spec PB-21 |
| 2026-08-10 | Sequencing inverted: lifecycle → licence → price → sale. PB-11 now depends on PB-21 | Spec A1.6 |
| 2026-08-10 | Storage management is an **engineering** concern, never a pricing mechanism; `trimGallery(20)` goes only after PB-17 | Spec A1.3, PB-17 |
| 2026-08-10 | Annual sale gated behind entitlement recovery; One Event fails **open** locally and is gated the same way | Spec A1.7 |
| 2026-08-10 | **Amendment 002** — four open decisions locked; lifecycle simplified to DRAFT → LIVE → ENDED | Spec A1.9 |
| 2026-08-10 | **ENDED never removes photos.** Stops new personalised capture only; gallery stays viewable, downloadable, shareable permanently | Spec PB-20 |
| 2026-08-10 | **No reactivation of an ENDED event.** A further £19 creates a new event; "Use these settings again" duplicates the design | Spec PB-20 |
| 2026-08-10 | Free event types locked to four: Birthday · Wedding · Party · Celebration | Spec PB-18 |
| 2026-08-10 | **Withdrawn:** the Amendment 001 instruction to declare the £19 licence non-refundable after the first live photo. It asserted which statutory exception applies; PB-04 now requires legal classification before sale and consent capture at checkout | Spec A1.9, PB-04 |
| 2026-08-10 | PB-17 promoted to next executable packet — live defects, no gated dependencies | Spec A1.9 |
| 2026-08-11 | **Amendment 005:** consolidated locked product pass authorised EventConfig, lifecycle, landing, Strip and real Moving Polaroid integration; Magazine/local-first systems remain protected; no deployment authorised | Owner consolidated implementation prompt |
| 2026-08-11 | **Amendment 006:** one shared three-photo session restored; all three feed Strip and Moving Polaroid, Magazine gets a favourite picker, Next Guest starts fresh and Retake replaces the current guest's source record | Owner correction before white-box audit |
| 2026-08-29 | **ONE_EVENT price restored to £19** (founder decision, explicit: "let's try £19 — don't lock in, flexible, we'll try for now"). Reverses the undocumented £9 reprice that commit `5aee413` shipped on 2026-08-11 with no decision-log entry (found by the 2026-08-28 implementation review §5). £19 matches Amendment 001 and every design doc. Deliberately provisional: the price is presentational metadata (product.js:92 architecture), `BILLING_LIVE` is false, and changing it again is one line + this log. | `product.js`, `index.html`, legal pages, tests; review: `~/NightMode/research/photobooth-audit-implementation-review-2026-08-28.md` §5 |
| 2026-08-29 | **Audit #2 committed and both audits consolidated into one working document** (`docs/product/AUDIT-CONSOLIDATED-2026-08-29.md`) — the single list of open findings to execute from; the two source audits stay immutable as diagnosis records | This session, on founder instruction |
| 2026-08-30 | **Wave 1 quick wins executed** (founder "Go"): C-01, C-07, C-16, C-22, C-23, C-24 landed as six small commits, tests green throughout. **C-15 deliberately not implemented** — the only available static-site fixes either mint a ~1,000-line duplicate document or ship an unverified Vercel routing change; recorded as a decision conflict rather than improvised. C-16's catch-all returns status 200 for a branded 404 page, not a true 404, since modern Vercel `rewrites` cannot set status without a Function | See "Wave 1 quick wins (2026-08-30)" section above; commits `8f8e000`, `fb5e92b`, `f6cdf84`, `aa8c86c`, `6ecd979`, `65d4bdf` |
