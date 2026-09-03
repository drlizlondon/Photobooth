# Photobooth — Booth Kits & Editor Overhaul (PB-30 → PB-33)

**Date:** 2026-09-02 · **Prefix:** PB (continues the programme; PB-29 was the previous max) · **Status:** execution-grade spec for dispatch, pending founder sign-off on the four packets below.
**Founder direction (2026-09-02, verbatim intent):** templates so it's *soooo simple* to get a booth running; simple customisation by default with advanced tucked away (no clutter); mobile **and** larger screens (iPad); when editing, the live demo sits at the bottom with options at the top so every change previews live. Name = **Booth Kits**. Sequence = **flip the editor first**. Kits = **Birthday (happy, animated) · Wedding · Kids Party · Minimal** — **no Corporate**; Minimal is the clean "Rae's birthday" style; **Birthday should be happier — "withluv level of animation."**

## 0. Ground truth (from the 2026-09-02 read-only survey — cite before changing)
- **A real live-preview engine already exists** — `renderAdminPreview()` (`app.js:2709`), debounced 90ms (`adminPreviewTimer`, `app.js:2791`), ~10 call sites, 4 preview tabs Event Home / Strip / Magazine / Polaroid (`index.html:942-947`). **Extend it; never rebuild it.**
- **The 5-step setup wizard** lives at `#settings` (`index.html:691-985`): Event / Vibe / Words / Test / Ready (`.setup-progress` tabs `index.html:702-707`). Advanced options are already collapsed in `<details id="advancedSettings">` (`index.html:839-931`) — a real progressive-disclosure seed.
- **Editor layout is INVERTED vs the target.** Desktop `.admin-grid` is a left/right split (options left, preview right sticky) — `styles.css:378`, `:392`. Narrow screens stack but put the **preview on top, options below** (`styles.css:405-413`, `:558-560`) — the exact opposite of "options top / demo bottom."
- **Breakpoints are fragmented** — duplicate/overlapping `@media(max-width:1050px)` (`styles.css:400` and `:558`) and two `@media(max-width:920px)` (`:405`, `:452`). iPad (768/1024) falls into the **phone bucket**; the two-column desktop layout structurally can't render below ~870px, so **iPad never gets a tuned layout**.
- **"Vibe" presets exist but only skin the entrance screen** — Pop / After Dark / Editorial / Sunshine (`index.html:734-768`; `[data-theme=…]` in `styles.css:514-531`). They are NOT whole-booth templates.
- **Naming collision:** `TEMPLATES` is already a taken identifier — the magazine-cover registry (`covers.js:20`), owned by PB-26/27/28. **"Booth Kits" must not reuse that word or namespace.**
- **Three uncoordinated "options + preview" UIs** today: the personal wizard `.admin-grid`; the Business marketing `.brand-lab` (`index.html:466-483`, `styles.css:243`); and hardcoded client booths (`clients.js`, no UI). **Do not add a fourth — unify.**
- **PB-14 "Setup Pass"** (`docs/product/IMPLEMENTATION-SPEC.md:797`) is already designed to carry "bundled themes/templates referenced by ID" — the correct persistence substrate for Booth Kits. Do NOT invent a new save/load.
- **Repo state:** on `main`, working tree clean (7 already-committed, unpushed Wave-1 commits ahead of origin; only untracked `.claude/` tooling). **Never push** — deploy is the founder's. Branch each packet off `main`.
- **Out of scope:** pricing/commerce. `product.js` already has the full Free / One Party / Annual model + capability matrix; `checkoutCreationEnabled:false` is a separate founder decision (D4), not touched here.

## 1. Constitution for this programme (violations need a written decision record)
1. **Feed the existing concept.** Extend `renderAdminPreview`, the wizard, the `<details>` disclosure, and PB-14 Setup Pass. No parallel preview engine, no parallel save system, no fourth option+preview UI.
2. **One shared editor.** The flipped layout is built once as a shared component and the three current surfaces converge on it. Structure fixed before features stack on it.
3. **Data, not code, for kits.** A Booth Kit is a config object (like a Vibe preset), never bespoke per-kit code paths. Adding a kit = adding data.
4. **Distinct vocabulary.** "Booth Kit" everywhere in this work; never "template" (reserved for `covers.js`).
5. **Motion is a feature, and it is accessible.** All animation respects `prefers-reduced-motion` (full functionality, motion reduced to instant/opacity). No motion that blocks input or the live preview.
6. **Honesty invariants untouched.** The load-bearing privacy invariant (Free/Personal photos never leave the device) and all entitlement gating are out of scope and must not be weakened.

---

## PB-30 — Unified editor: options-top / sticky live-preview-bottom, responsive (phone · iPad · desktop)
**The frame. Do first (founder-sequenced).**

**Goal:** one shared editor layout — **options at the top, the live preview pinned to the bottom of the viewport** as a sticky panel so it stays visible while you edit — at every width, replacing the current inverted/left-right layout, and giving iPad its own tuned tier.

