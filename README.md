# Rae's Photo Booth — Live Build

## Guest flow
Start → 3 photos → Strip → optionally try frame/filter → Magazine → pick one of the 3 photos → choose one of four cover styles → Share / Save → Next guest.

Every new guest resets to:
- Strip
- White frame
- Original filter
- no magazine photo selected

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

Frame and filter are separate systems.

## Magazine
Four cover styles, each laid out separately for portrait and landscape sessions:
- **Keepsake** (default) — the party cover: framed, didone masthead over condensed stacked lines, left rail of event detail, script + condensed hero line, hearts and an icon strip. Each guest gets their own **numbered edition** ("EDITION 14 OF 63") counted from the booth's local gallery; set the expected headcount in Admin.
- **Editorial** — full-bleed high-fashion cover: oversized didone masthead, three feature columns, huge cover line bottom-right.
- **Noir** — deep monochrome, centred masthead and cover line, heavy contrast.
- **Press** — solid sidebar carrying the masthead, accent issue chip, name and standfirst on the photo.

Magazine always asks the guest to pick Photo 1 / 2 / 3 before showing the finished cover, then shows a live thumbnail of that photo in each of the four styles.

Cover copy lives in one set of slots shared by all four styles (`covers.js`). Every slot is editable in Admin; **leaving a slot blank generates it from the event title** — masthead, age in words, issue lines, script line and barcode all follow "Rae's 26th Birthday" / "Sam's 30th" / "Aisha & Tom's Wedding" without any admin work.

Legibility is measured, not assumed: the renderer samples the photo behind each block of type and deepens the scrim where the photo is bright, so white type never washes out on a pale wall.

## Admin
Live previews (using the real cover renderer with a stand-in photo):
- Strip
- Keepsake
- Editorial
- Noir
- Press
- Landscape
- Portrait

**Every word a guest can see is editable.** Three groups of fields:
- *Magazine Cover* / *Keepsake Cover* — all copy printed on the covers, including the badge's own "edition" / "of" wording.
- *Strip* — the strip's header, signature and date lines.
- *Screen Text* — welcome eyebrow, start button and hint, cancel, shot counter (`{n}` / `{total}`), camera prompts (comma-separated, one per shot), the Strip/Magazine tabs, every control label, Share / Save / Next guest / Retake, and the end-screen wording.

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
- Cover copy auto-generates from the event title; old Birthday/Fashion copy is migrated on load where it was customised.
- Strips, capture, gallery, sharing and guest flow are unchanged.

## Service worker
`sw.js` is **network first, cache as offline fallback**, and deletes old caches on activate. The previous cache-first worker meant an installed booth iPad kept serving whatever build it first saw, no matter how many times the site was redeployed. Set the booth up with signal once and it will always be on the current build; it still runs fine offline on the night.
