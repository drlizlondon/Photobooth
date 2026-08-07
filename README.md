# Rae's Photo Booth 1.0

Production-style birthday/event photo booth for iPad.

## Guest flow
Start → 3 photos → finished strip → try strip styles / filters → Share / Save → try another version → Next guest.

Next guest goes directly to the camera.

Cancel during capture immediately stops the countdown and camera, then returns to the homepage.

The review screen resets to the homepage after 2 minutes of inactivity.

## Guest choices
Strip:
- White
- Black
- Editorial
- Film

Filters:
- Original
- B&W
- Warm
- Film
- Glow
- Party

Other outputs:
- Magazine
- Polaroid
- Square grid
- Story

Magazine lets the guest choose the best of the three photos for the cover.

Every version can be saved or shared independently.

## Admin
The host configures the event before guests arrive:
- Event title
- Year / date
- Strip footer
- Event design: Luxury / Editorial / Romantic / Party
- Magazine masthead and 3 cover lines
- Polaroid, grid and story captions
- Accent colour
- Countdown
- Mirror mode
- Group prompts
- Shutter sound
- Flash
- Enable / disable keepsake types

Guests cannot edit event wording or typography.

## Photography philosophy
The app does not use face detection, AI enhancement or artistic re-cropping. The photograph itself is preserved. Templates design around the original photo.

## Deploying through GitHub Web
Unzip this folder.

In your existing GitHub repository choose:
Add file → Upload files

Drag the CONTENTS of this folder into GitHub:
- index.html
- app.js
- styles.css
- manifest.webmanifest
- sw.js
- README.md
- icons/

Commit the changes to main.

If the repository is linked to Vercel, Vercel should redeploy automatically and keep the same production URL.

## iPad
Use the HTTPS production URL in Safari.
Allow camera access.
Test Share/AirDrop and shutter sound before the event.
Add to Home Screen for a more app-like experience.
Keep the iPad on charge.


## 1.1 changes
- Wider, shorter photo strip for group shots
- Reduced strip margins and branding space so the photos dominate
- Phone-friendlier final strip proportions
- More editorial magazine cover hierarchy
- Larger review preview with a smaller control panel
- Preserves original photo framing
- All 1.0 guest/admin behaviour retained


## 1.2
- Smart landscape/portrait strip composition
- Luxury script signature at the bottom of the strip
- Birthday Cover and Fashion Cover magazine variants
- Magazine remembers the selected cover photo
- Live admin previews for Strip, Birthday Cover and Fashion Cover
- Admin preview can switch between landscape and portrait placeholders
- Host wording updates the preview live


## Party-ready build
- New guest always starts on White Strip + Original filter.
- Magazine never carries over from the previous guest.
- Magazine uses the three current guest photos and asks them to pick a cover.
- Birthday Cover and Fashion Cover remember the selected photo within that guest session.
- Strip uses much broader Daisy & Jack-style photo proportions.
- No barcode on the strip.
- Luxury strip signature remains script/cursive at the bottom.
- Magazine keeps editorial barcode/details.
- Camera preview uses the full frame with no centre composition box.
- Session orientation is detected once and locked for all three photographs.
- Landscape and portrait sessions get different output canvas proportions.
- Saved/shared output remains high resolution regardless of on-screen preview size.


## Final polish bundle
- Keeps the broad photo width from the party-ready build.
- Adds slightly more white space at the top, sides and between strip photos.
- Adds restrained top event text on the strip.
- Keeps the script signature/footer at the bottom.
- No barcode on the strip.
- Birthday Cover retains warm editorial paper treatment.
- Fashion Cover uses white typography directly over the flat photo, with no subject cut-out or fake layering.
- Soft confetti appears briefly after the third shot/review reveal.
- No artificial "Preparing..." delay.
- No brand-pack download feature.


## Header-editable release
- Adds distinct editable Strip top line and Strip second line.
- Keeps Event title separate for the welcome screen.
- Adds more white space above the strip photos for a stronger header.
- Header preview updates live in Admin.
- White / Black / Editorial / Film frame styles remain distinct.
- Film is a frame treatment, while Vintage is the separate filter.
- Filter list remains independent from frame style.
- Strip footer remains independently editable in script.
