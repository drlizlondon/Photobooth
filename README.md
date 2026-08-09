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
- **Noir** — deep tonal drama, centred masthead and cover line. It retains the photograph's original hues.
- **Press** — solid sidebar carrying the masthead, accent issue chip, name and standfirst on the photo.

Magazine always asks the guest to pick Photo 1 / 2 / 3 before showing the finished cover, then shows a live thumbnail of that photo in each of the four styles.

**Editorial finish.** Every magazine cover — all four styles — puts the same deterministic, adaptive luxury-print pass on the photograph. It samples the untouched capture before making a bounded midtone exposure and colour-cast correction, then applies a gentle S-curve, soft highlight shoulder, protected shadow density, clean whites and an almost imperceptible matte floor. The analysis keys exposure from the median and upper midtones instead of applying one fixed brightness value. Dark venues receive a lift; bright, complex scenes receive a restrained reduction; flat pale scenes are specifically protected from being made unnecessarily dark.

White balance listens primarily to genuinely low-chroma surfaces. A strongly yellow or blue room may contribute a deliberately quiet 25% fallback vote only when reliable neutral evidence is absent. Ambiguous equal-gap orange — which could be tungsten light, complexion or brown fabric — gets a separate 10% fallback. Both room votes fade continuously to zero as neutral support reaches 1% of analysed samples, so a coloured wall cannot rotate a valid grey surface. Correction is bounded to ±6.5% per channel and continuously reduced on coloured pixels; protection rises again for highly saturated clothing. Warm-pigment protection is also a continuous confidence rather than an on/off colour class, so adjacent skin or wall pixels cannot split into different colour treatments. There is no separate selective wall/clothing recolouring pass. Colour gets +8 vibrance and −6% global saturation; deep-shadow chroma remains at least 86% before that global colour shaping. Template character remains tonal, so clothing hue is not deliberately changed between styles.

Definition is luminance-only: very light shadow noise reduction, two restrained local-contrast scales, micro-contrast and two edge-masked detail stages around one deterministic 2.5% fine monochrome grain pass. A separate sub-one-code monochrome paper tooth is visible only in close comparison. Noise reduction and micro-contrast occupy different frequency bands, so real skin texture is retained rather than smoothed away and replaced with grain. Broad local contrast is limited to five output code values. A Sobel edge-flow guard limits coherent contours to two additional code values while allowing four only at non-edge texture extrema, preventing HDR outlines while making eyes, hair and fabric visibly clearer.

The signature vignette is part of this single house finish: the central 70% is untouched, side-centres receive only about one quarter of the already-low fall-off, and 7.5–9.5% is reached only at the extreme corners. The ellipse is heavily feathered and protects dark tones. It does not create a brighter subject zone or paint light onto the person. No face detection or reconstruction, skin smoothing, background isolation or blur, relighting, bloom, glow or flare is used. The original camera capture is never overwritten; the finish exists only inside the transient cover canvas.

It runs on the photo rectangle only, before the existing cover scrims, typography, rules and barcode are drawn. Template tone stays in the floating-point recovery pass through tone/colour staging, so white clothing and bright venue detail are not clipped before the shoulder can recover them. Luminance detail then remains twelve-bit until the final detail write. Each output channel stays inside a print-safe 2.5–253 range.

### Exact editorial finish parameters

| Stage | Implemented values |
|---|---|
| Analysis | Up to 50,000 regular samples; scene key `max(median, p75 − 0.17)`; tonal span `median − p10` |
| Exposure | Target midtone `0.45`; adaptation `0.24`; hard range `−0.20…+0.20 EV`; negative correction on low-span scenes reduced to `30–100%` |
| Adaptive density | Gamma `1.00…1.20`, gated by median `0.20…0.38` and span `0.12…0.28`; shadow gamma `1.00…1.25` below pivot `0.22`; identical tonal curve at every image position — no radial subject brightening |
| White balance | Deadband `0.035`; full-cast point `0.10`; strength `0.95`; channel-gain ceiling `0.935…1.065`; yellow/blue tail authority `25%`; ambiguous warm/orange tail authority `10%`; both fade to zero over core support `0.002…0.010` of analysed samples; near-neutral chroma roll-off `0.025…0.10`; directional-tail chroma enters `0.06…0.14` and exits `0.35…0.50`; yellow/blue direction slopes `1.08 / 0.75` |
| Continuous colour protection | Coloured-pixel gate `0.055…0.18`; generic protection `0.40`, rising to `0.92` over chroma `0.18…0.45`; warm R/G/B protection `0.92 / 0.28 / 0.25`; warm ordering margins `−0.03…+0.03` and pigment margin `−0.06…+0.06` at R−G : G−B slope `0.85`; no cast-aligned selective desaturation |
| Tone curve | S-curve `0.065`; deep-shadow lift `0.006`; highlight shoulder `0.035` from `0.56`, peaking at `0.80` and rolling out by `0.985`; black density `0.018`; white clean-up `0.022`; matte floor `0.0035` |
| Colour | Density-following chroma floor `0.30` and cap `1.04`; saturation `0.94`; vibrance `0.08`; deep-shadow chroma floor `0.86`; no skin/clothing-specific chroma boost |
| Noise/detail | Luminance NR `0.010…0.022`; clarity `0.22`; broad structure `0.15`; micro-contrast `0.10`; pre-sharpen `2.00`; final sharpen `0.80`; texture gate `0.004…0.018`; edge gate `0.010…0.032`; strong-edge suppression `0.95` |
| Detail guards | Broad move cap `±5/255`; broad extrema radius `8 px`; Sobel strength gate `0.008…0.030` and edge-flow gate `0.35…0.55`; local 3 × 3 allowance `2/255` on coherent edges and up to `4/255` on irregular texture; smooth-plane protection `0.35` clarity / `0.65` structure |
| Texture | Seeded monochrome grain `0.025` with range `0.68`; seeded paper tooth `0.0015`; both modulated gently by luminance |
| Vignette | Scene-adaptive corner strength `0.075…0.095`; elliptical squared-radius feather `0.25…1.00`; centre at `(0.50, 0.50)`; side-centre mask `0.259`; shadow weighting `0.52…1.00` |
| Existing template tone | Editorial `contrast 1.04 / brightness 1.01`; Noir `contrast 1.07 / brightness 0.985`; Keepsake `contrast 1.05 / brightness 0.99`; Press `contrast 1.04`; folded into the float pass without a separate clamp |
| Output | High-quality cover resize; monotonic 4096-step tone LUT; gamut-safe chroma reconstruction; final range `2.5/255…253/255` |

