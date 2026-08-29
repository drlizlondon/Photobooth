# MyBishBash Photobooth — White-box Product & UX Audit

**Date:** 11 August 2026  
**Mode:** White-box — committed product, repository and current public release posture  
**Scope:** `/Users/lizzie/photobooth` at `main` commit `a7352f0` plus the currently published `https://raes-photo-booth.vercel.app/`, `/business`, the legal pages, and the intended `https://mybishbash.app/photobooth/` destination  
**Product type:** Combined marketing site and browser application  
**Method:** Source review across 52 source files (approximately 23,289 lines), focused review of the camera/session/history/gallery/export, EventConfig, renderer, pricing/entitlement, Worker, service-worker and legal boundaries; 90 browser/static tests; 14 Worker tests plus Worker typecheck; local browser interaction; fake-camera end-to-end sessions at 390×844, 820×1180 and 1180×820; responsive visual captures; and direct public HTTP checks.  
**Audit target:** The committed shared-three-photo implementation. No code was changed as part of this audit.

## Confidence and release note

The product audited here is commit `a7352f0`. Local `main` is one commit ahead of `origin/main`; the public Vercel deployment still serves the earlier `973e1dc` product. That is expected because the owner requested a commit, not a push or deployment. Production drift is therefore recorded as release state, not presented as a defect in the committed implementation.

The automated camera pass used Chromium's fake media device. It proves the browser state machine, three-shot loop, renderer choices, local persistence and responsive layout in those environments. It does **not** prove iPhone/iPad Safari permissions, AirDrop, installed-PWA chrome, Safari's native share implementation or real-device memory behaviour. Those checks are marked **[verify by hand]**.

Billing is deliberately closed (`BILLING_LIVE=false` and no API base). Findings about the Worker catalogue and One Party enforcement are launch gates, not claims that anybody can currently be charged incorrectly.

---

## 1. Executive summary

The core product is now coherent.

A guest takes three photos once. Those same three photos become a physical-feeling Photo Strip, all three animate inside the Moving Polaroid, and the guest chooses a favourite for the Magazine Cover. Save, Share, Still photo, Retake, Next Guest, Home and Event Home remain distinct. That is the right loop for this product, and it passed the complete automated suite and fake-camera browser pass on phone and iPad-sized viewports.

The visual product has also retained what made it special: the white/pastel identity, playful entrance, real renderer collage, personalised event entrance and premium Magazine work. The new flow did not flatten that into a generic software site.

The main risks now sit around the loop rather than inside it:

1. Under storage pressure, old guest sessions can be deleted silently. For an event product, unannounced photo loss is a release blocker.
2. The Event Gallery is device-wide rather than event-scoped. A later event on the same device can see an earlier event's photos.
3. A late CSS rule breaks the phone pricing layout and clips the Annual card horizontally.
4. Host preview has a one-way transition into guest mode, forcing the host back through the public site to recover host controls.
5. The browser and Worker encode two different paid catalogues, and One Party is not yet bound to a single event. Billing is safely closed, but it must stay closed until those contracts agree.

The product is ready for continued private testing. It is not ready for a paid public launch or branded-domain cutover until storage safety and the commercial server contract are resolved. The current renderer/capture implementation is not the reason to hold it.

---

## 2. Root-cause map

### RC-1 — Device-local is not yet event-local

The privacy architecture correctly keeps photos off the network, but the local store has no event boundary. Gallery records lack an `eventId`, the gallery reads every record on the device, reset preserves the whole gallery, and storage recovery treats the oldest records as disposable capacity.

Symptoms: F-01 silent deletion, F-02 cross-event gallery exposure, F-06 One Party's local event scope.

### RC-2 — Two catalogues with no shared contract

The browser has moved to Free / One Party £19 / Annual £49. The Worker still implements six months £30 / twelve months £50 / Founding Lifetime £100. Both test suites pass because each tests its own contradictory truth.

Symptoms: F-05 catalogue mismatch, F-06 unenforced One Party binding, commercial launch remains closed.

### RC-3 — The host/guest boundary has one missing return edge

The distinction between host setup and guest use is otherwise strong, but Preview Photobooth replaces the Event Home state with guest mode and removes every host control. The transition is modelled as a one-way state change rather than a temporary preview.

Symptoms: F-04 stranded host preview; some focus/state issues in F-09 and F-10.

### RC-4 — Visual state is carrying semantic state

Several controls communicate selected/current/changed state only through classes and colour. The late cascade also overrides a correct mobile pricing rule. The experience looks right to a sighted desktop user while some mobile and assistive-technology states are wrong or silent.

Symptoms: F-03 phone overflow, F-09 transition announcements, F-10 unnamed selections, F-11 reduced motion, F-12 contrast.

### RC-5 — One static shell is serving several public identities

Personal and Business share one static HTML head and rely on JavaScript to become distinct. The source and sitemap promise a final MyBishBash domain that is not yet connected, while the deployed product remains on the temporary Rae/Vercel origin.

Symptoms: F-07 domain/cutover, F-08 Business metadata, F-15 no-JavaScript fallback, F-16 release drift.

### RC-6 — Honest closed commerce, but no conversion bridge

The site correctly refuses to fake checkout. That is a strength. The cost is that interested Personal visitors have no honest next action other than returning later.

Symptoms: F-13 paid-intent dead end and part of F-14's pre-sale legal boundary.

---

## 3. Ranked findings

