"use strict";

const { expect, test } = require("@playwright/test");
const {
  canvasSignature,
  installRuntimeProbes,
  openPhotobooth,
  resetRendererProbe,
  runtimeProbeState,
  selectAdminRenderer,
  waitForCanvasChange,
  waitForReview
} = require("./helpers/booth");
const {
  assertFocusWithin,
  assertNoHorizontalOverflow,
  assertPreviewIsProminent,
  assertSelected,
  assertTouchTargets
} = require("./helpers/layout");
const { previewPhotoPayloads } = require("./helpers/photos");
const {
  SETTINGS_KEY,
  readGalleryRecords,
  readLocalState,
  seedHostState
} = require("./helpers/storage");

const EVENT_TITLE = "Alex & Sam's Summer Party";
const EVENT_PALETTE = {
  id: "blue-sky",
  primary: "#245f9f",
  secondary: "#dcecff",
  highlight: "#fff0aa",
  primaryInk: "#ffffff"
};
const PINK_PALETTE = {
  primary: "#b52167",
  secondary: "#ffdce8",
  highlight: "#eee6ff",
  primaryInk: "#ffffff"
};
const SUNSHINE_PALETTE = {
  primary: "#9a5c00",
  secondary: "#fff0aa",
  highlight: "#ffdce8"
};
const PALETTE_IDS = ["lilac-pop", "pink-party", "blue-sky", "sunshine"];
const LIVE_WINDOW_MS = 48 * 60 * 60 * 1000;

test.beforeEach(async ({ page }) => {
  await seedHostState(page);
  await openPhotobooth(page);
  await installRuntimeProbes(page);
});

