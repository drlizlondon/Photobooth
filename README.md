# Rae's Photo Booth — Live Build

## Guest flow
Start → 3 photos → Strip → optionally try frame/filter → Magazine → pick one of the 3 photos → choose one of four cover styles → Polaroid → Share / Save → Next guest.

Every new guest resets to:
- Strip
- White frame
- Original filter
- no magazine photo selected
- no Living Polaroid built

## Strip
Frames:
- White
- Black
- Editorial
- Film

Filters:
- Original
- B&W
- Vintage
- Warm
- Glow

Frame and filter are separate systems. **Both apply to the strip only** — filters are not carried over to magazine covers, which have their own finish (below).

Filters are applied as a pixel pass, not with `ctx.filter` — see **Grading**. On an older booth iPad the `ctx.filter` version silently did nothing at all.

## Magazine
Four cover styles, each laid out separately for portrait and landscape sessions:
- **Keepsake** (default) — the party cover: framed, didone masthead over condensed stacked lines, left rail of event detail, script + condensed hero line, hearts and an icon strip. Each guest gets their own **numbered edition** ("EDITION 14 OF 63") counted from the booth's local gallery; set the expected headcount in Admin.
- **Editorial** — full-bleed high-fashion cover: oversized didone masthead, three feature columns, huge cover line bottom-right.
- **Noir** — deep monochrome, centred masthead and cover line, heavy contrast.
- **Press** — solid sidebar carrying the masthead, accent issue chip, name and standfirst on the photo.

Magazine always asks the guest to pick Photo 1 / 2 / 3 before showing the finished cover, then shows a live thumbnail of that photo in each of the four styles.

**Editorial finish.** Every magazine cover — all four styles — puts a luxury print pass on the photograph: +2% exposure, +6% contrast, −4% saturation, then ultra-fine print grain. No fake lighting, no glow, no beauty work. It runs on the photo rectangle only, so type, scrims and the barcode are never graded, and it runs before the scrims are measured so they still adapt to the finished picture. The grain is baked once into a repeating tile, so a preview and the saved file are identical.

The finish is automatic and is the **only** grade a cover photo gets beyond its template's own. The guest's filter choice is deliberately switched off for magazine — a cover has one house look, so every cover from the booth matches whatever the guest was playing with on their strip. Strips keep all five filters and are unaffected by the finish.

Cover copy lives in one set of slots shared by all four styles (`covers.js`). Every slot is editable in Admin; **leaving a slot blank generates it from the event title** — masthead, age in words, issue lines, script line and barcode all follow "Rae's 26th Birthday" / "Sam's 30th" / "Aisha & Tom's Wedding" without any admin work.

Legibility is measured, not assumed: the renderer samples the photo behind each block of type and deepens the scrim where the photo is bright, so white type never washes out on a pale wall.

## Grading
Every colour adjustment in the booth — the five strip filters, each cover
template's grade, the editorial finish — is a **pixel pass**. Nothing uses
`ctx.filter`.

That is not a preference. `CanvasRenderingContext2D.filter` only shipped in
Safari 17 and fails *silently* before it: on an older iPad the filter buttons
did nothing, Noir was not monochrome, and no cover got its template grade —
while the pixel-based editorial finish carried on working, which is exactly
why the magazine looked right and the filters looked broken.

`Covers.applyGrade(ctx, x, y, w, h, spec)` reads the same CSS-filter syntax the
code already used, so the recipes did not change. brightness, contrast,
saturate, grayscale and sepia are each affine in sRGB, so each compiles to a
3x3 matrix and an offset. They are applied **in sequence, not multiplied into
one matrix**, because CSS clamps between filter functions — `brightness(1.07)`
hits white before the next function sees it. Collapsing the chain drifts by up
to 13/255 in blown highlights, which is where Warm and Glow live. Sequenced,
every recipe lands within 2/255 of what `ctx.filter` produces on a browser
that has it.

`grayscale(g)` is exactly `saturate(1-g)`, so one matrix serves both.

## Typography
Five roles, set in Admin, driving every keepsake:

| Role | Drives |
|---|---|
| Headlines | Cover mastheads and the strip's title |
| Small caps | Cover detail lines, dates, footers |
| Condensed | Stacked cover lines and cover lines |
| Script | The strip signature and cover script |
| Handwriting | The Living Polaroid's felt tip |

`fonts.js` is the only place a typeface is written down. Before it, covers.js,
app.js and polaroid.js each carried their own stacks and changing a face meant
editing three files and hoping.

**Only faces that ship with iOS and macOS are offered.** The booth runs from a
service-worker cache on an iPad with no guarantee of signal, so a web font is
not a font — it is a request that might not arrive.

**Specimens are drawn on canvas, using your own event wording.** Canvas
resolves a font stack differently from the DOM and lays type out differently,
so an HTML preview would be a promise the covers might not keep; and a face
that carries "RAE" beautifully can fall apart on "Aisha & Tom's Wedding".
Hearts are stripped from the handwriting specimen because the print draws them
as paths — showing the font's own glyph would be the one thing on that page
that is not what a guest gets.

