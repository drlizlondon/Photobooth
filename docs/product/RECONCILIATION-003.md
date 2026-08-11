# Reconciliation 003 — Product direction vs repository and programme

**Date:** 2026-08-11
**Status:** IN PROGRESS — written incrementally, one pass at a time, committed after each pass.
**Scope:** Reconcile the stated product direction ("tell us about your event, we'll build the photobooth") against the repository as it exists, the PB programme, the two landed packets, and existing pricing/payment/storage/trial/activation assumptions.
**Authority:** This document is diagnostic. It does **not** restart the programme, rewrite working functionality, or create a parallel roadmap. Amendments it recommends land in `IMPLEMENTATION-SPEC.md` only after Lizzie accepts them.

---

## Progress marker

**RESUME HERE → Section D.**

| Section | Subject | State |
|---|---|---|
| A | Existing product capabilities | ✅ written |
| B | Reusable architecture | ✅ written |
| C | Current configuration model | ✅ written |
| D | Product-generation feasibility | ⬜ **next** |
| E | Setup Pass feasibility | 🟡 measured (§E-evidence below); prose not written |
| F | 48-hour event model | ⬜ |
| G | Owner mode vs guest mode | ⬜ |
| H | Trial / payment reconciliation | ⬜ |
| I | Magazine architecture | 🟡 registry located; assessment not written |
| J | Migration hazards | ⬜ |

**Resume rule:** read this marker, do the next unwritten section, commit, update the marker. A pass may cover more than one section but **must end with a commit** — the point is that a credit cutoff costs one pass, never the document.

---

## Headline of this pass

**The product direction is far closer to the existing code than it looks — because the "MyBishBash does the design work" mechanism is already built and shipping.**

`DEFAULTS` ([app.js:1-88](../../app.js:1)) is a flat, 75-field, fully-serialisable event configuration in which **blank means "generate it from the event title."** Strip copy, all 29 cover copy slots and all four Polaroid lines already auto-generate from `eventTitle`. The direction's core rule — *the customer provides very few inputs, MyBishBash does the design* — is the contract this file already implements.

What is missing is not the generation engine. It is the **thin resolver in front of it**: event type + name + date + Look → set `eventTitle`, `date`, `accent` and the five font roles. Everything downstream already cascades.

That reframes the work from "build a generator" to "build a preset layer over the generator that already exists."

---

## A. Existing product capabilities

### Already works — reuse untouched

| Capability | Where | Note |
|---|---|---|
| Three-photo capture with countdown, mirror, flash, prompts | `app.js` `beginSession`, `capturePhoto` [849](../../app.js:849), `startCamera` [795](../../app.js:795) | The successful flow. Protected. |
| Blank-means-generate copy contract | `DEFAULTS` [app.js:1](../../app.js:1); `Covers.copyFor` [covers.js:110](../../covers.js:110) | **This is the direction's engine, already shipping.** |
| Four magazine templates behind a registry | `TEMPLATES` [covers.js:21](../../covers.js:21), `RENDERERS` [covers.js:1433](../../covers.js:1433) | Catalogue expansion is cheap. See §I. |
| Editorial photo treatment | `FINISH` constants [covers.js:357-375](../../covers.js:357) | Separate pass from template drawing. **Do not reopen.** |
| Strip: 4 frames × 5 filters, pixel-pass grading | `Covers.applyGrade`, `FRAMES`/`FILTERS` [app.js:90](../../app.js:90) | Filters are a pixel pass, deliberately not `ctx.filter`. |
| Living Polaroid, H.264 + PNG fallback | `polaroid.js`, `mp4.js` | Protected. |
| Typography as five named roles | `fonts.js` | Device-resident faces only; canvas-drawn specimens. |
| Local gallery, IndexedDB | `saveSessionToGallery` [app.js:290](../../app.js:290) | Photos never leave the device. |
| Share/Save with iOS fallbacks | `app.js` share/save paths | Protected. |
| Offline PWA shell | `sw.js` | Network-first; entitlement responses excluded from Cache Storage. |
| Entitlement boundary | `product.js` | Prices structurally cannot grant capabilities. |

### Exists but needs adaptation

| Capability | Where | Gap against the direction |
|---|---|---|
| Event configuration | `DEFAULTS` + `settings` | Is a flat bag with no identity, no lifecycle, no versioning. Needs an `EventConfig` contract extracted around it — see §C. |
| "Example booth" preview | `applyExampleBoothSettings` [app.js:511](../../app.js:511) | Hardcodes `Rae's 26th Birthday`. This is the *shape* of generation, with one baked-in event instead of a resolver. |
| Accent colour | `settings.accent`, single hex | Direction wants **Event Looks** coordinating many surfaces. One colour is not a Look. See §16 of the brief. |
| Free tier identity | `DEFAULTS.eventTitle = "Your Celebration"` | PB-18 already owns replacing this with event-type identity. |
| Settings screen | 5-step setup, all fields exposed | Direction wants *constrained* post-generation editing, not the full surface first. |

### Genuinely missing

- **The resolver**: event type + name + date + Look → config. Nothing exists.
- **Event Look as a coordinated multi-surface concept** — only `accent` exists.
- **Event identity and lifecycle** — no event ID, no DRAFT/LIVE/ENDED, no activation. PB-20 owns this.
- **Setup Pass / device transfer** — nothing. PB-14 owns export/import but as a file, not a QR/link.
- **Multi-photo magazine layouts** — capture keeps all three photos, but no template consumes more than one.
- **Owner vs guest mode distinction** — see §G.