**Design:**
- Introduce ONE shared editor shell (extract the current `.admin-grid` markup/logic into a single reusable structure) used by the personal wizard now, and by the Business/brand path in a later packet (leave `brand-lab` in place for now but build the shell so it can host it — do not fork a new pattern).
- **Layout order (all widths):** options/controls region on top; **live preview docked to the bottom** as a `position: sticky; bottom: 0` panel (a persistent "stage" strip) that always shows the current preview tab, updating live via the existing `renderAdminPreview` debounce. On tall phones the sticky bottom stage keeps the preview on-screen while the host scrolls the options above it — this is the fix for "make a change, see it live" that a plain in-flow bottom preview would lose.
- The preview stage keeps its existing tab switcher (Event Home / Strip / Magazine / Polaroid), orientation toggle, and test-photo drop (`index.html:942-977`) — reuse, don't rebuild.
- **Responsive tiers — consolidate the fragmented breakpoints into ONE scale:**
  - **Phone (≤ ~640px):** single column, options scroll, sticky bottom preview stage (compact height).
  - **iPad / tablet (~641–1024px):** NEW tuned tier — options in a comfortable single or two-up column with a taller sticky bottom stage; must not fall into the phone bucket. Verified at 768px portrait and 1024px landscape.
  - **Desktop (≥ ~1025px):** may keep a larger stage; options top, preview bottom (or a deliberate large-screen variant), but the **order stays options-then-preview** — no reversion to the old right-rail split unless a written decision records why.
  - Delete/merge the duplicate `@media(max-width:1050px)` (`styles.css:400`, `:558`) and `@media(max-width:920px)` (`:405`, `:452`) blocks into the single scale above.

**Files (expected):** `styles.css` (rework `.admin-grid`/`.admin-preview` into the shared stage + one breakpoint scale), `index.html` (`#settings` markup reorder to options-then-sticky-stage), `app.js` (preview call sites keep working; no logic rebuild). Do not touch `covers.js`, `product.js`, capture/upload code, or entitlement logic.

**Acceptance:**
- [ ] On phone, iPad-portrait (768px), iPad-landscape (1024px) and desktop, the editor shows **options above** and a **live preview pinned at the bottom** that stays visible while options scroll.
- [ ] Changing any control updates the bottom preview live (existing debounce), on every tier.
- [ ] iPad renders a purpose-built tier, not the phone layout — verified at 768 and 1024px.
- [ ] Exactly one breakpoint scale drives the editor; the duplicate 1050/920 media blocks are gone.
- [ ] The Business `brand-lab` and capture flows are unchanged in behaviour (this packet does not migrate them yet, but must not break them).
- [ ] `prefers-reduced-motion`: any stage transitions degrade to instant.
- [ ] App loads with zero new console errors; the 4 preview tabs + orientation + test-photo drop still work.

---

## PB-31 — Booth Kits: whole-booth quick-start presets
**The "soooo simple" win. After PB-30.**

**Goal:** a host picks a **Booth Kit** and the whole booth is essentially ready — event type, theme/vibe, default output style, and starting copy all populated in one tap; they tweak from there. "Up and running in seconds."

