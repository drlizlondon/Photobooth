import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "../../worker/node_modules/sharp/dist/index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const GENERATED = path.join(HERE, "generated");
const OUTPUTS = path.join(HERE, "outputs");
const FRAMES = path.join(HERE, "frames");
const SEGMENTS = path.join(HERE, "segments");
const QC = path.join(HERE, "qc");
const FFMPEG = "/opt/homebrew/bin/ffmpeg";

for (const directory of [FRAMES, SEGMENTS, QC]) fs.mkdirSync(directory, { recursive: true });

function run(executable, args) {
  const command = executable === FFMPEG ? ["-hide_banner", "-loglevel", "error", ...args] : args;
  const result = spawnSync(executable, command, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "");
    throw new Error(`${path.basename(executable)} failed (${result.status})`);
  }
}

function svg(markup) {
  return Buffer.from(`
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity=".58"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="ctaFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0b0908" stop-opacity=".96"/>
          <stop offset=".78" stop-color="#0b0908" stop-opacity=".76"/>
          <stop offset="1" stop-color="#0b0908" stop-opacity=".22"/>
        </linearGradient>
      </defs>
      <style>
        .sans { font-family: "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif; }
        .serif { font-family: Didot, "Bodoni 72", Georgia, serif; }
        .heavy { font-weight: 900; }
        .bold { font-weight: 800; }
        .tracked { letter-spacing: 4px; }
        .wide { letter-spacing: 7px; }
        .shadow { paint-order: stroke; stroke: rgba(0,0,0,.58); stroke-width: 8px; stroke-linejoin: round; }
      </style>
      ${markup}
    </svg>
  `);
}

function darkLayer(alpha) {
  return svg(`<rect width="1080" height="1920" fill="#000" opacity="${alpha}"/>`);
}

async function coverBuffer(source, { blur = 0, brightness = 1 } = {}) {
  let pipeline = sharp(source).resize(1080, 1920, { fit: "cover", position: "centre" });
  if (blur > 0) pipeline = pipeline.blur(blur);
  if (brightness !== 1) pipeline = pipeline.modulate({ brightness });
  return pipeline.png().toBuffer();
}

async function frameFrom(source, destination, markup, { dark = 0, blur = 0, brightness = 1, composites = [] } = {}) {
  const base = await coverBuffer(source, { blur, brightness });
  const layers = [];
  if (dark > 0) layers.push({ input: darkLayer(dark), left: 0, top: 0 });
  layers.push(...composites);
  if (markup) layers.push({ input: svg(markup), left: 0, top: 0 });
  await sharp(base).composite(layers).png().toFile(destination);
}

async function solidFrame(destination, colour) {
  await sharp(svg(`<rect width="1080" height="1920" fill="${colour}"/>`)).png().toFile(destination);
}

function cameraMarkup(photoNumber, countdown = "") {
  return `
    <rect x="0" y="0" width="1080" height="430" fill="url(#topFade)"/>
    <text x="64" y="190" class="sans heavy tracked" font-size="30" fill="#fff">YOUR PHOTOBOOTH</text>
    <text x="64" y="238" class="sans bold tracked" font-size="25" fill="#fff" opacity=".84">PHOTO ${photoNumber} / 3</text>
    <text x="1018" y="190" text-anchor="end" class="sans bold tracked" font-size="24" fill="#fff">CANCEL</text>
    ${countdown ? `<text x="540" y="1115" text-anchor="middle" class="serif shadow" font-size="285" fill="#fff">${countdown}</text>` : ""}
    <text x="540" y="1480" text-anchor="middle" class="sans bold wide" font-size="20" fill="#fff" opacity=".72">MYBISHBASH PHOTOBOOTH</text>
  `;
}

function shadowBox(x, y, width, height, radius = 16) {
  return { input: svg(`<rect x="${x + 18}" y="${y + 24}" width="${width}" height="${height}" rx="${radius}" fill="#000" opacity=".48"/>`), left: 0, top: 0 };
}

function brandMarkup(y) {
  return `
    <text x="80" y="${y}" class="sans heavy" font-size="58"><tspan fill="#3d91ef">my</tspan><tspan fill="#d92d7f">Bish</tspan><tspan fill="#e8ad00">Bash</tspan></text>
    <text x="82" y="${y + 34}" class="sans bold tracked" font-size="18" fill="#fff" opacity=".88">PHOTOBOOTH</text>
  `;
}

