/* kits.js — Booth Kit registry for MyBishBash Photobooth (PB-31).

   A Booth Kit is a whole-booth quick-start preset: pick one and the event
   type, Vibe theme, default output style and a handful of starting copy
   lines are pre-filled in one tap. It is data, never a code path — every
   kit is one object in the KITS array below, in the same spirit as the
   Vibe theme presets in event.js. Adding a fifth kit means adding a fifth
   object here, nothing else.

   Deliberately named "Booth Kit", never "template" — TEMPLATES is already
   the magazine-cover registry owned by covers.js (PB-26/27/28) and this
   module must never collide with that vocabulary or namespace.

   Uses the same dependency-free UMD wrapper as product.js/event.js so it
   can be loaded directly by the browser and required by Node tests. */
(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MyBishBashKits = factory();
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* vibe must name an id from event.js THEME_IDS (pop / after-dark /
     editorial / sunshine) — a kit never invents its own palette, it picks
     one of the existing curated Vibe treatments. outputDefault must be one
     of the three real output renderers. copy values are starting points
     only: every one is optional, and applying a kit never writes a blank
     copy field over a field the host has already typed something into
     (see applyBoothKit in app.js) — blank here means "leave the booth's
     own sensible default alone", the same contract every copy field in
     this app already keeps. */
  var OUTPUT_DEFAULTS = ["strip", "magazine", "polaroid"];

  var KITS = [
    {
      id: "birthday",
      name: "Birthday",
      tagline: "Warm and joyful — cake, candles, your people",
      eventType: "birthday",
      vibe: "sunshine",
      outputDefault: "strip",
      copy: {
        eventTitle: "Your Birthday Bash",
        eventLine: "Cake, candles and your favourite people",
        welcomeEyebrow: "LET'S CELEBRATE",
        startLabel: "START",
        startHint: "enter the booth"
      },
      /* Not consumed by any renderer yet — a single built-in sample sheet
         (assets/demo-photos.jpg) is all the admin preview has today. Carried
         here so a future per-kit sample set is a data change, not a new
         code path. */
      previewSampleTag: "birthday"
    },
    {
      id: "wedding",
      name: "Wedding",
      tagline: "Elegant and editorial, ready for the big day",
      eventType: "wedding",
      vibe: "editorial",
      outputDefault: "magazine",
      copy: {
        eventTitle: "The Wedding",
        eventLine: "One last fling before the ring",
        welcomeEyebrow: "THE CELEBRATION",
        startLabel: "BEGIN",
        startHint: "enter the booth"
      },
      previewSampleTag: "wedding"
    },
    {
      id: "kids-party",
      name: "Kids Party",
      tagline: "Bright, bold primaries — built for chaos",
      eventType: "party",
      vibe: "pop",
      outputDefault: "strip",
      copy: {
        eventTitle: "Kids Party Time",
        eventLine: "Smile, strike a pose, go again",
        welcomeEyebrow: "PARTY TIME",
        startLabel: "GO",
        startHint: "enter the booth"
      },
      previewSampleTag: "kids-party"
    },
    {
      id: "minimal",
      name: "Minimal",
      tagline: "Clean and understated, out of the way",
      eventType: "party",
      vibe: "after-dark",
      outputDefault: "strip",
      /* Minimal's own ethos: don't put words in the host's mouth. Every
         copy field is left blank so applying this kit changes only the
         event type, Vibe and output default — the booth's existing blank
         defaults do the rest. */
      copy: {
        eventTitle: "",
        eventLine: "",
        welcomeEyebrow: "",
        startLabel: "",
        startHint: ""
      },
      previewSampleTag: "minimal"
    }
  ];

  var KIT_IDS = KITS.map(function (kit) { return kit.id; });

  function find(id) {
    var text = String(id || "");
    for (var i = 0; i < KITS.length; i += 1) {
      if (KITS[i].id === text) return KITS[i];
    }
    return null;
  }

  return {
    KITS: KITS,
    KIT_IDS: KIT_IDS,
    OUTPUT_DEFAULTS: OUTPUT_DEFAULTS,
    find: find
  };
}));
