"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("node:fs");
var path = require("node:path");

var ROOT = path.resolve(__dirname, "..");
function source(name) {
  return fs.readFileSync(path.join(ROOT, name), "utf8");
}

var app = source("app.js");
var covers = source("covers.js");
var polaroid = source("polaroid.js");
var strip = source("strip.js");
var marketing = source("marketing.js");
var html = source("index.html");
var styles = source("styles.css");
var manifest = source("manifest.webmanifest");
var serviceWorker = source("sw.js");
var vercelIgnore = source(".vercelignore");
var vercel = JSON.parse(source("vercel.json"));

test("sends public Start directly into one shared three-photo capture", function () {
  var launch = app.slice(app.indexOf("function launchFreeBooth"), app.indexOf("function previewExampleBooth"));
  var session = app.slice(app.indexOf("async function beginSession"), app.indexOf("function beginSharedSession"));
  assert.match(launch, /enterBoothHistory\(\);beginSharedSession\(false\)/);
  assert.match(app, /document\.querySelectorAll\("\[data-start-photobooth\]"\)/);
  assert.doesNotMatch(launch, /(checkout|register|email)/i);
  assert.doesNotMatch(html, /id="experience"/);
  assert.doesNotMatch(html, /data-experience=/);
  assert.match(session, /const shared=experience==="shared"/);
  assert.match(session, /sharedOutputSession=shared/);
  assert.match(session, /const total=shared\|\|currentExperience==="strip"\?3:1/);
  assert.match(session, /photos\.push\(capturePhoto\(\)\)/);
  assert.match(app, /\$\("reviewModeNav"\)\.hidden=!sharedOutputSession/);
});

