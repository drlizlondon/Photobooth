# Consolidated audit — the one document to work from

**Date:** 2026-08-29. Created on the founder's instruction ("let's put audits together for one to work from").
**Sources (immutable diagnosis records — never edit them, edit this):**
- Audit #1: `AUDIT-2026-08-09.md` (26 findings, pre-shared-three build)
- Audit #2: `AUDIT-2026-08-11-SHARED-THREE.md` (16 findings, committed to the repo the same day as this document)
- Status evidence: `~/NightMode/research/photobooth-audit-implementation-review-2026-08-28.md` (read-only review that verified every finding against code and the live site)

**Rule of use:** this is the single working list. A finding is closed here only when the behaviour is retested and observed absent (per `findingVerificationSchema`), not when a packet claims it. When a finding closes, strike it through with a date and the evidence. WORK.md remains the packet tracker; this document is the findings ledger the packets must answer to.

---

## 0. Already closed — do not re-litigate

From audit #1 (verified live 2026-08-28): F-02 dead CTAs, F-03 silent save discard, F-04 camera-error branching, F-05 OG tags, F-07 robots/sitemap, F-13/F-14 legal pages, F-17 page weight, F-21 mobile nav, F-24 kicker contrast, F-25 touch targets, F-26 skip link (tab-check owed, §D). F-22 repriced per-event as recommended. Decided-not-coded (recorded decisions, not debt): F-10 grandfathering ends at origin change; F-15/F-16 client-side entitlement accepted as posture (ADR still owed, §D).

**2026-08-29:** the £9-vs-£19 drift the review found is resolved — ONE_EVENT restored to **£19** across code, copy, legal pages and tests (founder decision, provisional, WORK.md decision log 2026-08-29).

---

## 1. Open findings, consolidated and deduplicated

IDs are `C-nn`. Sources given as A1-Fnn / A2-Fnn. Duplicates merged.

### Block A — Data safety (first: audit #2's own §23 recommendation)

| ID | Finding | Source | Severity | Owner packet |
|---|---|---|---|---|
| C-01 | `trimGallery()` (app.js:822) still deletes sessions silently on the routine path — `catch(e){}`, no "N sessions removed" disclosure. PB-17 fixed the pressure path only. | A2-F01 | **Blocker** | PB-17 follow-through (needs a packet number) |
| C-02 | Gallery is device-wide, not event-scoped — `galleryRecord()` (app.js:740) has no `eventId`. Photos from different events intermix on a shared device. | A2-F02 | High | PB-18/19/20 chain |

### Block B — Commerce chain (sequenced: lifecycle → licence → price → sale; WORK.md A1.6)

| ID | Finding | Source | Severity | Owner packet |
|---|---|---|---|---|
| C-03 | One Party is not bound to one event — no server-side event binding; local fail-open fallback admitted at product.js:270. | A2-F06 | High — paid-launch gate | PB-20 → PB-21 |
| C-04 | Browser and Worker catalogues contradict: Worker (`worker/src/types.ts`, `policy.ts`) still encodes retired £30/£50/£100; browser runs £0/£19/£49. | A2-F05 | High — paid-launch gate | PB-16 prerequisite |
| C-05 | Nothing can be bought — Worker undeployed, `BILLING_LIVE=false`, `/v1/plans` 404s. Now honestly "coming soon" but commercially inert. | A1-F01 | Blocker (by design until PB-16) | PB-16 |
| C-06 | No upgrade route at any denial point. | A1-F12 | High | PB-12 (blocked by PB-18/PB-11) |
| C-07 | Interested paid buyers have no waitlist/contact bridge while checkout is closed. | A2-F13 | Medium | quick win, no packet yet |
| C-08 | Free covers still say "YOUR CELEBRATION" (`DEFAULTS.eventTitle`, app.js:5). | A1-F23 | High | PB-12/PB-18 |
| C-09 | Unevidenced founding-scarcity claim (cap of 500 unverifiable client-side). | A1-F11 | Low | PB-16 |
| C-10 | Pre-sale legal identity + one privacy statement incomplete for actual sale. | A2-F14 | Medium | PB-04 close-out |

### Block C — Domain migration (gates billing: decision C3, billing after migration)