const dinnerHook = path.join(GENERATED, "dinner-hook-v2.png");
const gatherPhone = path.join(GENERATED, "gather-phone.png");
const captureOne = path.join(GENERATED, "selfie-1.png");
const captureTwo = path.join(GENERATED, "selfie-3.png");
const captureThree = path.join(GENERATED, "selfie-2.png");
const reaction = path.join(GENERATED, "reaction.png");
const magazineOutput = path.join(OUTPUTS, "after-dark-magazine.png");
const stripOutput = path.join(OUTPUTS, "after-dark-photo-strip.png");
const polaroidOutput = path.join(OUTPUTS, "after-dark-moving-polaroid.mp4");

for (const filename of [dinnerHook, gatherPhone, captureOne, captureTwo, captureThree, reaction, magazineOutput, stripOutput, polaroidOutput]) {
  if (!fs.existsSync(filename)) throw new Error(`Missing required advert input: ${filename}`);
}

await frameFrom(dinnerHook, path.join(FRAMES, "hook.png"), `
  <rect x="48" y="168" width="858" height="252" rx="28" fill="#130f0c" opacity=".78"/>
  <rect x="48" y="168" width="8" height="252" rx="4" fill="#c8b5a6"/>
  <text x="84" y="258" class="serif" font-size="58" fill="#fff">“Wait — we haven’t got</text>
  <text x="84" y="342" class="serif" font-size="58" fill="#fff">one of everyone…”</text>
`);

await frameFrom(gatherPhone, path.join(FRAMES, "gather.png"), `
  <rect x="54" y="174" width="360" height="78" rx="39" fill="#f8f5ef" opacity=".96"/>
  <text x="234" y="226" text-anchor="middle" class="sans bold tracked" font-size="34" fill="#111">EVERYONE IN.</text>
`, { brightness: 0.96 });

await frameFrom(captureOne, path.join(FRAMES, "countdown-3.png"), cameraMarkup(1, "3"));
await frameFrom(captureOne, path.join(FRAMES, "countdown-2.png"), cameraMarkup(1, "2"));
await frameFrom(captureOne, path.join(FRAMES, "countdown-1.png"), cameraMarkup(1, "1"));
await frameFrom(captureOne, path.join(FRAMES, "capture-1.png"), cameraMarkup(1));
await frameFrom(captureTwo, path.join(FRAMES, "capture-2.png"), cameraMarkup(2));
await frameFrom(captureThree, path.join(FRAMES, "capture-3.png"), cameraMarkup(3));
await solidFrame(path.join(FRAMES, "flash.png"), "#fffdf8");

const magazine = await sharp(magazineOutput)
  .flatten({ background: "#111111" })
  .resize({ width: 800 })
  .png()
  .toBuffer();
const magazineMeta = await sharp(magazine).metadata();
await frameFrom(reaction, path.join(FRAMES, "magazine.png"), `
  <text x="60" y="214" class="sans bold wide" font-size="30" fill="#c8b5a6">MAGAZINE</text>
  <text x="60" y="296" class="serif" font-size="54" fill="#fff">Now it’s something worth keeping.</text>
`, {
  dark: 0.50,
  blur: 8,
  brightness: 0.70,
  composites: [
    shadowBox(140, 340, magazineMeta.width, magazineMeta.height),
    { input: magazine, left: 140, top: 340 }
  ]
});

const strip = await sharp(stripOutput)
  .flatten({ background: "#090909" })
  .resize({ width: 380 })
  .png()
  .toBuffer();
const stripMeta = await sharp(strip).metadata();
await frameFrom(reaction, path.join(FRAMES, "strip.png"), `
  <text x="60" y="218" class="sans bold wide" font-size="31" fill="#c8b5a6">PHOTO STRIP</text>
  <text x="60" y="294" class="serif" font-size="54" fill="#fff">The same three photos.</text>
`, {
  dark: 0.54,
  blur: 8,
  brightness: 0.68,
  composites: [
    shadowBox(350, 330, stripMeta.width, stripMeta.height),
    { input: strip, left: 350, top: 330 }
  ]
});