test("host can customise, use own photos, test the real camera and start separately", async ({ page }, testInfo) => {
  const initial = await readLocalState(page);
  expect(initial.settings.schemaVersion).toBe(2);
  expect(initial.settings.paletteId).toBe("lilac-pop");
  expect(initial.settings.palettePrimary).toBe("#66519c");
  expect(initial.settings.look).toBeUndefined();
  expect(initial.settings.accent).toBeUndefined();
  expect(initial.settings.eventStatus).toBe("DRAFT");
  expect(initial.settings.activatedAt).toBe("");
  expect(initial.settings.endsAt).toBe("");
  expect(await readGalleryRecords(page)).toEqual([]);

  await page.locator("#openPersonalSetup").click();
  await expect(page.locator("#settings")).toHaveClass(/\bactive\b/);
  await assertNoHorizontalOverflow(page, "#settings");
  await assertFocusWithin(page, "#settings");
  await assertPreviewIsProminent(page, ".admin-preview-stage");

  await resetRendererProbe(page);
  await selectAdminRenderer(page, "strip");
  const placeholderStrip = await canvasSignature(page);
  expect([placeholderStrip.width, placeholderStrip.height]).toEqual([600, 1800]);

  await page.locator("#adminPreviewPhotos").setInputFiles(previewPhotoPayloads());
  await expect(page.locator("#previewPhotoStatus")).toContainText(/3/);
  await expect(page.locator("#previewPhotoThumbs").locator("img, canvas")).toHaveCount(3);
  const uploadedStrip = await waitForCanvasChange(page, placeholderStrip);

  await page.locator("#setEventTitle").fill(EVENT_TITLE);
  const namedStrip = await waitForCanvasChange(page, uploadedStrip);
  await page.locator('[data-setup-step="1"]').click();

  const paletteRadios = page.locator('input[name="eventPalette"]');
  const paletteCards = page.locator(".host-palette-grid .palette-card");
  await expect(paletteRadios).toHaveCount(4);
  await expect(paletteCards).toHaveCount(4);
  expect(await paletteRadios.evaluateAll((radios) => radios.map((radio) => radio.value))).toEqual(PALETTE_IDS);
  for (const name of ["Lilac Pop", "Pink Party", "Blue Sky", "Sunshine"]) {
    await expect(page.getByRole("radio", { name: new RegExp(name, "i") })).toBeAttached();
  }
  await expect(page.locator('#paletteLilacPop')).toBeChecked();

  /* Native radios provide checked semantics and arrow-key operation. Each
     choice must also drive the real Strip renderer immediately. */
  await page.locator("#paletteLilacPop").focus();
  await page.locator("#paletteLilacPop").press("ArrowRight");
  await expect(page.locator("#palettePinkParty")).toBeChecked();
  const pinkStrip = await waitForCanvasChange(page, namedStrip);

  await page.locator('label[for="paletteBlueSky"]').click();
  await expect(page.locator("#paletteBlueSky")).toBeChecked();
  const blueStrip = await waitForCanvasChange(page, pinkStrip);

  await page.locator('label[for="paletteSunshine"]').click();
  await expect(page.locator("#paletteSunshine")).toBeChecked();
  const sunshineStrip = await waitForCanvasChange(page, blueStrip);

  await page.locator('label[for="paletteLilacPop"]').click();
  await expect(page.locator("#paletteLilacPop")).toBeChecked();
  const lilacStrip = await waitForCanvasChange(page, sunshineStrip);

  await page.locator('label[for="paletteBlueSky"]').click();
  await expect(page.locator("#paletteBlueSky")).toBeChecked();
  const brandedStrip = await waitForCanvasChange(page, lilacStrip);

  expect(new Set([
    namedStrip.hash,
    pinkStrip.hash,
    blueStrip.hash,
    sunshineStrip.hash
  ]).size).toBe(4);
  await expect(page.locator('input[name="eventPalette"]:checked')).toHaveCount(1);
  await expect(page.locator(".host-palette-grid .palette-selected:visible")).toHaveCount(1);
  await expect(page.locator('label[for="paletteBlueSky"] .palette-selected')).toBeVisible();
  await assertNoHorizontalOverflow(page, "#settings");

  const paletteLayout = await page.locator(".host-palette-grid").evaluate((grid) => {
    const cards = [...grid.querySelectorAll(".palette-card")];
    const boxes = cards.map((card) => card.getBoundingClientRect());
    const swatches = cards.map((card) =>
      card.querySelector(".palette-swatches").getBoundingClientRect()
    );
    const fontSize = (selector) => parseFloat(getComputedStyle(grid.closest("#settings").querySelector(selector)).fontSize);
    return {
      columns: new Set(boxes.map((box) => Math.round(box.left))).size,
      cardMinHeight: Math.min(...boxes.map((box) => box.height)),
      swatchMinHeight: Math.min(...swatches.map((box) => box.height)),
      cardNameSize: parseFloat(getComputedStyle(cards[0].querySelector("strong")).fontSize),
      descriptionSize: parseFloat(getComputedStyle(cards[0].querySelector(".palette-description")).fontSize),
      helperSize: fontSize("#eventPaletteHelp"),
      fieldLabelSize: fontSize("#setupPanel1 .host-defaults label"),
      selectSize: fontSize("#setupPanel1 .host-defaults select")
    };
  });
  expect(paletteLayout.cardMinHeight).toBeGreaterThanOrEqual(140);
  expect(paletteLayout.swatchMinHeight).toBeGreaterThanOrEqual(56);
  expect(paletteLayout.cardNameSize).toBeGreaterThanOrEqual(18);
  expect(paletteLayout.descriptionSize).toBeGreaterThanOrEqual(15);
  expect(paletteLayout.helperSize).toBeGreaterThanOrEqual(16);
  expect(paletteLayout.fieldLabelSize).toBeGreaterThanOrEqual(16);
  expect(paletteLayout.selectSize).toBeGreaterThanOrEqual(16);
  expect(paletteLayout.columns).toBe(testInfo.project.name === "ipad-portrait" ? 2 : 1);

  await assertTouchTargets(page, [
    'label[for="paletteLilacPop"]',
    'label[for="palettePinkParty"]',
    'label[for="paletteBlueSky"]',
    'label[for="paletteSunshine"]'
  ]);
  await page.locator("#setGuestPinEnabled").check();
  await page.locator("#setGuestPin").fill("2468");

  const stripTab = await selectAdminRenderer(page, "strip");
  await assertSelected(stripTab);
  expect((await canvasSignature(page)).hash).toBe(brandedStrip.hash);
  await expect.poll(async () => (await runtimeProbeState(page)).rendererOptions.strip).toEqual({
    accent: EVENT_PALETTE.primary,
    brandingPrimary: EVENT_PALETTE.primary,
    brandingSecondary: EVENT_PALETTE.highlight
  });

  const magazineTab = await selectAdminRenderer(page, "magazine");
  await assertSelected(magazineTab);
  const magazinePreview = await canvasSignature(page);
  expect(magazinePreview.opaquePixels).toBeGreaterThan(0);
  expect(Math.max(magazinePreview.width, magazinePreview.height) /
    Math.min(magazinePreview.width, magazinePreview.height)).toBeCloseTo(1.4, 1);
  await expect.poll(async () => (await runtimeProbeState(page)).rendererOptions.magazine).toEqual({
    accent: EVENT_PALETTE.primary,
    accentInk: EVENT_PALETTE.primaryInk,
    brandingPrimary: EVENT_PALETTE.primary,
    brandingSecondary: EVENT_PALETTE.highlight
  });

  /* Keep Magazine active while switching schemes: this catches previews that
     update only the Strip tab or merely repaint host CSS. */
  await page.locator('label[for="palettePinkParty"]').click();
  const pinkMagazine = await waitForCanvasChange(page, magazinePreview);
  await expect.poll(async () => (await runtimeProbeState(page)).rendererOptions.magazine).toEqual({
    accent: PINK_PALETTE.primary,
    accentInk: PINK_PALETTE.primaryInk,
    brandingPrimary: PINK_PALETTE.primary,
    brandingSecondary: PINK_PALETTE.highlight
  });
  await page.locator('label[for="paletteBlueSky"]').click();
  await waitForCanvasChange(page, pinkMagazine);
  await expect.poll(async () => (await runtimeProbeState(page)).rendererOptions.magazine).toEqual({
    accent: EVENT_PALETTE.primary,
    accentInk: EVENT_PALETTE.primaryInk,
    brandingPrimary: EVENT_PALETTE.primary,
    brandingSecondary: EVENT_PALETTE.highlight
  });

  const polaroidTab = await selectAdminRenderer(page, "polaroid");
  await assertSelected(polaroidTab);
  const polaroidPreview = await canvasSignature(page);
  expect(polaroidPreview.opaquePixels).toBeGreaterThan(0);
  await expect.poll(async () => (await runtimeProbeState(page)).rendererOptions.polaroid).toEqual({
    backdrop: EVENT_PALETTE.secondary,
    brandingPrimary: EVENT_PALETTE.primary,
    brandingSecondary: EVENT_PALETTE.highlight
  });

  /* The moving canvas changes every frame, so its production compose inputs
     are the deterministic proof that an active Polaroid preview updates now. */
  await page.locator('label[for="paletteSunshine"]').click();
  await expect(page.locator("#paletteSunshine")).toBeChecked();
  await expect.poll(async () => (await runtimeProbeState(page)).rendererOptions.polaroid).toEqual({
    backdrop: SUNSHINE_PALETTE.secondary,
    brandingPrimary: SUNSHINE_PALETTE.primary,
    brandingSecondary: SUNSHINE_PALETTE.highlight
  });
  await page.locator('label[for="paletteBlueSky"]').click();
  await expect(page.locator("#paletteBlueSky")).toBeChecked();
  await expect.poll(async () => (await runtimeProbeState(page)).rendererOptions.polaroid).toEqual({
    backdrop: EVENT_PALETTE.secondary,
    brandingPrimary: EVENT_PALETTE.primary,
    brandingSecondary: EVENT_PALETTE.highlight
  });

  await expect.poll(async () => (await runtimeProbeState(page)).renderers.strip).toBeGreaterThan(0);
  await expect.poll(async () => (await runtimeProbeState(page)).renderers.magazine).toBeGreaterThan(0);
  await expect.poll(async () => (await runtimeProbeState(page)).renderers.polaroid).toBeGreaterThan(0);

  expect(await readGalleryRecords(page)).toEqual([]);
  const beforeCamera = await readLocalState(page);
  expect(beforeCamera.settings.eventStatus).toBe("DRAFT");
  expect(beforeCamera.settings.activatedAt).toBe("");
  expect(beforeCamera.settings.endsAt).toBe("");
  expect(beforeCamera.settingsRaw).not.toMatch(/(?:data:image|blob:)/i);
  expect(beforeCamera.accessRaw).toBe(initial.accessRaw);
  expect(beforeCamera.edition).toBe(initial.edition);

  await assertTouchTargets(page, [
    '#settings [data-preview="strip"]',
    '#settings [data-preview="magazine"]',
    '#settings [data-preview="polaroid"]',
    "#testCameraFromSettings",
    "#clearPreviewPhotos"
  ]);

  await page.locator('[data-setup-step="3"]').click();
  await assertSelected(page.locator('[data-setup-step="3"]'));
  await page.locator("#testCameraFromSettings").click();
  await expect(page.locator("#camera")).toHaveClass(/\bactive\b/);
  await expect.poll(() => page.locator("#video").evaluate((video) => video.videoWidth)).toBeGreaterThan(0);
  await assertNoHorizontalOverflow(page, "#camera");
  await waitForReview(page);
  await assertNoHorizontalOverflow(page, "#review");
  await assertFocusWithin(page, "#review");

  const reviewStrip = page.locator('#reviewModeNav [data-mode="strip"]');
  const reviewMagazine = page.locator('#reviewModeNav [data-mode="magazine"]');
  const reviewPolaroid = page.locator('#reviewModeNav [data-mode="polaroid"]');
  await assertSelected(reviewStrip);

  const cameraStrip = await canvasSignature(page, "#mainCanvas");
  expect(cameraStrip.hash).not.toBe(brandedStrip.hash);
  expect(await readGalleryRecords(page)).toEqual([]);

  await reviewMagazine.click();
  await assertSelected(reviewMagazine);
  const favourites = page.locator("#coverPhotoChoices button");
  await expect(favourites).toHaveCount(3);
  const beforeFavourite = await canvasSignature(page, "#mainCanvas");
  await favourites.nth(1).click();
  await expect(favourites.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#magazineStyleStep")).toBeVisible();
  const magazineOutput = await waitForCanvasChange(page, beforeFavourite, "#mainCanvas");
  expect(Math.max(magazineOutput.width, magazineOutput.height) /
    Math.min(magazineOutput.width, magazineOutput.height)).toBeCloseTo(1.4, 1);

  await reviewPolaroid.click();
  await assertSelected(reviewPolaroid);
  const polaroidOutput = await waitForCanvasChange(page, magazineOutput, "#mainCanvas");
  expect(polaroidOutput.opaquePixels).toBeGreaterThan(0);
  await expect(page.locator("#mainCanvas:visible, #polaroidVideo:visible")).toHaveCount(1);

  await assertTouchTargets(page, [
    '#reviewModeNav [data-mode="strip"]',
    '#reviewModeNav [data-mode="magazine"]',
    '#reviewModeNav [data-mode="polaroid"]',
    "#retakeBtn",
    "#exitTestPreview"
  ]);

  await page.locator("#retakeBtn").click();
  await expect(page.locator("#camera")).toHaveClass(/\bactive\b/);
  await waitForReview(page);
  expect((await runtimeProbeState(page)).cameraCalls).toBe(2);
  expect(await readGalleryRecords(page)).toEqual([]);

  await page.locator("#exitTestPreview").click();
  await expect(page.locator("#settings")).toHaveClass(/\bactive\b/);
  await assertFocusWithin(page, "#settings");
  await assertSelected(page.locator('[data-setup-step="3"]'));
  await expect(page.locator('[data-setup-panel="3"]')).toBeVisible();
  await expect(page.locator("#setEventTitle")).toHaveValue(EVENT_TITLE);
  await expect(page.locator("#paletteBlueSky")).toBeChecked();
  await expect(page.locator("#setGuestPinEnabled")).toBeChecked();
  await expect(page.locator("#setGuestPin")).toHaveValue("2468");
  await expect(page.locator("#previewPhotoThumbs").locator("img, canvas")).toHaveCount(3);
  await selectAdminRenderer(page, "strip");
  await expect.poll(async () => (await canvasSignature(page)).hash).toBe(brandedStrip.hash);

  const afterExit = await readLocalState(page);
  expect(afterExit.settings.eventStatus).toBe("DRAFT");
  expect(afterExit.settings.activatedAt).toBe("");
  expect(afterExit.settings.endsAt).toBe("");
  expect(afterExit.settingsRaw).not.toContain("2468");
  expect(afterExit.accessRaw).toBe(initial.accessRaw);
  expect(afterExit.edition).toBe(initial.edition);
  expect(await readGalleryRecords(page)).toEqual([]);

  await page.locator('[data-setup-step="4"]').click();
  await page.locator("#saveSettings").click();
  await expect.poll(async () => (await readLocalState(page)).settings.eventTitle).toBe(EVENT_TITLE);

  /* A real reload must restore the selected scheme from EventConfig rather
     than reconstructing it from transient CSS or the former accent field. */
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#landing")).toHaveClass(/\bactive\b/);
  await installRuntimeProbes(page);
  await page.locator("#openPersonalSetup").click();
  await page.locator('[data-setup-step="1"]').click();
  await expect(page.locator("#setEventTitle")).toHaveValue(EVENT_TITLE);
  await expect(page.locator("#paletteBlueSky")).toBeChecked();
  await expect(page.locator(".host-palette-grid .palette-selected:visible")).toHaveCount(1);
  await assertNoHorizontalOverflow(page, "#settings");

  await page.locator('[data-setup-step="4"]').click();
  await page.locator("#launchCustomBooth").click();
  await expect(page.locator("#welcome")).toHaveClass(/\bactive\b/);
  await expect(page.locator("#previewEventBtn")).toBeVisible();
  await expect(page.locator("#activateEventBtn")).toBeVisible();
  /* Event Home deliberately clips its oversized decorative shapes; unlike
     the settings form, that non-interactive artwork may exceed the surface. */
  await assertNoHorizontalOverflow(page, "#welcome", { allowClippedDecorativeOverflow: true });
  await assertTouchTargets(page, ["#previewEventBtn", "#activateEventBtn"]);

  const savedDraft = await readLocalState(page);
  expect(savedDraft.settings.eventTitle).toBe(EVENT_TITLE);
  expect(savedDraft.settings.schemaVersion).toBe(2);
  expect(savedDraft.settings.paletteId).toBe(EVENT_PALETTE.id);
  expect(savedDraft.settings.palettePrimary).toBe(EVENT_PALETTE.primary);
  expect(savedDraft.settings.paletteSecondary).toBe(EVENT_PALETTE.secondary);
  expect(savedDraft.settings.paletteHighlight).toBe(EVENT_PALETTE.highlight);
  expect(savedDraft.settings.look).toBeUndefined();
  expect(savedDraft.settings.accent).toBeUndefined();
  expect(savedDraft.settings.eventStatus).toBe("DRAFT");
  expect(savedDraft.settingsRaw).not.toContain("2468");
  expect(savedDraft.settings.activatedAt).toBe("");
  expect(savedDraft.settings.endsAt).toBe("");

  await page.locator("#previewEventBtn").click();
  await expect(page.locator("#camera")).toHaveClass(/\bactive\b/);
  await waitForReview(page);
  await page.locator("#exitTestPreview").click();
  await expect(page.locator("#welcome")).toHaveClass(/\bactive\b/);
  await expect(page.locator("#welcome")).toHaveClass(/\bhost-mode\b/);
  const afterEventHomeTest = await readLocalState(page);
  expect(afterEventHomeTest.settings.eventStatus).toBe("DRAFT");
  expect(afterEventHomeTest.settings.activatedAt).toBe("");
  expect(afterEventHomeTest.settings.endsAt).toBe("");
  expect(afterEventHomeTest.accessRaw).toBe(initial.accessRaw);
  expect(afterEventHomeTest.edition).toBe(initial.edition);
  expect(await readGalleryRecords(page)).toEqual([]);

  await page.locator("#activateEventBtn").click();
  const awaitingConfirmation = await readLocalState(page);
  expect(awaitingConfirmation.settings.eventStatus).toBe("DRAFT");
  expect(awaitingConfirmation.settings.activatedAt).toBe("");
  expect(awaitingConfirmation.settings.endsAt).toBe("");
  await expect(page.locator("#activateEventBtn")).toContainText(/confirm/i);

  await page.locator("#activateEventBtn").click();
  const live = await readLocalState(page);
  expect(live.settings.eventStatus).toBe("LIVE");
  expect(live.settings.activatedAt).not.toBe("");
  expect(live.settings.endsAt).not.toBe("");
  expect(Date.parse(live.settings.endsAt) - Date.parse(live.settings.activatedAt)).toBe(LIVE_WINDOW_MS);
  expect(live.accessRaw).toBe(initial.accessRaw);
  expect(live.edition).toBe(initial.edition);
  expect(await readGalleryRecords(page)).toEqual([]);
});

test("pre-schema saved looks migrate to the matching curated palette", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone-portrait", "One browser migration pass is sufficient.");

  await page.evaluate(({ settingsKey }) => {
    localStorage.setItem(settingsKey, JSON.stringify({
      eventId: "event_e2e_host_preview",
      eventType: "party",
      eventTitle: "Legacy Sky Party",
      look: "sky",
      accent: "#12ff12",
      eventStatus: "DRAFT",
      activatedAt: "",
      endsAt: ""
    }));
  }, { settingsKey: SETTINGS_KEY });
  await page.reload({ waitUntil: "domcontentloaded" });

  const migrated = await readLocalState(page);
  expect(migrated.settings.schemaVersion).toBe(2);
  expect(migrated.settings.paletteId).toBe("blue-sky");
  expect(migrated.settings.palettePrimary).toBe(EVENT_PALETTE.primary);
  expect(migrated.settings.paletteSecondary).toBe(EVENT_PALETTE.secondary);
  expect(migrated.settings.paletteHighlight).toBe(EVENT_PALETTE.highlight);
  expect(migrated.settings.look).toBeUndefined();
  expect(migrated.settings.accent).toBeUndefined();

  await page.locator("#openPersonalSetup").click();
  await page.locator('[data-setup-step="1"]').click();
  await expect(page.locator("#paletteBlueSky")).toBeChecked();
  await expect(page.locator(".host-palette-grid .palette-selected:visible")).toHaveCount(1);
});

test("reduced motion holds the host Moving Polaroid until Play Motion", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone-portrait", "One deterministic reduced-motion pass is sufficient.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#openPersonalSetup").click();
  await page.locator("#adminPreviewPhotos").setInputFiles(previewPhotoPayloads());
  await selectAdminRenderer(page, "polaroid");

  const first = await canvasSignature(page);
  await page.waitForTimeout(300);
  const second = await canvasSignature(page);
  expect(second.hash).toBe(first.hash);

  const play = page.locator("#adminPreviewPlayMotion");
  await expect(play).toBeVisible();
  await assertTouchTargets(page, ["#adminPreviewPlayMotion"]);
  await play.click();
  await waitForCanvasChange(page, second);
});
