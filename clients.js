/* clients.js — branded client booths and the single source of route vocabulary.

   Two jobs, deliberately in one file because they are the same fact:

   1. A client is DATA. "David Lloyd Clubs" is a customer, not a branch in
      app.js. Adding the next venue is a row in CLIENTS and a rewrite in
      vercel.json — no new function, no new regex, no new sw.js reasoning.

   2. Route vocabulary lives here and NOWHERE else. app.js and landing.js
      both used to carry their own copy of /(?:^|\/)business\/?$/, and the
      first attempt at a client route updated app.js's two copies and missed
      landing.js's third — so landing.js's full-screen entrance overlay still
      believed the URL was an ordinary landing page and painted itself over
      the branded booth. Both files now ask this module instead. The
      duplication cannot come back without a contract test failing.

   Loaded as a browser global before app.js, like every other module here.
   No build step, no dependencies. */
(function (global) {
  "use strict";

  function freeze(value) {
    return Object.freeze ? Object.freeze(value) : value;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return freeze(value);
  }

  /* The product's own surface, which predates any client and is not a client:
     it has no brand, no logo and no entitlement grant. It is listed here only
     so that "is this path one of ours" has one answer. */
  var PRODUCT_SEGMENT = "business";

  var CLIENTS = deepFreeze({
    "david-lloyd": {
      slug: "david-lloyd",
      name: "David Lloyd Clubs",

      /* Concept preview prepared for an outreach conversation. It is not a
         live customer deployment and the page says so on screen. */
      status: "concept_preview",
      previewNote: "Concept preview for David Lloyd Clubs · built with MyBishBash Photobooth",

      /* The tab title and share card are part of the white-label surface. A
         client route that inherits "MyBishBash for Business" puts the
         builder's name in the one place a prospect forwards to a colleague. */
      meta: {
        title: "Summer at David Lloyd — Photobooth",
        description: "A summer photobooth for David Lloyd Clubs: three photos become a photo strip, a magazine cover and a living polaroid, made on the device in about a minute."
      },

      brand: {
        name: "David Lloyd Clubs",
        /* Relative to the app's own base path, which the consumer resolves
           through basePathFrom(). Not root-relative: PB-13/PB-15 move this
           app to mybishbash.app/photobooth, and a leading slash would point
           the logo at the wrong origin root the day that lands. Resolving
           against the base path also survives the trailing-slash form of a
           client route, where a bare relative path would 404. */
        logo: "assets/clients/david-lloyd-logo.png",
        primaryColor: "#245f9f",
        secondaryColor: "#dcecff",
        /* Owner decision 2026-08-17: the keepsake carries the club's brand
           alone. MyBishBash attribution lives in previewNote, on screen,
           where the person evaluating it sees it and the guest's photograph
           does not. */
        whiteLabel: true
      },

      /* Sunshine is the shipped summer theme — butter ground, coral
         highlight, warm strip filter, sunburst decoration — and its primary
         (#245f9f) is already the blue this brand reads in. No new theme. */
      event: {
        themeId: "sunshine",
        eventType: "party",
        eventTitle: "Summer at David Lloyd",
        eventLine: "Sun's out. Strike a pose.",
        location: "",
        date: "",
        datePrecision: "unknown",
        /* Left empty on purpose: the signature falls back to eventTitle, and
           the white-label footer already prints the brand name as its label.
           Setting both put "David Lloyd Clubs" on the strip twice. */
        stripSignature: "",
        stripTop: "THE SUMMER EDIT",
        stripSecond: "",
        stripDate: "",
        guestPinEnabled: false
      },

      /* A club booth that captures nothing is not the pitch. Email plus both
         consent decisions are collected; consented photo collection stays
         OFF, so no photograph can become upload-eligible from this route.
         The club turns that on deliberately, with its own DPO, or not at
         all. */
      businessEvent: {
        collectEmail: true,
        requireEmail: false,
        allowShare: true,
        allowSave: true,
        collectMarketingConsent: true,
        collectPublicityConsent: true,
        collectConsentedPhotos: false
      },

      /* Granted through the founder-demo path (dedicated storage key, tier
         allowlist, never reconciled against the Worker), never by writing
         real access state. A URL cannot mint a paying customer. */
      entitlement: "BUSINESS"
    }
  });

  var CLIENT_SLUGS = freeze(Object.keys(CLIENTS));

  /* Every path segment this app answers to beyond the personal landing. */
  var ROUTE_SEGMENTS = freeze([PRODUCT_SEGMENT].concat(CLIENT_SLUGS));

  function trailingSegment(pathname) {
    var text = String(pathname || "");
    var match = text.match(/(?:^|\/)([^/]+)\/?$/);
    return match ? match[1] : "";
  }

  /* "business" | "<client slug>" | null — the one route test in the app. */
  function routeSegmentFromPath(pathname) {
    var segment = trailingSegment(pathname);
    return ROUTE_SEGMENTS.indexOf(segment) === -1 ? null : segment;
  }

  function clientFromPath(pathname) {
    var segment = routeSegmentFromPath(pathname);
    if (!segment || segment === PRODUCT_SEGMENT) {
      return null;
    }
    return CLIENTS[segment] || null;
  }

  function isProductRoutePath(pathname) {
    return routeSegmentFromPath(pathname) !== null;
  }

  /* The directory the app is served from, with any known route segment
     removed. Replaces app.js's hand-written /business/?$ strip, which had to
     be taught each new segment by hand. */
  function basePathFrom(pathname) {
    var text = String(pathname || "/");
    var segment = routeSegmentFromPath(text);
    var withoutSegment = segment
      ? text.replace(new RegExp("(?:^|/)" + segment + "/?$"), "/")
      : text;
    if (withoutSegment.charAt(0) !== "/") {
      withoutSegment = "/" + withoutSegment;
    }
    return withoutSegment.charAt(withoutSegment.length - 1) === "/"
      ? withoutSegment
      : withoutSegment + "/";
  }

  global.MyBishBashClients = freeze({
    PRODUCT_SEGMENT: PRODUCT_SEGMENT,
    CLIENTS: CLIENTS,
    CLIENT_SLUGS: CLIENT_SLUGS,
    ROUTE_SEGMENTS: ROUTE_SEGMENTS,
    routeSegmentFromPath: routeSegmentFromPath,
    clientFromPath: clientFromPath,
    isProductRoutePath: isProductRoutePath,
    basePathFrom: basePathFrom
  });
})(typeof window !== "undefined" ? window : this);