await frameFrom(reaction, path.join(FRAMES, "polaroid-background.png"), `
  <text x="60" y="218" class="sans bold wide" font-size="31" fill="#c8b5a6">MOVING POLAROID</text>
  <text x="60" y="294" class="serif" font-size="54" fill="#fff">One moment, still moving.</text>
  <rect x="178" y="376" width="760" height="992" rx="22" fill="#000" opacity=".46"/>
`, { dark: 0.54, blur: 8, brightness: 0.68 });

await frameFrom(reaction, path.join(FRAMES, "cta-main.png"), `
  <rect x="0" y="0" width="960" height="1920" fill="url(#ctaFade)"/>
  <rect x="48" y="166" width="852" height="1274" rx="30" fill="#0d0b0a" opacity=".78" stroke="#c8b5a6" stroke-opacity=".48" stroke-width="2"/>
  <text x="80" y="244" class="sans bold tracked" font-size="24" fill="#c8b5a6">FREE EARLY ACCESS · BEFORE LAUNCH</text>
  <text x="80" y="348" class="sans heavy" font-size="58" fill="#fff">WE’RE LOOKING FOR</text>
  <text x="80" y="420" class="sans heavy" font-size="58" fill="#fff">OUR FIRST</text>
  <ellipse cx="785" cy="385" rx="32" ry="23" fill="#fff"/><ellipse cx="850" cy="385" rx="32" ry="23" fill="#fff"/>
  <circle cx="794" cy="390" r="11" fill="#111"/><circle cx="859" cy="390" r="11" fill="#111"/>
  <text x="74" y="650" class="serif" font-size="255" fill="#f8f5ef">25</text>
  <text x="410" y="636" class="sans heavy wide" font-size="78" fill="#fff">EVENTS</text>
  <text x="80" y="758" class="serif" font-size="42" fill="#fff">Want to try MyBishBash free</text>
  <text x="80" y="814" class="serif" font-size="42" fill="#fff">before we launch?</text>
  <text x="80" y="870" class="sans bold" font-size="28" fill="#c8b5a6">We’re choosing up to 25 suitable events.</text>
  <rect x="78" y="920" width="762" height="178" rx="20" fill="#f8f5ef"/>
  <text x="459" y="990" text-anchor="middle" class="sans heavy tracked" font-size="34" fill="#111">FOLLOW + COMMENT</text>
  <text x="459" y="1048" text-anchor="middle" class="sans heavy" font-size="34" fill="#111">WHAT YOU’RE CELEBRATING ↓</text>
  ${brandMarkup(1225)}
  <text x="80" y="1368" class="sans bold tracked" font-size="28" fill="#fff">25 EVENTS. FREE EARLY ACCESS.</text>
`, { dark: 0.58, blur: 3.5, brightness: 0.66 });

await frameFrom(reaction, path.join(FRAMES, "cta-alt.png"), `
  <rect x="0" y="0" width="960" height="1920" fill="url(#ctaFade)"/>
  <rect x="48" y="166" width="852" height="1274" rx="30" fill="#0d0b0a" opacity=".78" stroke="#c8b5a6" stroke-opacity=".48" stroke-width="2"/>
  <text x="80" y="244" class="sans bold tracked" font-size="24" fill="#c8b5a6">FREE EARLY ACCESS · BEFORE LAUNCH</text>
  <text x="80" y="370" class="sans heavy" font-size="62" fill="#fff">GOT SOMETHING</text>
  <text x="80" y="448" class="sans heavy" font-size="62" fill="#fff">TO CELEBRATE?</text>
  <rect x="78" y="528" width="762" height="154" rx="20" fill="#f8f5ef"/>
  <text x="459" y="626" text-anchor="middle" class="serif" font-size="68" fill="#111">Tell us what ↓</text>
  <text x="80" y="796" class="serif" font-size="44" fill="#fff">We’re choosing <tspan fill="#e8ad00">25 upcoming events</tspan></text>
  <text x="80" y="856" class="serif" font-size="44" fill="#fff">to try MyBishBash free</text>
  <text x="80" y="916" class="serif" font-size="44" fill="#fff">before launch.</text>
  ${brandMarkup(1125)}
  <text x="80" y="1272" class="sans bold tracked" font-size="28" fill="#fff">25 EVENTS. FREE EARLY ACCESS.</text>
`, { dark: 0.58, blur: 3.5, brightness: 0.66 });