**Faces missing from the device are detected and marked**, rather than
silently falling back to something that looks nothing like the specimen. The
laptop the settings were tuned on and the booth iPad are not the same machine,
so check the specimens on the iPad before the night.

## Living Polaroid
A third keepsake next to Strip and Magazine: one instant-film print whose
photograph loops, exported as a genuine H.264 MP4.

**The print.** Real Polaroid 600 geometry — a nearly square image area with
equal borders on the sides and top. Warm white paper with a gradient and fine
grain, small corner radius, soft drop shadow. Because the photo window is
near-square, a wide group shot is cropped in from the sides; that is the
format, and it is why the Polaroid supplements the strip rather than replacing
it.

One deliberate departure from the film: **the bottom border is deepened** from
the true 0.289 of print width to 0.40. On real film that space is empty and
reads as a margin; here it is carrying four lines of handwriting, and at the
true depth the writing fills it wall to wall and stops looking written on. The
photo, the sides and the top stay exactly to the film. Type is sized off the
print's *width* for the same reason — pinning it to the height would make the
writing grow every time the border deepens.

**The handwriting.** Four lines under the photograph, in whichever face is set
for the Handwriting role (default `Marker Felt`). A felt tip laid on paper does
two things a font does not: it puts down a stroke much heavier than any digital
handwriting face draws, and the ink creeps into the paper fibres around it. So
each line is drawn three times — a wide, very faint bleed, then the widened
outline, then the fill. Without the bleed the letters look stamped; without the
widening they look like a font pretending.

Hearts are drawn as paths, not typed: no handwriting face carries ♡, so the
glyph falls back to a symbol font at half the weight of the letters beside it.
They are stroked at the marker's own **stem** width rather than the outline
width used to fatten the glyphs — a felt tip cannot draw a hairline next to
letters that heavy, and a delicate heart beside them is the giveaway.

Each line gets a tiny tilt and offset derived from a hash of its own text —
deterministic, so the animated preview and the exported file agree, and so
consecutive video frames do not shimmer.

**The animation.** Only the photograph changes. Frame, paper, shadow and
handwriting are rendered once into a chrome layer with the window punched out,
so they cannot drift; each video frame is the photo plates composited under
that one layer. Four seconds at 25fps:

`P1 0.6s │ fade 0.2s │ P2 1.2s │ fade │ P3 1.2s │ fade │ P1 0.6s`

The clip **starts and ends halfway through Photo 1's hold**. iOS does not loop
`<video>` gaplessly — there is a hitch at the seam whatever the pixels do — so
the seam is placed between two identical *still* frames, where a dropped
millisecond is invisible. Seaming mid-transition, the obvious way to write
this, would put the hitch exactly where the eye is tracking movement.
Measured: the difference across the seam is 0.95, against 0.83 for two
adjacent frames sitting still and 26.6 for a genuine photo change.

Admin can switch the crossfade for a hard cut; the holds lengthen to 1.4s so
the clip stays 4.2 seconds either way.

**Exports.** Share sends the MP4 (H.264 Baseline, 1080 wide, `autoplay muted
playsinline loop` in the preview); Save writes the still PNG at 1400 wide.
Where no encoder exists, Share falls back to the PNG and the panel says so.

**The photograph** gets the booth's editorial finish and nothing else — the
same `editorialFinish` the covers use, imported rather than reimplemented, so
one house grade covers every keepsake. No beautifying, no relighting, no glow,
no bloom. The finish runs once per photo rather than once per frame: it is a
pass on the photograph, not on the film.

**Not yet built — the motion capture.** The far better version of this records
the ~0.9s *before* each shutter, so each panel holds real movement (people
settling, a laugh) and resolves into the still that appears on the strip and
the cover. That wants a hard cut, not a crossfade — dissolves over moving
footage look dated. It also means recording during the countdown, which
touches the capture path, so it is deliberately deferred.

## Admin
Live previews (using the real cover renderer with a stand-in photo):
- Strip
- Keepsake
- Editorial
- Noir
- Press
- Polaroid (instant film has one shape, so this one ignores the orientation tabs)
- Landscape
- Portrait

**Every word a guest can see is editable.** Five groups of fields:
- *Magazine Cover* / *Keepsake Cover* — all copy printed on the covers, including the badge's own "edition" / "of" wording.
- *Strip* — the strip's header, signature and date lines.
- *Typography* — the five font roles, each a grid of canvas-drawn specimens in your own event wording, with anything missing from the device marked.
- *Living Polaroid* — the four handwritten lines, crossfade or hard cut, and the three status lines the panel shows while rendering, when ready, and when video is unavailable.
- *Screen Text* — welcome eyebrow, start button and hint, cancel, shot counter (`{n}` / `{total}`), camera prompts (comma-separated, one per shot), the Strip/Magazine/Polaroid tabs, every control label, Share / Save / Next guest / Retake, and the end-screen wording.

