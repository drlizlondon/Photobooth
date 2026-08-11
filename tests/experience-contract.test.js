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
var html = source("index.html");

/* Extract one declaration by balanced braces so each assertion stays within
   the behaviour it protects. This deliberately avoids a regex spanning most
   of app.js, which would turn unrelated refactors into false failures. */
function functionSource(name) {
  var signature = new RegExp("(?:async\\s+)?function\\s+" + name + "\\s*\\(");
  var match = signature.exec(app);
  assert.ok(match, "missing function " + name);
  var start = match.index;
  var brace = app.indexOf("{", start + match[0].length);
  assert.ok(brace >= 0, "missing function body for " + name);

  var depth = 0;
  var quote = "";
  var escaped = false;
  var lineComment = false;
  var blockComment = false;
  for (var index = brace; index < app.length; index += 1) {
    var char = app[index];
    var next = app[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return app.slice(start, index + 1);
    }
  }
  assert.fail("unterminated function " + name);
}

function section(id) {
  var start = html.indexOf('<section id="' + id + '"');
  assert.ok(start >= 0, "missing #" + id + " section");
  var end = html.indexOf("</section>", start);
  assert.ok(end > start, "unterminated #" + id + " section");
  return html.slice(start, end + 10);
}

function handlerLine(id) {
  var marker = '$("' + id + '").onclick';
  var start = app.indexOf(marker);
  assert.ok(start >= 0, "missing click handler for #" + id);
  return app.slice(start, app.indexOf("\n", start));
}

test("loads a first-class experience chooser with all three capture experiences", function () {
  var chooser = section("experience");
  var experiences = Array.from(chooser.matchAll(/data-experience="([^"]+)"/g), function (match) {
    return match[1];
  });

  assert.deepEqual(experiences, ["strip", "polaroid", "magazine"]);
  assert.match(chooser, /id="experienceHomeBtn"/);
  assert.match(html, /id="motionCanvas"/);
  assert.ok(html.indexOf('<script src="motion.js"></script>') < html.indexOf('<script src="app.js"></script>'));
});

test("locks Strip to three stills, Magazine to one still and Polaroid to real motion", function () {
  var session = functionSource("beginSession");
  var moving = functionSource("captureMovingPolaroid");

  assert.match(session, /currentExperience==="polaroid"/);
  assert.match(session, /await captureMovingPolaroid\(sid\)/);
  assert.match(session, /const total=currentExperience==="strip"\?3:1/);
  assert.match(session, /currentExperience==="magazine"\?"ONE HERO PHOTO"/);

  assert.match(moving, /Polaroid\.composeLive\(/);
  assert.match(moving, /MOTION\.inspectSupport\(canvas\)/);
  assert.match(moving, /MOTION\.record\(\{/);
  assert.match(moving, /motionMs:2500/);
  assert.match(moving, /holdMs:1000/);
  assert.match(moving, /fps:30/);
  assert.match(moving, /drawMotionFrame\(ctx\)\{compositor\.drawLive\(ctx,video\);\}/);
  assert.match(moving, /drawFinalStill\(ctx\)\{captureFinal\(\);compositor\.drawFinalStill\(ctx,frozenSource\);\}/);
});

test("Next Guest resets to the chooser while Retake repeats the current experience", function () {
  var chooser = functionSource("showExperienceChooser");
  var nextGuest = handlerLine("nextGuestBtn");
  var retake = handlerLine("retakeBtn");

  assert.match(chooser, /teardownBoothSession\(\)/);
  assert.match(chooser, /showScreen\("experience"\)/);
  assert.equal(nextGuest.trim(), '$("nextGuestBtn").onclick=showExperienceChooser;');
  assert.equal(retake.trim(), '$("retakeBtn").onclick=()=>beginSession(currentExperience);');
});

test("Event Home remains the explicit event-welcome destination", function () {
  var chooser = functionSource("showExperienceChooser");
  var returnHome = functionSource("showBoothReturnScreen");
  var enterGuest = functionSource("enterGuestBooth");

  assert.match(chooser, /boothReturnScreen==="welcome"\?"Event Home":"Home"/);
  assert.equal(handlerLine("experienceHomeBtn").trim(), '$("experienceHomeBtn").onclick=showBoothReturnScreen;');
  assert.match(returnHome, /boothReturnScreen==="welcome"/);
  assert.match(returnHome, /showEventHome\(boothExampleMode,false\)/);
  assert.match(returnHome, /surface:HISTORY_SURFACE\.EVENT_HOME/);
  assert.match(enterGuest, /setBoothReturnScreen\("welcome"\)/);
  assert.match(enterGuest, /showExperienceChooser\(\)/);
});

test("preserves the recorder's real extension and media type through Share and Save", function () {
  var moving = functionSource("captureMovingPolaroid");
  var share = functionSource("shareCurrent");
  var save = functionSource("saveCurrent");

  assert.match(moving, /motionCaptureExtension=result\.extension\|\|"mp4"/);
  assert.match(share, /motionCaptureBlob\?motionCaptureExtension/);
  assert.match(share, /const mime=video\?\(blob\.type\|\|\(videoExt==="webm"\?"video\/webm":"video\/mp4"\)\):"image\/png"/);
  assert.match(share, /new File\(\[blob\],name,\{type:mime\}\)/);
  assert.match(save, /motionCaptureBlob\?motionCaptureExtension/);
  assert.match(save, /download\(polaroidVideoBlob,ext\)/);
});

test("invalidates pending exports before a different guest session can use their result", function () {
  var session = functionSource("beginSession");
  var teardown = functionSource("teardownBoothSession");
  var share = functionSource("shareCurrent");
  var save = functionSource("saveCurrent");

  assert.match(teardown, /captureSessionId\+\+/);
  assert.match(teardown, /exportBusy=false/);
  assert.match(session, /captureSessionId\+\+[\s\S]*?exportBusy=false/);
  [share, save].forEach(function (operation) {
    assert.match(operation, /const exportSession=captureSessionId/);
    assert.match(operation, /if\(exportSession!==captureSessionId\)return/);
    assert.match(operation, /if\(exportSession===captureSessionId\)\{exportBusy=false;refreshExportControls\(\);\}/);
  });
});

test("offers the exact Polaroid still as a separate PNG action", function () {
  var reset = functionSource("resetCreativeState");
  var stillHandler = handlerLine("stillPhotoBtn");
  var handlerStart = app.indexOf(stillHandler);
  var handlerEnd = app.indexOf("\n};", handlerStart);
  var handler = app.slice(handlerStart, handlerEnd + 3);

  assert.match(html, /id="stillPhotoBtn"[^>]*hidden>Still photo<\/button>/);
  assert.match(reset, /\$\("stillPhotoBtn"\)\.hidden=currentMode!=="polaroid"/);
  assert.match(handler, /polaroidPrintBlob\(\)/);
  assert.match(handler, /download\([^;]+,"png"\)/);
  assert.match(handler, /const exportSession=captureSessionId/);
  assert.match(handler, /if\(exportSession!==captureSessionId\)return/);
  assert.doesNotMatch(handler, /motionCaptureBlob|polaroidVideoBlob/);
});