function stillClip(image, output, frames) {
  run(FFMPEG, [
    "-y", "-loop", "1", "-framerate", "30", "-i", image,
    "-vf", "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p",
    "-frames:v", String(frames), "-an", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

function concatSegments(inputs, output, listName, expectedFrames) {
  const list = path.join(SEGMENTS, listName);
  fs.writeFileSync(list, inputs.map(input => `file '${input.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
  run(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-an", "-vf", "fps=30,format=yuv420p", "-frames:v", String(expectedFrames),
    "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2", "-preset", "medium", "-crf", "18",
    "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

function movingPolaroidClip(output, frames, start) {
  const duration = frames / 30;
  run(FFMPEG, [
    "-y",
    "-loop", "1", "-framerate", "30", "-i", path.join(FRAMES, "polaroid-background.png"),
    "-ss", String(start), "-i", polaroidOutput,
    "-filter_complex",
    `[0:v]fps=30,trim=duration=${duration},setpts=PTS-STARTPTS[bg];` +
    `[1:v]trim=duration=${duration},setpts=PTS-STARTPTS,fps=30,scale=760:-2:flags=lanczos[pol];` +
    `[bg][pol]overlay=160:370:shortest=1,format=yuv420p[v]`,
    "-map", "[v]", "-frames:v", String(frames), "-an", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

const segment = name => path.join(SEGMENTS, `${name}.mp4`);
stillClip(path.join(FRAMES, "hook.png"), segment("hook"), 51);
stillClip(path.join(FRAMES, "gather.png"), segment("gather"), 24);
stillClip(path.join(FRAMES, "countdown-3.png"), segment("countdown-3"), 8);
stillClip(path.join(FRAMES, "countdown-2.png"), segment("countdown-2"), 8);
stillClip(path.join(FRAMES, "countdown-1.png"), segment("countdown-1"), 8);
stillClip(path.join(FRAMES, "capture-1.png"), segment("capture-1"), 13);
stillClip(path.join(FRAMES, "flash.png"), segment("flash"), 2);
stillClip(path.join(FRAMES, "capture-2.png"), segment("capture-2"), 13);
stillClip(path.join(FRAMES, "capture-3.png"), segment("capture-3"), 20);
stillClip(path.join(FRAMES, "magazine.png"), segment("magazine"), 84);
stillClip(path.join(FRAMES, "strip.png"), segment("strip"), 30);
movingPolaroidClip(segment("polaroid"), 29, 0.74);
stillClip(path.join(FRAMES, "cta-main.png"), segment("cta-main"), 156);
stillClip(path.join(FRAMES, "cta-alt.png"), segment("cta-alt"), 156);

const common = [
  segment("hook"), segment("gather"),
  segment("countdown-3"), segment("countdown-2"), segment("countdown-1"),
  segment("capture-1"), segment("flash"), segment("capture-2"), segment("flash"),
  segment("capture-3"), segment("flash"), segment("magazine"), segment("strip"), segment("polaroid")
];
const mainOutput = path.join(ROOT, "mybishbash-dinner-party-25-events.mp4");
const altOutput = path.join(ROOT, "mybishbash-dinner-party-25-events-alt-cta.mp4");
concatSegments([...common, segment("cta-main")], mainOutput, "main-final.txt", 450);
concatSegments([...common, segment("cta-alt")], altOutput, "alt-final.txt", 450);

function contactSheet(input, output) {
  run(FFMPEG, [
    "-y", "-v", "error", "-i", input,
    "-vf", "fps=2,scale=216:384:flags=lanczos,tile=10x3:padding=2:margin=2:color=111111",
    "-frames:v", "1", output
  ]);
}

contactSheet(mainOutput, path.join(QC, "main-contact-sheet.jpg"));
contactSheet(altOutput, path.join(QC, "alt-contact-sheet.jpg"));

console.log("Created:");
console.log(mainOutput);
console.log(altOutput);
