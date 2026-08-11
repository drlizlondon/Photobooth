# MyBishBash Photobooth — Implementation Tracker

Canonical plan: [IMPLEMENTATION-SPEC.md](docs/product/IMPLEMENTATION-SPEC.md)
Diagnosis: [AUDIT-2026-08-09.md](docs/product/AUDIT-2026-08-09.md)

Work-package prefix: **PB** (claimed 2026-08-09 in `~/.claude/portfolio.md`). A session seeing a foreign prefix in this repo should stop and ask.

Update this file **in the same commit** as each packet. Keep it terse — reasoning lives in the spec, state lives here.

## Status

- **Current phase:** P0 — Stop the site lying. Not started.
- **Completed packets:** PB-08 (mobile nav containing block) · PB-06 (page weight 2,331,527 → 341,779 bytes)
- **Next packet:** **PB-17 — make local photo storage survivable.** Promoted 2026-08-10 ahead of the P0/P1 sequence: the 20-session silent deletion and the swallowed quota failure are live defects in a shipped product, not future commercial architecture, and they depend on none of the gated decisions. PB-01 remains blocked on the contact address; PB-03 and PB-06…PB-10 are unblocked and can run in parallel sessions.
- **Programme started:** —
- **Amendments:** 001 (2026-08-10) — four experiences, event lifecycle, £19/£49 model. 002 (2026-08-10) — lifecycle decisions locked, cancellation governance corrected. **003 (2026-08-11) — PROPOSED, NOT ACCEPTED**: reconciles the "we build your photobooth" direction. Proposes PB-22…PB-28 and amends PB-14/18/19/20. Evidence: `docs/product/RECONCILIATION-003.md`. **Three decisions block acceptance — see spec A3.5.**
- **Reconciliation 003 verdict:** the programme survives. The immediate run `PB-17 → PB-10 → PB-05 → PB-07 → PB-09 → PB-03` is unchanged and remains executable now; PB-06 and PB-08 stay closed with no regression found.
- **Live defect found during Amendment 001, not in the audit:** `trimGallery(20)` ([app.js:301](app.js:301)) silently deletes a party's earliest sessions past 20, and `saveSessionToGallery` swallows write failures with `catch(e){}`. Owned by PB-17.

## Packet checklist (execute strictly in this order)

**The `#` column is execution position. `PB-nn` is identity and never changes.** Amendment 001 inserted five packets and reordered the tail, so the numbers are deliberately out of sequence — follow the `#` column, not the packet number.

Three chains are load-bearing:

- **PB-17 → PB-18 → PB-19** — storage before freedom. Removing the 20-session cap before storage is managed turns a silent trim into a dead booth at a live party.
- **PB-20 → PB-21 → PB-11 → PB-16** — lifecycle before licence before price before sale. PB-11 cannot price `ONE_EVENT` before the entitlement exists; the entitlement cannot bound an event before the lifecycle does. Pricing is still the freezing step and still lands before the billing gate.
- **PB-13 + PB-14 → PB-15** — prerequisite pair; cutting over with only one produces either an unstyled site or stranded users.