| Rank | Finding | Severity |
|---:|---|---|
| 1 | Storage-pressure recovery can silently delete saved guest sessions | **Blocker** |
| 2 | Event Gallery exposes photos across events on the same device | **High** |
| 3 | Phone pricing is horizontally clipped by a cascade regression | **High** |
| 4 | Browser and Worker paid catalogues contradict one another | **High — paid-launch gate** |
| 5 | One Party is not technically bound to one event | **High — paid-launch gate** |
| 6 | Intended branded URL is not connected and subpath strategy is unresolved | **High — release gate** |
| 7 | Preview Photobooth removes the host's route back to host mode | **Medium** |
| 8 | Business route has Personal metadata for crawlers and link previews | **Medium** |
| 9 | Capture and Review transitions are not announced or focus-managed | **Medium** |
| 10 | Review choices expose visual selection without accessible names/state | **Medium** |
| 11 | Live Moving Polaroid ignores reduced-motion preference | **Medium** |
| 12 | Host-selected accent can produce failing control contrast | **Medium** |
| 13 | Personal paid intent has no waitlist/contact bridge | **Medium** |
| 14 | Pre-sale legal identity and one privacy statement need correction | **Medium** |
| 15 | Core state machine is concentrated in one file without committed browser E2E | **Medium** |
| 16 | JavaScript-off failure is silent and favicon is missing | **Low** |

---

## 4. What is genuinely good

### The shared-three-photo loop is now one understandable product

Public Start and Event Enter both begin the same three-shot session. Strip consumes all three, Magazine displays all three and blocks export until the guest chooses one, and Moving Polaroid composes all three. The UI copy no longer relies on catalogue counts such as “three finished keepsakes” or fixed frame/filter totals. The only prominent number is the structural truth: three captured photographs.

### Navigation semantics are unusually disciplined

Home, Event Home, Next Guest and Retake are separate concepts. Browser history distinguishes public product, Event Home and booth states. Session tokens prevent stale camera/render/export work from reopening Review or acting on the next guest. Public Cancel returns to the marketing landing; event Cancel returns to the event entrance; Next Guest clears temporary guest data and starts a new record; Retake replaces the current record.

### The renderers are honest marketing evidence

The landing page uses the real Strip, Magazine and Polaroid renderer paths rather than invented mock outputs. The canonical 600×1800 Strip geometry is shared by marketing preview, live preview, Save and Share. Magazine retains the strong editorial finish. Polaroid Save/Share uses the locally encoded moving object where supported and preserves a deterministic still image.

### The Strip is a real output, not preview CSS

All treatments share the same three photo-dominant apertures. White and black retain identical geometry. Footer branding is constrained to a small controlled zone, and business logo geometry uses contain rather than crop. The crop guide is derived from canonical renderer proportions and is synchronised to the contained video area rather than guessed from the viewport.

### Local-first is genuine

Free and Personal photo capture, IndexedDB gallery, canvas rendering, MP4/PNG preparation, native Share and Save contain no media upload path. The browser's only API request helper is for closed billing/access endpoints. No analytics, third-party font, tracking pixel or photo-upload request was introduced by the shared-flow restoration.

### Commerce fails closed

The £19 and £49 cards say “coming soon”. Checkout refuses to start unless both billing and an authoritative API endpoint are deliberately enabled. A checkout-success query parameter is presentational only and cannot grant entitlement. Restore accepts only a finite, server-verified access token. The current Worker mismatch therefore cannot charge a customer today.

### Event lifecycle and transfer boundaries are honest

The 48-hour period begins only through an explicit Start Event action. Preview, edit, import and purchase do not activate it. Setup Pass carries sparse configuration in a URL fragment, excludes photos, logos, entitlement and an active clock, and imports as Draft. Guest PIN stores a salted verifier with modest throttling and is accurately described as lightweight local access—not secure server protection.

### Business consent is structurally separated

Email, marketing consent, photo-publicity consent and photo collection remain independent. Future output upload requires Business scope, a live event, enabled collection, affirmative unrevoked attendee consent, the exact consent snapshot and server-side revalidation. Next Guest clears completion, email and consent state; Retake preserves the current guest's state.

### Offline and service-worker boundaries are careful

The service worker caches a finite same-origin shell, excludes API and Authorization responses, uses network-first behaviour, and leaves IndexedDB/localStorage alone between guests. It does not cache a private output or entitlement response into shared Cache Storage.

### The design now explains the product in seconds

The first-visit entrance, live event-creation demo, personalised Sophie entrance and real output cards create the right mental model: make an event photobooth, open it at the party, let guests use it. The visual language is distinctive, white/pastel and playful without becoming cheap or generic. Phone and iPad fake-camera runs kept the capture/review controls usable without horizontal overflow; the pricing section is the isolated mobile exception in F-03.

### Internal quality benchmark

`event.js` is the pattern to propagate. It makes versioning, migration, lifecycle, PIN verification and Setup Pass encoding explicit in a pure module with focused tests and replaceable boundaries. It separates product truth from DOM and persistence mechanics. The canonical `strip.js` renderer is the equivalent output benchmark: one geometry, one rendering path, many consumers.

---

## 5. Current user journeys

| Entry / task | Current committed behaviour | Expected | Coherent? |
|---|---|---|---|
| First visit | Short accessible MyBishBash entrance, then the existing marketing site | Experience the concept without blocking the page | Yes |
| Public Start Photobooth | Camera → three stills → Review on Strip | Immediate useful free booth | Yes |
| Strip | All three photos rendered through canonical geometry; frame/filter choices where allowed | Classic strip from all three | Yes |
| Magazine | Three thumbnails shown; Share/Save disabled until one favourite is selected | One chosen hero photo becomes the cover | Yes |
| Moving Polaroid | All three captured stills animate inside one instant-print object; separate still available | Moving keepsake from the shared session | Yes; this is intentionally still-source animation, not live camera video |
| Retake | Repeats the shared three-photo capture and replaces the same gallery record | Correct the current guest's session | Yes |
| Next Guest | Clears guest-temporary data and starts a new three-photo gallery record | Fast hand-off at an event | Yes |
| Public Cancel / Home | Returns to public landing and stops camera | Leave the booth | Yes |
| Event Cancel / Event Home | Returns to personalised event entrance | Leave capture without leaving the party | Yes |
| Host setup → Open event entrance | Personalised entrance in host mode with Preview and Start Event | Inspect before activation | Yes |
| Host → Preview Photobooth | Entrance becomes guest mode; only Back to Website and Enter remain | Temporary guest preview with a route back to host controls | **No — F-04** |
| Price card | Honest “not on sale yet” message; no checkout | Closed sale should offer an honest next step | Partly — F-13 |
| Business Talk to us | Opens a pre-addressed email | Reach a human | Yes; mailbox delivery **[verify by hand]** |
| Returning host on same device | Settings and all local gallery sessions remain | Resume this event | Partly; records are not event-scoped — F-02 |
| Shared Business URL | JavaScript activates Business page and rewrites metadata | Business page and Business share card | Visual page yes; crawler metadata no — F-08 |
| Production visitor today | Receives previous experience-first build | Receive audited shared-three-photo build after an authorised release | Not yet; deployment was not requested |

