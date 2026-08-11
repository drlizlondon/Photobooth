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

test("sends public Start to the experience chooser before the existing capture engine", function () {
  var launch = app.slice(app.indexOf("function launchFreeBooth"), app.indexOf("function previewExampleBooth"));
  assert.match(launch, /enterBoothHistory\(\);showExperienceChooser\(\)/);
  assert.match(app, /document\.querySelectorAll\("\[data-start-photobooth\]"\)/);
  assert.doesNotMatch(launch, /(checkout|register|email)/i);
  assert.match(html, /id="experience"/);
  ["strip", "polaroid", "magazine"].forEach(function (experience) {
    assert.match(html, new RegExp('data-experience="' + experience + '"'));
  });
  assert.match(app, /const total=currentExperience==="strip"\?3:1/);
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
  assert.match(html, /id="boothHomeBtn"[^>]*>Home</);
  assert.match(app, /const HISTORY_SURFACE=\{PRODUCT:"product",EVENT_HOME:"event-home",BOOTH:"booth"\}/);
  assert.match(app, /function setBoothReturnScreen\(target\)[\s\S]*?"Event Home":"Home"/);
  assert.match(app, /function teardownBoothSession\(\)[\s\S]*?captureSessionId\+\+[\s\S]*?clearTimeout\(idleTimer\)[\s\S]*?stillRenderToken\+\+[\s\S]*?stopCamera\(\)[\s\S]*?invalidatePolaroid\(\)/);
  assert.match(app, /function cancelCapture\(\)[\s\S]*?boothReturnScreen==="welcome"[\s\S]*?showExperienceChooser\(\)[\s\S]*?showBoothReturnScreen\(\)/);
  assert.match(app, /function launchFreeBooth\(\)[\s\S]*?setBoothReturnScreen\("landing"\);enterBoothHistory\(\);showExperienceChooser\(\)/);
  assert.match(app, /\$\("startBtn"\)\.onclick=enterGuestBooth/);
  assert.match(app, /\$\("nextGuestBtn"\)\.onclick=showExperienceChooser/);
  assert.match(app, /\$\("retakeBtn"\)\.onclick=\(\)=>beginSession\(currentExperience\)/);
  assert.match(app, /window\.addEventListener\("popstate",handleHistoryChange\)/);
  assert.match(app, /bootstrapNavigation\(\)/);
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
  assert.match(session, /await delay\(420\);[\s\S]*?if\(sid!==captureSessionId\)return;\s*stopCamera\(\)/);
  assert.match(session, /await saveSessionToGallery\(photos,sessionOrientation,currentExperience\);\s*if\(sid!==captureSessionId\)return/);
  assert.match(session, /const galleryCount=await countGallerySessions\(\);\s*if\(sid!==captureSessionId\)return/);
  assert.match(session, /if\(currentExperience==="polaroid"\)await enterPolaroid\(\);else await renderWithFade\(\);\s*if\(sid!==captureSessionId\)return/);
  var sessionCatch = session.slice(session.indexOf("}catch(err){"));
  assert.ok(sessionCatch.indexOf("sid!==captureSessionId") < sessionCatch.indexOf("stopCamera()"));
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
  assert.match(admin, /const adminDraft=String\(s\.eventStatus\|\|"DRAFT"\)==="DRAFT"/);
  assert.match(admin, /draft:adminDraft/);
  assert.equal((admin.match(/drawDraftPreview\(ctx,c\.width,c\.height,adminDraft\)/g) || []).length, 2);
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
  var load = app.slice(app.indexOf("function loadSettings"), app.indexOf("const EVENT_LOOKS"));
  var setupPass = app.slice(app.indexOf("async function setupPassLink"), app.indexOf("async function copySetupPass"));
  assert.match(load, /const serialised=JSON\.stringify\(migrated\)/);
  assert.match(load, /localStorage\.setItem\(SETTINGS_KEY,serialised\)/);
  assert.match(load, /delete eventDefaults\.eventType/);
  assert.match(load, /delete eventDefaults\.datePrecision/);
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
  assert.match(serviceWorker, /const CACHE="mybishbash-photobooth-v4"/);
});

test("keeps internal plans, tests and credentials out of the static deployment", function () {
  [".claude/", ".env*", "README.md", "WORK.md", "docs/", "tests/", "worker/"].forEach(function (entry) {
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
