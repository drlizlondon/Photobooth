"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("node:fs");
var path = require("node:path");
var vm = require("node:vm");

function rendererHarness() {
  var canvases = [];
  var coverCalls = [];
  var finishCalls = [];

  function Context(canvas) {
    this.canvas = canvas;
    this.draws = [];
    this.text = [];
    this.stateDepth = 0;
    this.globalAlpha = 1;
  }
  Context.prototype.save = function () { this.stateDepth += 1; };
  Context.prototype.restore = function () { this.stateDepth -= 1; };
  Context.prototype.setTransform = function () {};
  Context.prototype.clearRect = function () {};
  Context.prototype.fillRect = function () {};
  Context.prototype.strokeRect = function () {};
  Context.prototype.beginPath = function () {};
  Context.prototype.moveTo = function () {};
  Context.prototype.arcTo = function () {};
  Context.prototype.closePath = function () {};
  Context.prototype.clip = function () {};
  Context.prototype.fill = function () {};
  Context.prototype.translate = function () {};
  Context.prototype.rotate = function () {};
  Context.prototype.scale = function () {};
  Context.prototype.stroke = function () {};
  Context.prototype.strokeText = function () {};
  Context.prototype.fillText = function (value) { this.text.push(String(value)); };
  Context.prototype.measureText = function (value) { return { width: String(value).length * 8 }; };
  Context.prototype.drawImage = function (source) { this.draws.push(source); };
  Context.prototype.createPattern = function () { return {}; };
  Context.prototype.createLinearGradient = function () { return { addColorStop: function () {} }; };
  Context.prototype.createImageData = function (w, h) {
    return { data: new Uint8ClampedArray(w * h * 4) };
  };
  Context.prototype.putImageData = function () {};

  function Canvas() {
    this.width = 0;
    this.height = 0;
    this.context = new Context(this);
    canvases.push(this);
  }
  Canvas.prototype.getContext = function () { return this.context; };

  var document = {
    createElement: function (name) {
      assert.equal(name, "canvas");
      return new Canvas();
    }
  };
  var Covers = {
    firstName: function () { return "Sophie"; },
    eventAge: function () { return null; },
    ordinal: function (value) { return String(value); },
    heartPath: function () {},
    drawPhotoCover: function (ctx, source, x, y, w, h, anchorY) {
      coverCalls.push({ ctx: ctx, source: source, x: x, y: y, w: w, h: h, anchorY: anchorY });
    },
    polaroidFinish: function (ctx, x, y, w, h) {
      finishCalls.push({ ctx: ctx, x: x, y: y, w: w, h: h });
    }
  };
  var window = { document: document, Covers: Covers, console: console };
  var sandbox = {
    window: window,
    document: document,
    Covers: Covers,
    console: console,
    Uint8ClampedArray: Uint8ClampedArray
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../polaroid.js"), "utf8"), sandbox);

  return {
    Polaroid: window.Polaroid,
    Canvas: Canvas,
    canvases: canvases,
    coverCalls: coverCalls,
    finishCalls: finishCalls
  };
}

test("live compositor preserves canonical Polaroid geometry and chrome", function () {
  var h = rendererHarness();
  var live = h.Polaroid.composeLive({
    base: 600,
    copy: { line1: "Sophie's Hen ♡", line2: "16.05.27" },
    attribution: { text: "MYBISHBASH PHOTOBOOTH" }
  });
  assert.deepEqual(live.geo, h.Polaroid.size(600));
  assert.equal(live.draftPreview, false);
  assert.equal(typeof h.Polaroid.compose, "function", "the original still compositor remains available");
});

test("three-photo compositor builds and displays every captured plate", function () {
  var h = rendererHarness();
  var images = [
    { id: "first", width: 1600, height: 1200 },
    { id: "second", width: 1200, height: 1600 },
    { id: "third", width: 1920, height: 1080 }
  ];
  var job = h.Polaroid.compose({ base: 600, images: images, transition: "cut" });
  var output = new h.Canvas();

  assert.deepEqual(h.coverCalls.map(function (call) { return call.source.id; }), ["first", "second", "third"]);
  var plates = h.coverCalls.map(function (call) { return call.ctx.canvas; });

  job.drawAt(output.context, 0.2);
  job.drawAt(output.context, 0.8);
  job.drawAt(output.context, 2.2);

  var usedPlateIndexes = output.context.draws
    .filter(function (source) { return plates.indexOf(source) !== -1; })
    .map(function (source) { return plates.indexOf(source); });
  assert.deepEqual(usedPlateIndexes, [0, 1, 2], "the timeline reaches every captured photograph");
});

test("live and final frames share crop and finish while the final still freezes exactly once", function () {
  var h = rendererHarness();
  var live = h.Polaroid.composeLive({ base: 600, anchorY: 0.42 });
  var output = new h.Canvas();
  var movingSource = { id: "moving", videoWidth: 1920, videoHeight: 1080 };
  var laterSource = { id: "later", videoWidth: 1920, videoHeight: 1080 };

  assert.equal(live.drawLive(output.context, movingSource), true);
  assert.equal(live.hasFinalStill(), false);
  assert.equal(live.drawFinalStill(output.context, movingSource), true);
  assert.equal(live.hasFinalStill(), true);
  assert.equal(live.drawFinalStill(output.context, laterSource), true);

  assert.deepEqual(h.coverCalls.map(function (call) { return call.source.id; }), ["moving", "moving"]);
  assert.deepEqual(h.coverCalls.map(function (call) { return call.anchorY; }), [0.42, 0.42]);
  assert.equal(h.finishCalls.length, 2);
  assert.equal(output.context.draws.length, 6, "each output frame draws one plate and one immutable chrome layer");

  live.resetFinalStill();
  assert.equal(live.hasFinalStill(), false);
  live.drawFinalStill(output.context, laterSource);
  assert.deepEqual(h.coverCalls.map(function (call) { return call.source.id; }), ["moving", "moving", "later"]);
});

test("optional DRAFT PREVIEW mark is composited over every live and held frame", function () {
  var h = rendererHarness();
  var live = h.Polaroid.composeLive({ base: 600, draftPreview: true });
  var output = new h.Canvas();
  var source = { videoWidth: 1280, videoHeight: 720 };

  live.drawLive(output.context, source);
  live.drawFinalStill(output.context, source);

  assert.equal(live.draftPreview, true);
  assert.equal(output.context.draws.length, 6, "plate, chrome and watermark are drawn on both frames");
  assert.ok(h.canvases.some(function (canvas) {
    return canvas.context.text.indexOf("DRAFT PREVIEW") !== -1;
  }), "the stationary overlay contains the conspicuous draft label");
});

test("unready camera sources cannot silently become a final photograph", function () {
  var h = rendererHarness();
  var live = h.Polaroid.composeLive({ base: 600 });
  var output = new h.Canvas();

  assert.equal(live.drawLive(output.context, { videoWidth: 0, videoHeight: 0 }), false);
  assert.equal(live.captureFinalStill({ width: 0, height: 0 }), false);
  assert.equal(live.hasFinalStill(), false);
  assert.throws(function () { live.drawFinalStill(output.context); }, /Capture the final photograph/);
});