test("exposes Personal and Business as separate static product surfaces", function () {
  ["landing", "business", "welcome", "camera", "review", "settings"].forEach(function (id) {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
  assert.match(html, /data-product-route="personal"/);
  assert.match(html, /data-product-route="business"/);
  assert.match(app, /function routeFromLocation\(\)/);
  assert.match(app, /window\.addEventListener\("popstate"/);
  assert.equal(vercel.cleanUrls, undefined, "cleanUrls rewrites index.html away before the static root fallback can resolve it");
  assert.deepEqual(vercel.rewrites, [
    { source: "/", destination: "/index.html" },
    { source: "/business", destination: "/index.html" },
    { source: "/business/", destination: "/index.html" }
  ]);
});

test("renders attribution inside every output pipeline", function () {
  assert.match(app, /return STRIP\.render\(ctx,\{[\s\S]*?branding,/);
  assert.match(strip, /const brand=brandingLayout\(opts\.branding,geo\)/);
  assert.match(app, /branding:currentBranding\(\)/);
  assert.match(app, /attribution:currentBranding\(\)/);

  var templateRender = covers.indexOf("(RENDERERS[opts.template]||tplKeepsake)(L);");
  var coverBrand = covers.indexOf("drawOutputBranding(ctx,L,opts.branding");
  assert.ok(templateRender >= 0 && coverBrand > templateRender, "cover branding follows the real template render");

  var handwriting = polaroid.indexOf("drawHand(ctx,geo,copy,hand);");
  var polaroidBrand = polaroid.indexOf("drawAttribution(ctx,geo,attribution);");
  var windowClear = polaroid.indexOf("ctx.clearRect(p.x,p.y,p.w,p.h);");
  assert.ok(handwriting >= 0 && polaroidBrand > handwriting, "Polaroid attribution is part of the print chrome");
  assert.ok(windowClear > polaroidBrand, "photo window remains clear after attribution is drawn");
  assert.match(polaroid, /buildChrome\(geo,o\.copy\|\|\{\},o\.hand\|\|HAND_FALLBACK,o\.backdrop,o\.attribution\)/);
});

test("uses the real renderers for homepage evidence and keeps Polaroid moving", function () {
  assert.match(marketing, /global\.MyBishBashRenderers/);
  assert.match(marketing, /global\.Covers\.render/);
  assert.match(marketing, /global\.Polaroid\.compose/);
  assert.match(marketing, /polaroidJob\.drawAt/);
  assert.match(marketing, /requestFrame\(animatePolaroid\)/);
  ["heroStripCanvas", "heroMagazineCanvas", "heroPolaroidCanvas"].forEach(function (id) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.ok(marketing.includes('"' + id + '"'), id + " must be wired into marketing.js");
  });
  assert.match(marketing, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(marketing, /if\(!prefersReducedMotion\(\)\)animatePolaroid\(\)/);
  assert.doesNotMatch(html, /<img[^>]+(?:strip|magazine|polaroid)[^>]+(?:output|result)/i);
});

test("keeps the public landing white, pastel and product-first", function () {
  var hero = html.slice(html.indexOf('class="hero-section'), html.indexOf('class="transformation-section'));
  var landing = html.slice(html.indexOf('<section id="landing"'), html.indexOf('<section id="business"'));
  assert.match(hero, /data-start-photobooth/);
  assert.doesNotMatch(hero, /openPersonalSetup|Customise my booth/i);
  assert.doesNotMatch(html, /promise-strip/);
  assert.doesNotMatch(landing, /These examples use the booth.s real Strip, Magazine and Living Polaroid renderers/i);
  assert.match(styles, /--public-white:#ffffff/);
  assert.match(styles, /\.landing-screen\{background:var\(--public-white\)\}/);
  assert.match(styles, /\.strip-demo-card\{background:var\(--party-pink\)\}/);
  assert.match(styles, /\.magazine-demo-card\{background:var\(--party-blue\)\}/);
  assert.match(styles, /\.polaroid-demo-card\{background:var\(--party-yellow\)\}/);
  assert.equal(JSON.parse(manifest).background_color, "#ffffff");
  assert.equal(JSON.parse(manifest).theme_color, "#ffffff");
});

test("keeps the locked Personal pricing visible while checkout stays honest", function () {
  ["£0", "£19", "£49"].forEach(function (price) {
    assert.ok(html.includes(price), price + " must be visible");
  });
  assert.doesNotMatch(html, /Founding Lifetime|£100|£30|£50/);
  assert.match(html, /One Party and Annual are coming soon/);
  assert.match(app, /const BILLING_LIVE=false/);
  assert.match(app, /if\(!BILLING_LIVE\|\|!API_BASE\)/);
});

test("separates public Home, Event Home, Next Guest and Retake semantics", function () {
  var cancel = app.slice(app.indexOf("function cancelCapture"), app.indexOf("function syncReviewModeUI"));
  var enterGuest = app.slice(app.indexOf("function enterGuestBooth"), app.indexOf("async function submitGuestPin"));
  var restart = app.slice(app.indexOf("function beginSharedSession"), app.indexOf("function inAppBrowser"));
  assert.match(html, /id="boothHomeBtn"[^>]*>Home</);
  assert.match(app, /const HISTORY_SURFACE=\{PRODUCT:"product",EVENT_HOME:"event-home",BOOTH:"booth"\}/);
  assert.match(app, /function setBoothReturnScreen\(target\)[\s\S]*?"Event Home":"Home"/);
  assert.match(app, /function teardownBoothSession\(\)[\s\S]*?captureSessionId\+\+[\s\S]*?clearTimeout\(idleTimer\)[\s\S]*?stillRenderToken\+\+[\s\S]*?stopCamera\(\)[\s\S]*?invalidatePolaroid\(\)/);
  assert.match(app, /function teardownBoothSession\(\)[\s\S]*?hideCameraError\(\)[\s\S]*?stopCamera\(\)/);
  assert.match(cancel, /function cancelCapture\(\)\{\s*showBoothReturnScreen\(\);\s*\}/);
  assert.match(app, /function launchFreeBooth\(\)[\s\S]*?setBoothReturnScreen\("landing"\);enterBoothHistory\(\);beginSharedSession\(false\)/);
  assert.match(enterGuest, /setBoothReturnScreen\("welcome"\);\s*enterBoothHistory\(\);\s*beginSharedSession\(false\)/);
  assert.match(app, /\$\("startBtn"\)\.onclick=enterGuestBooth/);
  assert.match(restart, /function beginSharedSession\(retake,options\)\{return beginSession\("shared",\{retake:!!retake,purpose:options&&options\.purpose\}\);\}/);
  assert.match(restart, /function restartCurrentSession\(\)\{[\s\S]*?const options=\{retake:true,purpose:activeCapturePurpose\};[\s\S]*?sharedOutputSession\?beginSharedSession\(true,options\):beginSession\(currentExperience,options\)/);
  assert.match(app, /\$\("nextGuestBtn"\)\.onclick=\(\)=>beginSharedSession\(false\)/);
  assert.match(app, /\$\("retakeBtn"\)\.onclick=restartCurrentSession/);
  assert.match(app, /window\.addEventListener\("popstate",handleHistoryChange\)/);
  assert.match(app, /bootstrapNavigation\(\)/);
  assert.doesNotMatch(app, /showExperienceChooser/);
});

test("keeps an ended event in guest-safe navigation", function () {
  var welcomeMode = app.slice(app.indexOf("function updateWelcomeMode"), app.indexOf("function refreshHostEventStatus"));
  var enterGuest = app.slice(app.indexOf("function enterGuestBooth"), app.indexOf("async function submitGuestPin"));
  var begin = app.slice(app.indexOf("async function beginSession"), app.indexOf("function launchConfetti"));
  assert.match(html, /id="welcomeEndedMessage"/);
  assert.match(welcomeMode, /guestEnded=!hostView&&String\(settings\.eventStatus\|\|"DRAFT"\)==="ENDED"/);
  assert.match(welcomeMode, /\$\("startBtn"\)\.hidden=pinRequired\|\|guestEnded/);
  assert.match(enterGuest, /settings=EVENT\.refreshEventLifecycle\(settings\)[\s\S]*?settings\.eventStatus==="ENDED"[\s\S]*?updateWelcomeMode\(false\);return/);
  assert.match(begin, /settings\.eventStatus==="ENDED"[\s\S]*?showEventHome\(boothExampleMode,false\);return/);
});

test("cancels stale capture work without stopping a newer camera stream", function () {
  var camera = app.slice(app.indexOf("function releaseMediaStream"), app.indexOf("function initAudio"));
  var session = app.slice(app.indexOf("async function beginSession"), app.indexOf("function launchConfetti"));
  assert.match(camera, /const acquired=await navigator\.mediaDevices\.getUserMedia/);
  assert.doesNotMatch(camera, /stream=await navigator\.mediaDevices\.getUserMedia/);
  assert.equal((camera.match(/releaseMediaStream\(acquired\);throw new Error\("cancelled"\)/g) || []).length, 2);
  assert.match(camera, /if\(video&&video\.srcObject===target\)video\.srcObject=null/);
  assert.match(camera, /if\(stream===target\)stream=null/);
  assert.match(session, /await startCamera\(sid\)/);
  assert.match(session, /activeCapturePurpose=purpose;[\s\S]*?hideCameraError\(\)/);
  assert.match(session, /await delay\(420\);[\s\S]*?if\(sid!==captureSessionId\)return;\s*stopCamera\(\)/);
  assert.match(session, /if\(!isHostTest\)\{[\s\S]*?const galleryRecord=await saveSessionToGallery\(photos,sessionOrientation,shared\?"shared":currentExperience,replaceId\);\s*if\(sid!==captureSessionId\)return/);
  assert.match(session, /if\(galleryRecord\)activeGalleryRecordId=galleryRecord\.id/);
  assert.match(session, /const galleryCount=await countGallerySessions\(\);\s*if\(sid!==captureSessionId\)return/);
  assert.match(session, /if\(currentExperience==="polaroid"\)await enterPolaroid\(\);else await renderWithFade\(\);\s*if\(sid!==captureSessionId\)return/);
  var sessionCatch = session.slice(session.indexOf("}catch(err){"));
  assert.ok(sessionCatch.indexOf("sid!==captureSessionId") < sessionCatch.indexOf("stopCamera()"));
});

test("persists one shared source record per guest and reopens all three outputs", function () {
  var record = app.slice(app.indexOf("function galleryRecord"), app.indexOf("function putSession"));
  var save = app.slice(app.indexOf("async function saveSessionToGallery"), app.indexOf("async function storageBudget"));
  var gallery = app.slice(app.indexOf("async function renderEventGallery"), app.indexOf("function persistSettings"));
  var session = app.slice(app.indexOf("async function beginSession"), app.indexOf("function beginSharedSession"));

  assert.match(record, /const hasRecordId=recordId!==null&&recordId!==undefined&&Number\.isFinite\(Number\(recordId\)\)/);
  assert.match(record, /const id=hasRecordId\?Number\(recordId\):Date\.now\(\)/);
  assert.match(record, /experience:experience\|\|"shared"/);
  assert.match(save, /const record=galleryRecord\(sessionPhotos,orientation,experience,recordId\)/);
  assert.match(save, /await putSession\(record\)/);
  assert.match(save, /return record/);

  assert.match(session, /const retaking=!!\(options&&options\.retake\)/);
  assert.match(session, /const replaceId=shared&&retaking&&!isHostTest\?activeGalleryRecordId:null/);
  assert.match(session, /const replacingRecord=replaceId!==null&&replaceId!==undefined&&Number\.isFinite\(Number\(replaceId\)\)/);
  assert.match(session, /if\(!replacingRecord\)activeGalleryRecordId=null/);
  assert.match(session, /if\(!isHostTest\)\{[\s\S]*?if\(!replacingRecord\)\{[\s\S]*?sessionEdition=nextEditionNumber\(galleryCount\)/);

  assert.match(gallery, /const hasThreeSources=session\.photos\.length===3/);
  assert.match(gallery, /sharedOutputSession=hasThreeSources&&\["shared","legacy","strip"\]\.includes\(recordedExperience\)/);
  assert.match(gallery, /currentExperience=sharedOutputSession\?"strip"/);
  assert.match(gallery, /activeGalleryRecordId=null/);
  assert.match(gallery, /resetCreativeState\(currentExperience\)[\s\S]*?buildReviewControls\(\)[\s\S]*?showScreen\("review"\)/);
});

test("clears Business completion for a fresh guest while preserving it for Retake", function () {
  var session = app.slice(app.indexOf("async function beginSession"), app.indexOf("function beginSharedSession"));
  var reset = app.slice(app.indexOf("function resetGuestCompletionState"), app.indexOf("function enterGuestBooth"));
  var teardown = app.slice(app.indexOf("function teardownBoothSession"), app.indexOf("function setBoothReturnScreen"));

  assert.match(session, /const retaking=!!\(options&&options\.retake\)/);
  assert.match(session, /if\(!retaking\)resetGuestCompletionState\(true\)/);
  assert.doesNotMatch(session, /if\(retaking\)resetGuestCompletionState/);
  assert.match(reset, /businessCompletionSatisfied=false/);
  assert.match(reset, /if\(!clearFields\)return/);
  assert.match(reset, /email\.value=""/);
  assert.match(reset, /marketing\.checked=false/);
  assert.match(reset, /publicity\.checked=false/);
  assert.match(teardown, /resetGuestCompletionState\(true\)/);
});

test("matches the Strip framing guide to the contained camera pixels", function () {
  var guide = app.slice(app.indexOf("function syncStripFramingGuide"), app.indexOf("async function startCamera"));
  assert.match(guide, /video\.videoWidth\/video\.videoHeight/);
  assert.match(guide, /shownWidth=boxRatio>sourceRatio\?availableHeight\*sourceRatio:availableWidth/);
  assert.match(guide, /const stripGeometry=STRIP&&typeof STRIP\.geometry==="function"\?STRIP\.geometry\(\):null/);
  assert.match(guide, /const apertureRatio=aperture\?aperture\.w\/aperture\.h:564\/504/);
  assert.match(guide, /guide\.style\.width=cropWidth\+"px"/);
  assert.match(guide, /guide\.style\.left=shownLeft\+\(shownWidth-cropWidth\)\/2\+"px"/);
  assert.match(app, /sessionOrientation=w>=h\?"landscape":"portrait";\s*syncStripFramingGuide\(\)/);
});

test("marks host draft previews through the canonical output surfaces", function () {
  var admin = app.slice(app.indexOf("function renderAdminPreview"), app.indexOf("function scheduleAdminPreview"));
  var polaroid = admin.slice(admin.indexOf('if(adminPreviewType==="polaroid")'), admin.indexOf("const size=Covers.coverSize"));
  var watermark = app.slice(app.indexOf("function drawDraftPreview"), app.indexOf("/* ---------- living polaroid"));
  assert.match(admin, /adminDraft=String\(s\.eventStatus\|\|"DRAFT"\)==="DRAFT"/);
  assert.match(admin, /draft:adminDraft/);
  assert.match(polaroid, /draftPreview:adminDraft/);
  assert.match(polaroid, /if\(prefersReducedMotion\(\)&&!adminPreviewMotionRequested\)\{[\s\S]*?job\.drawStill\(ctx,0\)/);
  assert.match(polaroid, /function drawPreview\(\)[\s\S]*?job\.drawAt/);
  assert.doesNotMatch(polaroid, /drawDraftPreview/, "Polaroid owns one canonical frame watermark");
  assert.match(admin, /Covers\.render\(ctx,\{[\s\S]*?\}\);\s*drawDraftPreview\(ctx,c\.width,c\.height,adminDraft\)/);
  assert.match(watermark, /rotate\(-Math\.PI\/6\)/);
  assert.match(watermark, /globalAlpha=\.18/);
  assert.match(watermark, /fillText\("SAMPLE",0,0\)/);
  assert.doesNotMatch(watermark, /fillRect|strokeRect|DRAFT PREVIEW/, "Magazine watermark remains text-only");
});

test("keeps uploaded design photos separate and feeds all real output renderers", function () {
  var defaults = app.slice(0, app.indexOf("const FRAMES"));
  var globals = app.slice(app.indexOf("let settings;"), app.indexOf("const $="));
  var usePhotos = app.slice(app.indexOf("async function useAdminPreviewPhotos"), app.indexOf("function clearAdminPreviewPhotos"));
  var readPhoto = app.slice(app.indexOf("async function readPreviewPhoto"), app.indexOf("function renderPreviewPhotoThumbs"));
  var previewImages = app.slice(app.indexOf("async function adminPreviewImages"), app.indexOf("async function renderAdminPreview"));
  var admin = app.slice(app.indexOf("async function renderAdminPreview"), app.indexOf("function scheduleAdminPreview"));
  var record = app.slice(app.indexOf("function galleryRecord"), app.indexOf("function putSession"));
  var persist = app.slice(app.indexOf("function persistSettings"), app.indexOf("function nextEditionNumber"));
  var draft = app.slice(app.indexOf("function draftSettings"), app.indexOf("function releaseMediaStream"));

  assert.match(globals, /let photos=\[\]/);
  assert.match(globals, /let adminPreviewPhotos=\[\]/);
  assert.doesNotMatch(defaults, /adminPreviewPhotos|adminPreviewPhotoIndex/);
  assert.doesNotMatch(record, /adminPreviewPhotos/);
  assert.doesNotMatch(persist, /adminPreviewPhotos/);
  assert.doesNotMatch(draft, /adminPreviewPhotos|adminPreviewPhotoIndex/);
  assert.match(html, /id="adminPreviewPhotos"[^>]*type="file"[^>]*accept="image\/\*"[^>]*multiple/);
  assert.match(usePhotos, /Array\.from\(input&&input\.files\|\|\[\]\)\.slice\(0,3\)/);
  assert.match(readPhoto, /URL\.createObjectURL\(file\)/);
  assert.match(readPhoto, /maxEdge=2048,maxPixels=3000000/);
  assert.match(readPhoto, /canvas\.width=Math\.max/);
  assert.match(readPhoto, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.doesNotMatch(readPhoto, /FileReader|readAsDataURL/);
  assert.match(usePhotos, /adminPreviewPhotos=selected/);
  assert.match(usePhotos, /for\(const file of files\)selected\.push\(await readPreviewPhoto\(file\)\)/);
  assert.doesNotMatch(usePhotos, /(?:^|[^\w])photos\s*=|saveSessionToGallery|persistSettings/);
  assert.match(previewImages, /while\(images\.length<3\)images\.push/);
  assert.match(previewImages, /return images\.slice\(0,3\)/);
  assert.doesNotMatch(previewImages, /loadImage/);

  assert.match(admin, /renderStrip\(ctx,c,images,s,adminOrientation,\{[\s\S]*?frameStyle:s\.stripFrame[\s\S]*?filterStyle:s\.stripFilter/);
  assert.match(admin, /const job=Polaroid\.compose\(\{[\s\S]*?images,/);
  assert.match(admin, /Covers\.render\(ctx,\{[\s\S]*?img:images\[Math\.min\(adminPreviewPhotoIndex,images\.length-1\)\]/);
  assert.match(admin, /template:s\.magazineTemplate\|\|"keepsake"/);
});

test("reduced motion holds Polaroids still until the guest explicitly plays", function () {
  var live = app.slice(app.indexOf("async function enterPolaroid"), app.indexOf("async function encodePolaroid"));
  var status = app.slice(app.indexOf("function polaroidStatus"), app.indexOf("async function enterPolaroid"));
  var admin = app.slice(app.indexOf("async function renderAdminPreview"), app.indexOf("function scheduleAdminPreview"));
  var playStart = app.indexOf('$("polaroidPlayBtn").onclick');
  var playHandler = app.slice(playStart, app.indexOf("\n};", playStart) + 3);

  assert.match(live, /const reduced=prefersReducedMotion\(\)&&!motionPlaybackRequested/);
  assert.match(live, /if\(reduced\)\{\s*polaroidJob\.drawStill\(ctx,0\);[\s\S]*?encodePolaroid\(token\);\s*return/);
  assert.match(admin, /if\(prefersReducedMotion\(\)&&!adminPreviewMotionRequested\)\{\s*job\.drawStill\(ctx,0\);[\s\S]*?playMotion\.hidden=false[\s\S]*?return/);
  assert.match(status, /const reducedReady=reduced&&\(polaroidState==="ready"\|\|polaroidState==="unsupported"\)/);
  assert.match(status, /play\.hidden=!\(reducedReady&&sharedOutputSession\)/);
  assert.match(html, /id="polaroidPlayBtn"[^>]*hidden>PLAY MOTION<\/button>/);
  assert.match(html, /id="adminPreviewPlayMotion"[^>]*hidden>PLAY MOTION<\/button>/);
  assert.match(playHandler, /motionPlaybackRequested=true/);
  assert.match(playHandler, /enterPolaroid\(\)/);
});

test("selected states, screen focus and host colours have explicit semantics", function () {
  var sync = app.slice(app.indexOf("function syncReviewModeUI"), app.indexOf("function resetCreativeState"));
  var controls = app.slice(app.indexOf("function buildReviewControls"), app.indexOf("let thumbToken"));
  var focus = app.slice(app.indexOf("function focusScreenHeading"), app.indexOf("function delay"));
  var setup = app.slice(app.indexOf("function setSetupStep"), app.indexOf("function openPersonalSettings"));
  var contrast = app.slice(app.indexOf("function colourLuminance"), app.indexOf("function eventMeta"));
  var paletteSync = app.slice(app.indexOf("function syncPaletteUI"), app.indexOf("function eventMeta"));

  assert.match(html, /id="reviewModeNav"[^>]*role="tablist"/);
  assert.match(sync, /setAttribute\("aria-selected",String\(selected\)\)/);
  assert.match(sync, /setAttribute\("aria-pressed",String\(selected\)\)/);
  assert.match(sync, /panel\.setAttribute\("aria-hidden",String\(!active\)\)/);
  assert.match(controls, /aria-label","Choose photo "\+\(i\+1\)\+" of "\+photos\.length\+" for the Magazine cover"/);
  assert.match(controls, /setAttribute\("aria-pressed",String\(coverIndex===i\)\)/);

  assert.match(focus, /const selectors=\{welcome:"#welcomeTitle",camera:"#cameraExperienceLabel",review:"#resultsKicker",settings:"#settingsTitle"\}/);
  assert.match(focus, /target\.focus\(\{preventScroll:id==="camera"\|\|id==="review"\}\)/);
  assert.match(focus, /if\(!options\|\|options\.focus!==false\)focusScreenHeading\(id\)/);
  assert.match(setup, /button\.setAttribute\("aria-selected",String\(active\)\)/);
  assert.match(setup, /button\.setAttribute\("aria-current","step"\)/);
  assert.match(setup, /heading\.focus\(\{preventScroll:false\}\)/);

  assert.match(contrast, /function contrastRatio\(first,second\)/);
  assert.match(contrast, /contrastRatio\(background,"#111111"\)>=contrastRatio\(background,"#ffffff"\)/);
  assert.match(contrast, /EVENT\.safeForeground\(background\)/);
  assert.match(contrast, /style\.setProperty\("--accent-ink",safeForeground\(palette\.primary\)\)/);
  assert.match(contrast, /style\.setProperty\("--event-accent-ink",safeForeground\(palette\.primary\)\)/);
  assert.match(paletteSync, /document\.querySelectorAll\('input\[name="eventPalette"\]'\)/);
  assert.match(paletteSync, /input\.checked=input\.value===palette\.id/);
  assert.match(paletteSync, /--palette-primary-ink",safeForeground\(option\.primary\)/);
  assert.match(paletteSync, /--palette-secondary-ink",safeForeground\(option\.secondary\)/);
  assert.match(paletteSync, /--palette-highlight-ink",safeForeground\(option\.highlight\)/);
});

test("propagates one curated palette through host state and every personalised surface", function () {
  var defaults = app.slice(0, app.indexOf("const FRAMES"));
  var eventPalette = app.slice(app.indexOf("function applyEventPalette"), app.indexOf("function syncPaletteUI"));
  var draft = app.slice(app.indexOf("function draftSettings"), app.indexOf("function releaseMediaStream"));
  var branding = app.slice(app.indexOf("function normaliseBranding"), app.indexOf("function setEntitlement"));
  var polaroidOptions = app.slice(app.indexOf("function polaroidOptions"), app.indexOf("function invalidatePolaroid"));
  var paletteHandler = app.slice(app.indexOf("document.querySelectorAll('input[name=\"eventPalette\"]')"), app.indexOf('$("resetSettings")'));
  var panel = html.slice(html.indexOf('id="setupPanel1"'), html.indexOf('id="setupPanel2"'));
  var paletteIds = Array.from(panel.matchAll(/name="eventPalette"[^>]*value="([^"]+)"/g), function (match) { return match[1]; });

  assert.match(defaults, /schemaVersion:2/);
  assert.match(defaults, /paletteId:"lilac-pop"/);
  assert.match(defaults, /palettePrimary:"#66519c"/);
  assert.match(defaults, /paletteSecondary:"#eee6ff"/);
  assert.match(defaults, /paletteHighlight:"#ffdce8"/);
  assert.doesNotMatch(defaults, /(?:^|\s)(?:look|accent):/m);

  assert.deepEqual(paletteIds, ["lilac-pop", "pink-party", "blue-sky", "sunshine"]);
  assert.match(panel, /fieldset[^>]+aria-labelledby="chooseLookTitle"[^>]+aria-describedby="eventPaletteHelp"/);
  assert.equal((panel.match(/class="palette-card"/g) || []).length, 4);
  assert.doesNotMatch(panel, /id="setLook"|id="setAccent"|data-accent/);

  assert.match(eventPalette, /--event-surface",palette\.secondary/);
  assert.match(eventPalette, /--event-accent",palette\.primary/);
  assert.match(eventPalette, /--event-accent-ink",safeForeground\(palette\.primary\)/);
  assert.match(eventPalette, /--event-shape",palette\.highlight/);
  assert.match(eventPalette, /--event-ink",safeForeground\(palette\.secondary\)/);
  assert.match(draft, /input\[name="eventPalette"\]:checked/);
  assert.match(draft, /paletteId:palette\.id/);
  assert.match(draft, /palettePrimary:palette\.primary/);
  assert.match(draft, /paletteSecondary:palette\.secondary/);
  assert.match(draft, /paletteHighlight:palette\.highlight/);
  assert.match(branding, /primaryColor:x\.primaryColor\|\|palette\.primary/);
  assert.match(branding, /secondaryColor:x\.secondaryColor\|\|palette\.highlight/);
  assert.match(polaroidOptions, /backdrop:palette\.secondary/);
  assert.ok((app.match(/accent:palette\.primary/g) || []).length >= 4);
  assert.ok((app.match(/accentInk:safeForeground\(palette\.primary\)/g) || []).length >= 3);
  assert.ok((app.match(/backdrop:palette\.secondary/g) || []).length >= 3);
  assert.match(paletteHandler, /syncPaletteUI\(input\.value\)/);
  assert.match(paletteHandler, /applyRootPalette\(input\.value\)/);
  assert.match(paletteHandler, /renderAdminPreview\(\)/);
  assert.doesNotMatch(app, /setLook|setAccent|data-accent|EVENT_LOOKS|settings\.accent|s\.accent/);
});

test("keeps Business output colours isolated while Personal previews stay curated", function () {
  var resolver = app.slice(app.indexOf("function outputPalette"), app.indexOf("function applyRootPalette"));
  var movingCapture = app.slice(app.indexOf("async function captureMovingPolaroid"), app.indexOf("async function beginSession"));
  var thumbnails = app.slice(app.indexOf("async function renderStyleThumbs"), app.indexOf("function setMode"));
  var magazine = app.slice(app.indexOf("function renderMagazine"), app.indexOf("function drawDraftPreview"));
  var polaroidOptions = app.slice(app.indexOf("function polaroidOptions"), app.indexOf("function invalidatePolaroid"));
  var stripRenderer = app.slice(app.indexOf("function renderStrip"), app.indexOf("window.MyBishBashRenderers"));
  var admin = app.slice(app.indexOf("async function renderAdminPreview"), app.indexOf("function scheduleAdminPreview"));

  assert.match(resolver, /if\(options&&options\.personal\)return palette/);
  assert.match(resolver, /entitlement===ENTITLEMENTS\.BUSINESS/);
  assert.match(resolver, /primary=businessBrand\.primaryColor\|\|palette\.primary/);
  assert.match(resolver, /secondary=businessBrand\.secondaryColor\|\|palette\.secondary/);
  assert.match(resolver, /return \{\.\.\.palette,primary,secondary,highlight:secondary\}/);
  assert.match(movingCapture, /const palette=outputPalette\(settings\)/);
  assert.match(thumbnails, /const palette=outputPalette\(settings\)/);
  assert.match(magazine, /palette=outputPalette\(settings\)/);
  assert.match(polaroidOptions, /const palette=outputPalette\(settings\)/);
  assert.match(stripRenderer, /outputPalette\(s,\{personal:creative&&creative\.paletteMode==="personal"\}\)/);
  assert.match(admin, /paletteMode:"personal"/);
  assert.match(marketing, /paletteMode:"personal"/);
  assert.match(styles, /\.confetti:nth-child\(3n\)\{background:var\(--palette-secondary,#eee6ff\)\}/);
  assert.match(styles, /\.confetti:nth-child\(4n\)\{background:var\(--palette-highlight,#ffdce8\)\}/);
});

test("derives safe Magazine foregrounds without changing renderer geometry", function () {
  var press = covers.slice(covers.indexOf("function tplPress"), covers.indexOf("const RENDERERS"));
  var branding = covers.slice(covers.indexOf("function colourLuminance"), covers.indexOf("function render(ctx,opts)"));
  var render = covers.slice(covers.indexOf("function render(ctx,opts)"), covers.indexOf("/* Stand-in"));

  assert.match(press, /const \{ctx,W,H,u,M,land,copy,accent,accentInk\}=L/);
  assert.match(press, /ctx\.fillStyle=accent;ctx\.fillRect\(chip\.x,chip\.y,chip\.w,chip\.h\);\s*ctx\.fillStyle=accentInk/);
  assert.match(branding, /function contrastRatio\(first,second\)/);
  assert.match(branding, /function safeForeground\(background\)/);
  assert.match(branding, /const fg=safeForeground\(bg\)/);
  assert.doesNotMatch(branding, /hexLuma|>\.62/);
  assert.match(render, /accentInk:opts\.accentInk\|\|safeForeground\(accent\)/);
  assert.match(render, /\(RENDERERS\[opts\.template\]\|\|tplKeepsake\)\(L\)/);
});

test("collapses transient booth history and replaces example Event Home state", function () {
  var restore = app.slice(app.indexOf("function restoreHistorySurface"), app.indexOf("function handleHistoryChange"));
  var enterEvent = app.slice(app.indexOf("function enterEventHome"), app.indexOf("function enterBoothHistory"));
  var savePersonal = app.slice(app.indexOf("async function savePersonalSettings"), app.indexOf("function launchFreeBooth"));
  assert.match(restore, /next\.surface===HISTORY_SURFACE\.BOOTH[\s\S]*?history\.back&&history\.length>1[\s\S]*?history\.back\(\)/);
  assert.match(app, /let historyTransitionPending=false/);
  assert.match(app, /function handleHistoryChange\(event\)\{\s*historyTransitionPending=false/);
  assert.match(enterEvent, /current\.surface===HISTORY_SURFACE\.EVENT_HOME[\s\S]*?history\.replaceState\(next/);
  assert.ok(enterEvent.indexOf("history.replaceState") < enterEvent.indexOf("showEventHome(example,hostView)"));
  assert.match(savePersonal, /if\(boothExampleMode\)\{temporarySettingsSnapshot=null;boothExampleMode=false;\}/);
  assert.match(app, /function productBasePath\(\)[\s\S]*?location\.pathname\.replace\(\/\\\/business\\\/\?\$\/,"\/"\)/);
  assert.match(app, /function productURL\(route\)[\s\S]*?route==="business"[\s\S]*?"\/business":base/);
  assert.match(app, /const url=productURL\(productRoute\)/);
  assert.match(app, /history\.replaceState\(productHistoryState\(productRoute\),"",productURL\(productRoute\)\)/);
});

test("keeps magazine grading independent from Strip filters and older Safari canvas filters", function () {
  assert.match(app, /Covers\.applyGrade\(photoContext,destination\.x,destination\.y,destination\.w,destination\.h,filterCSS\(chosenFilter\)\)/);
  assert.doesNotMatch(covers.replace(/\/\*[\s\S]*?\*\//g, ""), /\.filter\s*=/);
  assert.doesNotMatch(polaroid.replace(/\/\*[\s\S]*?\*\//g, ""), /\.filter\s*=/);
  assert.doesNotMatch(app.replace(/\/\*[\s\S]*?\*\//g, ""), /\.filter\s*=/);
  assert.match(app, /Covers\.render\(ctx,\{/);
});

test("migrates legacy local data without deleting its source identifiers", function () {
  assert.match(app, /const SETTINGS_KEY="mybishbashPhotoboothSettingsV1"/);
  assert.match(app, /const LEGACY_SETTINGS_KEY="raePhotoBoothLiveSettings"/);
  assert.match(app, /const GALLERY_DB="mybishbashPhotoboothGallery"/);
  assert.match(app, /const LEGACY_GALLERY_DB="raePhotoBoothGallery"/);
  assert.match(app, /legacySettingsImported\|\|!!localStorage\.getItem\(LEGACY_SETTINGS_KEY\)/);
  assert.doesNotMatch(app, /deleteDatabase\(LEGACY_GALLERY_DB\)/);
  assert.doesNotMatch(app, /removeItem\(LEGACY_SETTINGS_KEY\)/);
});

test("persists migrated EventConfig identity and keeps Setup Passes sparse", function () {
  var load = app.slice(app.indexOf("function loadSettings"), app.indexOf("function colourLuminance"));
  var setupPass = app.slice(app.indexOf("async function setupPassLink"), app.indexOf("async function copySetupPass"));
  assert.match(load, /const serialised=JSON\.stringify\(migrated\)/);
  assert.match(load, /localStorage\.setItem\(SETTINGS_KEY,serialised\)/);
  assert.match(load, /delete eventDefaults\.eventType/);
  assert.match(load, /delete eventDefaults\.datePrecision/);
  assert.match(load, /delete eventDefaults\.schemaVersion/);
  assert.ok(
    app.indexOf("settings=loadSettings()") > app.indexOf("function migrateSettings"),
    "legacy migration constants must exist before settings are loaded"
  );
  assert.match(load, /delete eventDefaults\.paletteId/);
  assert.match(load, /delete eventDefaults\.palettePrimary/);
  assert.match(load, /delete eventDefaults\.paletteSecondary/);
  assert.match(load, /delete eventDefaults\.paletteHighlight/);
  assert.match(setupPass, /EVENT\.encodeSetupPass\(draft,\{defaults:DEFAULTS\}\)/);
});

test("keeps unpaid Personal drafts out of the real Free booth", function () {
  var pricingHandler = app.slice(
    app.indexOf('$("choosePersonalPlan").onclick'),
    app.indexOf('$("openPersonalSetup").onclick')
  );
  assert.match(pricingHandler, /showProductRoute\("personal",true\)/);
  assert.doesNotMatch(pricingHandler, /settings=draftSettings\(\)/);
  assert.match(app, /function launchFreeBooth\(\)\{[\s\S]*?restoreTemporarySettings\(\)/);
  assert.match(app, /!capabilities\.canPersonaliseEvent&&!legacyProfileAvailable[\s\S]*?settings=EVENT\?EVENT\.createEventConfig\(DEFAULTS/);
  assert.match(app, /function showProductRoute\(route,push,replace\)[\s\S]*?restoreTemporarySettings\(\)/);
});

test("requires a finite unexpired server token for cached Personal access", function () {
  assert.match(app, /Number\.isFinite\(expiry\)&&expiry>Date\.now\(\)/);
  assert.match(app, /if\(!accessToken\|\|!Number\.isFinite\(expiry\)\|\|expiry<=Date\.now\(\)\)return null/);
  assert.match(app, /personalPlans\.indexOf\(plan\)===-1/);
  assert.doesNotMatch(app, /!Number\.isFinite\(expiry\)\|\|expiry>Date\.now\(\)/);
});

test("caches the complete local-first product shell", function () {
  [
    "./product.js",
    "./marketing.js",
    "./assets/demo-photos.jpg",
    "./covers.js",
    "./polaroid.js",
    "./mp4.js",
    "./event.js",
    "./strip.js",
    "./motion.js",
    "./landing.js"
  ].forEach(function (asset) {
    assert.ok(serviceWorker.includes(JSON.stringify(asset)), asset + " must remain available offline");
  });
  assert.match(serviceWorker, /fetch\(request,\{cache:"no-store"\}\)/);
  assert.match(serviceWorker, /CACHEABLE_ASSET_URLS\.has\(cacheKey\.href\)/);
  assert.match(serviceWorker, /if\(cacheable&&response\.status===200/);
  assert.match(serviceWorker, /if\(cacheable\)\{[\s\S]*?cache\.match\(request\)/);
});

test("does not force-reload safe-worker booths or cache product API responses", function () {
  var legacySet = serviceWorker.slice(
    serviceWorker.indexOf("const LEGACY_CACHES"),
    serviceWorker.indexOf("self.addEventListener(\"install\"")
  );
  assert.match(legacySet, /rae-photo-booth-live-v7/);
  assert.doesNotMatch(legacySet, /rae-photo-booth-live-v(?:8|9|10|11)/);
  var assetList = serviceWorker.slice(serviceWorker.indexOf("const ASSETS"), serviceWorker.indexOf("const CACHEABLE_ASSET_URLS"));
  assert.doesNotMatch(assetList, /\/v1\//);
  assert.match(serviceWorker, /const CACHE="mybishbash-photobooth-v8"/);
});

test("keeps internal plans, tests and credentials out of the static deployment", function () {
  [".claude/", ".env*", "README.md", "WORK.md", "docs/", "tests/", "worker/", "package.json", "package-lock.json", "playwright.config.js"].forEach(function (entry) {
    assert.ok(vercelIgnore.split(/\r?\n/).includes(entry), entry + " must be excluded from the static artefact");
  });
});

test("loads capabilities before the booth and demo integrations", function () {
  var product = html.indexOf('src="product.js"');
  var appScript = html.indexOf('src="app.js"');
  var marketing = html.indexOf('src="marketing.js"');
  assert.ok(product >= 0 && appScript > product && marketing > appScript);
});

test("keeps every literal application DOM reference present and every id unique", function () {
  var ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), function (match) { return match[1]; });
  var idSet = new Set(ids);
  var references = Array.from(app.matchAll(/\$\("([^"]+)"\)/g), function (match) { return match[1]; });
  assert.equal(idSet.size, ids.length, "HTML ids must be unique");
  assert.deepEqual(references.filter(function (id) { return !idSet.has(id); }), []);
});
