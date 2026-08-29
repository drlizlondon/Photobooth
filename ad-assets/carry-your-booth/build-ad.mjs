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
  const result = spawnSync(executable, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${path.basename(executable)} failed (${result.status})`);
}

function svg(markup) {
  return Buffer.from(`
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <style>
        .sans { font-family: "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif; }
        .heavy { font-weight: 900; }
        .bold { font-weight: 800; }
        .tracked { letter-spacing: 4px; }
        .shadow { paint-order: stroke; stroke: rgba(0,0,0,.62); stroke-width: 10px; stroke-linejoin: round; }
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

const arrivalAction = path.join(GENERATED, "arrival-action.png");
const arrivalSelfies = [1, 2, 3].map(number => path.join(GENERATED, `arrival-selfie-${number}.png`));
const dinnerAction = path.join(GENERATED, "dinner-action.png");
const dinnerSelfies = [1, 2, 3].map(number => path.join(GENERATED, `dinner-selfie-${number}.png`));
const poolAction = path.join(GENERATED, "pool-action.png");
const poolSelfies = [1, 2, 3].map(number => path.join(GENERATED, `pool-selfie-${number}.png`));
const stripOutput = path.join(OUTPUTS, "ibiza-weekend-photo-strip.png");
const magazineOutput = path.join(OUTPUTS, "ibiza-weekend-magazine.png");
const polaroidOutput = path.join(OUTPUTS, "ibiza-weekend-moving-polaroid.mp4");
const polaroidStill = path.join(OUTPUTS, "ibiza-weekend-moving-polaroid-still.png");

run(FFMPEG, ["-y", "-ss", "2.2", "-i", polaroidOutput, "-frames:v", "1", polaroidStill]);

await frameFrom(arrivalAction, path.join(FRAMES, "hook.png"), `
  <rect x="60" y="150" width="720" height="360" rx="28" fill="#fff0aa" opacity=".96"/>
  <text x="96" y="235" class="sans heavy tracked" font-size="45" fill="#b52167">POV:</text>
  <text x="96" y="320" class="sans heavy" font-size="62" fill="#111">YOUR GROUP</text>
  <text x="96" y="397" class="sans heavy" font-size="62" fill="#111">HOLIDAY HAS ITS</text>
  <text x="96" y="474" class="sans heavy" font-size="62" fill="#111">OWN PHOTOBOOTH</text>
  <rect x="60" y="1324" width="360" height="76" rx="38" fill="#111" opacity=".88"/>
  <text x="240" y="1376" text-anchor="middle" class="sans bold tracked" font-size="38" fill="#fff">ARRIVAL · IBIZA</text>
`);

await frameFrom(dinnerAction, path.join(FRAMES, "dinner-action.png"), `
  <rect x="60" y="165" width="465" height="76" rx="38" fill="#fff0aa" opacity=".96"/>
  <text x="292" y="218" text-anchor="middle" class="sans bold tracked" font-size="38" fill="#111">LATER THAT NIGHT…</text>
  <text x="70" y="338" class="sans heavy shadow" font-size="76" fill="#fff">“DO ANOTHER ONE.”</text>
`);

await frameFrom(poolAction, path.join(FRAMES, "pool-action.png"), `
  <rect x="60" y="165" width="350" height="76" rx="38" fill="#245f9f" opacity=".94"/>
  <text x="235" y="218" text-anchor="middle" class="sans bold tracked" font-size="38" fill="#fff">NEXT MORNING</text>
  <text x="70" y="338" class="sans heavy shadow" font-size="84" fill="#fff">EVERYONE IN!</text>
`);

async function captureFrame(source, destination, label, accent) {
  await frameFrom(source, destination, `
    <rect x="60" y="165" width="250" height="76" rx="38" fill="${accent}" opacity=".96"/>
    <text x="185" y="218" text-anchor="middle" class="sans heavy tracked" font-size="40" fill="#fff">${label}</text>
    <rect x="60" y="270" width="475" height="76" rx="16" fill="#111" opacity=".74"/>
    <text x="90" y="322" class="sans bold tracked" font-size="39" fill="#fff">THREE QUICK PHOTOS</text>
  `);
}

for (let index = 0; index < 3; index += 1) {
  await captureFrame(arrivalSelfies[index], path.join(FRAMES, `arrival-capture-${index + 1}.png`), `${index + 1} / 3`, "#b52167");
  await captureFrame(dinnerSelfies[index], path.join(FRAMES, `dinner-capture-${index + 1}.png`), `${index + 1} / 3`, "#245f9f");
  await captureFrame(poolSelfies[index], path.join(FRAMES, `pool-capture-${index + 1}.png`), `${index + 1} / 3`, "#ff6f61");
}

async function resultFrame(background, output, destination, { width, x, y, label, chip, dark = 0.30 }) {
  const resized = await sharp(output).resize({ width }).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const shadow = svg(`
    <rect x="${x + 18}" y="${y + 22}" width="${meta.width}" height="${meta.height}" rx="18" fill="#000" opacity=".38"/>
  `);
  await frameFrom(background, destination, `
    <rect x="60" y="165" width="${chip.length * 25 + 86}" height="72" rx="36" fill="#fff0aa" opacity=".96"/>
    <text x="92" y="215" class="sans bold tracked" font-size="36" fill="#111">${chip}</text>
    <text x="60" y="342" class="sans heavy shadow" font-size="86" fill="#fff">${label}</text>
  `, {
    dark,
    blur: 1.2,
    composites: [
      { input: shadow, left: 0, top: 0 },
      { input: resized, left: x, top: y }
    ]
  });
}

await resultFrame(arrivalSelfies[1], stripOutput, path.join(FRAMES, "strip-result.png"), {
  width: 390, x: 345, y: 445, label: "PHOTO STRIP", chip: "ARRIVAL · RESULT", dark: 0.24
});
await resultFrame(dinnerSelfies[1], magazineOutput, path.join(FRAMES, "magazine-result.png"), {
  width: 650, x: 180, y: 455, label: "MAGAZINE", chip: "DINNER · RESULT", dark: 0.32
});

await frameFrom(poolSelfies[1], path.join(FRAMES, "polaroid-background.png"), `
  <rect x="60" y="165" width="460" height="72" rx="36" fill="#fff0aa" opacity=".96"/>
  <text x="92" y="215" class="sans bold tracked" font-size="36" fill="#111">POOL DAY · RESULT</text>
  <text x="60" y="342" class="sans heavy shadow" font-size="64" fill="#fff">MOVING POLAROID</text>
  <rect x="188" y="392" width="704" height="920" rx="24" fill="#000" opacity=".38"/>
`, { dark: 0.28, blur: 1.2 });

const stripSmall = await sharp(stripOutput).resize({ width: 245 }).rotate(-5, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const magazineSmall = await sharp(magazineOutput).resize({ width: 390 }).rotate(4, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const polaroidSmall = await sharp(polaroidStill).resize({ width: 370 }).rotate(-2, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

await frameFrom(arrivalSelfies[2], path.join(FRAMES, "montage.png"), `
  <rect x="52" y="145" width="795" height="335" rx="28" fill="#111" opacity=".88"/>
  <text x="88" y="240" class="sans heavy" font-size="66" fill="#fff">ONE WEEKEND.</text>
  <text x="88" y="326" class="sans heavy" font-size="64" fill="#fff0aa">LOADS OF MOMENTS.</text>
  <text x="88" y="414" class="sans heavy" font-size="50" fill="#fff">ONE POCKET PHOTOBOOTH.</text>
`, {
  dark: 0.38,
  blur: 3,
  composites: [
    { input: stripSmall, left: 48, top: 690 },
    { input: magazineSmall, left: 262, top: 722 },
    { input: polaroidSmall, left: 500, top: 790 }
  ]
});

await frameFrom(arrivalSelfies[1], path.join(FRAMES, "end-card.png"), `
  <rect x="48" y="210" width="772" height="1140" rx="32" fill="#111" opacity=".78"/>
  <text x="88" y="350" class="sans heavy" font-size="58" fill="#fff">YOUR PHOTOBOOTH,</text>
  <text x="88" y="446" class="sans heavy" font-size="58" fill="#fff0aa">WHEREVER YOU GO.</text>
  <line x1="88" x2="794" y1="520" y2="520" stroke="#fff" stroke-width="3" opacity=".55"/>
  <text x="88" y="695" class="sans heavy" font-size="70" fill="#3d91ef">MY</text>
  <text x="198" y="695" class="sans heavy" font-size="70" fill="#d92d7f">BISH</text>
  <text x="376" y="695" class="sans heavy" font-size="70" fill="#e8ad00">BASH</text>
  <text x="90" y="738" class="sans bold tracked" font-size="24" fill="#fff">PHOTOBOOTH</text>
  <text x="88" y="930" class="sans heavy tracked" font-size="54" fill="#fff">LAUNCHING SOON</text>
  <rect x="82" y="1032" width="690" height="102" rx="18" fill="#fff0aa"/>
  <text x="427" y="1100" text-anchor="middle" class="sans heavy tracked" font-size="42" fill="#111">FOLLOW TO TRY IT FIRST ✦</text>
`, { dark: 0.48, blur: 4 });

function stillClip(image, output, frames, zoomRate = 0.00065) {
  run(FFMPEG, [
    "-y", "-loop", "1", "-framerate", "30", "-i", image,
    // Keep the finished typography and real product artwork pixel-stable.
    // The previous whole-frame push also enlarged overlays and could make
    // essential copy shimmer or clip near the end of a shot.
    "-vf", "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p",
    "-frames:v", String(frames), "-an", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

function concatSegments(inputs, output, listName) {
  const list = path.join(SEGMENTS, listName);
  fs.writeFileSync(list, inputs.map(input => `file '${input.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
  // Decode and re-encode at joins. Stream-copying independent H.264 clips can
  // carry prediction state across boundaries in some decoders, producing
  // brief block corruption in high-contrast text even though each source clip
  // is valid on its own.
  run(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-an", "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

function captureClip(prefix, framePaths, framesEach) {
  const clips = framePaths.map((framePath, index) => {
    const output = path.join(SEGMENTS, `${prefix}-${index + 1}.mp4`);
    stillClip(framePath, output, framesEach, 0.00045);
    return output;
  });
  const joined = path.join(SEGMENTS, `${prefix}.mp4`);
  concatSegments(clips, joined, `${prefix}.txt`);
  return joined;
}

function movingPolaroidClip(output, frames, start) {
  const duration = frames / 30;
  run(FFMPEG, [
    "-y",
    "-loop", "1", "-framerate", "30", "-i", path.join(FRAMES, "polaroid-background.png"),
    "-i", polaroidOutput,
    "-filter_complex",
    `[0:v]fps=30,trim=duration=${duration},setpts=PTS-STARTPTS[bg];` +
    `[1:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS,fps=30,scale=680:-2:flags=lanczos[pol];` +
    `[bg][pol]overlay=200:405:shortest=1,format=yuv420p[v]`,
    "-map", "[v]", "-frames:v", String(frames), "-an", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

function buildVersion(name, counts, finalOutput) {
  const segment = key => path.join(SEGMENTS, `${name}-${key}.mp4`);
  stillClip(path.join(FRAMES, "hook.png"), segment("hook"), counts.hook, counts.hookZoom);
  const arrivalCapture = captureClip(`${name}-arrival-capture`, [1, 2, 3].map(n => path.join(FRAMES, `arrival-capture-${n}.png`)), counts.captureEach);
  stillClip(path.join(FRAMES, "strip-result.png"), segment("strip"), counts.strip, 0.00055);
  stillClip(path.join(FRAMES, "dinner-action.png"), segment("dinner-action"), counts.action, 0.00075);
  const dinnerCapture = captureClip(`${name}-dinner-capture`, [1, 2, 3].map(n => path.join(FRAMES, `dinner-capture-${n}.png`)), counts.captureEach);
  stillClip(path.join(FRAMES, "magazine-result.png"), segment("magazine"), counts.magazine, 0.00055);
  stillClip(path.join(FRAMES, "pool-action.png"), segment("pool-action"), counts.action, 0.00075);
  const poolCapture = captureClip(`${name}-pool-capture`, [1, 2, 3].map(n => path.join(FRAMES, `pool-capture-${n}.png`)), counts.captureEach);
  movingPolaroidClip(segment("polaroid"), counts.polaroid, counts.polaroidStart);
  stillClip(path.join(FRAMES, "montage.png"), segment("montage"), counts.montage, 0.00045);
  stillClip(path.join(FRAMES, "end-card.png"), segment("end"), counts.end, 0.00020);

  concatSegments([
    segment("hook"), arrivalCapture, segment("strip"), segment("dinner-action"), dinnerCapture,
    segment("magazine"), segment("pool-action"), poolCapture, segment("polaroid"), segment("montage"), segment("end")
  ], finalOutput, `${name}-final.txt`);
}

buildVersion("main", {
  hook: 48, captureEach: 9, strip: 39, action: 27, magazine: 39,
  polaroid: 42, polaroidStart: 0.65, montage: 72, end: 75, hookZoom: 0.00060
}, path.join(ROOT, "mybishbash-carry-your-booth-15s.mp4"));

buildVersion("short", {
  hook: 36, captureEach: 6, strip: 24, action: 9, magazine: 24,
  polaroid: 30, polaroidStart: 0.86, montage: 18, end: 66, hookZoom: 0.00080
}, path.join(ROOT, "mybishbash-carry-your-booth-short.mp4"));

console.log("Created:");
console.log(path.join(ROOT, "mybishbash-carry-your-booth-15s.mp4"));
console.log(path.join(ROOT, "mybishbash-carry-your-booth-short.mp4"));