---

## B. Reusable architecture

**Reuse, do not replace.** Everything in the "already works" table above. Specifically:

- **The capture pipeline is the product's crown jewel and the direction depends on it** — clause 4 ("trial means using the real booth") is satisfied by *not touching* `startCamera`/`capturePhoto`/the countdown. The only sanctioned change is PB-09's `catch` branch.
- **`covers.js` is a renderer library, not a page.** It exports `TEMPLATES, RATIO, coverSize, derive, copyFor, copyKeys, render, placeholder, FONT` ([covers.js:1538](../../covers.js:1538)). `marketing.js` already drives it from outside the booth to render landing-page demos — proving the renderers are reusable headlessly. A generation preview can use the same route.
- **`product.js` stays the entitlement boundary.** The direction's trial/paid progression must express itself in `CAPABILITY_MATRIX` terms via PB-21, not in a parallel concept.
- **`sw.js`'s finite-shell rule** must survive: any new bundled theme/template asset joins `ASSETS` explicitly, and its contract test in `tests/integration-contract.test.js:193` updates with it. PB-06 proved that pair is load-bearing — a stale entry makes `cache.addAll` reject and breaks offline install entirely.

**Replace nothing.** No packet in this reconciliation proposes replacing a renderer, the capture flow, the storage layer or the entitlement module.

---

## C. Current configuration model

### What an event configuration *is* today

One flat object, `settings`, initialised from `DEFAULTS` ([app.js:1-88](../../app.js:1)).

Measured composition:

```
field count: 75
value types: 69 string, 1 number, 5 boolean
non-primitive fields: NONE — fully serialisable, no embedded assets
```

Field groups: event identity (2) · strip copy (4) · cover copy (29) · Polaroid lines + transition (5) · typography roles (5) · guest-facing screen text (22) · booth behaviour (`accent`, `countdown`, `mirror`, `prompts`, `shutter`, `flash`, `confetti`) (7).

### Where things live

| Concern | Location | Persists? |
|---|---|---|
| Event configuration | `settings`, key `mybishbashPhotoboothSettingsV1` [app.js:94](../../app.js:94), written by `persistSettings` [app.js:367](../../app.js:367) | ✅ localStorage |
| Guest photographs | IndexedDB `mybishbashPhotoboothGallery`, `sessions` store | ✅ IndexedDB |
| Edition counter | `mybishbashPhotoboothEditionSequenceV1` | ✅ localStorage |
| Verified access token | `mybishbashPhotoboothVerifiedAccessV1` | ✅ localStorage |
| **Business brand incl. `logoImage`** | `businessBrand` module variable [app.js:~166](../../app.js:166) | ❌ **not persisted anywhere** |
| Free user's draft settings | `temporarySettingsSnapshot` | ❌ ephemeral |
| Lifecycle / activation state | — | ❌ does not exist |

### How values reach the renderers

`settings` → `Covers.copyFor(settings)` derives cover copy (blank → generated from `eventTitle`) → `Covers.render()` applies the photo finish, then the selected template renderer draws. `fonts.js` resolves the five roles. Strip and Polaroid read `settings` directly. Nothing in the render path reads storage — it all flows from the in-memory `settings` object, which is why `marketing.js` can drive the same renderers with a literal object.

### Is there a clean `EventConfig` contract?

**Effectively yes, and it can be extracted without a rewrite.** `settings` is already the contract: flat, primitive-only, fully serialisable, consumed by every renderer, and with a documented blank-means-generate semantic.

What it lacks is not structure but **metadata**: no `schemaVersion`, no event identity, no lifecycle, no Look reference. Those are additive fields, not a restructuring.

Two hazards to record now:

1. **Photo data and event configuration are already cleanly separated** — photos live only in IndexedDB, configuration only in localStorage, and the two never mix. This is exactly the boundary clause 14 demands, and it is already true. **Preserve it.**
2. **`businessBrand.logoImage` is the only place a large asset could enter configuration, and it is currently not persisted at all.** Any future work that starts persisting it must keep it *out* of the Setup Pass payload, or reference it by ID. Recorded as a §J hazard.

---

## E-evidence — Setup Pass payload, measured

Recorded now because the measurement was cheap and it de-risks §E. Prose assessment still owed.

Realistic fully-populated event (Rae-style: title, date, accent, four strip fields, five font roles):

| Payload | Raw | deflateRaw | → base64url |
|---|---|---|---|
| Full defaults | 1,349 B | 471 B | — |
| Full populated config | 1,461 B | 544 B | **728 chars** |
| **Sparse — non-default fields only (11 fields)** | **310 B** | **198 B** | **264 chars** |

QR byte-mode capacity at error-correction level M: v10 (57×57) ≈ 271 chars · v15 ≈ 412 · v20 ≈ 666 · v25 ≈ 1003.

**Provisional conclusion: a self-contained V1 Setup Pass is comfortable, provided it carries the sparse diff rather than the full object.** 264 chars fits a **QR v10 (57×57)** — small, printable, reliably scannable by a phone camera. The full object needs ~v20 (97×97), still viable but denser and more failure-prone in poor light.

This is measured, not assumed. Compression earns its place: 310 → 198 bytes (36%) on the sparse payload, and the gap widens as customers fill in more fields.

---

## Sections D, F, G, H, I, J — not yet written

See the progress marker. Do not act on this document's recommendations until it is complete and accepted.
