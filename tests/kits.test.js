"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("node:fs");
var path = require("node:path");
var Kits = require("../kits.js");
var Event = require("../event.js");

/* PB-31 — Booth Kits are pure config: a new kit is a new object in KITS,
   never a new code path. These assertions pin that contract mechanically
   rather than trusting a description, and pin the "never call it a
   template" naming rule the same way. */

test("ships exactly the four founder-confirmed starter kits, no Corporate kit", function () {
  assert.deepEqual(Kits.KIT_IDS, ["birthday", "wedding", "kids-party", "minimal"]);
  Kits.KITS.forEach(function (kit) {
    assert.notEqual(String(kit.name).toLowerCase(), "corporate");
  });
});

test("every kit is a plain, complete config object", function () {
  Kits.KITS.forEach(function (kit) {
    assert.equal(typeof kit.id, "string");
    assert.ok(kit.id, "kit needs an id");
    assert.equal(typeof kit.name, "string");
    assert.ok(kit.name);
    assert.equal(typeof kit.eventType, "string");
    assert.equal(typeof kit.vibe, "string");
    assert.ok(
      Event.THEME_IDS.includes(kit.vibe),
      kit.id + ".vibe must name a real event.js theme id, never invent its own palette"
    );
    assert.ok(
      Kits.OUTPUT_DEFAULTS.includes(kit.outputDefault),
      kit.id + ".outputDefault must be one of the three real renderers"
    );
    assert.equal(typeof kit.copy, "object");
    assert.notEqual(kit.copy, null);
  });
});

test("Kits.find resolves a real id and fails closed for anything else", function () {
  assert.equal(Kits.find("birthday").name, "Birthday");
  assert.equal(Kits.find("does-not-exist"), null);
  assert.equal(Kits.find(""), null);
  assert.equal(Kits.find(undefined), null);
});

test("Birthday, Wedding and Kids Party are visibly distinct from one another and from Minimal", function () {
  var vibes = Kits.KITS.map(function (kit) { return kit.vibe; });
  assert.equal(new Set(vibes).size, vibes.length, "every starter kit uses a different Vibe theme");
});

test("Wedding defaults to Magazine Cover; the other three default to the Photo Strip", function () {
  assert.equal(Kits.find("wedding").outputDefault, "magazine");
  ["birthday", "kids-party", "minimal"].forEach(function (id) {
    assert.equal(Kits.find(id).outputDefault, "strip");
  });
});

test("never uses the word 'template' — that vocabulary belongs to covers.js alone", function () {
  var source = fs.readFileSync(path.join(__dirname, "..", "kits.js"), "utf8");
  var withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(withoutComments.toLowerCase(), /template/);
});

test("loads as a browser global without CommonJS or dependencies", function () {
  var source = fs.readFileSync(path.join(__dirname, "..", "kits.js"), "utf8");
  var sandbox = {};
  var vm = require("node:vm");
  vm.runInNewContext(source, sandbox, { filename: "kits.js" });
  assert.equal(sandbox.MyBishBashKits.KIT_IDS.length, 4);
  assert.equal(sandbox.MyBishBashKits.find("wedding").vibe, "editorial");
});
