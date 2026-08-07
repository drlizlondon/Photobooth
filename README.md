# Rae's Photo Booth v2

A more polished iPad-first, backend-free event photo booth.

## What's improved in v2
- Premium iPad-first visual treatment using native Apple-friendly Didot/Bodoni/Avenir font stacks
- Narrower, more realistic physical photo-strip proportions
- White, black, magazine, editorial and film modes
- Cleaner layout previews rather than app-style text pills
- Fun pose prompts before every shot
- Developing / printing reveal animation
- Optional confetti reveal
- Optional random "Gold Edition" (1 in 10 sessions)
- 8 curated photo filters
- Editable title, year/date, footer, accent colour and booth settings
- AirDrop-compatible native Share sheet on supported iPadOS Safari
- PNG saving
- No backend and no uploads
- PWA / Add to Home Screen support

## Updating an existing Vercel project

### If your Vercel project is linked to GitHub
This is the best setup.

1. Unzip this folder.
2. Replace the files in your existing local GitHub project with these files.
3. Commit and push to `main`.
4. Vercel automatically creates a new deployment.
5. Your existing production URL stays the same.

### If you originally deployed by dragging/uploading files to Vercel
You can either:

1. Import a GitHub repository into the existing/new Vercel project, recommended for future updates, or
2. Install the Vercel CLI and run `vercel --prod` from this folder.

Do not create a brand-new public URL every time unless you want a separate project.

## Before the event
- Open the production HTTPS URL on the iPad.
- Allow camera access.
- Add it to the iPad Home Screen.
- Keep the iPad connected to power.
- Test AirDrop from the Share button.
- Consider iPad Guided Access to stop guests leaving the booth.
- Test the front camera crop at the actual tripod distance and lighting.

## Privacy
Captured images remain in the browser session only. This project does not send photos to a server. Press "Next guest" to clear the current session.
