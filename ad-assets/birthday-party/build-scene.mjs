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
const FINAL = path.join(ROOT, "mybishbash-birthday-party-scene.mp4");

for (const directory of [OUTPUTS, FRAMES, SEGMENTS, QC]) {
  fs.mkdirSync(directory, { recursive: true });
}

function run(executable, args) {
  const commandArgs = executable === FFMPEG
    ? ["-hide_banner", "-loglevel", "error", ...args]
    : args;
  const result = spawnSync(executable, commandArgs, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${path.basename(executable)} failed (${result.status})`);
}

function svg(markup) {
  return Buffer.from(`
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity=".54"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <style>
        .sans { font-family: "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif; }
        .serif { font-family: Didot, "Bodoni 72", Georgia, serif; }
        .heavy { font-weight: 900; }
        .bold { font-weight: 800; }
        .tracked { letter-spacing: 4px; }
      </style>
      ${markup}
    </svg>
  `);
}

async function coverBuffer(source, options = {}) {
  let pipeline = sharp(source).resize(1080, 1920, {
    fit: "cover",
    position: options.position || "centre"
  });
  if (options.blur) pipeline = pipeline.blur(options.blur);
  if (options.brightness && options.brightness !== 1) {
    pipeline = pipeline.modulate({ brightness: options.brightness });
  }
  return pipeline.png().toBuffer();
}

async function composeFrame(source, destination, markup, options = {}) {
  const base = await coverBuffer(source, options);
  const composites = [];
  if (options.dark) {
    composites.push({
      input: svg(`<rect width="1080" height="1920" fill="#000" opacity="${options.dark}"/>`),
      left: 0,
      top: 0
    });
  }
  if (options.composites) composites.push(...options.composites);
  if (markup) composites.push({ input: svg(markup), left: 0, top: 0 });
  await sharp(base).composite(composites).png().toFile(destination);
}

function brandMarkup(x, y, size, dark = false) {
  const photobooth = dark ? "#111111" : "#ffffff";
  return `
    <text x="${x}" y="${y}" text-anchor="middle" class="sans heavy" font-size="${size}"><tspan fill="#3d91ef">my</tspan><tspan fill="#d92d7f">Bish</tspan><tspan fill="#e8ad00">Bash</tspan></text>
    <text x="${x}" y="${y + size * 0.55}" text-anchor="middle" class="sans bold tracked" font-size="${Math.max(12, size * 0.25)}" fill="${photobooth}">PHOTOBOOTH</text>
  `;
}

function footageBrandMarkup() {
  return `
    <rect x="42" y="1690" width="430" height="132" rx="24" fill="#111" opacity=".76"/>
    ${brandMarkup(257, 1758, 48)}
  `;
}

function stillClip(image, output, frameCount, movement = false) {
  const filter = movement
    ? "fps=30,scale=1120:1992:flags=lanczos,crop=1080:1920:x='20+2*sin(n/3)':y='36+2*cos(n/4)',setsar=1,format=yuv420p"
    : "fps=30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p";
  run(FFMPEG, [
    "-y", "-loop", "1", "-framerate", "30", "-i", image,
    "-vf", filter,
    "-frames:v", String(frameCount), "-an", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

function concatSegments(inputs, output, listName) {
  const list = path.join(SEGMENTS, listName);
  fs.writeFileSync(list, inputs.map(input => `file '${input.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
  run(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-an", "-vf", "fps=30,setsar=1,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2",
    "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", output
  ]);
}

const actionOne = path.join(GENERATED, "birthday-action-1.png");
const actionTwo = path.join(GENERATED, "birthday-action-2.png");
const originalSelfies = [1, 2, 3].map(number => path.join(GENERATED, `birthday-selfie-${number}.png`));
const selfies = [1, 2, 3].map(number => path.join(GENERATED, `birthday-selfie-${number}-warm.png`));

for (const filename of [actionOne, actionTwo, ...originalSelfies]) {
  if (!fs.existsSync(filename)) throw new Error(`Missing required birthday advert input: ${filename}`);
}

for (let index = 0; index < originalSelfies.length; index += 1) {
  await sharp(originalSelfies[index])
    .modulate({ brightness: 0.95, saturation: 0.97 })
    .linear([1.07, 1.01, 0.88], [0, 0, 0])
    .png()
    .toFile(selfies[index]);
}

run(process.execPath, [path.join(HERE, "render-magazine.mjs")]);

const magazine = path.join(OUTPUTS, "maya-23rd-birthday-magazine.png");

await composeFrame(actionOne, path.join(FRAMES, "action-1.png"), `
  <rect x="48" y="104" width="300" height="112" rx="26" fill="#fff0aa" opacity=".97"/>
  <text x="82" y="181" class="sans heavy" font-size="58" fill="#111">WAIT—</text>
  ${footageBrandMarkup()}
`);

await composeFrame(actionTwo, path.join(FRAMES, "action-2.png"), `
  <rect x="48" y="104" width="694" height="112" rx="26" fill="#d92d7f" opacity=".96"/>
  <text x="82" y="181" class="sans heavy" font-size="56" fill="#fff">EVERYONE GET IN!</text>
  ${footageBrandMarkup()}
`);

const captureColours = ["#3d91ef", "#d92d7f", "#e8ad00"];
for (let index = 0; index < selfies.length; index += 1) {
  const ink = index === 2 ? "#111" : "#fff";
  const progress = captureColours.map((colour, progressIndex) => `
    <rect x="${48 + progressIndex * 72}" y="234" width="58" height="10" rx="5" fill="${colour}" opacity="${progressIndex <= index ? 1 : 0.24}"/>
  `).join("");
  await composeFrame(selfies[index], path.join(FRAMES, `capture-${index + 1}.png`), `
    <rect x="0" y="0" width="1080" height="330" fill="url(#topFade)"/>
    <rect x="48" y="112" width="250" height="92" rx="46" fill="${captureColours[index]}" opacity=".97"/>
    <text x="173" y="174" text-anchor="middle" class="sans heavy tracked" font-size="38" fill="${ink}">${index + 1} / 3</text>
    ${progress}
    ${footageBrandMarkup()}
  `);
}

const transitionFrames = [];
for (let index = 0; index < 5; index += 1) {
  const progress = (index + 1) / 5;
  const height = Math.round(1920 * progress);
  const destination = path.join(FRAMES, `colour-transition-${index + 1}.png`);
  await composeFrame(selfies[2], destination, `
    <rect x="0" y="0" width="360" height="${height}" fill="#3d91ef"/>
    <rect x="360" y="${1920 - height}" width="360" height="${height}" fill="#d92d7f"/>
    <rect x="720" y="0" width="360" height="${height}" fill="#e8ad00"/>
  `);
  transitionFrames.push(destination);
}

const resultBase = await sharp(svg(`
  <rect width="1080" height="1920" fill="#fffdf8"/>
  <circle cx="82" cy="110" r="310" fill="#dcecff"/>
  <rect x="760" y="-100" width="430" height="470" rx="50" fill="#ffdce8" transform="rotate(9 975 135)"/>
  <rect x="-110" y="1460" width="470" height="440" rx="42" fill="#fff0aa" transform="rotate(-8 125 1680)"/>
  <circle cx="1010" cy="1640" r="270" fill="#eee6ff"/>
  <rect x="54" y="62" width="536" height="70" rx="35" fill="#d92d7f"/>
  <text x="322" y="109" text-anchor="middle" class="sans bold tracked" font-size="25" fill="#fff">MAGAZINE COVER · AFTER DARK</text>
  <text x="54" y="202" class="sans heavy" font-size="49" fill="#111">THAT SELFIE → THIS COVER.</text>
  <text x="540" y="1452" text-anchor="middle" class="serif" font-size="51" fill="#111">Same moment. Made worth keeping.</text>
  ${brandMarkup(540, 1560, 78, true)}
  <rect x="142" y="1652" width="820" height="112" rx="18" fill="#ffdce8"/>
  <rect x="130" y="1640" width="820" height="112" rx="18" fill="#111"/>
  <text x="540" y="1711" text-anchor="middle" class="sans heavy tracked" font-size="31" fill="#fff">FOLLOW TO TRY IT FIRST ✦</text>
  <rect x="60" y="1812" width="320" height="14" rx="7" fill="#3d91ef"/>
  <rect x="380" y="1812" width="320" height="14" rx="7" fill="#d92d7f"/>
  <rect x="700" y="1812" width="320" height="14" rx="7" fill="#e8ad00"/>
`)).png().toBuffer();

const enterFrames = [];
for (let index = 0; index < 6; index += 1) {
  const progress = 1 - Math.pow(1 - (index + 1) / 6, 3);
  const width = Math.round(1040 - 320 * progress);
  const artwork = await sharp(magazine).resize({ width }).png().toBuffer();
  const metadata = await sharp(artwork).metadata();
  const left = Math.round((1080 - metadata.width) / 2);
  const top = Math.round(252 - (metadata.height - 1008) * 0.48);
  const shadow = svg(`
    <rect x="${left + 20}" y="${top + 26}" width="${metadata.width}" height="${metadata.height}" rx="16" fill="#000" opacity=".48"/>
  `);
  const destination = path.join(FRAMES, `magazine-enter-${index + 1}.png`);
  await sharp(resultBase).composite([
    { input: shadow, left: 0, top: 0 },
    { input: artwork, left, top }
  ]).png().toFile(destination);
  enterFrames.push(destination);
}

const finalArtwork = await sharp(magazine).resize({ width: 720 }).png().toBuffer();
const finalMeta = await sharp(finalArtwork).metadata();
const finalLeft = Math.round((1080 - finalMeta.width) / 2);
const finalTop = 236;
await sharp(resultBase).composite([
  { input: svg(`<rect x="${finalLeft + 20}" y="${finalTop + 26}" width="${finalMeta.width}" height="${finalMeta.height}" rx="16" fill="#000" opacity=".48"/>`), left: 0, top: 0 },
  { input: finalArtwork, left: finalLeft, top: finalTop }
]).png().toFile(path.join(FRAMES, "branded-result.png"));

const actionOneClip = path.join(SEGMENTS, "action-1.mp4");
const actionTwoClip = path.join(SEGMENTS, "action-2.mp4");
stillClip(path.join(FRAMES, "action-1.png"), actionOneClip, 9, true);
stillClip(path.join(FRAMES, "action-2.png"), actionTwoClip, 9, true);

const captureClips = [1, 2, 3].map(number => {
  const output = path.join(SEGMENTS, `capture-${number}.mp4`);
  stillClip(path.join(FRAMES, `capture-${number}.png`), output, 11);
  return output;
});

const transitionClips = transitionFrames.map((frame, index) => {
  const output = path.join(SEGMENTS, `colour-transition-${index + 1}.mp4`);
  stillClip(frame, output, 1);
  return output;
});

const enterClips = enterFrames.map((frame, index) => {
  const output = path.join(SEGMENTS, `magazine-enter-${index + 1}.mp4`);
  stillClip(frame, output, 1);
  return output;
});
const resultClip = path.join(SEGMENTS, "magazine-result.mp4");
stillClip(path.join(FRAMES, "branded-result.png"), resultClip, 67);

concatSegments([
  actionOneClip,
  actionTwoClip,
  ...captureClips,
  ...transitionClips,
  ...enterClips,
  resultClip
], FINAL, "birthday-scene.txt");

run(FFMPEG, [
  "-y", "-i", FINAL,
  "-vf", "fps=2.5,scale=270:480:flags=lanczos,tile=4x3:padding=0:margin=0",
  "-frames:v", "1", path.join(QC, "birthday-scene-contact-sheet.jpg")
]);

console.log(`Created ${FINAL}`);