---

## 6. User state map

| State | What they see | Primary action | Product expectation | Coherent? |
|---|---|---|---|---|
| First-time public visitor | MyBishBash entrance then marketing story | Press to Start / Start Photobooth | Understand and try the booth | Yes |
| Free guest | Shared three-photo capture and branded outputs | Save / Share / Next Guest | Use a genuinely useful free product | Yes |
| Draft host | Five-step setup, personalised entrance, preview, Start Event | Preview or deliberately activate | Configure before the party | Mostly; preview return is broken |
| Guest preview | Guest entrance without host controls | Enter Photobooth | Experience guest view temporarily | No explicit way back to host mode |
| Active event guest | Personalised entrance, capture, results | Save / Share / Next Guest | Fast self-service session | Yes |
| Event host using gallery | All saved device sessions | Reopen a session | Review this event's local history | Misleading: it is a device gallery |
| One Party customer | Planned £19 entitlement for one 48-hour event | Buy / restore / start event | One purchase, one event | Unreachable and not yet enforceable |
| Annual customer | Planned £49 access | Buy / restore | Multiple Personal events across a year | Unreachable; Worker still encodes £50 legacy plan |
| Business prospect | Business architecture and consent story | Talk to us | Start a sales conversation | Yes, subject to mailbox verification |
| Reduced-motion guest | Static marketing previews, but animated Review Polaroid | Save / Share | Use product without unsolicited movement | Inconsistent — F-11 |
| Screen-reader guest | Standard controls, but weak capture/review announcements and unnamed photo choices | Choose output/favourite | Complete the same live flow | Material friction — F-09/F-10 |

---

## 7. CTA audit

| CTA | Promise | Actual result | Verdict |
|---|---|---|---|
| PRESS TO START | Reveal the product | Fast first-visit reveal; not repeated during normal navigation | Accurate |
| START PHOTOBOOTH / Start free | Use the booth now | Shared three-photo capture | Strong primary action |
| BUILD MY EVENT PREVIEW | Make the product personal | Opens host setup with live renderer preview | Accurate |
| Open event entrance | See the personalised event object | Host-mode entrance with Preview / Start Event | Accurate |
| PREVIEW PHOTOBOOTH | Temporarily try the guest view | Permanently changes the current Event Home entry to guest mode | Copy/behaviour mismatch — F-04 |
| START EVENT | Begin the 48-hour clock | Two-step deliberate confirmation; remains closed without entitlement | Accurate and safely gated |
| One Party / Annual — coming soon | Express paid intent | Displays another closed-sale message | Honest but commercially inert — F-13 |
| Share | Native file share where supported | Uses `navigator.share`/`canShare`, otherwise explains limitation | Accurate |
| Save | Save current output | Local download with session-token guard | Accurate |
| Still photo | Save Polaroid final still | Local PNG | Accurate |
| Retake | Replace this guest's photographs | Same shared capture, same gallery record | Accurate |
| Next Guest | Prepare for another guest | Fresh shared capture and cleared temporary guest state | Accurate |
| Home / Event Home | Leave booth / return to event entrance | Context-aware public/event destination | Accurate |
| TALK TO US | Contact Business team | Pre-addressed `mailto:` | Accurate; delivery **[verify by hand]** |

---

## 8. Detailed findings

### F-01 — Storage recovery can erase finished sessions without saying so

