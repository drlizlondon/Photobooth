# Rae's Photo Booth — Live Build

## Guest flow
Start → 3 photos → Strip → optionally try frame/filter → Magazine → pick one of the 3 photos → choose Birthday or Fashion cover → Share / Save → Next guest.

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
Two deliberately different covers:
- Birthday Cover
- Fashion Cover

Magazine always asks the guest to pick Photo 1 / 2 / 3 before showing the finished cover.

All wording is editable in Admin. The renderer uses text slots and automatic fitting/wrapping, so layout does not depend on any specific wording.

## Admin
Live previews:
- Strip
- Birthday
- Fashion
- Landscape
- Portrait

All event, strip and magazine copy is editable.

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


## Latest build
- Incorporates the latest premium magazine hierarchy.
- Original photograph remains untouched apart from full-bleed crop.
- Transparent typography and graphic layers only.
- Existing strips, gallery, capture, sharing and guest flow retained.