**Design:**
- A **Booth Kit is a config object** (new `kits.js`, mirroring the shape/spirit of the Vibe presets `index.html:734-768` but bundling more): `{ id, name, eventType, vibe (existing theme id), outputDefault (strip|magazine|polaroid), copy (headline/microcopy defaults), previewSampleTag }`. No per-kit code branches.
- **Applying a kit** writes those values into the existing `draftSettings()` and re-runs `renderAdminPreview()` — same machinery the wizard already uses; a kit is just a bulk pre-fill. After apply, every field remains individually editable (kits are a starting point, not a lock).
- **Entry point:** a **"Pick a Booth Kit" grid** as the first thing in setup (tile-as-CTA pattern — each kit tile is clickable and previews on hover/tap), consistent with a plus "Start from scratch" tile. Reuse the existing setup-step chrome; do not build a separate page.
- **Persistence:** a kit is referenced **by id** through the existing **PB-14 Setup Pass** export/import — a shared booth carries its kit id, not a copy of every field. Extend PB-14; do not add a new save format.
- **Starter kits (4) — founder-confirmed:**
  - **Birthday** — *happy, celebratory* (the withluv-level one; its delight layer is PB-33). Warm, joyful palette + playful display/script type accent; default output = Photo Strip.
  - **Wedding** — elegant, editorial; refined serif; muted/tasteful palette; default output = Magazine Cover.
  - **Kids Party** — bright, bold, playful (distinct from Birthday's warmth — think primary brights, chunky type); default output = Photo Strip.
  - **Minimal** — clean and understated ("Rae's birthday" style); restrained palette + type, minimal chrome; default output = Photo Strip.
  - (No Corporate kit.)

**Files (expected):** new `kits.js`; `index.html` (kit-picker grid in the setup entry); `app.js` (apply-kit → draftSettings + preview); PB-14 Setup Pass code (carry kit id). Do not duplicate the magazine `covers.js` TEMPLATES registry or its `COPY_KEYS`.

**Acceptance:**
- [ ] A "Pick a Booth Kit" grid shows the 4 kits + "Start from scratch"; each tile is the CTA.
- [ ] Selecting a kit pre-fills event type, vibe/theme, default output and starting copy, and the live preview reflects it immediately.
- [ ] After applying a kit, every field is still individually editable; changing one does not reset the others.
- [ ] Booth Kits are pure config (a new kit = a new object in `kits.js`, no new code path).
- [ ] A shared booth (PB-14 Setup Pass) carries the kit **by id**; importing it reconstructs the kit selection.
- [ ] No use of the word/identifier "template"; no change to `covers.js`.
- [ ] Works within the PB-30 unified editor at all responsive tiers.

---

## PB-32 — Progressive disclosure, systematised
**Mostly falls out of PB-30; this packet completes it. After PB-31.**

**Goal:** simple by default, advanced available but never cluttering — applied *consistently*, not just in the one existing `<details>`.

**Design:** promote the essentials (kit + event basics + primary copy) to an always-visible "Simple" layer; move everything else (per-field magazine/keepsake copy, typography, screen microcopy, countdown/mirror behaviour — currently the flat `<details id="advancedSettings">` block `index.html:839-931`) into a consistent, clearly-labelled **"Advanced"** disclosure pattern reused everywhere an editor surface exists. One disclosure component, not per-section ad hoc `<details>`.

**Acceptance:**
- [ ] Default editor view shows only the essential controls; nothing advanced is visible until revealed.
- [ ] A single, consistently-styled "Advanced" reveal pattern is used across the editor (not multiple bespoke `<details>` treatments).
- [ ] Revealing/hiding advanced never loses entered values and never reflows the sticky bottom preview stage off-screen.
- [ ] On phone, the default (simple) view fits without horizontal scroll and without a wall of options.

---

## PB-33 — "withluv-level" delight pass (Birthday kit + kit-apply joy moment)
**The polish that makes Birthday *happier*. After PB-31. First-class, not an afterthought.**

**Reference bar — QUALITY, NOT LOOK (founder, 2026-09-02):** `https://withluv.co` is the bar for the *level of craft and polish* — smooth, eased, tasteful, premium motion and a genuine sense of delight. **Do NOT copy withluv's aesthetic** — not its lavender/purple palette, not its specific type or layout, not its brand. The Birthday kit gets its **own** celebratory identity (warm, joyful, its own palette + type), executed to that quality level. Match the craft; invent the look. "withluv level of animation" = joyful but tasteful — eased, considered reveals and a real joy-moment, never gaudy, never a clone.

**Goal:** raise the Birthday kit (and the kit-apply moment generally) to that bar, in the vanilla stack (CSS transitions/keyframes + a lightweight Canvas confetti/sparkle — **no heavy library**, consistent with the no-build app).

**Design:**
- **Birthday kit aesthetic:** warm celebratory palette; a display + **script accent** type pairing for the headline (mirroring withluv's serif+script); tilted/polaroid framing in the preview; spring-eased entrance of preview elements.
- **Kit-apply joy moment:** when a kit is applied (Birthday especially), a brief, tasteful celebration — a Canvas confetti/sparkle burst + the preview elements easing/tilting into place. Time-boxed (~1s), non-blocking, dismissible, and it never obscures the controls.
- **Micro-interactions:** kit tiles and primary controls get subtle spring hover/press states.
- **Accessibility:** all of the above is gated behind `prefers-reduced-motion: no-preference`; reduced-motion users get the same result with instant/opacity-only transitions and no confetti.

**Acceptance:**
- [ ] The Birthday kit visibly reads as celebratory/joyful (palette + display/script type + tilted framing) and is clearly distinct from Minimal.
- [ ] Applying a kit triggers a tasteful, time-boxed joy-moment (confetti/sparkle + eased reveal) that does not block input or hide controls.
- [ ] Motion is smooth (eased/spring), not linear/janky; no layout shift of the sticky preview stage.
- [ ] `prefers-reduced-motion` fully suppresses confetti and reduces transitions to instant, with identical end state.
- [ ] No new heavy dependency added; confetti/motion is CSS/Canvas only.
- [ ] Zero new console errors; performance stays smooth on a mid-range phone.

---

## Sequencing & dispatch
1. **PB-30** (frame) → 2. **PB-31** (Booth Kits) → 3. **PB-33** (Birthday/delight) → 4. **PB-32** (disclosure completion; partly delivered by PB-30).
- One packet per session; branch off `main`; commit locally per repo protocol; **never push** (founder deploys via her Lovable/Vercel step). Exit bar per packet: app loads clean, the packet's acceptance boxes verifiable in the browser at phone/iPad/desktop, existing tests still green.
- Extend `renderAdminPreview`, the wizard, `<details>` disclosure, and PB-14 Setup Pass — do not mint parallel systems. Keep "Booth Kit" out of the `covers.js` TEMPLATES namespace.
- **Follow-on programme (2026-09-03):** Worlds — live virtual backgrounds — is specced as **PB-34 → PB-36** in `PB-WORLDS-2026-09-03.md` and runs **after** PB-32 on the same stacked chain. It hooks into Booth Kits through one optional data field (`worldId`, see that spec §3.4); nothing in PB-30→33 needs to anticipate it.

*Document read: ☐ Lizzie*
