# Ad-creative ledger — MyBishBash Photobooth

*The permanent record of every exported creative: what it is, the hypothesis it tests, where it was posted, what happened, and when the file was retired. Rows are NEVER deleted — files may be, once their row is complete. The portfolio-wide pathway this instantiates lives in `~/.claude/social-registry.md` §Creative asset pathway.*

**Storage rule (decided 2026-08-29):** exported videos/images stay on disk, gitignored — git history never shrinks, so committing outputs would make the "delete when done" step impossible. Build scripts (`build-*.mjs`, `render*.html`) are committed; any export is reproducible from them. Once posted, the platform hosts the durable published copy.

## Lifecycle states

`EXPORTED` → `POSTED` (add date, platform, post URL, native audio used) → `MEASURED` (day-7 metrics-of-record: saves / shares / profile visits / UTM clicks — not views) → verdict `SCALE` / `ITERATE` / `RETIRE` → retired files may be deleted from disk (note the date in the row).

## Assets

| # | File (ad-assets/…) | Test hypothesis | Caption (prepared) | Status | Posted (date · platform · URL) | Day-7 outcome | Verdict | File deleted |
|---|---|---|---|---|---|---|---|---|
| 1 | launch-teasers/mybishbash-tiktok-01-price.mp4 | People care about avoiding photobooth hire cost | "A photobooth vibe without hiring the whole booth? 👀 …" (full text: launch-teasers posting notes) | EXPORTED | — | — | — | — |
| 2 | launch-teasers/mybishbash-tiktok-02-ipad.mp4 | Turning your own device into a photobooth is novel and useful | "Your iPad, but make it the party photobooth 📸 …" | EXPORTED | — | — | — | — |
| 3 | launch-teasers/mybishbash-tiktok-03-results.mp4 | The distinctive finished outputs create desire | "Three photos. Three very different keepsakes. …" | EXPORTED | — | — | — | — |
| 4 | birthday-party/mybishbash-birthday-party-scene.mp4 | *(no posting notes were written — add hypothesis before posting)* | — | EXPORTED | — | — | — | — |
| 5 | carry-your-booth/mybishbash-carry-your-booth-15s.mp4 | *(no posting notes were written — add hypothesis before posting)* | — | EXPORTED | — | — | — | — |
| 6 | carry-your-booth/mybishbash-carry-your-booth-short.mp4 | *(same test as #5, short cut)* | — | EXPORTED | — | — | — | — |
| 7 | dinner-party-25-events/mybishbash-dinner-party-25-events.mp4 | A sophisticated late-20s/30s occasion + concrete 25-events early-access recruitment beats generic "launching soon" (useful signal = a real upcoming occasion with timing in comments) | "Got something coming up? 👀 We're choosing up to 25 upcoming events…" (full text + offer positioning: dinner-party posting notes) | EXPORTED | — | — | — | — |
| 8 | dinner-party-25-events/mybishbash-dinner-party-25-events-alt-cta.mp4 | Same offer, softer hook ("Got something to celebrate?") vs #7's direct recruitment lead | per posting notes, alt CTA | EXPORTED | — | — | — | — |

*Status honesty note: all 8 marked EXPORTED as of 2026-08-29 because no posting is recorded anywhere in this repo. If any was already posted, update its row with the URL — the row, not memory, is the record.*

## Blockers before anything can move to POSTED

- No MyBishBash TikTok/Instagram account exists in `~/.claude/social-registry.md` — creating the account (founder) adds the registry row, then posting can start.
- All edits are intentionally silent — add trending native audio at posting time (per the notes).
- Every link in a caption/bio must carry UTM (registry standing rule) or day-7 "UTM clicks" is unmeasurable.