The contract is the same everywhere: **leave a field blank and you get the default**, which the field shows in grey as its placeholder. Defaults are written to be good enough to run the night untouched; the fields are there for when something needs amending.

## Behaviour
- No backend.
- No photo upload.
- Full-frame camera preview.
- No centre composition box.
- Session orientation is locked for all three shots.
- Cancel immediately stops the session and returns home.
- Next Guest goes directly to a fresh camera session.
- Soft confetti after the three-shot capture.
- Two-minute review timeout.
- Share uses the iOS Share sheet where supported.
- Save exports a high-resolution PNG.
- The Living Polaroid also exports a looping H.264 MP4, encoded on the device.

## New Vercel project
This is a plain static site.

1. Unzip this folder.
2. Create a new Vercel project.
3. Deploy the folder containing `index.html`.
4. Framework preset: Other / static.
5. No build command.
6. No output directory.

Use HTTPS so Safari can access the camera.


## A + B session behaviour
A. Current session
- After taking three photos, the guest can move between Strip and Magazine repeatedly.
- They can save/share multiple outputs from the same three photos.
- Magazine remembers the chosen photo until the guest explicitly changes it.
- No retake is required to create another version.

B. Local Event Gallery
- Every completed three-photo session is stored locally in IndexedDB on the iPad.
- Admin → Event Gallery shows the most recent 20 sessions.
- Tap any session to reopen its three photos and make another Strip or Magazine later.
- Nothing is uploaded to a backend.
- Clear Event Gallery removes the locally stored sessions from the device.


## Premium Magazine release
- Strip, capture, gallery, sharing and guest flow are unchanged.
- Magazine is now based on one premium editorial architecture.
- Premium Cover and Birthday Edition share the same high-fashion structure.
- The original guest photograph is never tinted, washed, graded or darkened.
- Magazine only applies a modest full-bleed crop.
- All design is transparent typography, rules, barcode and graphic layers over the original photograph.
- All host wording remains editable.
- Text auto-fits its semantic zone.


## Latest build — editorial cover engine
- Cover rendering moved to `covers.js`: four templates over one copy model.
- Portrait covers are 1200 × 1560, landscape 1560 × 1200 (magazine trim, not the old 4:3 / 3:4).
- Layout is measured from the canvas — masthead, columns and cover line re-flow rather than collide when copy is long.
- Photos now get a per-template grade, adaptive scrims, vignette and print grain.
- Every cover photo then gets the **editorial finish** on top of its template grade (see Magazine).
- Cover copy auto-generates from the event title; old Birthday/Fashion copy is migrated on load where it was customised.
- Strips, capture, gallery, sharing and guest flow are unchanged.

## Video encoding
`mp4.js` is a self-contained H.264 MP4 writer — one video track, constant
frame duration, every sample in one chunk. That is enough for a four-second
keepsake and small enough to hand-write, which beats vendoring a minified
muxer into a repo that has no build step and no `node_modules`.

Two encoders, probed in order:
1. **WebCodecs** (`VideoEncoder`, Safari 17+). Deterministic — frame N gets
   exactly the timestamp we ask for, so the loop lands on the authored frame.
   Baseline profile is preferred, and not only for decoder reach: baseline has
   no B-frames, so encoder output order matches input order and a loop cannot
   come back re-ordered.
2. **MediaRecorder** with an MP4 mime type (Safari only; Chrome emits WebM).
   Real time, variable frame rate, so the seam is approximate — which is
   exactly why the timeline seams on a still frame rather than a transition.

Neither available means no video, and Share falls back to the PNG.

Two things that are load-bearing and easy to undo by accident:
- The frame loop yields with **`MessageChannel`, never `setTimeout(0)`**.
  `setTimeout` is floored at ~4ms and throttled to whole seconds whenever the
  page is not foreground; that alone took one encode from 1.5s to 13.3s.
- Every frame checks `shouldAbort`. A guest flicking between tabs would
  otherwise leave a stack of encoders all running to completion on one iPad.

Measured on this build: 105 frames at 1080 × 1408 encode in ~1.4s to a ~640KB
MP4, with the animated preview running throughout.

## Service worker
Cache `v7` is the one-time bridge away from every shipped cache-first worker.
When it finds one of those legacy booth caches it deletes only this app's old
caches, takes control, and reloads the open booth page once. Settings and the
saved gallery survive; photos in the middle of an unfinished session do not, so
deploy this migration between booth sessions.

`sw.js` is **network first, cache as offline fallback**. Its network requests
explicitly bypass the browser HTTP cache, successful responses are fully written
before the worker can be suspended, and `index.html` is used only for an offline
page navigation — never as a fake response for a missing script or stylesheet.

`app.js` registers with `updateViaCache: "none"` and checks again when the PWA
comes online or returns to the foreground. After the v7 migration, a future
worker update reloads immediately on the welcome screen or waits until the next
between-guests boundary if a session is active.

When the app shell or its asset list changes, update `ASSETS` and bump `CACHE` in
`sw.js`. Before the event, open the installed booth once with a signal and let
the migration reload finish; it will then keep the current build available
offline.