| ID | Finding | Source | Severity | Owner packet |
|---|---|---|---|---|
| C-11 | `mybishbash.app/photobooth` still 404s; root-vs-subpath undecided. | A2-F07, A1-F20 | High — release gate | PB-15 (decision is the founder's) |
| C-12 | Trailing-slash `/photobooth/` breaks assets (relative paths). | A1-F19 | High | PB-13 |
| C-13 | Domain move strands all local state — export/import not built. | A1-F09 | High | PB-14 |
| C-14 | Legacy grandfathering end needs its coded moment at cutover (decision made 2026-08-09). | A1-F10 | Medium | with PB-15 |

### Block D — Metadata, accessibility, polish (parallelisable; no gates)

| ID | Finding | Source | Severity | Owner packet |
|---|---|---|---|---|
| C-15 | `/business` raw HTML byte-identical to `/` — crawlers/link-previews get Personal metadata. Client-side rewrite exists; server response doesn't. | A1-F06 = A2-F08 | Medium | none yet |
| C-16 | Genuinely unmatched paths still hit Vercel's bare `text/plain` 404 (no catch-all in `vercel.json`). | A1-F08 caveat | Low | none yet |
| C-17 | Capture/Review transitions not announced, no focus management. | A2-F09 | Medium | none yet |
| C-18 | Output/favourite selection communicated only visually — no accessible names/state. | A2-F10 | Medium | none yet |
| C-19 | Live Moving Polaroid ignores `prefers-reduced-motion`. | A2-F11 | Medium | none yet |
| C-20 | Host accent colour can produce failing control contrast. | A2-F12 | Medium | none yet |
| C-21 | Preview Photobooth has no return edge to host mode. | A2-F04 | Medium | none yet |
| C-22 | Phone pricing row overflow (cascade regression) — unverified since 11 Aug; retest at 390px first. | A2-F03 | High (if still present) | verify, then fix |
| C-23 | JavaScript-off failure is silent; favicon 404s. | A2-F16 | Low | quick win |
| C-24 | Three `<h1>` elements on the landing page. | A1-F18 | Low | quick win |
| C-25 | Core state machine concentrated in one file with no committed browser E2E suite. | A2-F15 | Medium | engineering hygiene |

### Owed manual checks (10 minutes total, founder or any session with a device)

- Tab through the live page and confirm the skip link works (A1-F26).
- Confirm `photobooth@mybishbash.app` actually receives mail (nobody has).
- Camera-error wording check in real in-app browsers (A1-F04 residue).
- Write the owed ADR for the accepted client-side-entitlement posture (A1-F15/16).

---

## 2. The fix schedule

Order follows the tracker's own sequencing logic (lifecycle → licence → price → sale; migration before billing). Executor sessions work top-down; founder gates are marked 👤 and mirrored in `~/NightMode/LIZZIE-TASKS.md`.

| Wave | Work | Findings closed | Gate |
|---|---|---|---|
| **1 — now** | Quick wins needing no decisions: silent-trim disclosure (C-01), waitlist bridge (C-07), favicon + no-JS notice (C-23), h1s (C-24), 390px retest (C-22), Business raw-HTML metadata (C-15), branded catch-all 404 (C-16) | C-01, C-07, C-15, C-16, C-22, C-23, C-24 | none — dispatchable today |
| **2 — event model** | PB-18/19/20 chain (persistent free booth, event lifecycle) then PB-21 (ONE_EVENT entitlement); event-scoped gallery rides with it | C-02, C-03, C-08 | 👤 PB-22 go/no-go (the programme's stated pause) |
| **3 — migration** | PB-14 export/import → PB-13 path fixes → PB-15 cutover to `mybishbash.app/photobooth` + grandfathering end | C-11, C-12, C-13, C-14 | 👤 root-vs-subpath decision; DNS/Vercel access |
| **4 — open commerce** | Worker catalogue rewrite to £0/£19/£49 (C-04), Stripe products, restore path, event binding proof, legal completeness (C-10), then PB-16 deploy + `BILLING_LIVE=true` | C-04, C-05, C-06, C-09, C-10 | 👤 "start the commerce chain" + PB-04 legal sign-off |
| **parallel** | Accessibility set (C-17–C-21) and E2E suite (C-25) — any idle executor lane | C-17…C-21, C-25 | none |

**Why this order:** Wave 1 is pure debt with zero decisions. Wave 2 before 3/4 because the event model is what both later waves build on (the tracker's own inversion: lifecycle before licence before price before sale). Migration (3) before billing (4) is a recorded 2026-08-09 decision — nobody should be sold a URL that's about to change. Accessibility runs parallel because nothing gates it and nothing depends on it.
