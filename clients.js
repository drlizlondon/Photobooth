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
        logo: "assets/clients/david-lloyd-logo-dark.png",
        /* The cover's branding chip is filled with primaryColor, so a dark
           mark on plum is unreadable. The knockout variant is used wherever
           the mark sits on the brand colour. Both are the same trimmed
           wordmark; the supplied asset was a 600x600 square that was mostly
           white padding, which is why it rendered at thumbnail size. */
        logoInverse: "assets/clients/david-lloyd-logo-light.png",

        /* Sampled from davidlloyd.co.uk, not invented: #82285F is the
           "Enquire now" CTA, #FCFCF6 the page ground. For a Business
           entitlement outputTheme() derives the whole output palette from
           these two — primary becomes accent, button and border; secondary
           becomes background and highlight, with foreground computed for
           contrast. The restraint is the brand: plum appears as an accent
           only, never as a field. */
        primaryColor: "#82285F",
        secondaryColor: "#FCFCF6",
        /* Their body copy and dark sections are this warm charcoal, not
           black. It is the difference between "calm" and "stark". */
        textColor: "#474A4A",
        /* Owner decision 2026-08-17: the keepsake carries the club's brand
           alone. MyBishBash attribution lives in previewNote, on screen,
           where the person evaluating it sees it and the guest's photograph
           does not. */
        whiteLabel: true
      },

      /* Editorial supplies the structure — clean frame, restrained
         decoration, magazine template. The palette comes from brand above,
         so the theme is chosen for its composure, not its colours. Sunshine
         was the wrong instinct: a sunburst and butter-yellow ground is a
         children's-party voice, and this brand is calm, cream and
         photography-led. */
      event: {
        themeId: "editorial",
        eventType: "party",
        eventTitle: "The Summer Glow",
        eventLine: "Summer at David Lloyd",
        location: "",
        date: "",
        datePrecision: "unknown",

        /* Neuzeit Grotesk is the site's face and is not on the device. Futura
           is the closest available geometric grotesk; Snell answers the
           script in their own wordmark. Baskerville over Didot for the
           masthead — Didot is high-fashion loud, and this brand is not. */
        fontDisplay: "baskerville",
        fontText: "futura",
        fontCondensed: "futuracond",
        fontScript: "snell",

        /* The signature falls back to eventTitle, and the footer already
           prints the brand name as its label — setting both printed "David
           Lloyd Clubs" on the strip twice. */
        stripSignature: "",
        stripTop: "THE SUMMER ISSUE",
        stripSecond: "",
        stripDate: "",
        guestPinEnabled: false,

        /* A members' summer wellness issue, not a birthday party. Every slot
           is set explicitly because the derived defaults are party copy —
           "ONE NIGHT ONLY", "Not just an age. A whole vibe." — which is the
           wrong register for a health club by some distance. */
        coverMasthead: "SUMMER GLOW",
        coverOccasion: "SUMMER",
        /* Short on purpose: the editorial template sets `big` as a full-width
           word along the same baseline, and a long script line runs straight
           underneath it. Verified by rendering — "The Summer Glow" here was
           overrun by GLOW. The title still leads as the masthead. */
        coverScript: "Summer '26",
        coverSkyline1: "THE SUMMER ISSUE",
        coverSkyline2: "2026",
        coverSkyline3: "MEMBERS' EDITION",
        coverF1Title: "Strong is the new summer",
        coverF1Dek: "Where your season begins.",
        coverF2Title: "Pool, courts, poolside",
        coverF2Dek: "Ninety minutes that are yours.",
        coverF3Title: "The after-swim glow",
        coverF3Dek: "Earned, not filtered.",
        coverBig: "GLOW",
        coverBigDek: "Summer, the David Lloyd way.",
        coverFooter: "Move · Recover",
        coverBarcode: "DL 26  SUMMER",
        coverEyebrow: "The Summer Glow",
        coverStack: "Summer Edition",
        coverDateLine: "2026",
        coverScriptSmall: "this summer at",
        coverHeroScript: "The summer we",
        coverHero: "Felt Our Best",
        coverThanks: "Thank you for being part of your club this summer",
        coverHashtag: "#SummerAtDavidLloyd",
        coverIcons: "Move well, Recover fully, Belong here",
        coverEditionWord: "Edition",
        coverOfWord: "of"
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
