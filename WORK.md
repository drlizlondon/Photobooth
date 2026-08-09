# MyBishBash Photobooth — Implementation Tracker

Canonical plan: [IMPLEMENTATION-SPEC.md](docs/product/IMPLEMENTATION-SPEC.md)
Diagnosis: [AUDIT-2026-08-09.md](docs/product/AUDIT-2026-08-09.md)

Work-package prefix: **PB** (claimed 2026-08-09 in `~/.claude/portfolio.md`). A session seeing a foreign prefix in this repo should stop and ask.

Update this file **in the same commit** as each packet. Keep it terse — reasoning lives in the spec, state lives here.

## Status

- **Current phase:** P0 — Stop the site lying. Not started.
- **Completed packets:** none
- **Next packet:** PB-01 — replace the dead Business contact URL with a working `mailto:`. No dependencies. **Blocked on one input from Lizzie: the address to use.**
- **Programme started:** —

## Packet checklist (execute strictly in this order)

The order is not a preference. Two prerequisite pairs and one freezing step are load-bearing: **PB-11 must land before PB-16** (pricing freezes once Stripe products exist), and **PB-13 + PB-14 must both land before PB-15** (cutting over with only one produces either an unstyled site or stranded users).

| # | Packet | Phase | Status | Commit |
|---|--------|-------|--------|--------|
| 1 | PB-01 Replace the dead Business contact URL | P0 | ☐ | — |
| 2 | PB-02 Make the commerce state honest | P0 | ☐ | — |
| 3 | PB-03 Never silently discard a guest's configuration | P0 | ☐ | — |
| 4 | PB-04 Publish terms, privacy and cancellation | P1 | ☐ | — |
| 5 | PB-05 Origin constant + complete social metadata | P2 | ☐ | — |
| 6 | PB-06 Cut the demo contact sheet to under 200 KB | P2 | ☐ | — |
| 7 | PB-07 robots.txt, sitemap.xml, branded 404 | P2 | ☐ | — |
| 8 | PB-08 Fix the mobile navigation containing block | P3 | ☐ | — |
| 9 | PB-09 Differentiate camera failures, remove the alert | P3 | ☐ | — |
| 10 | PB-10 Close the measured accessibility gaps | P3 | ☐ | — |
| 11 | PB-11 Reprice Personal around the event | P4 | ☐ | — |
| 12 | PB-12 Free-vs-paid cover comparison + purchase moment | P4 | ☐ | — |
| 13 | PB-13 Make the app subpath-ready | P5 | ☐ | — |
| 14 | PB-14 Settings export/import | P5 | ☐ | — |
| 15 | PB-15 Cut over to mybishbash.app/photobooth | P5 | ☐ | — |
| 16 | PB-16 GATE: decide whether to activate billing | P6 | ☐ | — |

Record the real commit hash when a packet lands. Placeholders like "this commit" or "pending" stop being meaningful the moment the session ends.

## Verification requirements (every packet)

1. Preflight green — there is no build step and no root `package.json`, so the preflight is this literal command:
   ```bash
   node tests/product.test.js && node tests/integration-contract.test.js && (cd worker && npx vitest run)
   ```
   Baseline verified 2026-08-09: **17 browser tests pass, 14 worker tests pass, 0 fail.**
2. The packet's acceptance criteria checked off in the commit message.
3. Any packet touching `index.html` or `styles.css` confirms all ten landing-page demo canvases still report `data-demo-ready="true"` — the landing page drives the real renderers.
4. Product manually loadable and deployable after the commit. This is a static site with no build step: a broken commit is a broken production deploy.
5. This tracker updated: status ticked, commit hash recorded, decision log appended if a call was made.

## Protected assets — no packet may modify these except where named

- `covers.js`, `polaroid.js`, `mp4.js`, `fonts.js` — the rendering engine. **No packet in this programme touches them.**
- `product.js` — **PB-11 only**, and only inside `PLAN_METADATA`.
- `worker/` — **no packet modifies it**; PB-16 only reads and reports.
- `sw.js` `ASSETS` — **PB-06 only** (filename), and the list stays finite.
- The capture path in `app.js` — **PB-09 only**, and only its `catch` branch.

**Storage keys no packet may rename without a specified migration:** `mybishbashPhotoboothVerifiedAccessV1`, `mybishbashPhotoboothGallery`, `mybishbashPhotoboothGalleryMigratedV1`, `mybishbashPhotoboothEditionSequenceV1`, the settings key at `app.js:226`, and the read-only legacy `raePhotoBoothLiveSettings` / `raePhotoBoothGallery`.

## Owed manual verifications

A packet that would "fix" one of these must not run until the behaviour is confirmed to exist — otherwise a working component gets rebuilt to cure a phantom.

- [ ] **In-app browser camera behaviour (blocks PB-09 sign-off).** Open the live link from inside WhatsApp and Instagram on a real iPhone *and* a real Android handset. Record whether `getUserMedia` is permitted and what the guest actually sees. The audit browser could not reproduce in-app browser restrictions.
- [ ] **Whole capture flow end to end.** Three-shot countdown, four Strip frames, five filters, four Cover styles, Living Polaroid H.264 and PNG fallback, iOS Share sheet. Never exercised in the audit — no camera access. Expected: all working, per the README.
- [ ] **Hard navigation to the Business surface (blocks PB-13 sign-off).** One `navigate` to `/business` timed out during the audit while `curl` returned 200 and client-side routing worked. Recorded as instrument noise; confirm under the subpath before cutover.
- [ ] **Booth keyboard and screen-reader path.** Not assessable without the camera.
- [ ] **Font specimens on the actual booth iPad.** The tuning laptop and the booth are not the same machine.

## Inputs needed from Lizzie

- [ ] **PB-01:** the monitored email address for Business enquiries.
- [ ] **PB-04:** sign-off on the legal content. The executor drafts; it does not sign off.
- [ ] **PB-11:** the event price point. The spec settles the *model* (per event, not per duration); the number is Lizzie's.
- [ ] **PB-15:** approval to cut over, and whether/when to announce the new URL.

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