The finish is automatic and is the **only** grade a cover photo gets beyond its template's own. The guest's filter choice is deliberately switched off for magazine — a cover has one house look, so every cover from the booth matches whatever the guest was playing with on their strip. Strips keep all five filters and are unaffected by the finish.

Cover copy lives in one set of slots shared by all four styles (`covers.js`). Every slot is editable in Admin; **leaving a slot blank generates it from the event title** — masthead, age in words, issue lines, script line and barcode all follow "Rae's 26th Birthday" / "Sam's 30th" / "Aisha & Tom's Wedding" without any admin work.

Legibility is measured, not assumed: the renderer samples the finished photo beneath each cover zone and adjusts the existing scrim where required, so typography remains readable over varied captures.

## Grading
Every colour adjustment in the booth — the five strip filters, each cover
template's tone and the editorial finish — is a **pixel pass**. Nothing uses
`ctx.filter`.

That is not a preference. `CanvasRenderingContext2D.filter` only shipped in
Safari 17 and fails *silently* before it: on an older iPad the filter buttons
did nothing and no cover got its template tone —
while the pixel-based editorial finish carried on working, which is exactly
why the magazine looked right and the filters looked broken.

`Covers.applyGrade(ctx, x, y, w, h, spec)` reads the same CSS-filter syntax the
code already used, so the recipes did not change. brightness, contrast,
saturate, grayscale and sepia are each affine in sRGB, so each compiles to a
3x3 matrix and an offset. Strip filters are applied **in sequence**, including
CSS's between-step clamp, so they remain within 2/255 of `ctx.filter` on
browsers that support it. Magazine template tone instead folds into the
adaptive tone/colour pass as one floating-point transform before its staging
write; otherwise highlight recovery would be asked to recover pixels already
discarded by the template. The later luminance-detail pass keeps twelve-bit
working luma until its final output write.

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

**The photograph** keeps the Living Polaroid's existing lightweight fixed
print pass. The new adaptive finish is deliberately magazine-only, so this
cover change cannot alter already-authored Polaroid video plates. There is no
beautifying, relighting, glow or bloom. The fixed pass runs once per photo
rather than once per frame: it is a pass on the photograph, not on the film.

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


## Premium magazine architecture
- Strip, capture, gallery, sharing and guest flow are unchanged.
- All four covers share one non-destructive photograph pipeline.
- The original guest capture remains unchanged in memory and IndexedDB; only the exported cover canvas is finished.
- Design remains typography, rules, barcode and graphic layers over that transient photograph render.
- All host wording remains editable.
- Text auto-fits its semantic zone.


## Latest build — editorial cover engine
- Cover rendering moved to `covers.js`: four templates over one copy model.
- Portrait covers are 1200 × 1560, landscape 1560 × 1200 (magazine trim, not the old 4:3 / 3:4).
- Layout is measured from the canvas — masthead, columns and cover line re-flow rather than collide when copy is long.
- Template tone and the adaptive **editorial finish** now share one float pipeline, preserving highlight headroom until final output.
- Grain is consolidated into one deterministic 2.5% monochrome pass; the old second 4–6% template grain is gone.
- Noir retains original clothing hues; its mood comes from tonal density, typography and its existing adaptive scrims, while the canonical finish supplies the same soft edge fall-off as every other cover.
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
Cache `v10` carries the locked editorial-finish update. The `v7` worker remains the
one-time bridge away from every shipped cache-first worker: when it finds one
of those legacy booth caches it deletes only this app's old caches, takes
control, and reloads the open booth page once. Settings and the saved gallery
survive; photos in the middle of that one legacy migration do not, so deploy
the migration between booth sessions.

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
