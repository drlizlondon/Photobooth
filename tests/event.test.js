"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("node:fs");
var path = require("node:path");
var vm = require("node:vm");
var Event = require("../event.js");

var FIXED_ID = "event_sophies_hen";
var START_MS = Date.parse("2027-05-16T18:00:00.000Z");

function fixedOptions(extra) {
  var options = { idFactory: function () { return FIXED_ID; } };
  Object.keys(extra || {}).forEach(function (key) {
    options[key] = extra[key];
  });
  return options;
}

function rawSetupFragment(payload) {
  return "#setup=r." + Buffer.from(JSON.stringify(payload), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

test("exports the accepted event vocabulary through CommonJS and a browser global", function () {
  var source = fs.readFileSync(path.resolve(__dirname, "../event.js"), "utf8");
  var context = {
    self: {},
    Uint8Array: Uint8Array,
    Date: Date,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    RegExp: RegExp,
    Math: Math,
    JSON: JSON,
    Promise: Promise,
    isFinite: isFinite,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  vm.runInNewContext(source, context);

  assert.equal(Event.EVENT_CONFIG_SCHEMA_VERSION, 1);
  assert.equal(Event.SETUP_PASS_VERSION, 1);
  assert.equal(Event.LIVE_DURATION_MS, 48 * 60 * 60 * 1000);
  assert.deepEqual(Event.EVENT_TYPES, [
    "birthday",
    "wedding",
    "baby_shower",
    "anniversary",
    "graduation",
    "party",
    "other"
  ]);
  assert.equal(context.self.MyBishBashEvent.VERSION, "1.0.0");
  assert.equal(Object.isFrozen(Event.EVENT_FIELD_DEFAULTS), true);
});

test("migrates old flat settings additively without losing renderer fields", function () {
  var oldDefaults = {
    eventTitle: "Your Celebration",
    date: "2026",
    accent: "#ff5b52",
    stripSignature: "",
    mirror: true
  };
  var oldSettings = {
    eventTitle: "  Sophie's Hen  ",
    date: "16.05.27",
    accent: "#9f78ff",
    stripSignature: "SOPHIE'S HEN",
    mirror: false
  };
  var migrated = Event.migrateEventConfig(oldSettings, fixedOptions({ defaults: oldDefaults }));

  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.eventId, FIXED_ID);
  assert.equal(migrated.eventType, "birthday", "legacy output keeps the existing Birthday voice");
  assert.equal(migrated.eventTitle, "Sophie's Hen");
  assert.equal(migrated.date, "16.05.27");
  assert.equal(migrated.datePrecision, "exact");
  assert.equal(migrated.look, "pink-purple");
  assert.equal(migrated.accent, "#9f78ff");
  assert.equal(migrated.stripSignature, "SOPHIE'S HEN");
  assert.equal(migrated.mirror, false);
  assert.equal(migrated.eventStatus, "DRAFT");
  assert.equal(migrated.activatedAt, "");

  assert.equal(
    Event.createEventConfig(migrated).eventId,
    FIXED_ID,
    "persisted event identity remains stable across future loads"
  );
  assert.equal(oldSettings.schemaVersion, undefined, "migration must not mutate old saved data");
});

test("does not migrate or persist a plaintext PIN field", function () {
  var migrated = Event.migrateEventConfig({
    eventTitle: "Private Party",
    guestPin: "1234",
    plaintextPin: "5678",
    passcode: "9999"
  }, fixedOptions());
  var persisted = JSON.stringify(migrated);

  assert.equal(migrated.guestPin, undefined);
  assert.equal(migrated.plaintextPin, undefined);
  assert.equal(migrated.passcode, undefined);
  assert.equal(migrated.guestPinEnabled, false);
  assert.doesNotMatch(persisted, /1234|5678|9999/);
});

test("uses explicit timing precision and conservatively infers legacy timing", function () {
  assert.equal(Event.inferLegacyDatePrecision("15/08/2026"), "exact");
  assert.equal(Event.inferLegacyDatePrecision("2026-08-15"), "exact");
  assert.equal(Event.inferLegacyDatePrecision("August 2026"), "approximate");
  assert.equal(Event.inferLegacyDatePrecision("2026"), "approximate");
  assert.equal(Event.inferLegacyDatePrecision("not sure yet"), "unknown");

  assert.equal(Event.createEventConfig({
    date: "August 2026",
    datePrecision: "approximate"
  }, fixedOptions()).datePrecision, "approximate");
  assert.equal(Event.createEventConfig({
    date: "15/08/2026",
    datePrecision: "unknown"
  }, fixedOptions()).datePrecision, "unknown", "an explicit Unknown choice is never upgraded");
});

test("uses the seven accepted types and degrades an explicit unknown type to Other", function () {
  assert.equal(Event.createEventConfig({ eventType: "Baby Shower" }, fixedOptions()).eventType, "baby_shower");
  assert.equal(Event.createEventConfig({ eventType: "Hen Party" }, fixedOptions()).eventType, "other");
  assert.equal(Event.EVENT_TYPE_LABELS.other, "Other");
  assert.throws(function () {
    Event.createEventConfig({ schemaVersion: 99 }, fixedOptions());
  }, /Unsupported EventConfig schemaVersion/);
});

test("starts the 48-hour clock only through the explicit startEvent action", function () {
  var draft = Event.createEventConfig({
    eventTitle: "Sophie's Hen",
    date: "16.05.27",
    datePrecision: "exact"
  }, fixedOptions());
  var edited = Event.createEventConfig({
    eventId: draft.eventId,
    eventTitle: draft.eventTitle,
    date: "17.05.27",
    datePrecision: "exact"
  });
  var live = Event.startEvent(edited, START_MS);

  assert.equal(draft.eventStatus, "DRAFT");
  assert.equal(edited.eventStatus, "DRAFT", "editing or reaching a planned date cannot activate");
  assert.equal(live.eventStatus, "LIVE");
  assert.equal(live.activatedAt, "2027-05-16T18:00:00.000Z");
  assert.equal(live.endsAt, "2027-05-18T18:00:00.000Z");
  assert.equal(draft.activatedAt, "", "startEvent is pure and does not mutate its input");
});

test("ends at the exact 48-hour boundary and never reactivates an ended event", function () {
  var draft = Event.createEventConfig({}, fixedOptions());
  var live = Event.startEvent(draft, START_MS);
  var oneMillisecondBefore = START_MS + Event.LIVE_DURATION_MS - 1;
  var exactBoundary = START_MS + Event.LIVE_DURATION_MS;
  var ended;

  assert.equal(Event.resolveEventStatus(live, oneMillisecondBefore), "LIVE");
  assert.equal(Event.resolveEventStatus(live, exactBoundary), "ENDED");
  ended = Event.refreshEventLifecycle(live, exactBoundary);
  assert.equal(ended.eventStatus, "ENDED");
  assert.equal(live.eventStatus, "LIVE", "refresh does not mutate stored input");
  assert.throws(function () {
    Event.startEvent(ended, exactBoundary + 1);
  }, /cannot be reactivated/i);
  assert.throws(function () {
    Event.startEvent(live, START_MS + 1000);
  }, /Only a DRAFT event/);
});

test("repairs impossible lifecycle combinations without consuming a live window", function () {
  var partial = Event.createEventConfig({
    eventId: FIXED_ID,
    eventStatus: "LIVE",
    activatedAt: "",
    endsAt: "2027-05-18T18:00:00.000Z"
  });
  var tamperedEnd = Event.createEventConfig({
    eventId: FIXED_ID,
    eventStatus: "LIVE",
    activatedAt: "2027-05-16T18:00:00.000Z",
    endsAt: "2099-01-01T00:00:00.000Z"
  });

  assert.equal(partial.eventStatus, "DRAFT");
  assert.equal(partial.endsAt, "");
  assert.equal(tamperedEnd.endsAt, "2027-05-18T18:00:00.000Z");
});

test("stores only a salted SHA-256 Guest PIN verifier and verifies locally", async function () {
  var salt = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  var draft = Event.createEventConfig({ eventTitle: "Sophie's Hen" }, fixedOptions());
  var protectedEvent = await Event.enableGuestPin(draft, "2605", { saltBytes: salt });
  var serialised = JSON.stringify(protectedEvent);

  assert.equal(protectedEvent.guestPinEnabled, true);
  assert.equal(protectedEvent.guestPinAlgorithm, "SHA-256");
  assert.equal(protectedEvent.guestPinAuthority, "local_device");
  assert.match(protectedEvent.guestPinSalt, /^[A-Za-z0-9_-]+$/);
  assert.match(protectedEvent.guestPinVerifier, /^[A-Za-z0-9_-]{40,}$/);
  assert.doesNotMatch(serialised, /2605/);
  assert.equal(await Event.verifyGuestPin(protectedEvent, "2605"), true);
  assert.equal(await Event.verifyGuestPin(protectedEvent, "0000"), false);
  assert.equal(await Event.verifyGuestPin(protectedEvent, "26"), false);
  assert.equal(await Event.verifyGuestPin(Event.disableGuestPin(protectedEvent), "anything"), true);
  await assert.rejects(Event.enableGuestPin(draft, "12ab"), /exactly four digits/);
});

test("Guest PIN throttle is pure, modest and releases exactly at its boundary", function () {
  var start = 1000000;
  var original = Event.createGuestPinThrottleState();
  var state = original;
  var i;
  for (i = 0; i < 5; i += 1) {
    state = Event.recordGuestPinAttempt(state, false, start + i);
  }

  assert.deepEqual(original, { failures: 0, blockedUntil: 0 });
  assert.equal(state.failures, 5);
  assert.equal(state.blockedUntil, start + 4 + 30000);
  assert.equal(Event.guestPinThrottleStatus(state, state.blockedUntil - 1).allowed, false);
  assert.equal(Event.guestPinThrottleStatus(state, state.blockedUntil - 1).retryAfterMs, 1);
  assert.equal(Event.guestPinThrottleStatus(state, state.blockedUntil).allowed, true);
  assert.deepEqual(
    Event.recordGuestPinAttempt({ failures: 3, blockedUntil: 0 }, true, start),
    { failures: 0, blockedUntil: 0 }
  );
});

test("encodes a sparse raw Setup Pass in the URL fragment and imports it as DRAFT", async function () {
  var defaults = {
    eventTitle: "Your Celebration",
    date: "",
    accent: "#ff5b52",
    mirror: true,
    stripSignature: ""
  };
  var config = Event.createEventConfig({
    eventId: FIXED_ID,
    eventType: "party",
    eventTitle: "Sophie's Hen",
    location: "Ibiza",
    date: "16.05.27",
    datePrecision: "exact",
    look: "pink-purple",
    accent: "#9f78ff",
    mirror: true,
    stripSignature: "SOPHIE'S HEN"
  }, { defaults: defaults });
  var fragment = await Event.encodeSetupPass(config, { defaults: defaults });
  var imported = await Event.decodeSetupPass(
    "https://mybishbash.app/photobooth/" + fragment,
    { defaults: defaults }
  );

  assert.match(fragment, /^#setup=r\.[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(fragment, /^\?/);
  assert.equal(imported.eventId, FIXED_ID);
  assert.equal(imported.eventTitle, "Sophie's Hen");
  assert.equal(imported.location, "Ibiza");
  assert.equal(imported.accent, "#9f78ff");
  assert.equal(imported.mirror, true);
  assert.equal(imported.eventStatus, "DRAFT");
  assert.equal(imported.activatedAt, "");
  assert.equal(imported.endsAt, "");
  assert.equal(
    Event.buildSetupPassUrl("https://mybishbash.app/photobooth/#old", fragment),
    "https://mybishbash.app/photobooth/" + fragment
  );
});

test("Setup Pass carries the derived Guest PIN fields but never its plaintext", async function () {
  var protectedEvent = await Event.enableGuestPin(
    Event.createEventConfig({ eventId: FIXED_ID }, fixedOptions()),
    "1234",
    { saltBytes: Uint8Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]) }
  );
  var fragment = await Event.encodeSetupPass(protectedEvent);
  var imported = await Event.decodeSetupPass(fragment);

  assert.doesNotMatch(fragment, /1234/);
  assert.equal(imported.guestPinEnabled, true);
  assert.equal(await Event.verifyGuestPin(imported, "1234"), true);
});

test("Setup Pass excludes photos, logos, entitlement, activation and plaintext PIN", async function () {
  var live = Event.startEvent(Event.createEventConfig({ eventId: FIXED_ID }, fixedOptions()), START_MS);
  live.photos = ["data:image/jpeg;base64,guest-photo"];
  live.guestPhoto = "data:image/jpeg;base64,guest-photo";
  live.logoImage = "data:image/png;base64,business-logo";
  live.businessBrand = { logoImage: "data:image/png;base64,business-logo" };
  live.accessToken = "server-secret-token";
  live.entitlement = "ONE_EVENT";
  live.guestPin = "9876";
  var fragment = await Event.encodeSetupPass(live);
  var imported = await Event.decodeSetupPass(fragment);

  assert.equal(imported.photos, undefined);
  assert.equal(imported.guestPhoto, undefined);
  assert.equal(imported.logoImage, undefined);
  assert.equal(imported.businessBrand, undefined);
  assert.equal(imported.accessToken, undefined);
  assert.equal(imported.entitlement, undefined);
  assert.equal(imported.guestPin, undefined);
  assert.equal(imported.eventStatus, "DRAFT");
  assert.equal(imported.activatedAt, "");
  assert.equal(imported.endsAt, "");
});

test("supports optional raw-DEFLATE Setup Passes with an honest raw fallback", async function () {
  var config = Event.createEventConfig({
    eventId: FIXED_ID,
    eventTitle: "Sophie's Very Special Hen Party Weekend Celebration",
    location: "Ibiza, Balearic Islands",
    eventLine: "Good friends, loud laughs and one brilliant weekend"
  });
  var fragment = await Event.encodeSetupPass(config, { compress: true });
  var imported = await Event.decodeSetupPass(fragment);

  assert.match(fragment, /^#setup=[rd]\.[A-Za-z0-9_-]+$/);
  assert.equal(imported.eventId, FIXED_ID);
  assert.equal(imported.eventLine, config.eventLine);
});

test("rejects query-string, malformed and unknown-version Setup Passes", async function () {
  await assert.rejects(
    Event.decodeSetupPass("https://example.test/photobooth/?setup=r.abc"),
    /URL fragment/
  );
  await assert.rejects(Event.decodeSetupPass("#setup=x.abc"), /Unknown Setup Pass encoding/);
  await assert.rejects(
    Event.decodeSetupPass(rawSetupFragment({ v: 2, c: { eventId: FIXED_ID } })),
    /Unsupported Setup Pass version: 2/
  );
  await assert.rejects(Event.decodeSetupPass("#setup=r.not-valid-json"), /not valid JSON/);
});

test("a malicious imported lifecycle cannot activate an event", async function () {
  var fragment = rawSetupFragment({
    v: 1,
    c: {
      eventId: FIXED_ID,
      eventTitle: "Sophie's Hen",
      eventStatus: "LIVE",
      activatedAt: "2027-05-16T18:00:00.000Z",
      endsAt: "2027-05-18T18:00:00.000Z",
      accessToken: "do-not-import",
      logoImage: "do-not-import"
    }
  });
  var imported = await Event.decodeSetupPass(fragment);

  assert.equal(imported.eventStatus, "DRAFT");
  assert.equal(imported.activatedAt, "");
  assert.equal(imported.endsAt, "");
  assert.equal(imported.accessToken, undefined);
  assert.equal(imported.logoImage, undefined);
});
