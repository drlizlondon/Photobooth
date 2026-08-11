/* landing.js — the public site's experiential entrance and live event demo.
   It owns no booth state. The demo emits a configuration event; app.js decides
   whether that configuration is a temporary preview or a saved event. */
(function(global){
"use strict";

var ENTRANCE_KEY="mybishbashPhotoboothEntranceSeenV1";
var EVENT=global.MyBishBashEvent||null;
var DEFAULT_PALETTE_ID="lilac-pop";
var currentPaletteId=DEFAULT_PALETTE_ID;

function byId(id){return document.getElementById(id);}
function text(value,max){return String(value||"").trim().slice(0,max||100);}
function title(value){return text(value,64)||"Your Event";}
function metaLine(location,date){return [text(location,48),text(date,32)].filter(Boolean).join(" · ");}

function paletteFor(value){
  if(EVENT&&typeof EVENT.resolvePalette==="function")return EVENT.resolvePalette(value);
  var registry=EVENT&&EVENT.PALETTES||{};
  return registry[value]||registry[DEFAULT_PALETTE_ID]||null;
}

function paletteInk(background){
  return EVENT&&typeof EVENT.safeForeground==="function"?EVENT.safeForeground(background):"";
}

function demoConfig(){
  var palette=paletteFor(currentPaletteId);
  return {
    eventType:text(byId("landingEventType")&&byId("landingEventType").value,24)||"party",
    eventTitle:title(byId("landingEventName")&&byId("landingEventName").value),
    location:text(byId("landingEventLocation")&&byId("landingEventLocation").value,48),
    date:text(byId("landingEventDate")&&byId("landingEventDate").value,32),
    datePrecision:"exact",
    eventLine:text(byId("landingEventLine")&&byId("landingEventLine").value,72),
    paletteId:palette&&palette.id||DEFAULT_PALETTE_ID,
    palettePrimary:palette&&palette.primary||"",
    paletteSecondary:palette&&palette.secondary||"",
    paletteHighlight:palette&&palette.highlight||""
  };
}

function applyPalette(node,value){
  var palette=paletteFor(value);
  if(!node||!palette)return;
  node.setAttribute("data-palette",palette.id);
  node.style.setProperty("--event-surface",palette.secondary);
  node.style.setProperty("--event-accent",palette.primary);
  node.style.setProperty("--event-accent-ink",paletteInk(palette.primary));
  node.style.setProperty("--event-shape",palette.highlight);
  node.style.setProperty("--event-ink",paletteInk(palette.secondary));
}

function hydratePaletteCards(){
  document.querySelectorAll(".palette-card[data-palette]").forEach(function(card){
    var palette=paletteFor(card.getAttribute("data-palette"));
    if(!palette)return;
    card.style.setProperty("--palette-primary",palette.primary);
    card.style.setProperty("--palette-secondary",palette.secondary);
    card.style.setProperty("--palette-highlight",palette.highlight);
    card.style.setProperty("--palette-primary-ink",paletteInk(palette.primary));
    card.style.setProperty("--palette-secondary-ink",paletteInk(palette.secondary));
    card.style.setProperty("--palette-highlight-ink",paletteInk(palette.highlight));
  });
}

function renderDemo(){
  var config=demoConfig();
  var preview=byId("landingEventPreview");
  var previewLine=byId("landingPreviewLine");
  var compareLine=byId("personalCompareMeta");
  var compareTitle=byId("personalCompareTitle");
  var compareLabel=byId("personalCompareLabel");
  var line=metaLine(config.location,config.date);
  if(byId("landingPreviewTitle"))byId("landingPreviewTitle").textContent=config.eventTitle;
  if(byId("landingPreviewMeta"))byId("landingPreviewMeta").textContent=line;
  if(previewLine){previewLine.textContent=config.eventLine;previewLine.hidden=!config.eventLine;}
  if(compareTitle)compareTitle.textContent=config.eventTitle;
  if(compareLabel)compareLabel.textContent=config.eventTitle;
  if(compareLine)compareLine.textContent=line;
  applyPalette(preview,currentPaletteId);
  var example=document.querySelector(".personal-welcome-browser .booth-example");
  applyPalette(example,currentPaletteId);
}

function choosePalette(input){
  var palette=input&&input.checked&&paletteFor(input.value);
  if(!palette)return;
  currentPaletteId=palette.id;
  renderDemo();
}

function dispatchPreview(){
  global.dispatchEvent(new CustomEvent("mybishbash:preview-event",{detail:demoConfig()}));
}

function entranceAllowed(){
  if(/(?:^|\/)business\/?$/.test(global.location.pathname))return false;
  if(global.location.hash)return false;
  try{return global.sessionStorage.getItem(ENTRANCE_KEY)!=="1";}catch(error){return true;}
}

function rememberEntrance(){try{global.sessionStorage.setItem(ENTRANCE_KEY,"1");}catch(error){}}

function revealSite(){
  var entrance=byId("siteEntrance"),landing=byId("landing");
  if(!entrance||entrance.classList.contains("revealing"))return;
  rememberEntrance();
  entrance.classList.add("revealing");
  document.body.classList.remove("entrance-open");
  if(landing){landing.removeAttribute("aria-hidden");try{landing.inert=false;}catch(error){}}
  var reduce=global.matchMedia&&global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  global.setTimeout(function(){
    entrance.hidden=true;
    entrance.classList.remove("active","revealing");
    var target=document.querySelector(".hero-start");
    if(target&&typeof target.focus==="function")target.focus({preventScroll:true});
  },reduce?160:720);
}

function initEntrance(){
  var entrance=byId("siteEntrance"),button=byId("siteEntranceStart"),landing=byId("landing");
  if(!entrance||!button||!entranceAllowed())return;
  entrance.hidden=false;
  document.body.classList.add("entrance-open");
  if(landing){landing.setAttribute("aria-hidden","true");try{landing.inert=true;}catch(error){}}
  global.requestAnimationFrame(function(){
    entrance.classList.add("active");
    button.focus({preventScroll:true});
  });
  button.addEventListener("click",revealSite,false);
}

function initDemo(){
  var form=byId("landingEventForm");
  hydratePaletteCards();
  if(form)form.addEventListener("input",function(event){
    if(event.target&&event.target.hasAttribute("data-landing-palette"))choosePalette(event.target);
    else renderDemo();
  },false);
  var preview=byId("previewCreatedBooth");
  if(preview)preview.addEventListener("click",dispatchPreview,false);
  var selected=document.querySelector('[name="landingPalette"]:checked');
  if(selected)choosePalette(selected);else renderDemo();
}

function init(){initDemo();initEntrance();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,false);
else init();

global.MyBishBashLanding={demoConfig:demoConfig,renderDemo:renderDemo,revealSite:revealSite};
})(window);