**Severity:** Blocker  
**Category:** Architecture / UX  
**Affected users:** Hosts using the booth on a device that approaches browser-storage quota; infrequent, but the consequence is permanent loss of earlier guest photographs.  
**Evidence:** On an IndexedDB quota error, `saveSessionToGallery()` calls `dropOldestSessions(3)` and retries ([app.js:532](../../app.js#L532), [app.js:543](../../app.js#L543)). If the retry succeeds, `clearStorageNotice()` runs and the host is not told that three old sessions were removed. Routine `trimGallery()` also deletes records beyond the computed budget without recording or surfacing the number removed ([app.js:592](../../app.js#L592)). `warnIfStorageLow()` runs only after trimming and only if total browser usage still exceeds 85%.  
**Root cause:** Availability was prioritised over retention without an explicit product policy. Old photos became an implicit cache even though the UI calls them an Event Gallery.  
**Recommended direction:** Treat gallery sessions as user data, not cache. Warn before automatic removal where possible; after emergency quota recovery, state exactly that older sessions were removed and how many; offer export/clear controls; and add focused quota/deletion tests. If automatic retention is necessary, make the rule explicit before the event.

### F-02 — The Event Gallery is actually a device-wide gallery

**Severity:** High  
**Category:** Architecture / Privacy  
**Affected users:** Hosts who reuse one phone or iPad for more than one event, and guests from an earlier event whose photos remain on that device.  
**Evidence:** `galleryRecord()` stores session, time, orientation and experience but no `eventId` ([app.js:510](../../app.js#L510)). `renderEventGallery()` loads all sessions and renders them together ([app.js:660](../../app.js#L660)). Reset deliberately creates a new EventConfig while preserving every gallery record ([app.js:2509](../../app.js#L2509)).  
**Root cause:** Local-first persistence was added before event tenancy existed. EventConfig is now versioned, but the gallery schema was not migrated to belong to it.  
**Recommended direction:** Add `eventId` to new records, filter the host gallery by the current event, and migrate legacy records into an explicitly labelled “unassigned / earlier booth sessions” area. Provide a deliberate host-only way to inspect or delete other-event records instead of exposing them by default.

### F-03 — The phone pricing row is wider than the viewport

**Severity:** High  
**Category:** UI / Frontend  
**Affected users:** Phone visitors reaching the primary Personal pricing section; this is expected to be a large share of traffic.  
**Evidence:** The `max-width:650px` rule correctly sets `.pricing-grid{grid-template-columns:1fr}` at [styles.css:378](../../styles.css#L378), but a later unscoped `.pricing-grid{grid-template-columns:repeat(3,1fr)}` at [styles.css:459](../../styles.css#L459) wins the cascade. In the 390px responsive capture, Free and One Party are visible while Annual is clipped off-screen; the page footer begins before the missing card can be reached vertically.  
**Root cause:** A later product-pass block redefined base pricing geometry after the responsive section.  
**Recommended direction:** Move the three-column base rule before responsive rules or restate one column in the final phone media query. Add a computed `scrollWidth <= innerWidth` assertion specifically at the pricing section, not only on capture/review screens.

### F-04 — Preview Photobooth has no return to host mode

**Severity:** Medium  
**Category:** UX / Interaction  
**Affected users:** Every host who uses the intended Preview Photobooth step before starting an event.  
**Evidence:** Reproduced locally: Host setup → Open event entrance shows Edit Event, Preview Photobooth and Start Event. Pressing Preview Photobooth calls `previewEventAsGuest()`, replaces the Event Home history state with `hostView:false`, and applies guest mode ([app.js:2434](../../app.js#L2434)). Guest mode hides all `.host-only` controls ([styles.css:467](../../styles.css#L467)). The only visible exit is Back to Website; there is no “Return to host preview” or browser-history entry to restore host mode.  
**Root cause:** Guest preview reuses the live guest state instead of wrapping it in a temporary preview context with an explicit return edge.  
**Recommended direction:** Preserve the Event Home host state and provide one clear host affordance such as “Exit guest preview”. Returning should restore the same setup/event state without touching the event clock.

### F-05 — The browser and Worker disagree about what is for sale

**Severity:** High — paid-launch gate  
**Category:** Backend / Product Strategy  
**Affected users:** All future One Party and Annual customers if billing were enabled before migration. No current customer can be charged because billing is closed.  
**Evidence:** Browser product metadata advertises One Party `ONE_EVENT` at £19 and Annual at £49 ([product.js:118](../../product.js#L118), [index.html:321](../../index.html#L321)). Worker `PersonalPlan` has no `ONE_EVENT`; it still declares six months, twelve months and Founding Lifetime ([worker/src/types.ts:1](../../worker/src/types.ts#L1)). Worker policy validates those at £30, £50 and £100 ([worker/src/policy.ts:10](../../worker/src/policy.ts#L10)), and the database check constraints encode the same retired catalogue ([worker/migrations/0001_initial.sql:13](../../worker/migrations/0001_initial.sql#L13)). Browser and Worker tests pass independently because there is no cross-layer catalogue contract.  
**Root cause:** Frontend product decisions moved ahead while the intentionally closed server catalogue remained as historical infrastructure.  
**Recommended direction:** Keep billing closed. Migrate Worker types, schema, Stripe price validation, webhook lifecycle, restore responses and tests together. Add one contract test that compares the public plan identifiers and amounts against the Worker policy so contradictory green suites cannot recur.

### F-06 — One Party's “one event” boundary is descriptive, not enforced

**Severity:** High — paid-launch gate  
**Category:** Architecture / Backend  
**Affected users:** Future paying customers and the business: the customer could reuse one purchase across newly created local events, while an honest customer cannot know which event their access belongs to.  
**Evidence:** The product model explicitly records a local fail-open event-scope fallback ([product.js:270](../../product.js#L270)). Restored Personal access contains plan/token/expiry but no bound `eventId` ([app.js:2317](../../app.js#L2317)). Entitlement capabilities are applied globally in the browser, while Reset creates a fresh EventConfig identity. The Worker entitlement table has no Personal event binding ([worker/migrations/0001_initial.sql:127](../../worker/migrations/0001_initial.sql#L127)).  
**Root cause:** The event lifecycle was implemented locally before paid entitlements were migrated to understand Personal events.  
**Recommended direction:** Define the server contract before opening One Party: purchase creates or binds one event identity; restore returns that binding; the browser refuses to apply it to a different event; Setup Pass never carries entitlement. Decide how pre-purchase Draft preview becomes the bound paid event and test reset/import/restore explicitly.

### F-07 — The final public URL is not connected, and root versus subpath is not locked

**Severity:** High — release gate  
**Category:** Product Strategy / Frontend  
**Affected users:** Every person receiving or searching for the intended MyBishBash link.  
**Evidence:** During the audit, `https://mybishbash.app/photobooth/` returned 404 while the temporary Vercel origin returned the product. Canonicals, Open Graph URLs, `robots.txt` and `sitemap.xml` still name `raes-photo-booth.vercel.app` ([index.html:31](../../index.html#L31), [robots.txt:7](../../robots.txt#L7), [sitemap.xml:6](../../sitemap.xml#L6)). Product routing currently uses origin-root `/` and `/business`, which is correct for a standalone root deployment but would leave the scope of an app mounted at `/photobooth`. Legal/footer links are also absolute-root.  
**Root cause:** The source documents a planned PB-15 cutover, but the deployment shape—standalone host versus subpath mount—has not been made authoritative.  
**Recommended direction:** First decide the canonical topology. Prefer a standalone photobooth host/root if possible; if `/photobooth` is required, derive routes, manifest scope, service-worker scope and legal links from an app base. Connect the domain, then update all canonical/OG/robots/sitemap values and verify direct, refresh, offline and installed-PWA navigation.

### F-08 — Business shares and indexes as Personal unless JavaScript runs

**Severity:** Medium  
**Category:** Frontend / Discoverability  
**Affected users:** Business prospects arriving from link previews or search crawlers that do not execute the route script.  
**Evidence:** Vercel rewrites `/` and `/business` to the same `index.html` ([vercel.json:2](../../vercel.json#L2)). The static head contains Personal title, description, canonical and OG/Twitter metadata. JavaScript correctly rewrites them when a browser activates Business ([app.js:171](../../app.js#L171)), but the raw `/business` response is the Personal document. The sitemap nevertheless advertises `/business` as a distinct URL.  
**Root cause:** Client routing is being asked to provide server-visible identity.  
**Recommended direction:** Serve a route-specific static Business head (separate shell, generated file or edge/server rewrite) while continuing to share the same application assets. Add a raw-response metadata test for both routes.

### F-09 — Capture and Review changes are silent to assistive technology

**Severity:** Medium  
**Category:** UX / Accessibility  
**Affected users:** Screen-reader and keyboard users attempting the core capture-to-result journey.  
**Evidence:** `showScreen()` toggles active classes/body state but does not move focus to the new screen or announce a route change ([app.js:719](../../app.js#L719)). The changing photo count/countdown lack live-region semantics ([index.html:538](../../index.html#L538)). Review's result canvas/video has no accessible output label ([index.html:552](../../index.html#L552)). Focus can therefore remain on a control inside a screen that has just become inactive.  
**Root cause:** The screens are visual state-machine surfaces without a corresponding focus/announcement contract.  
**Recommended direction:** On each major transition, focus a stable heading/status appropriate to that surface; make countdown/shot status intentionally live without over-announcing; give the result region an accessible name; and test with VoiceOver on the actual event device.

### F-10 — Output and favourite selection are communicated only by appearance

**Severity:** Medium  
**Category:** Accessibility / Interaction  
**Affected users:** Screen-reader users choosing Magazine favourites or switching output; also touch users on mounted devices because some controls are smaller than the recommended 44px target.  
**Evidence:** Favourite buttons are created from an unlabelled image with no `aria-label` or pressed state ([app.js:1594](../../app.js#L1594)). Mode buttons have no tab/pressed/current semantics ([index.html:560](../../index.html#L560)); `setMode()` only toggles `.active` ([app.js:1309](../../app.js#L1309)). `.mode-tab` and `.choice` have small padding/type and no minimum height ([styles.css:315](../../styles.css#L315)).  
**Root cause:** A visual class is doing the work of both selection state and control semantics.  
**Recommended direction:** Label favourites as “Choose photo 1 of 3”, expose `aria-pressed` or proper radio/tab semantics, keep selected state synchronised, and set event-facing controls to at least a comfortable 44×44px target.

### F-11 — Reduced motion stops the advert but not the guest result

**Severity:** Medium  
**Category:** Accessibility / Frontend  
**Affected users:** Guests whose operating system requests reduced motion.  
**Evidence:** Marketing Polaroids freeze when `prefers-reduced-motion: reduce` is active ([marketing.js:230](../../marketing.js#L230)), and CSS disables decorative motion. Live Review nevertheless begins an animation-frame Polaroid loop and later swaps to an autoplaying looping video ([app.js:1847](../../app.js#L1847), [app.js:1920](../../app.js#L1920)). The reduced-motion CSS does not stop either ([styles.css:385](../../styles.css#L385)).  
**Root cause:** Preference handling exists in the marketing renderer but is not part of the live output state.  
**Recommended direction:** Default live Review to the held final still for reduced-motion users and offer an explicit “Play motion” control. Keep moving Save/Share available; the preference should change playback, not remove the product they created.

### F-12 — A valid host colour choice can make guest controls fail contrast

**Severity:** Medium  
**Category:** UI / Accessibility  
**Affected users:** Guests at events whose host chooses a darker accent, including the supplied Cobalt preset.  
**Evidence:** Setup allows unrestricted colour input and offers Cobalt `#2357ff` ([index.html:660](../../index.html#L660)). The selected accent becomes `--accent`, while Next Guest uses small black text directly over that colour ([styles.css:335](../../styles.css#L335)). `#111111` on `#2357ff` is approximately 3.49:1, below WCAG AA for this small text.  
**Root cause:** Host branding is applied directly without deriving a safe foreground or constraining the palette by the UI role.  
**Recommended direction:** Derive black/white foreground from measured contrast and validate every host accent against the actual control roles. Keep the host's colour for borders/decorative areas if neither foreground produces the intended treatment.

### F-13 — Interested Personal buyers have nowhere honest to go

**Severity:** Medium  
**Category:** Product Strategy  
**Affected users:** Every visitor who presses One Party or Annual while sales are closed—the highest-intent Personal segment.  
**Evidence:** The cards honestly say “coming soon” ([index.html:310](../../index.html#L310)). `startCheckout()` repeats that Personal plans are not on sale and returns ([app.js:2259](../../app.js#L2259)). Business has a real email route; Personal has no waitlist, launch-notification or enquiry action.  
**Root cause:** The fail-closed commerce boundary was finished, but the pre-launch conversion state was left as a terminal status message.  
**Recommended direction:** Keep checkout closed. Add one modest, consented way to express interest only if there is a real destination and privacy basis—otherwise use the existing contact email with a clear Personal-launch subject. Do not add fake purchase state or imply a launch date.

### F-14 — Legal copy is honest, but not yet complete enough for sale

**Severity:** Medium  
**Category:** Copy / Product Strategy  
**Affected users:** Future paying customers and anyone evaluating who operates the service.  
**Evidence:** The current legal pages accurately explain local capture, sharing, PIN limits, closed payment and Business not being live. However, the operator is identified only by brand, email and “3A Beryl Court”, without a complete trader/controller identity, full postal address/company status or regulator complaint information ([privacy.html:60](../../privacy.html#L60), [terms.html:54](../../terms.html#L54)). Privacy also says “Nothing on the site asks for” an email ([privacy.html:48](../../privacy.html#L48)), while the public Business demonstration visibly includes an email field ([index.html:446](../../index.html#L446)). It is a non-submitting preview, so no email is collected, but the sentence is literally false. Hosting-level technical logs/retention are not described.  
**Root cause:** The pages correctly describe the product boundary but are still pre-sale drafts and do not fully describe the legal operator or infrastructure layer.  
**Recommended direction:** Before checkout or Business processing opens, obtain UK pre-sale/privacy review, state the full operator/controller details, confirm hosting/log retention, add complaint/escalation information as applicable, and rewrite the email sentence to distinguish Free/Personal collection from the non-functional Business preview.

### F-15 — The highest-risk state machine has no committed browser E2E suite

**Severity:** Medium  
**Category:** Architecture  
**Affected users:** Indirectly, all guests and hosts when future changes touch capture/history/gallery/export state.  
**Evidence:** `app.js` is 2,637 lines and owns routing, browser history, camera lifecycle, gallery, host setup, guest modes, exports, commerce hooks and much of renderer orchestration. The 90 root tests are valuable, but many integration contracts inspect source/DOM structure. The complete fake-camera phone/iPad journey used for this release exists as an external QA harness, not a versioned repository test. This audit found a real phone cascade regression and host-preview state defect despite all suites being green.  
**Root cause:** Pure product modules were extracted, but the browser orchestrator and its state transitions remain centralised and are verified mainly by contract tests plus ad-hoc release QA.  
**Recommended direction:** Commit a small deterministic browser suite for the critical state graph: public Cancel, shared capture, Magazine favourite, Polaroid, Retake replacement, Next Guest isolation, Event Home, host preview return, responsive overflow and no media POST/PUT. Extract further code only where it creates testable state boundaries; do not rewrite working renderers.

### F-16 — JavaScript-off failure is silent

**Severity:** Low  
**Category:** Frontend / Copy  
**Affected users:** Visitors with JavaScript blocked or broken; the camera product cannot operate for them, but the current page gives no explanation.  
**Evidence:** Personal marketing HTML remains visible without JavaScript, but Start buttons are inert, renderer canvases have no static fallback and there is no `<noscript>` message. Direct `/business` initially contains the Personal shell and depends on JavaScript to activate Business. The live `/favicon.ico` also returned 404 during the release check.  
**Root cause:** JavaScript is a legitimate product requirement but was treated as assumed rather than communicated.  
**Recommended direction:** Add a concise `<noscript>` message explaining that the browser camera booth needs JavaScript, keep legal/contact links available, and add an explicit favicon. A full no-JavaScript product is neither necessary nor appropriate.

---

## 9. Usability and interaction findings

The live guest loop is now unusually clear. A guest makes one decision—start—then takes three photographs and makes output choices at Review. Magazine's favourite gate is understandable and prevents exporting the wrong photo. Next Guest and Retake no longer compete semantically.

The main usability break is in the host journey: Preview Photobooth behaves like a permanent role switch rather than a preview. This is particularly risky immediately before an event, when a host expects to preview and then press Start Event without reconstructing context.

Storage messaging also uses the wrong mental model. “Event Gallery” implies durable event history, while the implementation is a device-wide, best-effort store that can trim itself. Either the persistence contract must become stronger or the interface must name its actual limits; the recommended direction is to strengthen it because host confidence at a real event matters more than opportunistic capacity recovery.

---

## 10. Visual design findings

The landing page should be preserved. It has a clear personality, visible product evidence and a strong event-specific story. The typography is confident without returning to the earlier fashion-editorial direction. Colour is mostly supporting energy on a white canvas. The renderer collage, personalised entrance and output cards do more explanatory work than a feature list.

The phone pricing overflow is the only major visual regression found. It is not a design-direction problem; it is a cascade-order defect. Fixing it should not trigger a redesign.

The host-configurable accent system needs a foreground contrast layer, but the palette itself is not the issue. Continue allowing personality while ensuring text/control roles select a safe foreground.

---

## 11. Information architecture and vocabulary

The product vocabulary is substantially improved:

- **Your event photobooth** names the package.
- **Event Home** names the personalised entrance.
- **Home** names leaving the booth for the public site.
- **Next Guest** names a fresh guest session.
- **Retake** names replacement of the current guest's photographs.
- **Strip / Magazine / Polaroid** name outputs chosen after one shared capture.
- **Guest PIN** correctly avoids a security claim.
- **Setup Pass** correctly avoids implying a durable cloud event link.

Two labels currently over-promise their mechanics:

- **Event Gallery** is device-wide and may self-trim.
- **Preview Photobooth** does not provide a route to exit the preview back to host mode.

Those should be fixed in behaviour rather than weakened in copy.

The latest owner decision intentionally supersedes “experience-first capture” and “real camera-motion Polaroid” as the primary live flow. The current Moving Polaroid animates the three captured still sources and the copy/docs say so. The dormant real-motion foundation is future capability, not a current customer promise and not an audit defect.

---

## 12. Accessibility

Strengths: a real skip link and focus-visible treatment exist; the first-visit entrance manages inert/focus and supports keyboard activation; reduced motion works on the entrance and marketing examples; forms generally use native inputs; camera errors use a labelled dialog; Guest PIN status is live; primary guest actions are large.

Priority gaps:

1. Add focus and announcement semantics to screen transitions and capture status (F-09).
2. Name Magazine photos and expose selected/current state for output and favourite choices (F-10).
3. Honour reduced motion in live Polaroid playback, not just marketing (F-11).
4. Derive safe foreground contrast for host-selected accents (F-12).
5. Mark the current setup step and move focus/announce panel changes. This is lower severity because the five setup buttons remain keyboard-operable, but state is currently visual only.

**[verify by hand]** Complete one VoiceOver pass on iPhone and iPad: entrance, host setup, Start, all three captures, output switching, Magazine favourite, Save/Share, Retake, Next Guest and Event Home.

---

## 13. Mobile and tablet

The fake-camera release pass completed at phone portrait (390×844), iPad portrait (820×1180) and iPad landscape (1180×820). Capture reached Review with three photos; Strip, Magazine favourite and Moving Polaroid rendered; Retake replaced the gallery record; Next Guest created a fresh record; and no Free/Personal media request used POST/PUT. Camera and Review controls fit without horizontal overflow in those flows.

The marketing pricing section is the exception: the late three-column rule clips Annual on a phone (F-03).

**[verify by hand]** Browser emulation cannot prove:

- iPhone/iPad Safari permission prompts and denial recovery;
- native Share/AirDrop and downloaded-file behaviour;
- mounted-stand portrait and landscape reachability with browser chrome;
- installed-PWA scope/history at the final domain;
- memory/storage behaviour over a long live event;
- backgrounding/locking during capture or export.

---

## 14. Discoverability and shareability

The Personal static head is strong: descriptive title, description, canonical, OG/Twitter fields and a product-specific 1200×630 image. `robots.txt`, `sitemap.xml`, manifest, branded 404 and legal routes exist. Unknown routes return a genuine 404 rather than a misleading app 200. Business JavaScript correctly changes title/description/canonical/OG inside a full browser.

The unresolved issues are structural:

- Business raw HTML is still Personal, so crawler/share identity is wrong (F-08).
- The final MyBishBash URL is not connected and all public metadata still names the temporary Vercel origin (F-07).
- Production has not yet received the shared-three-photo commit (release state, not a commit defect).
- Favicon is missing and legal pages do not have their own OG/Twitter cards; these are low-priority polish after the domain is final.

No structured data is currently present. Add it only after the legal operator identity and canonical domain are settled; otherwise it will encode information that immediately needs migration.

---

## 15. Compliance and data posture

The current data posture is materially better than most event-camera products:

- no analytics, cookies or tracking;
- no Free/Personal photo upload;
- no audio permission or recording;
- native sharing is clearly separated from booth storage;
- Setup Pass and Guest PIN limits are plainly stated;
- checkout and Business processing are explicitly not live;
- Business consent choices are separate and default off;
- the server collection path is double-gated by event configuration and attendee consent.

The main current privacy concern is local, not cloud: device-wide gallery exposure and silent retention deletion (F-01/F-02). “Local-first” is not sufficient by itself if unrelated events share the same local bucket.

Before sale, complete the operator/controller and hosting-log disclosures in F-14. The public Business email field is currently only an interactive preview and does not submit; revise the absolute privacy sentence rather than adding collection.

The production response had HSTS but no explicit CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options or framing policy during the audit check. A deliberate security-header baseline is advisable before a public camera deployment, especially `microphone=()`, an intentional camera policy and clickjacking protection. Device-test any CSP against canvas blobs, native share, the service worker and offline mode before enabling it.

---

## 16. Technical findings

The extracted modules are in good shape: `product.js`, `event.js`, `strip.js`, `covers.js`, `polaroid.js`, `motion.js` and `mp4.js` each own a coherent boundary. The service worker is finite and conservative. Gallery bytes are stored in IndexedDB rather than bloating localStorage. Capture, render and export work are protected by a monotonic session token. Stale media streams are stopped by identity rather than by a global stop that could kill a newer session.

The remaining structural risk is orchestration concentration in `app.js` (F-15). It is not a call for a rewrite. The next extraction should follow bugs: event-scoped gallery storage and host/guest preview state should become explicit tested boundaries, while stable camera/renderer code stays intact.

The Worker is well-defended within its old product model—Stripe signature validation, idempotency, live/test-mode checks, exact price validation, consent-gated Business uploads and database constraints are strengths. Its problem is catalogue age, not careless implementation.

Raw shell size is reasonable for a no-bundler, local-first media app: approximately 771 KB across primary shell/demo assets, with the demo photograph the largest item. No current performance blocker was observed. The local page produced no console warnings/errors in the inspected marketing journey.

---

## 17. Product strategy

The proposition now passes the internal differentiation test without naming a competitor: the page demonstrates an entrance, live camera flow and guest hand-off, not merely decorative templates. One Party is legible as an event photobooth package rather than a design purchase.

Free remains genuinely usable and visibly branded. One Party and Annual have a meaningful distinction. The 48-hour clock begins through a deliberate host action. Those are strong product decisions.

The commercial programme should remain sequenced:

1. Make event-local storage safe and fix the small release UI/state defects.
2. Align Worker catalogue and bind One Party to one EventConfig identity.
3. Complete legal/operator details and final domain topology.
4. Only then enable checkout and deploy the server path.

Until billing opens, a lightweight interest bridge would prevent high-intent Personal visitors from disappearing, but it must be real and consented. A fake waitlist or fake launch date would be worse than the current honest closed state.

---

## 18. Scores

Scores reflect the evidence gathered in this audit, not launch optimism.

| Dimension | Score | Evidence basis |
|---|---:|---|
| Product proposition | **9/10** | Personalised live event booth is visually and verbally clear |
| Core guest loop | **8.5/10** | Shared three-shot flow, three outputs, Retake/Next Guest and exports all passed |
| Visual identity | **9/10** | Distinctive white/pastel system and real renderer evidence; no redesign regression |
| Host journey | **7/10** | Strong setup/lifecycle, but guest preview has no host return |
| Mobile/tablet layout | **7/10** | Capture/Review pass; phone pricing overflow is a central acquisition defect |
| Accessibility | **5.5/10** | Good entrance/focus fundamentals; core Review state and live motion need work |
| Privacy design | **7/10** | Genuine no-upload design and strong consent boundary; gallery is not event-scoped |
| Data safety | **5/10** | IndexedDB persistence works, but automatic silent deletion is unacceptable |
| Commercial readiness | **4/10** | Offer is clear and closed honestly; Worker catalogue/event binding not ready |
| Discoverability/shareability | **6/10** | Strong Personal metadata/OG/404; Business and final domain unresolved |
| Reliability architecture | **7.5/10** | Strong cancellation/session/history guards; orchestrator remains concentrated |
| Test confidence | **7.5/10** | 104 automated tests plus fake-camera QA; browser E2E not committed; Safari pending |

The defining gap is **product craft 9/10 versus paid-release safety 4–5/10**. Further visual redesign would not close it.

---

## 19. Work by horizon

### Quick wins

- Restore phone pricing to one column after the final cascade rule (F-03).
- Add Exit guest preview / Return to host controls (F-04).
- Add Review/favourite labels, selected state, touch size and transition focus (F-09/F-10).
- Honour reduced motion in live Polaroid playback (F-11).
- Derive contrast-safe foregrounds for host accents (F-12).
- Correct the privacy email sentence and add a no-JavaScript notice/favicon (F-14/F-16).

### Medium-term

- Event-scope gallery records and migrate legacy sessions (F-02).
- Make any retention deletion explicit, measured and tested (F-01).
- Commit the fake-camera state-machine/browser suite (F-15).
- Serve route-specific Business metadata (F-08).
- Add a real Personal interest path while checkout is closed (F-13).
- Add and device-test a security-header baseline.

### Major architectural / release

- Migrate Worker/Stripe/database catalogue to One Party £19 and Annual £49 (F-05).
- Bind One Party entitlement to one event identity (F-06).
- Decide root versus `/photobooth`, connect final domain and migrate all scopes/metadata (F-07).
- Complete operator/legal/hosting disclosures and specialist pre-sale review (F-14).
- Push, deploy and verify `a7352f0` only after the owner authorises that release.

---

## 20. Decisions required

1. **Gallery ownership:** Is the gallery a history for the current event, or a host-managed library across events? Recommended: current-event by default, with an explicit host archive for older/unassigned sessions.
2. **Retention policy:** May the booth ever delete earlier guest sessions to save a new one? If yes, what warning and minimum retention promise is acceptable? Recommended: never silently; surface emergency deletion immediately.
3. **Canonical deployment:** standalone photobooth origin/root, or `mybishbash.app/photobooth` subpath? Recommended: standalone root if brand/domain strategy permits, because camera/PWA/history paths are simpler and already implemented that way.
4. **One Party binding:** Does payment bind the current Draft EventConfig, or create a new server Event that imports it? This must be decided before Worker migration.
5. **Pre-launch Personal demand:** use a real contact/waitlist route, or deliberately show no capture? Do not build collection without an owner and privacy basis.
6. **Business timing:** Is Business only a prospect page for now? If so, keep its interactive email/consent panel clearly labelled as a demonstration and the Worker undeployed.
7. **Release timing:** `a7352f0` is committed locally but not pushed or deployed. Decide after accepting/rejecting this audit's release findings.

---

## 21. Candidates investigated and rejected

- **“The shared three-photo flow lost the Strip/Magazine/Polaroid distinction.”** Rejected. The capture is shared, but each output uses the sources differently and Magazine explicitly requires a favourite.
- **“Moving Polaroid falsely claims live video capture.”** Rejected. Current customer/legal copy describes local animation from the three captured stills. The real-motion module is dormant future capability.
- **“Free/Personal photos upload to a backend.”** Rejected. No media network path exists in the browser flow; capture/gallery/render/export are local.
- **“Business email preview currently collects data.”** Rejected. The field is not submitted; the problem is the absolute privacy sentence, not active collection.
- **“Pricing is falsely purchasable.”** Rejected. Buttons and notice say coming soon, checkout is fail-closed, and URL return state cannot grant access.
- **“The repeated hero in a very tall screenshot is duplicate DOM.”** Rejected. It was a full-page raster stitching artefact beyond common tile bounds; unique DOM IDs and source contain one landing page.
- **“Marketing Polaroid ignores reduced motion.”** Rejected. Marketing freezes correctly; the gap is specifically the live Review result.
- **“The service worker can leak one guest's output to another.”** Rejected. It caches only the finite shell and excludes API/Authorization/private output data.
- **“Direct Business route has wrong metadata in a full browser.”** Rejected as stated. JavaScript rewrites it correctly; the real defect is the raw response seen by crawlers/share bots.

---

## 22. Manual verification still required

- Real HTTPS iPhone Safari and iPad Safari, portrait and landscape.
- Camera permission allow/deny/retry and device already-in-use states.
- Native Share, AirDrop, WhatsApp/Message/email hand-off and Save filenames.
- Installed-PWA launch, Back/Home/Event Home and offline shell on the final domain.
- VoiceOver through host setup and the complete three-photo guest flow.
- Reduced-motion Review after the proposed fix.
- Long-running event storage pressure, quota recovery and explicit retention messaging.
- Business enquiry mailbox receipt/reply.
- Final-domain direct `/business`, legal pages, 404, robots, sitemap, OG cards and service-worker headers.
- Production smoke of the immutable deployment and alias after an authorised deploy.

---

## 23. Immediate recommendation

Make the next implementation packet **Event-safe storage**: attach every new gallery session to its EventConfig, filter/migrate the gallery by event, and replace silent quota deletion with an explicit, tested retention path. It is the only current finding that combines guest privacy with irreversible photo loss, and it should be closed before smaller release polish or any paid-launch work.