| # | Packet | Phase | Status | Commit |
|---|--------|-------|--------|--------|
| 1 | PB-01 Replace the dead Business contact URL | P0 | ☐ | — |
| 2 | PB-02 Make the commerce state honest *(amended 001)* | P0 | ☐ | — |
| 3 | PB-03 Never silently discard a guest's configuration | P0 | ☐ | — |
| 4 | PB-04 Publish terms, privacy and cancellation | P1 | ☐ | — |
| 5 | PB-05 Origin constant + complete social metadata | P2 | ☐ | — |
| 6 | PB-06 Cut the demo contact sheet to under 200 KB | P2 | ☑ | `e690d01` |
| 7 | PB-07 robots.txt, sitemap.xml, branded 404 | P2 | ☐ | — |
| 8 | PB-08 Fix the mobile navigation containing block | P3 | ☑ | `2c47613` |
| 9 | PB-09 Differentiate camera failures, remove the alert | P3 | ☐ | — |
| 10 | PB-10 Close the measured accessibility gaps | P3 | ☐ | — |
| 11 | **PB-17 Make local photo storage survivable** | P3 | ☐ | — |
| 12 | **PB-18 Persistent Free booth with event-type identity** | P3 | ☐ | — |
| 13 | **PB-19 "Your Photobooth" return access + three entry routes** | P3 | ☐ | — |
| 14 | PB-13 Make the app subpath-ready | P5 | ☐ | — |
| 15 | PB-14 Settings export/import *(amended 001 — now a product feature)* | P5 | ☐ | — |
| 16 | PB-15 Cut over to mybishbash.app/photobooth | P5 | ☐ | — |
| 17 | **PB-20 Event lifecycle domain model** | P4 | ☐ | — |
| 18 | **PB-21 Extend the entitlement model for ONE_EVENT** | P4 | ☐ | — |
| 19 | PB-11 Reprice: FREE £0 / ONE EVENT £19 / ANNUAL £49 *(amended 001)* | P4 | ☐ | — |
| 20 | PB-12 Free-vs-paid comparison + purchase moment *(amended 001)* | P4 | ☐ | — |
| 21 | PB-16 GATE: decide whether to activate billing *(amended 001)* | P6 | ☐ | — |

Record the real commit hash when a packet lands. Placeholders like "this commit" or "pending" stop being meaningful the moment the session ends.

## Verification requirements (every packet)

1. Preflight green — there is no build step and no root `package.json`, so the preflight is this literal command:
   ```bash
   node tests/product.test.js && node tests/integration-contract.test.js && (cd worker && npx vitest run)
   ```
   Baseline re-verified 2026-08-11: **34 browser tests pass (17 `product.test.js` + 17 `integration-contract.test.js`), 14 worker tests pass, 48 total, 0 fail.**
   *Correction: entries before 2026-08-11 recorded "17 browser tests" — that was `product.test.js` alone and under-counted the suite. The preflight command was always correct; only the stated figure was wrong.*
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

**Storage keys no packet may rename without a specified migration:** `mybishbashPhotoboothVerifiedAccessV1`, `mybishbashPhotoboothGallery`, `mybishbashPhotoboothGalleryMigratedV1`, `mybishbashPhotoboothEditionSequenceV1`, the settings key at `app.js:226`, and the read-only legacy `raePhotoBoothLiveSettings` / `raePhotoBoothGallery`.

## Owed manual verifications

A packet that would "fix" one of these must not run until the behaviour is confirmed to exist — otherwise a working component gets rebuilt to cure a phantom.

- [ ] **In-app browser camera behaviour (blocks PB-09 sign-off).** Open the live link from inside WhatsApp and Instagram on a real iPhone *and* a real Android handset. Record whether `getUserMedia` is permitted and what the guest actually sees. The audit browser could not reproduce in-app browser restrictions.
- [ ] **Whole capture flow end to end.** Three-shot countdown, four Strip frames, five filters, four Cover styles, Living Polaroid H.264 and PNG fallback, iOS Share sheet. Never exercised in the audit — no camera access. Expected: all working, per the README.
- [ ] **Hard navigation to the Business surface (blocks PB-13 sign-off).** One `navigate` to `/business` timed out during the audit while `curl` returned 200 and client-side routing worked. Recorded as instrument noise; confirm under the subpath before cutover.
- [ ] **Booth keyboard and screen-reader path.** Not assessable without the camera.
- [ ] **Font specimens on the actual booth iPad.** The tuning laptop and the booth are not the same machine.

## Inputs needed from Lizzie

- [ ] **PB-01:** the monitored email address for Business enquiries. **This is the only thing blocking a packet today.**
- [ ] **PB-04:** sign-off on the legal content, **and** the cancellation classification — whether the one-event entitlement is treated as digital content, a service, or both, since the consent and acknowledgement checkout must capture differs. The executor drafts and flags; it does not decide this.
- [ ] **PB-15:** approval to cut over, and whether/when to announce the new URL.

**Resolved 2026-08-10 — no longer inputs:** PB-11 price point (£0 / £19 / £49) · PB-18 event types (Birthday · Wedding · Party · Celebration) · PB-20 ENDED behaviour (photos always survive) · PB-20 reactivation (none; new purchase creates a new event) · PB-16 Annual gating (gated, along with One Event).

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
