const DEFAULTS = {
  schemaVersion:1,
  eventId:"",
  eventType:"party",
  eventTitle:"Your Celebration",
  location:"",
  eventLine:"",
  date:String(new Date().getFullYear()),
  datePrecision:"unknown",
  look:"lilac",
  eventStatus:"DRAFT",
  activatedAt:"",
  endsAt:"",
  guestPinEnabled:false,
  guestPinAlgorithm:"SHA-256",
  guestPinAuthority:"local_device",
  guestPinSalt:"",
  guestPinVerifier:"",
  stripFrame:"white",
  stripFilter:"original",
  magazineTemplate:"keepsake",

  /* Blank Strip copy now follows the same useful auto-generation contract as
     Magazine and Polaroid. Existing saved Rae wording remains explicit. */
  stripTop:"",
  stripSecond:"",
  stripSignature:"",
  stripDate:"",

  /* Cover copy: blank means "generate it from the event title". */
  coverMasthead:"",
  coverOccasion:"",
  coverScript:"",
  coverSkyline1:"",
  coverSkyline2:"",
  coverSkyline3:"",
  coverF1Title:"",
  coverF1Dek:"",
  coverF2Title:"",
  coverF2Dek:"",
  coverF3Title:"",
  coverF3Dek:"",
  coverBig:"",
  coverBigDek:"",
  coverFooter:"",
  coverBarcode:"",
  coverEyebrow:"",
  coverStack:"",
  coverDateLine:"",
  coverScriptSmall:"",
  coverHeroScript:"",
  coverHero:"",
  coverThanks:"",
  coverHashtag:"",
  coverIcons:"",
  coverEditionOf:"",
  coverEditionWord:"",
  coverOfWord:"",

  /* Living Polaroid: four handwritten lines, blank meaning "write it for me". */
  polaroidLine1:"",
  polaroidLine2:"",
  polaroidLine3:"",
  polaroidLine4:"",
  polaroidTransition:"crossfade",

  /* Typography. Blank means the shipped face, same as every other field. */
  fontDisplay:"",
  fontText:"",
  fontCondensed:"",
  fontScript:"",
  fontHand:"",
  polaroidBusyLabel:"",
  polaroidReadyLabel:"",
  polaroidStillLabel:"",

  welcomeEyebrow:"",
  startLabel:"",
  startHint:"",
  cancelLabel:"",
  stripTabLabel:"",
  magazineTabLabel:"",
  polaroidTabLabel:"",
  polaroidLabel:"",
  frameLabel:"",
  filterLabel:"",
  pickLabel:"",
  styleLabel:"",
  changePhotoLabel:"",
  shareLabel:"",
  saveLabel:"",
  nextLabel:"",
  retakeLabel:"",
  endEyebrow:"",
  endMessage:"",
  shotLabelFormat:"",
  promptLines:"",

  accent:"#ff5b52",
  countdown:3,
  mirror:true,
  prompts:true,
  shutter:true,
  flash:true,
  confetti:true
};

const FRAMES = [["white","White"],["black","Black"],["editorial","Editorial"],["film","Film"]];
const FILTERS = [["original","Original"],["bw","B&W"],["vintage","Vintage"],["warm","Warm"],["glow","Glow"]];
const PRODUCT=window.MyBishBashProduct||null;
const EVENT=window.MyBishBashEvent||null;
const MOTION=window.MyBishBashMotion||null;
const STRIP=window.Strip||null;
const ENTITLEMENTS=PRODUCT?PRODUCT.ENTITLEMENTS:{FREE:"FREE",ONE_EVENT:"ONE_EVENT",PERSONAL_6_MONTH:"PERSONAL_6_MONTH",PERSONAL_12_MONTH:"PERSONAL_12_MONTH",FOUNDING_LIFETIME:"FOUNDING_LIFETIME",BUSINESS:"BUSINESS"};
const SETTINGS_KEY="mybishbashPhotoboothSettingsV1";
const LEGACY_SETTINGS_KEY="raePhotoBoothLiveSettings";
const ACCESS_KEY="mybishbashPhotoboothVerifiedAccessV1";
const GALLERY_DB="mybishbashPhotoboothGallery";
const LEGACY_GALLERY_DB="raePhotoBoothGallery";
const GALLERY_MIGRATION_KEY="mybishbashPhotoboothGalleryMigratedV1";
const EDITION_KEY="mybishbashPhotoboothEditionSequenceV1";
/* Business contact details come from the meta tags in index.html and nowhere
   else. Previously the URL was written into four anchors and a meta nobody
   read, so "change the contact address" meant five edits and a 404 when one
   was missed. Supplying an email or a url upgrades every control to a real
   link; with neither, the controls fall back to the on-page contact block
   they already point at, so no path can 404. */
function metaContent(name){
  const el=document.querySelector('meta[name="'+name+'"]');
  return String(el&&el.content||"").trim();
}
const BUSINESS_CONTACT={
  email:metaContent("business-contact-email"),
  url:metaContent("business-contact-url"),
  address:metaContent("business-contact-address")
};
function businessContactHref(){
  if(BUSINESS_CONTACT.email){
    return "mailto:"+BUSINESS_CONTACT.email+"?subject="+encodeURIComponent("MyBishBash Photobooth - Business enquiry");
  }
  return BUSINESS_CONTACT.url||"";
}
function applyBillingState(){
  if(BILLING_LIVE)return;
  const notice=$("pricingNotice");
  if(notice)notice.hidden=false;
  /* A restore path implies purchases exist to restore. None can yet. */
  const restore=$("restoreAccessSection");
  if(restore)restore.hidden=true;
}
function applyBusinessContact(){
  const href=businessContactHref();
  document.querySelectorAll("[data-business-contact]").forEach(el=>{
    if(href)el.setAttribute("href",href);
  });
  const details=$("businessContactDetails");
  if(!details)return;
  details.innerHTML="";
  if(BUSINESS_CONTACT.email){
    const a=document.createElement("a");
    a.href=businessContactHref();a.textContent=BUSINESS_CONTACT.email;
    details.appendChild(a);
  }
  if(BUSINESS_CONTACT.address){
    const p=document.createElement("p");
    p.textContent=BUSINESS_CONTACT.address;
    details.appendChild(p);
  }
  details.hidden=!details.childNodes.length;
}
/* One origin, asserted rather than hoped for. The absolute URLs in the head
   are static because link-preview crawlers do not run JavaScript, so this
   checks at boot that they still agree with site-origin. If PB-15 repoints
   the origin and misses one, this says so instead of the product quietly
   advertising the old domain to every chat app. */
const SITE_ORIGIN=metaContent("site-origin").replace(/\/$/,"");
const SURFACE_META={
  personal:{
    title:"MyBishBash Photobooth — Your event. Your photobooth.",
    description:"Create a personalised photobooth for your event. Guests choose an experience, capture it live, then save or share what they make.",
    path:"/"
  },
  business:{
    title:"MyBishBash for Business — branded photobooth activations",
    description:"Brand the booth and every keepsake, configure Share, Save and delivery, and keep each attendee consent decision separate and recorded.",
    path:"/business"
  }
};
function setMeta(selector,value){
  const el=document.querySelector(selector);
  if(el)el.setAttribute("content",value);
}
function applySurfaceMetadata(route){
  const meta=SURFACE_META[route==="business"?"business":"personal"];
  const url=SITE_ORIGIN+meta.path;
  document.title=meta.title;
  setMeta('meta[name="description"]',meta.description);
  setMeta('meta[property="og:title"]',meta.title);
  setMeta('meta[name="twitter:title"]',meta.title);
  setMeta('meta[property="og:description"]',meta.description);
  setMeta('meta[name="twitter:description"]',meta.description);
  setMeta('meta[property="og:url"]',url);
  const canonical=document.querySelector('link[rel="canonical"]');
  if(canonical)canonical.setAttribute("href",url);
}
function assertOriginConsistency(){
  if(!SITE_ORIGIN)return;
  const absolute=[
    document.querySelector('link[rel="canonical"]'),
    document.querySelector('meta[property="og:url"]'),
    document.querySelector('meta[property="og:image"]'),
    document.querySelector('meta[name="twitter:image"]')
  ];
  const stale=absolute.filter(el=>{
    const value=el&&(el.getAttribute("href")||el.getAttribute("content"))||"";
    return value&&value.indexOf(SITE_ORIGIN)!==0;
  });
  if(stale.length){
    console.warn("Site metadata does not match site-origin ("+SITE_ORIGIN+"). Update these before shipping:",
      stale.map(el=>el.getAttribute("property")||el.getAttribute("name")||el.getAttribute("rel")));
  }
  return stale.length===0;
}
/* Billing is not open. Nothing can be bought yet: the Worker that issues
   Checkout sessions is written and tested but not deployed, and Amendments
   003/004 gate both paid products behind PB-16 until entitlement recovery
   exists. One flag, so PB-16 flips exactly this and nothing else.

   NOTE: this is about whether a purchase can be MADE. It has nothing to do
   with the 48-hour live event period, which begins only at a deliberate
   START EVENT on the event device. Purchase time is not event start time. */
const BILLING_LIVE=false;
const API_META=document.querySelector('meta[name="photobooth-api-base"]');
const API_BASE=String(API_META&&API_META.content||"").trim().replace(/\/$/,"");
const HISTORY_SURFACE={PRODUCT:"product",EVENT_HOME:"event-home",BOOTH:"booth"};

/* Every word a guest can see. [settings key, shipped default, element id].
   Blank in settings means "use the default", which is what the admin field
   shows as its placeholder — same contract as the cover copy. */
const SCREEN_TEXT = [
  ["welcomeEyebrow","PHOTO BOOTH","welcomeEyebrow"],
  ["startLabel","ENTER","startLabelText"],
  ["startHint","photobooth","startHintText"],
  ["cancelLabel","CANCEL","cancelCapture"],
  ["stripTabLabel","STRIP","stripTab"],
  ["magazineTabLabel","MAGAZINE","magazineTab"],
  ["polaroidTabLabel","POLAROID","polaroidTab"],
  ["polaroidLabel","MOVING POLAROID","polaroidLabelText"],
  ["frameLabel","FRAME","frameLabelText"],
  ["filterLabel","FILTER","filterLabelText"],
  ["pickLabel","PICK YOUR COVER PHOTO","pickLabelText"],
  ["styleLabel","CHOOSE A STYLE","styleLabelText"],
  ["changePhotoLabel","Choose a different photo","changeCoverPhoto"],
  ["shareLabel","Share","shareBtn"],
  ["saveLabel","Save","saveBtn"],
  ["nextLabel","Next guest →","nextGuestBtn"],
  ["retakeLabel","Retake photos","retakeBtn"],
  ["endEyebrow","SESSION COMPLETE","endEyebrow"],
  ["endMessage","Thank you ♡","endMessage"]
];
/* Guest-facing wording with no fixed element: either it is used while the
   camera is running, or several strings take turns in one slot. Same blank
   means default contract; listed here so the admin placeholders stay honest. */
const LOOSE_TEXT = [
  ["shotLabelFormat","PHOTO {n} / {total}"],
  ["promptLines","Everyone in!, Squash together!, One more!"],
  ["polaroidBusyLabel","Bringing it to life…"],
  ["polaroidReadyLabel","Save or Share your moving Polaroid ♡"],
  ["polaroidStillLabel","The still photo is ready on this browser"]
];
const looseText=key=>{
  const row=LOOSE_TEXT.find(([k])=>k===key);
  return String(settings[key]||"").trim()||(row?row[1]:"");
};

function applyScreenText(){
  SCREEN_TEXT.forEach(([key,def,id])=>{
    const el=$(id);
    if(el)el.textContent=String(settings[key]||"").trim()||def;
  });
}
/* `prompts` is the on/off toggle; `promptLines` is the wording. */
function capturePrompts(){
  return looseText("promptLines").split(/\s*[,|]\s*/).filter(Boolean);
}
function shotLabel(n,total){
  return looseText("shotLabelFormat").replace(/\{n\}/gi,n).replace(/\{total\}/gi,total);
}

let legacySettingsImported=false;
let settings=loadSettings();
let legacyProfileAvailable=legacySettingsImported;
try{legacyProfileAvailable=legacyProfileAvailable||!!localStorage.getItem(LEGACY_SETTINGS_KEY);}catch(e){}
let entitlement=ENTITLEMENTS.FREE;
let capabilities=PRODUCT?PRODUCT.getCapabilities(entitlement):{canPersonaliseEvent:false,canRemoveFreeBranding:false,canUploadBusinessLogo:false,canWhiteLabel:false,canCollectEmail:false,canConfigureSharing:false,canCollectConsent:false,canCollectConsentedPhotos:false};
let businessEventConfig=PRODUCT?PRODUCT.createBusinessEventConfig():{collectEmail:false,requireEmail:false,allowShare:true,allowSave:true,collectMarketingConsent:false,collectPublicityConsent:false,collectConsentedPhotos:false};
let businessBrand={name:"",primaryColor:"#2357ff",secondaryColor:"#ffcf33",logoImage:null,whiteLabel:false};
let stream=null;
let photos=[];
let currentMode="strip";
let currentExperience="strip";
let legacySessionMode=false;
let frameStyle="white";
let filterStyle="original";
let coverIndex=null;
let magazineStyle="keepsake";
let sessionEdition=1;
let sessionOrientation="landscape";
let captureSessionId=0;
let idleTimer=null;
let audioCtx=null;
let adminPreviewType="strip";
let adminOrientation="landscape";
let adminPreviewTimer=0;
let serviceWorkerRefreshPending=false;
let serviceWorkerRefreshStarted=false;
let boothReturnScreen="landing";
let boothExampleMode=false;
let settingsReturnScreen="landing";
let temporarySettingsSnapshot=null;
let historyTransitionPending=false;
let activeSetupStep=0;
let latestRenderPromise=Promise.resolve();
let stillRenderToken=0;
let exportBusy=false;
let businessCompletionSatisfied=false;
let motionCaptureAbort=null;
let motionCaptureBlob=null;
let motionCaptureExtension="mp4";
let motionFinalStill="";
let guestPinUnlocked=false;
let guestPinThrottle=EVENT?EVENT.createGuestPinThrottleState():{failures:0,blockedUntil:0};
let activationConfirmationPending=false;

const $=id=>document.getElementById(id);
const screens=["landing","business","welcome","experience","camera","review","timeout","settings"];

/* Copy written under the old two-cover settings moves to the unified cover
   model — but only where the host actually edited it. Anything left at an old
   shipped default becomes blank, so it regenerates from the event title. */
const LEGACY_COPY=[
  ["fashionMasthead","coverMasthead","RAE"],
  ["birthdayMasthead","coverOccasion","BIRTHDAY"],
  ["birthdayScript","coverScript","Rae's 26th"],
  ["fashionTop","coverSkyline1","THE BIRTHDAY EDIT"],
  ["fashionFeature2","coverSkyline2","LONDON · 2026"],
  ["fashionIssue","coverSkyline3","SPECIAL BIRTHDAY EDITION"],
  ["fashionFeature1","coverF1Title","ONE NIGHT ONLY"],
  ["fashionBottom","coverF2Title","THE QUEEN OF HER DAY"],
  ["birthdayLine2","coverF3Title","CELEBRATING 26 YEARS OF RAE"],
  ["fashionLarge","coverBig","TWENTY SIX"],
  ["birthdayLine3","coverBigDek","ONE NIGHT TO REMEMBER"],
  ["birthdayLine1","coverFooter","THE BIRTHDAY ISSUE"]
];
function migrateSettings(raw){
  const out={...raw};
  LEGACY_COPY.forEach(([oldKey,newKey,oldDefault])=>{
    if(typeof out[newKey]==="string")return;
    const v=String(raw[oldKey]||"").trim();
    out[newKey]=v&&v!==oldDefault?v:"";
  });
  LEGACY_COPY.forEach(([oldKey])=>delete out[oldKey]);
  return out;
}
function loadSettings(){
  try{
    let stored=localStorage.getItem(SETTINGS_KEY);
    if(!stored){
      stored=localStorage.getItem(LEGACY_SETTINGS_KEY);
      legacySettingsImported=!!stored;
    }
    const raw=JSON.parse(stored||"{}");
    const eventDefaults={...DEFAULTS};
    /* A saved profile with no event fields predates EventConfig. Do not make
       the new defaults look like deliberate old choices: this lets the event
       boundary conservatively infer the old Birthday/date voice once. New
       installs still receive today's Party/Unknown defaults. */
    if(stored&&!Object.prototype.hasOwnProperty.call(raw,"eventType"))delete eventDefaults.eventType;
    if(stored&&!Object.prototype.hasOwnProperty.call(raw,"datePrecision"))delete eventDefaults.datePrecision;
    const legacy={...eventDefaults,...Fonts.migrate(migrateSettings(raw))};
    const migrated=EVENT?EVENT.migrateEventConfig(legacy,{defaults:eventDefaults}):legacy;
    /* Persist every real migration, including the generated eventId. Without
       this, a neutral pre-EventConfig profile received a new identity on each
       reload until the host happened to press Save. The old Rae key remains
       untouched for rollback. */
    const serialised=JSON.stringify(migrated);
    if(!stored||stored!==serialised||legacySettingsImported){
      try{localStorage.setItem(SETTINGS_KEY,serialised);}catch(e){}
    }
    return migrated;
  }
  catch{
    /* Leave an unreadable stored value untouched so a future recovery path
       still has the original bytes; only valid migrations are copied forward. */
    return EVENT?EVENT.createEventConfig(DEFAULTS,{defaults:DEFAULTS}):{...DEFAULTS};
  }
}

const EVENT_LOOKS={
  lilac:{surface:"#ded2f2",accent:"#66519c",shape:"#ffd8ea",ink:"#111111"},
  pink:{surface:"#ffd8ea",accent:"#e83e8c",shape:"#ded2f2",ink:"#111111"},
  sky:{surface:"#d9e9ff",accent:"#337fd8",shape:"#fff0ae",ink:"#111111"},
  butter:{surface:"#fff0ae",accent:"#d88600",shape:"#d9e9ff",ink:"#111111"}
};
function eventLook(value){return EVENT_LOOKS[value]||EVENT_LOOKS.lilac;}
function applyEventLook(target,value){
  if(!target)return;
  const look=eventLook(value);
  target.style.setProperty("--event-surface",look.surface);
  target.style.setProperty("--event-accent",look.accent);
  target.style.setProperty("--event-shape",look.shape);
  target.style.setProperty("--event-ink",look.ink);
  target.dataset.look=EVENT_LOOKS[value]?value:"lilac";
}
function eventMeta(s){
  const bits=[];
  if(String(s.location||"").trim())bits.push(String(s.location).trim());
  if(String(s.date||"").trim())bits.push(String(s.date).trim());
  return bits.join(" · ");
}
function eventIsPersonalised(){
  return boothReturnScreen==="welcome";
}
function eventIsDraft(){
  return eventIsPersonalised()&&String(settings.eventStatus||"DRAFT")==="DRAFT";
}

function stripCopyFor(s){
  const title=String(s.eventTitle||DEFAULTS.eventTitle).trim()||DEFAULTS.eventTitle;
  const date=String(s.date||"").trim();
  return {
    top:String(s.stripTop||"").trim()||"THE PHOTOBOOTH EDIT",
    second:String(s.stripSecond||"").trim()||title,
    signature:String(s.stripSignature||"").trim()||title,
    date:String(s.stripDate||"").trim()||date
  };
}

function openNamedGalleryDB(name){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(name,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("sessions"))db.createObjectStore("sessions",{keyPath:"id"});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
let galleryMigrationPromise=null;
async function migrateLegacyGallery(){
  if(localStorage.getItem(GALLERY_MIGRATION_KEY)==="done")return;
  /* The settings copy can happen on an earlier visit than the first gallery
     open. The old settings key is intentionally retained, so it is the durable
     migration signal rather than this page-load-only flag. */
  const hasLegacyProfile=legacySettingsImported||!!localStorage.getItem(LEGACY_SETTINGS_KEY);
  if(!hasLegacyProfile){localStorage.setItem(GALLERY_MIGRATION_KEY,"done");return;}
  try{
    const legacy=await openNamedGalleryDB(LEGACY_GALLERY_DB);
    const oldTx=legacy.transaction("sessions","readonly");
    const sessions=await new Promise((res,rej)=>{const r=oldTx.objectStore("sessions").getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});
    legacy.close();
    if(sessions.length){
      const next=await openNamedGalleryDB(GALLERY_DB);
      const tx=next.transaction("sessions","readwrite"),store=tx.objectStore("sessions");
      sessions.forEach(item=>store.put(item));
      await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
      next.close();
    }
    localStorage.setItem(GALLERY_MIGRATION_KEY,"done");
  }catch(e){/* Existing gallery remains available for a later migration retry. */}
}
async function openGalleryDB(){
  if(!galleryMigrationPromise)galleryMigrationPromise=migrateLegacyGallery();
  await galleryMigrationPromise;
  return openNamedGalleryDB(GALLERY_DB);
}
/* Schema 1 stored each photo as a base64 data URL. A data URL is a third
   larger than the bytes it carries, so a three-photo session cost about
   2.19 MB of a device's storage budget. Schema 2 stores the identical JPEG
   bytes as a Uint8Array — same pixels, no re-encode, a quarter less storage —
   and schema 1 records are still read, so existing galleries survive
   untouched. Uint8Array rather than Blob because Blob-in-IndexedDB was
   unreliable on the older iOS Safari this booth targets. */
const GALLERY_SCHEMA=3;
/* Never trim below this many sessions however tight storage is: losing a
   party's photographs to save space is the worse failure. */
const GALLERY_MIN_SESSIONS=20;
const GALLERY_STORAGE_FRACTION=0.5;
const STORAGE_WARN_RATIO=0.85;

function isQuotaError(error){
  const name=error&&error.name?String(error.name):"";
  return name==="QuotaExceededError"||name==="NS_ERROR_DOM_QUOTA_REACHED";
}
function dataUrlToBytes(dataUrl){
  const text=String(dataUrl||""),comma=text.indexOf(",");
  if(comma===-1||text.slice(0,comma).indexOf("base64")===-1)return null;
  try{
    const binary=atob(text.slice(comma+1)),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }catch(e){return null;}
}
function sessionBytes(item){
  if(!item||!item.photos)return 0;
  return item.photos.reduce((total,photo)=>{
    if(photo&&typeof photo.byteLength==="number")return total+photo.byteLength;
    return total+(typeof photo==="string"?photo.length:0);
  },0);
}
function galleryRecord(sessionPhotos,orientation,experience){
  const bytes=sessionPhotos.map(dataUrlToBytes);
  const base={id:Date.now(),createdAt:new Date().toISOString(),orientation,experience:experience||"legacy"};
  if(bytes.every(Boolean))return {...base,schema:GALLERY_SCHEMA,photoType:"image/jpeg",photos:bytes};
  /* A photo that will not decode to bytes is still worth keeping verbatim. */
  return {...base,photos:[...sessionPhotos]};
}
function putSession(record){
  return openGalleryDB().then(db=>new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(fn,value)=>{if(settled)return;settled=true;try{db.close();}catch(e){}fn(value);};
    try{
      const tx=db.transaction("sessions","readwrite");
      tx.oncomplete=()=>finish(resolve);
      tx.onerror=()=>finish(reject,tx.error);
      tx.onabort=()=>finish(reject,tx.error);
      tx.objectStore("sessions").put(record);
    }catch(error){finish(reject,error);}
  }));
}
async function dropOldestSessions(count){
  const all=await getGallerySessions();
  if(all.length<=count)return false;
  const doomed=all.slice(-count);
  const db=await openGalleryDB();
  const tx=db.transaction("sessions","readwrite"),store=tx.objectStore("sessions");
  doomed.forEach(item=>store.delete(item.id));
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
  db.close();
  return true;
}
async function saveSessionToGallery(sessionPhotos,orientation,experience){
  if(!sessionPhotos||sessionPhotos.length<1||sessionPhotos.length>3)return;
  const record=galleryRecord(sessionPhotos,orientation,experience);
  try{
    try{
      await putSession(record);
    }catch(error){
      /* Out of space mid-event. Make room from the oldest end and try once
         more before telling anyone the session is lost. */
      if(!isQuotaError(error))throw error;
      const freed=await dropOldestSessions(3);
      if(!freed)throw error;
      await putSession(record);
    }
    clearStorageNotice();
    await trimGallery();
    await warnIfStorageLow();
  }catch(error){
    /* Swallowing this loses a guest's photographs and nobody finds out until
       the party is over. */
    showStorageNotice(isQuotaError(error)
      ?"This device is out of space, so the last session was not saved. Free up space, or clear older sessions in Settings."
      :"The last session could not be saved to this device.");
  }
}
async function storageBudget(){
  try{
    if(navigator.storage&&typeof navigator.storage.estimate==="function"){
      const estimate=await navigator.storage.estimate();
      if(estimate&&estimate.quota)return estimate.quota*GALLERY_STORAGE_FRACTION;
    }
  }catch(e){}
  return 0;
}
async function warnIfStorageLow(){
  try{
    if(!navigator.storage||typeof navigator.storage.estimate!=="function")return;
    const estimate=await navigator.storage.estimate();
    if(!estimate||!estimate.quota)return;
    if((estimate.usage||0)/estimate.quota>=STORAGE_WARN_RATIO){
      showStorageNotice("This device is nearly out of space. Older sessions will be removed to keep the booth running.");
    }
  }catch(e){}
}
/* The cap is whatever the device can actually hold, not a number chosen in
   advance. With no estimate available nothing is trimmed and the quota error
   above is the backstop. */
async function trimGallery(){
  try{
    const budget=await storageBudget();
    if(budget<=0)return;
    const all=await getGallerySessions();
    let used=0,keep=0;
    for(const item of all){
      used+=sessionBytes(item);
      if(keep>=GALLERY_MIN_SESSIONS&&used>budget)break;
      keep+=1;
    }
    if(keep>=all.length)return;
    const db=await openGalleryDB();
    const tx=db.transaction("sessions","readwrite"),store=tx.objectStore("sessions");
    all.slice(keep).forEach(item=>store.delete(item.id));
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
    db.close();
  }catch(e){}
}
async function getGallerySessions(){
  try{
    const db=await openGalleryDB();
    const tx=db.transaction("sessions","readonly"),store=tx.objectStore("sessions");
    const all=await new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});
    db.close();
    return all.sort((a,b)=>b.id-a.id);
  }catch(e){return [];}
}
async function countGallerySessions(){
  try{return (await getGallerySessions()).length||1;}catch(e){return 1;}
}
async function clearGallerySessions(){
  try{
    const db=await openGalleryDB();
    const tx=db.transaction("sessions","readwrite");
    tx.objectStore("sessions").clear();
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
    db.close();
  }catch(e){}
}
function showStorageNotice(message){
  const el=$("storageNotice");
  if(!el)return;
  el.textContent=message;
  el.hidden=false;
}
function clearStorageNotice(){
  const el=$("storageNotice");
  if(el)el.hidden=true;
}
/* Schema 2 keeps bytes, but every consumer downstream — the thumbnails and
   the review renderers a reopened session feeds — wants something assignable
   to img.src. Object URLs are minted once per session and cached, so the
   count stays bounded by the gallery itself and a reopened session can never
   have its photographs revoked out from under it. */
const hydratedSessionPhotos=Object.create(null);
function hydrateSession(session){
  if(!session||!session.photos||!session.photos.length)return session;
  if(typeof session.photos[0]==="string")return session;
  let urls=hydratedSessionPhotos[session.id];
  if(!urls){
    try{
      urls=session.photos.map(bytes=>URL.createObjectURL(new Blob([bytes],{type:session.photoType||"image/jpeg"})));
    }catch(e){return session;}
    hydratedSessionPhotos[session.id]=urls;
  }
  return {...session,photos:urls};
}
async function renderEventGallery(){
  const host=$("eventGallery");if(!host)return;
  const sessions=(await getGallerySessions()).map(hydrateSession);
  host.innerHTML="";
  if(!sessions.length){host.innerHTML='<div class="gallery-empty">No saved sessions yet.</div>';return;}
  sessions.forEach(session=>{
    const btn=document.createElement("button");
    btn.type="button";btn.className="gallery-session";
    const grid=document.createElement("div");grid.className="gallery-thumb-grid";
    session.photos.forEach(src=>{const im=document.createElement("img");im.src=src;grid.appendChild(im);});
    const meta=document.createElement("div");meta.className="gallery-session-meta";
    const dt=new Date(session.createdAt);
    meta.textContent=dt.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+" · reopen";
    btn.append(grid,meta);
    btn.onclick=async()=>{
      photos=[...session.photos];
      sessionOrientation=session.orientation||"landscape";
      currentExperience=session.experience&&session.experience!=="legacy"?session.experience:"strip";
      legacySessionMode=!session.experience||session.experience==="legacy";
      sessionEdition=sessions.length-sessions.indexOf(session);
      const eventContext=settingsReturnScreen==="welcome";
      if(!eventContext)boothExampleMode=false;
      setBoothReturnScreen(eventContext?"welcome":"landing");
      enterBoothHistory();
      resetCreativeState(currentExperience);
      if(currentExperience==="magazine")coverIndex=0;
      buildReviewControls();
      showScreen("review");
      if(currentExperience==="polaroid")await enterPolaroid();else await renderWithFade();
      resetIdle();
    };
    host.appendChild(btn);
  });
}

function persistSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function nextEditionNumber(fallbackCount){
  let current=0;
  try{current=Math.max(0,Number(localStorage.getItem(EDITION_KEY))||0);}catch(e){}
  current=Math.max(current,Math.max(0,Number(fallbackCount)||0)-1);
  current+=1;
  try{localStorage.setItem(EDITION_KEY,String(current));}catch(e){}
  return current;
}
function applyServiceWorkerRefreshIfSafe(){
  const safe=["landing","business","welcome"].some(id=>$(id)&&$(id).classList.contains("active"));
  if(!serviceWorkerRefreshPending||serviceWorkerRefreshStarted||!safe)return false;
  serviceWorkerRefreshStarted=true;
  location.reload();
  return true;
}
function requestServiceWorkerRefresh(){
  serviceWorkerRefreshPending=true;
  applyServiceWorkerRefreshIfSafe();
}
function showScreen(id){
  screens.forEach(s=>{const el=$(s);if(el)el.classList.toggle("active",s===id);});
  document.body.dataset.surface=id;
  if(id==="landing"||id==="business"||id==="welcome")applyServiceWorkerRefreshIfSafe();
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}

function normaliseBranding(policy,extra){
  const p=policy||{},x=extra||{};
  return {
    mode:p.mode||x.mode||"free",
    text:x.text!==undefined?x.text:(p.myBishBashText||""),
    brandName:x.brandName||"",
    primaryColor:x.primaryColor||settings.accent,
    secondaryColor:x.secondaryColor||settings.accent,
    logoImage:x.logoImage||null
  };
}
function currentBranding(){
  if(!PRODUCT)return {mode:"free",text:"MYBISHBASH PHOTOBOOTH",primaryColor:settings.accent,secondaryColor:settings.accent};
  const policy=PRODUCT.getOutputBrandingPolicy(entitlement,{whiteLabel:businessBrand.whiteLabel});
  if(entitlement===ENTITLEMENTS.BUSINESS){
    return normaliseBranding(policy,{
      text:businessBrand.whiteLabel?businessBrand.name:[businessBrand.name,policy.myBishBashText].filter(Boolean).join(" · "),
      brandName:businessBrand.name,
      primaryColor:businessBrand.primaryColor,
      secondaryColor:businessBrand.secondaryColor,
      logoImage:businessBrand.logoImage
    });
  }
  return normaliseBranding(policy);
}
function personalPreviewBranding(){
  if(!PRODUCT)return {mode:"personal",text:"POWERED BY MYBISHBASH PHOTOBOOTH",primaryColor:settings.accent,secondaryColor:settings.accent};
  return normaliseBranding(PRODUCT.getOutputBrandingPolicy(ENTITLEMENTS.ONE_EVENT||ENTITLEMENTS.PERSONAL_6_MONTH));
}
function setEntitlement(next,record){
  if(!PRODUCT||PRODUCT.ENTITLEMENT_VALUES.indexOf(next)===-1)next=ENTITLEMENTS.FREE;
  entitlement=next;
  capabilities=PRODUCT?PRODUCT.getCapabilities(entitlement):capabilities;
  if(record&&record.serverVerified===true){
    try{localStorage.setItem(ACCESS_KEY,JSON.stringify(record));}catch(e){}
  }
  applyEntitlementUI();
  invalidatePolaroid();
  if(photos.length&&currentMode!=="polaroid")renderWithFade();
}
function applyEntitlementUI(){
  const paid=!!capabilities.canPersonaliseEvent||legacyProfileAvailable;
  const note=$("settingsAccessNote"),save=$("saveSettings"),launch=$("launchCustomBooth"),choose=$("choosePersonalPlan");
  if(note)note.textContent=paid?"Your Personal setup can be saved and used on this device.":"Preview the Personal experience, then choose access when you are ready to use it.";
  /* Deliberately NOT disabled. A disabled button fires no events, so pressing
     it produced silence at the exact moment the organiser wanted an answer -
     and it is unreachable for anyone using assistive tech. The controls stay
     live and explain themselves instead. */
  if(save){save.disabled=false;save.removeAttribute("aria-disabled");}
  if(launch){launch.disabled=false;launch.removeAttribute("aria-disabled");}
  if(paid)clearSettingsSaveStatus();
  if(choose)choose.hidden=paid;
  const outputNote=$("outputBrandingNote");
  if(outputNote){
    outputNote.textContent=entitlement===ENTITLEMENTS.FREE?"Free keepsakes include a tasteful MyBishBash Photobooth credit.":
      entitlement===ENTITLEMENTS.BUSINESS?"This output follows the organiser’s Business branding policy.":"Personal keepsakes carry a small Powered by MyBishBash Photobooth credit.";
  }
}
function restoreTemporarySettings(){
  if(!temporarySettingsSnapshot)return;
  settings=temporarySettingsSnapshot;
  temporarySettingsSnapshot=null;
  fillSettingsUI();
}
function abortMotionCapture(){
  if(motionCaptureAbort){motionCaptureAbort.abort();motionCaptureAbort=null;}
}
function teardownBoothSession(){
  captureSessionId++;
  abortMotionCapture();
  clearTimeout(idleTimer);idleTimer=null;
  stillRenderToken++;
  const countdown=$("countdown"),prompt=$("promptText"),flash=$("flash");
  if(countdown)countdown.textContent="";
  if(prompt)prompt.classList.remove("show");
  if(flash)flash.classList.remove("on");
  stopCamera();
  invalidatePolaroid();
  photos=[];
  motionCaptureBlob=null;
  motionFinalStill="";
  exportBusy=false;
}
function setBoothReturnScreen(target){
  boothReturnScreen=target==="welcome"?"welcome":"landing";
  const button=$("boothHomeBtn");
  if(button){
    const label=boothReturnScreen==="welcome"?"Event Home":"Home";
    button.textContent=label;
    button.setAttribute("aria-label",label+(boothReturnScreen==="welcome"?" — return to this event's welcome screen":" — return to the MyBishBash Photobooth website"));
  }
}
function updateProductNav(active){
  document.querySelectorAll("[data-product-route]").forEach(link=>{
    const selected=link.dataset.productRoute===active;
    if(selected)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");
  });
}
function productHistoryState(route){
  return {surface:HISTORY_SURFACE.PRODUCT,productRoute:route==="business"?"business":"personal"};
}
function productBasePath(){
  const withoutBusiness=location.pathname.replace(/\/business\/?$/,"/");
  return withoutBusiness.endsWith("/")?withoutBusiness:withoutBusiness+"/";
}
function productURL(route){
  const base=productBasePath();
  return route==="business"?base.replace(/\/$/,"")+"/business":base;
}
function showProductRoute(route,push,replace){
  teardownBoothSession();restoreTemporarySettings();
  const business=route==="business";
  boothExampleMode=false;setBoothReturnScreen("landing");
  showScreen(business?"business":"landing");
  const productRoute=business?"business":"personal";
  updateProductNav(productRoute);
  applySurfaceMetadata(productRoute);
  if(push&&history.pushState){
    const url=productURL(productRoute);
    const current=history.state||{};
    if(current.surface!==HISTORY_SURFACE.PRODUCT||current.productRoute!==productRoute){
      history.pushState(productHistoryState(productRoute),"",url);
    }
  }else if(replace&&history.replaceState){
    history.replaceState(productHistoryState(productRoute),"",productURL(productRoute));
  }
  window.scrollTo(0,0);
}
function routeFromLocation(){return /(?:^|\/)business\/?$/.test(location.pathname)?"business":"personal";}
function applyExampleBoothSettings(){
  if(!temporarySettingsSnapshot)temporarySettingsSnapshot=settings;
  const example={...DEFAULTS,eventType:"birthday",eventTitle:"Rae's 26th Birthday",location:"London",date:"08.08.26",datePrecision:"exact",eventLine:"Good people. Great pictures.",look:"pink",accent:"#d86c8f",stripTop:"",stripSecond:"",stripSignature:"Rae's 26th Birthday",stripDate:"08.08.26"};
  settings=EVENT?EVENT.createEventConfig(example,{defaults:DEFAULTS}):example;
}
function updateWelcomeMode(hostView){
  const welcome=$("welcome");
  if(!welcome)return;
  welcome.classList.toggle("host-mode",!!hostView);
  welcome.classList.toggle("guest-mode",!hostView);
  const guestEnded=!hostView&&String(settings.eventStatus||"DRAFT")==="ENDED";
  const pinRequired=!guestEnded&&!hostView&&settings.guestPinEnabled&&!guestPinUnlocked;
  $("welcomePinPanel").hidden=!pinRequired;
  $("welcomeEndedMessage").hidden=!guestEnded;
  $("startBtn").hidden=pinRequired||guestEnded;
  const hostName=String(settings.eventTitle||"this event").replace(/(?:['’]s\b.*|\b(?:party|wedding|birthday|hen)\b.*)$/i,"").trim();
  $("welcomePinMessage").textContent="This photobooth is just for "+(hostName||"the event")+"’s guests.";
}
function refreshHostEventStatus(){
  if(!EVENT)return;
  settings=EVENT.refreshEventLifecycle(settings);
  const status=settings.eventStatus;
  const text=$("hostEventStatusText"),label=$("hostEventStatusLabel"),activate=$("activateEventBtn");
  if(status==="LIVE"){
    label.textContent="EVENT LIVE";
    text.textContent="Guests can use the photobooth until "+new Date(settings.endsAt).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})+".";
    activate.hidden=true;
  }else if(status==="ENDED"){
    label.textContent="EVENT ENDED";
    text.textContent="The 48-hour live event period has ended. Saved guest keepsakes remain on this device.";
    activate.hidden=true;
  }else{
    label.textContent="HOST PREVIEW";
    text.textContent="Preview the guest experience. Your 48-hour event clock has not started.";
    activate.hidden=false;
    activate.textContent=activationConfirmationPending?"CONFIRM — START 48 HOURS":"START EVENT";
  }
}
function showEventHome(example,hostView){
  teardownBoothSession();
  boothExampleMode=!!example;
  if(boothExampleMode)applyExampleBoothSettings();
  setBoothReturnScreen("welcome");
  guestPinUnlocked=false;
  guestPinThrottle=EVENT?EVENT.createGuestPinThrottleState():guestPinThrottle;
  activationConfirmationPending=false;
  fillSettingsUI();
  applyEventLook($("welcome"),settings.look);
  refreshHostEventStatus();
  updateWelcomeMode(!!hostView);
  showScreen("welcome");
}
function enterEventHome(example,hostView){
  if(history.pushState){
    const current=history.state||{};
    const next={surface:HISTORY_SURFACE.EVENT_HOME,example:!!example,hostView:!!hostView};
    if(current.surface===HISTORY_SURFACE.EVENT_HOME){
      history.replaceState(next,"",location.href);
    }else{
      history.pushState(next,"",location.href);
    }
  }
  showEventHome(example,hostView);
}
function enterBoothHistory(){
  if(!history.pushState)return;
  const current=history.state||{};
  if(current.surface===HISTORY_SURFACE.BOOTH)return;
  history.pushState({
    surface:HISTORY_SURFACE.BOOTH,
    returnScreen:boothReturnScreen,
    example:boothExampleMode
  },"",location.href);
}
function showBoothReturnScreen(){
  teardownBoothSession();
  const state=history.state||{};
  if(state.surface===HISTORY_SURFACE.BOOTH&&history.back&&history.length>1){
    if(!historyTransitionPending){historyTransitionPending=true;history.back();}
    return;
  }
  if(boothReturnScreen==="welcome"){
    showEventHome(boothExampleMode,false);
    if(history.replaceState)history.replaceState({surface:HISTORY_SURFACE.EVENT_HOME,example:boothExampleMode,hostView:false},"",location.href);
    return;
  }
  showProductRoute("personal",false,true);
}
function returnFromEventToProduct(){
  teardownBoothSession();
  const state=history.state||{};
  if(state.surface===HISTORY_SURFACE.EVENT_HOME&&history.back&&history.length>1){
    if(!historyTransitionPending){historyTransitionPending=true;history.back();}
    return;
  }
  showProductRoute("personal",false,true);
}
function restoreHistorySurface(state){
  const next=state||{};
  if(next.surface===HISTORY_SURFACE.EVENT_HOME){showEventHome(!!next.example,!!next.hostView);return true;}
  if(next.surface===HISTORY_SURFACE.BOOTH){
    const eventReturn=next.returnScreen==="welcome";
    boothExampleMode=!!next.example;
    setBoothReturnScreen(eventReturn?"welcome":"landing");
    if(history.back&&history.length>1){
      if(!historyTransitionPending){historyTransitionPending=true;history.back();}
      return true;
    }
    if(eventReturn){
      showEventHome(!!next.example,false);
      if(history.replaceState)history.replaceState({surface:HISTORY_SURFACE.EVENT_HOME,example:!!next.example,hostView:false},"",location.href);
    }else{
      showProductRoute("personal",false,true);
    }
    return true;
  }
  return false;
}
function handleHistoryChange(event){
  historyTransitionPending=false;
  teardownBoothSession();
  const state=event&&event.state||history.state||{};
  if(restoreHistorySurface(state))return;
  showProductRoute(state.productRoute||routeFromLocation(),false,false);
}
function bootstrapNavigation(){
  const state=history.state||{};
  if(restoreHistorySurface(state))return;
  const route=state.productRoute||routeFromLocation();
  showProductRoute(route,false,false);
  if(history.replaceState)history.replaceState(productHistoryState(route),"",location.href);
}

function fillSettingsUI(){
  $("welcomeTitle").textContent=settings.eventTitle;
  const meta=eventMeta(settings);
  $("welcomeDate").textContent=meta;
  $("welcomeDate").hidden=!meta;
  $("welcomeEventLine").textContent=settings.eventLine||"";
  $("welcomeEventLine").hidden=!settings.eventLine;
  document.documentElement.style.setProperty("--accent",settings.accent);
  applyScreenText();

  const map={
    setEventType:"eventType",setEventTitle:"eventTitle",setLocation:"location",setDate:"date",setDatePrecision:"datePrecision",setEventLine:"eventLine",setLook:"look",
    setStripFrame:"stripFrame",setStripFilter:"stripFilter",setMagazineTemplate:"magazineTemplate",
    setStripTop:"stripTop",setStripSecond:"stripSecond",setStripSignature:"stripSignature",setStripDate:"stripDate"
  };
  COVER_FIELDS.concat(TEXT_FIELDS,POLAROID_FIELDS,FONT_FIELDS).forEach(([id,key])=>map[id]=key);
  Object.entries(map).forEach(([id,key])=>{if($(id))$(id).value=settings[key];});
  if($("setEventType"))$("setEventType").value=String(settings.eventType||"party").replace(/_/g,"-");
  refreshCoverPlaceholders();
  $("setAccent").value=settings.accent;
  $("setPolaroidTransition").value=settings.polaroidTransition;
  $("setCountdown").value=String(settings.countdown);
  $("setMirror").checked=settings.mirror;
  $("setPrompts").checked=settings.prompts;
  $("setShutter").checked=settings.shutter;
  $("setFlash").checked=settings.flash;
  $("setConfetti").checked=settings.confetti;
  $("setGuestPinEnabled").checked=settings.guestPinEnabled;
  $("setGuestPin").value="";
  $("setGuestPinField").hidden=!settings.guestPinEnabled;
  const summary=$("setupSummaryTitle");if(summary)summary.textContent=settings.eventTitle||DEFAULTS.eventTitle;
  applyEntitlementUI();
}

const inputId=key=>"set"+key.charAt(0).toUpperCase()+key.slice(1);
/* [input id, settings key] for every editable cover line. */
const COVER_FIELDS=Covers.copyKeys.map(k=>{
  const key="cover"+k.charAt(0).toUpperCase()+k.slice(1);
  return [inputId(key),key];
});
/* Same contract for the guest-facing screen wording. */
const TEXT_FIELDS=SCREEN_TEXT.map(([key])=>[inputId(key),key])
  .concat(LOOSE_TEXT.map(([key])=>[inputId(key),key]));
/* And for the four handwritten lines under the Polaroid. */
const POLAROID_FIELDS=Polaroid.copyKeys.map(k=>{
  const key="polaroid"+k.charAt(0).toUpperCase()+k.slice(1);
  return [inputId(key),key];
});
/* And one per typographic role. */
const FONT_FIELDS=Fonts.ROLES.map(([role,key])=>[inputId(key),key]);

/* Blank fields show what the cover will auto-generate. */
function refreshCoverPlaceholders(){
  const title=$("setEventTitle").value.trim()||DEFAULTS.eventTitle;
  const date=$("setDate").value.trim();
  const derived=Covers.derive({eventTitle:title,date});
  COVER_FIELDS.forEach(([id,key],i)=>{
    const el=$(id);if(!el)return;
    el.placeholder=derived[Covers.copyKeys[i]]||"";
  });
  SCREEN_TEXT.concat(LOOSE_TEXT).forEach(([key,def])=>{
    const el=$(inputId(key));if(el)el.placeholder=def;
  });
  const hand=Polaroid.derive({eventTitle:$("setEventTitle").value.trim()||DEFAULTS.eventTitle,date:$("setDate").value.trim()});
  POLAROID_FIELDS.forEach(([id],i)=>{
    const el=$(id);if(el)el.placeholder=hand[Polaroid.copyKeys[i]]||"";
  });
  const strip=stripCopyFor({eventTitle:title,date,stripTop:"",stripSecond:"",stripSignature:"",stripDate:""});
  [["setStripTop",strip.top],["setStripSecond",strip.second],["setStripSignature",strip.signature],["setStripDate",strip.date]].forEach(([id,value])=>{if($(id))$(id).placeholder=value;});
  const summary=$("setupSummaryTitle");if(summary)summary.textContent=title;
}

/* ---------- font specimens ---------- */

/* Sample wording per role, taken from the organiser's own event so a specimen
   shows the words that will actually be printed — a face that carries one name
   beautifully can fall apart on "Aisha & Tom's Wedding". */
function fontSamples(s){
  const cover=Covers.copyFor(s),hand=Polaroid.copyFor(s);
  return {
    display:cover.masthead||"TONIGHT",
    text:cover.footer||"GOOD PEOPLE",
    condensed:(cover.stack||"CELEBRATION EDITION").toUpperCase(),
    script:cover.script||"Your Celebration",
    /* Hearts are stripped from the handwriting specimen: the print draws them
       as paths, so showing the font's own glyph would be the one thing on
       this page that is not what a guest gets. */
    hand:(hand.line1||"Your Celebration").replace(/[♡♥❤]/g,"").trim()
  };
}
/* Specimens are drawn on canvas, not styled in HTML. Canvas resolves a font
   stack differently from the DOM and lays type out differently, so an HTML
   preview would be a promise the covers might not keep. */
function drawSpecimen(cv,role,option,sample,selected){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=cv.clientWidth||190,h=54;
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  const ctx=cv.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const missing=!Fonts.available(option[2]);
  ctx.fillStyle=selected?"#111":"#fff";
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle=missing?(selected?"#8a8a8a":"#b6b0a8"):(selected?"#fff":"#151515");

  const stack=option[3],pad=12;
  let size=role==="hand"||role==="script"?26:22;
  while(size>9){
    ctx.font=`400 ${size}px ${stack}`;
    if(ctx.measureText(sample).width<=w-pad*2)break;
    size-=1;
  }
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText(sample,w/2,h/2+1);
  return missing;
}

function buildFontRoles(){
  const host=$("fontRoles");if(!host)return;
  host.innerHTML="";
  Fonts.ROLES.forEach(([role,key,label,what])=>{
    const block=document.createElement("div");
    block.className="font-role";
    const head=document.createElement("p");
    head.className="control-label";
    head.textContent=label;
    const note=document.createElement("small");
    note.className="font-role-note";
    note.textContent=what;
    const grid=document.createElement("div");
    grid.className="font-specimens";
    grid.dataset.role=role;
    Fonts.optionsFor(role).forEach(option=>{
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="font-specimen";
      btn.dataset.role=role;btn.dataset.key=option[0];
      const cv=document.createElement("canvas");
      const name=document.createElement("small");
      name.textContent=option[1];
      btn.append(cv,name);
      btn.onclick=()=>{
        $(inputId(key)).value=option[0];
        refreshFontSpecimens();
        renderAdminPreview();
      };
      grid.appendChild(btn);
    });
    block.append(head,note,grid);
    host.appendChild(block);
  });
  refreshFontSpecimens();
}
/* Redrawn whenever the event wording or the selection changes — the specimen
   is only honest if it is showing the current words. */
function refreshFontSpecimens(){
  const s=draftSettings(),samples=fontSamples(s);
  document.querySelectorAll(".font-specimen").forEach(btn=>{
    const role=btn.dataset.role;
    const option=Fonts.find(role,btn.dataset.key);
    if(!option)return;
    const chosen=Fonts.find(role,String(s[Fonts.ROLES.find(r=>r[0]===role)[1]]||"").trim());
    const selected=chosen&&chosen[0]===option[0];
    btn.classList.toggle("active",!!selected);
    const missing=drawSpecimen(btn.querySelector("canvas"),role,option,samples[role],!!selected);
    btn.classList.toggle("missing",missing);
    btn.title=missing?option[1]+" is not installed on this device":option[1];
  });
}

function draftSettings(){
  const draft={
    ...settings,
    eventType:String($("setEventType").value||"party").replace(/-/g,"_"),
    eventTitle:$("setEventTitle").value.trim()||DEFAULTS.eventTitle,
    location:$("setLocation").value.trim(),
    date:$("setDate").value.trim(),
    datePrecision:$("setDatePrecision").value,
    eventLine:$("setEventLine").value.trim(),
    look:$("setLook").value,
    stripFrame:$("setStripFrame").value,
    stripFilter:$("setStripFilter").value,
    magazineTemplate:$("setMagazineTemplate").value,
    stripTop:$("setStripTop").value.trim(),
    stripSecond:$("setStripSecond").value.trim(),
    stripSignature:$("setStripSignature").value.trim(),
    stripDate:$("setStripDate").value.trim(),
    accent:$("setAccent").value,
    polaroidTransition:$("setPolaroidTransition").value,
    countdown:Number($("setCountdown").value),
    mirror:$("setMirror").checked,
    prompts:$("setPrompts").checked,
    shutter:$("setShutter").checked,
    flash:$("setFlash").checked,
    confetti:$("setConfetti").checked
  };
  COVER_FIELDS.concat(TEXT_FIELDS,POLAROID_FIELDS,FONT_FIELDS).forEach(([id,key])=>{if($(id))draft[key]=$(id).value.trim();});
  return EVENT?EVENT.migrateEventConfig(draft,{defaults:DEFAULTS}):draft;
}

function releaseMediaStream(target){
  if(!target)return;
  const video=$("video");
  if(video&&video.srcObject===target)video.srcObject=null;
  if(stream===target)stream=null;
  target.getTracks().forEach(track=>track.stop());
}
function syncStripFramingGuide(){
  const guide=$("stripFramingGuide"),video=$("video"),wrap=video&&video.parentElement;
  if(!guide||!video||!wrap||!video.videoWidth||!video.videoHeight)return;
  const availableWidth=wrap.clientWidth,availableHeight=wrap.clientHeight;
  if(!availableWidth||!availableHeight)return;
  const sourceRatio=video.videoWidth/video.videoHeight;
  const boxRatio=availableWidth/availableHeight;
  const shownWidth=boxRatio>sourceRatio?availableHeight*sourceRatio:availableWidth;
  const shownHeight=boxRatio>sourceRatio?availableHeight:availableWidth/sourceRatio;
  const shownLeft=(availableWidth-shownWidth)/2;
  const shownTop=(availableHeight-shownHeight)/2;
  const stripGeometry=STRIP&&typeof STRIP.geometry==="function"?STRIP.geometry():null;
  const aperture=stripGeometry&&stripGeometry.slots&&stripGeometry.slots[0];
  const apertureRatio=aperture?aperture.w/aperture.h:564/504;
  const cropWidth=sourceRatio>apertureRatio?shownHeight*apertureRatio:shownWidth;
  const cropHeight=sourceRatio>apertureRatio?shownHeight:shownWidth/apertureRatio;
  guide.style.width=cropWidth+"px";
  guide.style.height=cropHeight+"px";
  guide.style.left=shownLeft+(shownWidth-cropWidth)/2+"px";
  guide.style.top=shownTop+(shownHeight-cropHeight)/2+"px";
  guide.style.transform="none";
  guide.style.aspectRatio="auto";
}
async function startCamera(sessionId){
  stopCamera();
  const acquired=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:"user",width:{ideal:1920},height:{ideal:1080}},
    audio:false
  });
  if(sessionId!==captureSessionId){releaseMediaStream(acquired);throw new Error("cancelled");}
  const video=$("video");
  stream=acquired;
  video.srcObject=acquired;
  video.classList.toggle("mirror",settings.mirror);
  try{await video.play();}
  catch(error){releaseMediaStream(acquired);throw error;}
  if(sessionId!==captureSessionId){releaseMediaStream(acquired);throw new Error("cancelled");}
  const w=video.videoWidth||window.innerWidth;
  const h=video.videoHeight||window.innerHeight;
  sessionOrientation=w>=h?"landscape":"portrait";
  syncStripFramingGuide();
}
function stopCamera(){releaseMediaStream(stream);}

function initAudio(){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended")audioCtx.resume();
  }catch{}
}
function shutterSound(){
  if(!settings.shutter||!audioCtx)return;
  const now=audioCtx.currentTime;
  const noise=audioCtx.createBufferSource();
  const buffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.16),audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(data.length*.13));
  noise.buffer=buffer;
  const gain=audioCtx.createGain();
  gain.gain.setValueAtTime(.3,now);gain.gain.exponentialRampToValueAtTime(.001,now+.15);
  noise.connect(gain).connect(audioCtx.destination);noise.start(now);

  const osc=audioCtx.createOscillator(),og=audioCtx.createGain();
  osc.type="square";osc.frequency.setValueAtTime(210,now);osc.frequency.exponentialRampToValueAtTime(70,now+.06);
  og.gain.setValueAtTime(.16,now);og.gain.exponentialRampToValueAtTime(.001,now+.07);
  osc.connect(og).connect(audioCtx.destination);osc.start(now);osc.stop(now+.075);
}

async function runCountdown(sessionId){
  for(let n=settings.countdown;n>=1;n--){
    if(sessionId!==captureSessionId)throw new Error("cancelled");
    $("countdown").textContent=n;
    await delay(820);
    if(sessionId!==captureSessionId)throw new Error("cancelled");
    $("countdown").textContent="";
    await delay(180);
  }
}
function capturePhoto(){
  const v=$("video"),c=$("captureCanvas"),w=v.videoWidth||1280,h=v.videoHeight||720;
  c.width=w;c.height=h;
  const ctx=c.getContext("2d");
  ctx.save();
  if(settings.mirror){ctx.translate(w,0);ctx.scale(-1,1);}
  ctx.drawImage(v,0,0,w,h);
  ctx.restore();
  shutterSound();
  if(settings.flash){$("flash").classList.add("on");setTimeout(()=>$("flash").classList.remove("on"),120);}
  return c.toDataURL("image/jpeg",.96);
}
function freezeCameraFrame(){
  const video=$("video"),source=document.createElement("canvas");
  source.width=video.videoWidth||1280;source.height=video.videoHeight||720;
  source.getContext("2d").drawImage(video,0,0,source.width,source.height);
  return source;
}
function photoDataFromSource(source){
  const c=$("captureCanvas"),w=source.width,h=source.height;
  c.width=w;c.height=h;
  const ctx=c.getContext("2d");
  ctx.save();
  if(settings.mirror){ctx.translate(w,0);ctx.scale(-1,1);}
  ctx.drawImage(source,0,0,w,h);
  ctx.restore();
  return c.toDataURL("image/jpeg",.96);
}
function cancelCapture(){
  if(boothReturnScreen==="welcome"){showExperienceChooser();return;}
  showBoothReturnScreen();
}
function resetCreativeState(experience){
  currentExperience=["strip","polaroid","magazine"].includes(experience)?experience:"strip";
  currentMode=currentExperience;
  frameStyle=settings.stripFrame||"white";
  filterStyle=settings.stripFilter||"original";
  coverIndex=null;
  magazineStyle=settings.magazineTemplate||"keepsake";
  invalidatePolaroid();
  document.querySelectorAll(".mode-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===currentMode));
  $("stripControls").classList.toggle("active",currentMode==="strip");
  $("magazineControls").classList.toggle("active",currentMode==="magazine");
  $("polaroidControls").classList.toggle("active",currentMode==="polaroid");
  $("magazinePickStep").hidden=currentMode==="magazine";
  $("magazineStyleStep").hidden=currentMode!=="magazine";
  $("reviewModeNav").hidden=!legacySessionMode;
  $("review").querySelector(".review-panel").classList.toggle("output-locked",eventIsPersonalised()&&!legacySessionMode);
  const resultNames={strip:"YOUR PHOTO STRIP",polaroid:"YOUR MOVING POLAROID",magazine:"YOUR MAGAZINE COVER"};
  $("resultsKicker").textContent=resultNames[currentMode];
  $("stillPhotoBtn").hidden=currentMode!=="polaroid";
  $("retakeBtn").textContent=currentMode==="strip"?"Retake three photos":currentMode==="polaroid"?"Retake moving moment":"Retake photo";
  businessCompletionSatisfied=false;
  setExportStatus("");
  refreshExportControls();
}

function showExperienceChooser(){
  teardownBoothSession();
  legacySessionMode=false;
  const home=$("experienceHomeBtn");
  const label=boothReturnScreen==="welcome"?"Event Home":"Home";
  home.textContent=label;
  home.setAttribute("aria-label",label);
  applyEventLook($("experience"),settings.look);
  showScreen("experience");
  const first=document.querySelector("[data-experience]");
  if(first&&typeof first.focus==="function")first.focus();
}

async function captureMovingPolaroid(sid){
  const canvas=$("motionCanvas"),video=$("video");
  const compositor=Polaroid.composeLive({
    base:POLAROID_VIDEO_BASE,
    copy:Polaroid.copyFor(settings),
    hand:Fonts.stack("hand",settings),
    attribution:currentBranding(),
    mirror:settings.mirror,
    draftPreview:eventIsDraft()
  });
  canvas.width=compositor.geo.W;canvas.height=compositor.geo.H;
  let frozenSource=null;
  const captureFinal=()=>{
    if(frozenSource)return;
    frozenSource=freezeCameraFrame();
    compositor.captureFinalStill(frozenSource);
    motionFinalStill=photoDataFromSource(frozenSource);
    photos=[motionFinalStill];
    shutterSound();
    if(settings.flash){$("flash").classList.add("on");setTimeout(()=>$("flash").classList.remove("on"),120);}
  };

  const support=MOTION&&MOTION.inspectSupport(canvas);
  if(!support||!support.supported){
    $("promptText").textContent="A little movement… then hold the pose";
    $("promptText").classList.add("show");
    await runCountdown(sid);
    if(sid!==captureSessionId)throw new Error("cancelled");
    captureFinal();
    $("promptText").classList.remove("show");
    polaroidState="unsupported";
    return;
  }

  motionCaptureAbort=new AbortController();
  $("promptText").textContent="Move, laugh, pose…";
  $("promptText").classList.add("show");
  try{
    const result=await MOTION.record({
      canvas,
      signal:motionCaptureAbort.signal,
      motionMs:2500,
      holdMs:1000,
      fps:30,
      drawMotionFrame(ctx){compositor.drawLive(ctx,video);},
      drawFinalStill(ctx){captureFinal();compositor.drawFinalStill(ctx,frozenSource);},
      onProgress(point){
        if(point.phase==="motion")$("countdown").textContent=Math.max(1,Math.ceil((2500-point.elapsedMs)/1000));
        else $("countdown").textContent="";
      }
    });
    if(sid!==captureSessionId)return;
    captureFinal();
    motionCaptureBlob=result.blob;
    motionCaptureExtension=result.extension||"mp4";
    polaroidVideoBlob=result.blob;
    polaroidState="ready";
  }catch(error){
    if(sid!==captureSessionId||error&&error.code==="cancelled")throw new Error("cancelled");
    if(!frozenSource)captureFinal();
    polaroidState="unsupported";
  }finally{
    motionCaptureAbort=null;
    $("countdown").textContent="";
    $("promptText").classList.remove("show");
  }
}

async function beginSession(experience){
  /* A newly activated worker waits until the previous guest is finished. The
     next Start/Retake/Next guest tap is a safe boundary to load the new app. */
  if(serviceWorkerRefreshPending){showBoothReturnScreen();return;}
  if(EVENT&&eventIsPersonalised()){
    settings=EVENT.refreshEventLifecycle(settings);
    if(settings.eventStatus==="ENDED"){
      persistSettings();showEventHome(boothExampleMode,false);return;
    }
  }
  clearTimeout(idleTimer);
  captureSessionId++;
  /* Retake can start without passing through teardownBoothSession(). Invalidate
     any previous guest export here as well, so its eventual Promise cannot
     complete into this camera session. */
  exportBusy=false;
  const sid=captureSessionId;
  photos=[];
  motionCaptureBlob=null;
  motionFinalStill="";
  legacySessionMode=false;
  resetCreativeState(experience||currentExperience);
  initAudio();
  const labels={strip:"PHOTO STRIP",polaroid:"MOVING POLAROID",magazine:"MAGAZINE COVER"};
  $("cameraExperienceLabel").textContent=labels[currentExperience];
  $("stripFramingGuide").hidden=currentExperience!=="strip";
  showScreen("camera");

  const promptList=capturePrompts();
  try{
    await startCamera(sid);
    if(sid!==captureSessionId)return;
    await delay(400);
    if(currentExperience==="polaroid"){
      $("shotLabel").textContent="ONE MOVING MOMENT";
      await captureMovingPolaroid(sid);
    }else{
      const total=currentExperience==="strip"?3:1;
      for(let i=0;i<total;i++){
      if(sid!==captureSessionId)return;
      $("shotLabel").textContent=currentExperience==="magazine"?"ONE HERO PHOTO":shotLabel(i+1,total);
      if(settings.prompts){
        $("promptText").textContent=promptList[i]||"";
        $("promptText").classList.add("show");
        await delay(650);
        if(sid!==captureSessionId)return;
        $("promptText").classList.remove("show");
      }
      await runCountdown(sid);
      if(sid!==captureSessionId)return;
      photos.push(capturePhoto());
      await delay(420);
      }
    }
    if(sid!==captureSessionId)return;
    stopCamera();
    await saveSessionToGallery(photos,sessionOrientation,currentExperience);
    if(sid!==captureSessionId)return;
    const galleryCount=await countGallerySessions();
    if(sid!==captureSessionId)return;
    sessionEdition=nextEditionNumber(galleryCount);
    if(currentExperience==="magazine")coverIndex=0;
    buildReviewControls();
    showScreen("review");
    if(currentExperience==="polaroid")await enterPolaroid();else await renderWithFade();
    if(sid!==captureSessionId)return;
    resetIdle();
    if(settings.confetti)launchConfetti();
  }catch(err){
    if(sid!==captureSessionId||err.message==="cancelled")return;
    stopCamera();
    if(err.message!=="cancelled"){
      showCameraError(err);
    }
  }
}

/* One alert() used to cover six different causes and told everyone to fix
   Safari - including the in-app browsers a party link is actually opened in,
   which are not Safari and often cannot grant the camera at all. Each cause
   now says what happened and offers a way forward. */
function inAppBrowser(){
  const ua=String(navigator.userAgent||"");
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|WhatsApp|Snapchat|LinkedInApp|Pinterest|TikTok/i.test(ua);
}
function cameraFailure(err){
  const name=err&&err.name?String(err.name):"";
  const hint=inAppBrowser()
    ?"You are in an app's built-in browser, which often blocks the camera. Open this link in your normal browser and it will work."
    :"";
  if(typeof window!=="undefined"&&window.isSecureContext===false){
    return {heading:"The camera needs a secure connection",
      body:"This page is not on a secure (https) connection, so the camera cannot start.",hint:""};
  }
  if(!navigator.mediaDevices||typeof navigator.mediaDevices.getUserMedia!=="function"){
    return {heading:"This browser cannot open the camera",
      body:"The camera is not available here.",
      hint:hint||"Try opening this link in a different browser."};
  }
  if(name==="NotAllowedError"||name==="SecurityError"){
    return {heading:"Camera access was blocked",
      body:"Allow camera access for this site, then try again.",hint:hint};
  }
  if(name==="NotFoundError"||name==="OverconstrainedError"){
    return {heading:"No camera found",
      body:"This device does not seem to have a camera available.",hint:""};
  }
  if(name==="NotReadableError"||name==="AbortError"){
    return {heading:"The camera is busy",
      body:"Something else may be using it. Close any other app using the camera, then try again.",hint:hint};
  }
  return {heading:"The photobooth could not start",
    body:"Something stopped the camera before the photos could be taken. Try again, and reload the page if it keeps happening.",
    hint:hint};
}
function showCameraError(err){
  const panel=$("cameraError");
  const failure=cameraFailure(err);
  if(!panel){showBoothReturnScreen();return;}
  $("cameraErrorHeading").textContent=failure.heading;
  $("cameraErrorBody").textContent=failure.body;
  const hint=$("cameraErrorHint");
  hint.textContent=failure.hint||"";
  hint.hidden=!failure.hint;
  panel.hidden=false;
  const retry=$("cameraErrorRetry");
  if(retry&&typeof retry.focus==="function")retry.focus();
}
function hideCameraError(){
  const panel=$("cameraError");
  if(panel)panel.hidden=true;
}

function launchConfetti(){
  const layer=$("confettiLayer");layer.innerHTML="";
  for(let i=0;i<24;i++){
    const p=document.createElement("span");
    p.className="confetti";
    p.style.left=(Math.random()*100)+"%";
    p.style.animationDelay=(Math.random()*.2)+"s";
    p.style.animationDuration=(.9+Math.random()*.45)+"s";
    layer.appendChild(p);
  }
  setTimeout(()=>layer.innerHTML="",1600);
}

function buildReviewControls(){
  $("frameChoices").innerHTML="";
  FRAMES.forEach(([key,label])=>{
    const b=document.createElement("button");
    b.className="choice"+(frameStyle===key?" active":"");
    b.dataset.choice=key;
    b.textContent=label;
    b.onclick=()=>{
      frameStyle=key;
      document.querySelectorAll("#frameChoices .choice").forEach(x=>x.classList.toggle("active",x===b));
      renderWithFade();resetIdle();
    };
    $("frameChoices").appendChild(b);
  });

  $("filterChoices").innerHTML="";
  FILTERS.forEach(([key,label])=>{
    const b=document.createElement("button");
    b.className="choice"+(filterStyle===key?" active":"");
    b.dataset.choice=key;
    b.textContent=label;
    b.onclick=()=>{
      filterStyle=key;
      document.querySelectorAll("#filterChoices .choice").forEach(x=>x.classList.toggle("active",x===b));
      renderWithFade();resetIdle();
    };
    $("filterChoices").appendChild(b);
  });

  $("coverPhotoChoices").innerHTML="";
  photos.forEach((src,i)=>{
    const b=document.createElement("button");
    b.className="photo-choice"+(coverIndex===i?" active":"");
    b.dataset.photoIndex=String(i);
    const img=document.createElement("img");img.src=src;b.appendChild(img);
    b.onclick=()=>{
      coverIndex=i;
      $("magazinePickStep").hidden=true;
      $("magazineStyleStep").hidden=false;
      document.querySelectorAll(".photo-choice").forEach(x=>x.classList.toggle("active",x===b));
      renderStyleThumbs();
      renderWithFade();
      refreshExportControls();
      resetIdle();
    };
    $("coverPhotoChoices").appendChild(b);
  });

  $("magazineStyleChoices").innerHTML="";
  Covers.TEMPLATES.forEach(tpl=>{
    const b=document.createElement("button");
    b.className="mag-style-choice"+(magazineStyle===tpl.key?" active":"");
    b.type="button";
    b.dataset.template=tpl.key;
    const cv=document.createElement("canvas");
    cv.className="mag-style-preview";
    cv.dataset.template=tpl.key;
    const tx=document.createElement("span");tx.textContent=tpl.label;
    const hint=document.createElement("small");hint.textContent=tpl.hint;
    b.append(cv,tx,hint);
    b.onclick=()=>{
      magazineStyle=tpl.key;
      document.querySelectorAll(".mag-style-choice").forEach(x=>x.classList.toggle("active",x===b));
      renderWithFade();resetIdle();
    };
    $("magazineStyleChoices").appendChild(b);
  });
  if(coverIndex!==null)renderStyleThumbs();
  $("changeCoverPhoto").hidden=photos.length<2;
  applyBusinessEventFlow();
  refreshExportControls();
}

/* Live thumbnails of the guest's own chosen photo in every template. */
let thumbToken=0;
async function renderStyleThumbs(){
  const token=++thumbToken;
  const nodes=[...document.querySelectorAll("canvas.mag-style-preview")];
  if(!nodes.length)return;
  let img=null;
  if(coverIndex!==null&&photos[coverIndex]){
    try{img=await loadImage(photos[coverIndex]);}catch(e){}
  }
  if(token!==thumbToken)return;
  const copy=Covers.copyFor(settings);
  const size=Covers.coverSize(sessionOrientation,440);
  nodes.forEach(cv=>{
    cv.width=size.width;cv.height=size.height;
    Covers.render(cv.getContext("2d"),{
      img:img||Covers.placeholder(),
      fonts:Fonts.faces(settings),
      width:size.width,height:size.height,
      copy,accent:settings.accent,
      template:cv.dataset.template,
      edition:{no:sessionEdition},
      branding:currentBranding()
    });
  });
}

function setMode(mode){
  currentMode=mode;
  document.querySelectorAll(".mode-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $("stripControls").classList.toggle("active",mode==="strip");
  $("magazineControls").classList.toggle("active",mode==="magazine");
  $("polaroidControls").classList.toggle("active",mode==="polaroid");
  if(mode==="magazine"){
    $("magazinePickStep").hidden=coverIndex!==null;
    $("magazineStyleStep").hidden=coverIndex===null;
  }
  refreshExportControls();
  /* The Polaroid drives its own canvas on a rAF loop, so it skips the
     fade-and-redraw the still modes use — that would flash mid-animation. */
  if(mode==="polaroid"){enterPolaroid();resetIdle();return;}
  leavePolaroid();
  renderWithFade();resetIdle();
}
document.querySelectorAll(".mode-tab").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

function filterCSS(style){
  return {
    original:"none",
    bw:"grayscale(1) contrast(1.06)",
    vintage:"sepia(.18) saturate(.78) contrast(.97) brightness(1.03)",
    warm:"sepia(.10) saturate(1.12) brightness(1.03)",
    glow:"brightness(1.07) contrast(.92) saturate(.95)"
  }[style||filterStyle]||"none";
}
function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function drawContain(ctx,img,x,y,w,h,bg="#fff"){
  ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);
  const scale=Math.min(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;
  ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}

function fitText(ctx,text,maxWidth,startSize,font,weight=400,minSize=14){
  let size=startSize;
  while(size>minSize){
    ctx.font=`${weight} ${size}px ${font}`;
    if(ctx.measureText(text).width<=maxWidth)break;
    size-=2;
  }
  ctx.font=`${weight} ${size}px ${font}`;
  return size;
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3,align="left"){
  const words=(text||"").split(/\s+/).filter(Boolean);
  if(!words.length)return;
  let lines=[],line="";
  for(const word of words){
    const test=line?line+" "+word:word;
    if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}
    else line=test;
  }
  if(line)lines.push(line);
  lines=lines.slice(0,maxLines);
  ctx.textAlign=align;
  lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lineHeight));
}
/* The strip's faces, from the same five roles the covers use. Takes a
   settings object so the admin preview can render the draft, not the saved. */
function typography(s){
  const f=Fonts.faces(s||settings);
  return {serif:f.serif,sans:f.sans,script:f.script};
}
function drawBarcode(ctx,x,y,w,h,font,light=false){
  ctx.save();
  ctx.fillStyle=light?"rgba(255,255,255,.92)":"#fff";ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=light?"#fff":"#111";ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#111";
  for(let i=0;i<26;i++){const xx=x+7+i*(w-14)/26;ctx.fillRect(xx,y+6,i%4===0?2.4:(i%3===0?1.8:1.1),h-18);}
  ctx.font=`700 8px ${font}`;ctx.textAlign="center";ctx.fillText("001",x+w/2,y+h-4);
  ctx.restore();
}

async function renderWithFade(){
  const token=++stillRenderToken;
  latestRenderPromise=(async()=>{
    $("mainCanvas").classList.add("changing");
    await delay(70);
    if(token!==stillRenderToken)return;
    await render(token);
    if(token===stillRenderToken)$("mainCanvas").classList.remove("changing");
  })();
  return latestRenderPromise;
}
async function render(token){
  if(!photos.length||currentMode==="polaroid")return;
  const imgs=await Promise.all(photos.map(loadImage));
  if(token!==undefined&&token!==stillRenderToken)return;
  const c=$("mainCanvas"),ctx=c.getContext("2d");
  if(currentMode!=="magazine"||coverIndex===null)renderStrip(ctx,c,imgs,settings,sessionOrientation);
  else renderMagazine(ctx,c,imgs[coverIndex]);
}
/* No `photoFilter`: the guest's filter choice is a strip-only system. Covers
   carry the editorial finish instead, so every cover from a booth matches. */
function renderMagazine(ctx,c,img){
  const size=Covers.coverSize(sessionOrientation,1200);
  c.width=size.width;c.height=size.height;
  Covers.render(ctx,{
    img,
    width:size.width,height:size.height,
    copy:Covers.copyFor(settings),
    fonts:Fonts.faces(settings),
    accent:settings.accent,
    template:magazineStyle,
    edition:{no:sessionEdition},
    branding:currentBranding()
  });
  drawDraftPreview(ctx,c.width,c.height);
}

function drawDraftPreview(ctx,width,height,draftOverride){
  const shouldMark=draftOverride===undefined?eventIsDraft():!!draftOverride;
  if(!shouldMark)return;
  ctx.save();
  ctx.translate(width/2,height/2);
  ctx.rotate(-Math.PI/10);
  const boxW=Math.min(width*.72,760),boxH=Math.max(54,height*.055);
  ctx.fillStyle="rgba(222,210,242,.94)";
  ctx.strokeStyle="#111";ctx.lineWidth=Math.max(2,width/480);
  ctx.fillRect(-boxW/2,-boxH/2,boxW,boxH);ctx.strokeRect(-boxW/2,-boxH/2,boxW,boxH);
  ctx.fillStyle="#111";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=`900 ${Math.max(22,boxH*.42)}px ${Fonts.stack("text",settings)}`;
  ctx.fillText("DRAFT PREVIEW",0,1);
  ctx.restore();
}

/* ---------- living polaroid ---------- */

/* The video is authored at 1080 wide and the print at 1400: an MP4 that has
   to encode on an iPad between one guest and the next wants fewer pixels
   than a keepsake PNG does, and nothing about the layout is resolution
   dependent. 25fps divides the muxer's timescale exactly. */
const POLAROID_VIDEO_BASE=1080;
const POLAROID_PRINT_BASE=1400;
const POLAROID_FPS=25;

let polaroidJob=null;
let polaroidRaf=0;
let polaroidToken=0;
let polaroidVideoBlob=null;
let polaroidVideoUrl=null;
let polaroidState="idle";

function polaroidOptions(images){
  return {
    images,
    copy:Polaroid.copyFor(settings),
    hand:Fonts.stack("hand",settings),
    transition:settings.polaroidTransition||"crossfade",
    attribution:currentBranding(),
    draftPreview:eventIsDraft()
  };
}
/* Bumping the token orphans any in-flight build or encode, so a settings
   save mid-render can never drop a stale video on the next guest. */
function invalidatePolaroid(){
  polaroidToken++;
  stopPolaroidLoop();
  polaroidJob=null;
  polaroidVideoBlob=null;
  polaroidState="idle";
  if(polaroidVideoUrl){URL.revokeObjectURL(polaroidVideoUrl);polaroidVideoUrl=null;}
  const v=$("polaroidVideo");
  if(v){
    /* Drop the handlers first — the resume-on-pause nudge would otherwise
       fight this teardown. */
    v.onloadeddata=v.onplaying=v.onpause=null;
    v.pause();v.removeAttribute("src");v.load();v.hidden=true;
  }
  const c=$("mainCanvas");if(c)c.hidden=false;
}
function stopPolaroidLoop(){if(polaroidRaf){cancelAnimationFrame(polaroidRaf);polaroidRaf=0;}}
function leavePolaroid(){
  stopPolaroidLoop();
  const v=$("polaroidVideo");
  if(v&&!v.hidden){v.pause();v.hidden=true;}
  $("mainCanvas").hidden=false;
}
function polaroidStatus(){
  const el=$("polaroidStatus");if(!el)return;
  el.textContent=looseText(
    polaroidState==="ready"?"polaroidReadyLabel":
    polaroidState==="unsupported"?"polaroidStillLabel":"polaroidBusyLabel");
  el.classList.toggle("ready",polaroidState==="ready");
}

async function enterPolaroid(){
  const token=++polaroidToken;
  polaroidStatus();
  const imgs=await Promise.all(photos.map(loadImage));
  if(token!==polaroidToken||currentMode!=="polaroid")return;

  /* New experience-first sessions arrive with their real captured motion.
     Reopened sessions retain the exact still, even when the browser could not
     store a moving file. The old three-still compositor remains available only
     for legacy gallery records created before experience-first capture. */
  if(!legacySessionMode&&currentExperience==="polaroid"){
    polaroidJob=Polaroid.compose(Object.assign({base:POLAROID_VIDEO_BASE},polaroidOptions(imgs)));
    const c=$("mainCanvas"),ctx=c.getContext("2d");
    c.width=polaroidJob.geo.W;c.height=polaroidJob.geo.H;c.hidden=false;
    polaroidJob.drawStill(ctx,0);
    drawDraftPreview(ctx,c.width,c.height);
    polaroidVideoBlob=motionCaptureBlob||null;
    polaroidState=motionCaptureBlob?"ready":"unsupported";
    polaroidStatus();
    if(!motionCaptureBlob)return;
    if(polaroidVideoUrl)URL.revokeObjectURL(polaroidVideoUrl);
    polaroidVideoUrl=URL.createObjectURL(motionCaptureBlob);
    const v=$("polaroidVideo");
    v.src=polaroidVideoUrl;v.hidden=false;
    const swap=()=>{if(currentMode==="polaroid")$("mainCanvas").hidden=true;};
    v.onloadeddata=swap;v.onplaying=swap;
    v.onpause=()=>{if(currentMode==="polaroid"&&!v.hidden)v.play().catch(()=>{});};
    v.play().catch(()=>{});
    return;
  }
  polaroidJob=Polaroid.compose(Object.assign({base:POLAROID_VIDEO_BASE},polaroidOptions(imgs)));

  /* Animate the canvas straight away rather than making the guest watch a
     spinner: the loop and the MP4 share one drawFrame, so the preview is
     already the deliverable. The video swaps in when the encoder is done. */
  const c=$("mainCanvas"),ctx=c.getContext("2d");
  c.width=polaroidJob.geo.W;c.height=polaroidJob.geo.H;
  c.hidden=false;
  const started=performance.now();
  (function step(){
    if(token!==polaroidToken||!polaroidJob)return;
    polaroidJob.drawAt(ctx,(performance.now()-started)/1000);
    polaroidRaf=requestAnimationFrame(step);
  })();

  encodePolaroid(token);
}

async function encodePolaroid(token){
  if(!MP4.isSupported()){polaroidState="unsupported";polaroidStatus();return;}
  polaroidState="working";polaroidStatus();
  const job=polaroidJob;
  try{
    const blob=await MP4.encode({
      width:job.geo.W,height:job.geo.H,fps:POLAROID_FPS,
      frameCount:job.frameCount(POLAROID_FPS),
      renderFrame:(ctx,i)=>job.drawFrame(ctx,i,POLAROID_FPS),
      shouldAbort:()=>token!==polaroidToken
    });
    if(token!==polaroidToken)return;
    polaroidVideoBlob=blob;
    if(polaroidVideoUrl)URL.revokeObjectURL(polaroidVideoUrl);
    polaroidVideoUrl=URL.createObjectURL(blob);
    polaroidState="ready";polaroidStatus();
    if(currentMode!=="polaroid")return;
    const v=$("polaroidVideo");
    v.src=polaroidVideoUrl;
    v.hidden=false;
    /* Only stop the canvas once the video has a frame to show, so a slow
       first decode never leaves the guest looking at an empty stage. Both
       events, because a video that is blocked from autoplaying still decodes
       — and showing its first frame beats showing it beside the canvas. */
    const swap=()=>{if(currentMode==="polaroid"){stopPolaroidLoop();$("mainCanvas").hidden=true;}};
    v.onloadeddata=swap;
    v.onplaying=swap;
    /* iOS pauses inline video when the booth is backgrounded and does not
       resume on return. Nothing in the UI can pause it deliberately, so any
       pause while the guest is still here is one to undo. */
    v.onpause=()=>{if(currentMode==="polaroid"&&!v.hidden)v.play().catch(()=>{});};
    v.play().catch(()=>{});
  }catch(e){
    if(token!==polaroidToken)return;
    polaroidState="unsupported";polaroidStatus();
  }
}

/* The still export, rendered fresh at print size rather than read back off
   the preview — the canvas is very likely sitting mid-crossfade. */
async function polaroidPrintBlob(){
  const imgs=await Promise.all(photos.map(loadImage));
  const job=Polaroid.compose(Object.assign({base:POLAROID_PRINT_BASE},polaroidOptions(imgs)));
  const c=document.createElement("canvas");
  c.width=job.geo.W;c.height=job.geo.H;
  const ctx=c.getContext("2d");
  job.drawStill(ctx,coverIndex===null?0:coverIndex);
  drawDraftPreview(ctx,c.width,c.height);
  return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error("The Polaroid print could not be prepared.")),"image/png",1));
}

function renderStrip(ctx,c,imgs,s,orientation,creative){
  const chosenFrame=creative&&creative.frameStyle||frameStyle;
  const chosenFilter=creative&&creative.filterStyle||filterStyle;
  const branding=creative&&Object.prototype.hasOwnProperty.call(creative,"branding")?creative.branding:currentBranding();
  const copy=stripCopyFor(s);
  if(!STRIP)throw new Error("The Photo Strip renderer is unavailable.");
  return STRIP.render(ctx,{
    canvas:c,
    images:imgs,
    frameStyle:chosenFrame,
    filterStyle:chosenFilter,
    fonts:typography(s),
    accent:s.accent,
    event:{name:copy.signature||s.eventTitle,location:s.location,date:copy.date||s.date},
    footer:{primary:copy.signature||s.eventTitle,location:s.location,date:copy.date||s.date},
    branding,
    draft:creative&&Object.prototype.hasOwnProperty.call(creative,"draft")?!!creative.draft:eventIsDraft(),
    grade({ctx:photoContext,destination}){
      Covers.applyGrade(photoContext,destination.x,destination.y,destination.w,destination.h,filterCSS(chosenFilter));
    }
  });
}
window.MyBishBashRenderers={renderStrip};

async function canvasBlob(){
  await latestRenderPromise;
  return new Promise((resolve,reject)=>$("mainCanvas").toBlob(blob=>blob?resolve(blob):reject(new Error("The image could not be prepared.")),"image/png",1));
}
/* Save is always the print. Share prefers the MP4 on the Polaroid tab —
   the moving version is the thing worth sending — and falls back to the
   print everywhere else and whenever the encoder could not run. */
async function stillBlob(){
  if(currentMode==="magazine"&&coverIndex===null)throw new Error("Choose the photo for your Magazine cover first.");
  return currentMode==="polaroid"?polaroidPrintBlob():canvasBlob();
}
function download(blob,ext){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`mybishbash-photobooth-${currentMode}-${Date.now()}.${ext}`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function shareCurrent(){
  if(exportBusy||!exportReady())return;
  const exportSession=captureSessionId;
  exportBusy=true;refreshExportControls();setExportStatus("Preparing your keepsake…");
  resetIdle();
  try{
    await latestRenderPromise;
    if(exportSession!==captureSessionId)return;
    const video=currentMode==="polaroid"&&polaroidVideoBlob;
    const blob=video?polaroidVideoBlob:await stillBlob();
    if(exportSession!==captureSessionId)return;
    const videoExt=video?(motionCaptureBlob?motionCaptureExtension:(String(blob.type).includes("webm")?"webm":"mp4")):"png";
    const name=`mybishbash-photobooth-${currentMode}-${Date.now()}.${videoExt}`;
    const mime=video?(blob.type||(videoExt==="webm"?"video/webm":"video/mp4")):"image/png";
    const file=new File([blob],name,{type:mime});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:settings.eventTitle,text:settings.eventTitle});
      if(exportSession===captureSessionId)setExportStatus("");
      return;
    }
    if(exportSession!==captureSessionId)return;
    download(blob,videoExt);
    setExportStatus("Saved to this device.");
  }catch(e){
    if(exportSession===captureSessionId&&e&&e.name!=="AbortError")setExportStatus(e.message||"This keepsake could not be shared.",true);
  }finally{
    if(exportSession===captureSessionId){exportBusy=false;refreshExportControls();}
  }
}
async function saveCurrent(){
  if(exportBusy||!exportReady())return;
  const exportSession=captureSessionId;
  exportBusy=true;refreshExportControls();setExportStatus("Preparing your keepsake…");
  resetIdle();
  try{
    if(currentMode==="polaroid"&&polaroidVideoBlob){
      const ext=motionCaptureBlob?motionCaptureExtension:(String(polaroidVideoBlob.type).includes("webm")?"webm":"mp4");
      if(exportSession!==captureSessionId)return;
      download(polaroidVideoBlob,ext);
    }else{
      const blob=await stillBlob();
      if(exportSession!==captureSessionId)return;
      download(blob,"png");
    }
    setExportStatus("Saved to this device.");
  }
  catch(e){if(exportSession===captureSessionId)setExportStatus(e.message||"This keepsake could not be saved.",true);}
  finally{
    if(exportSession===captureSessionId){exportBusy=false;refreshExportControls();}
  }
}
function exportReady(){return currentMode!=="magazine"||coverIndex!==null;}
function refreshExportControls(){
  const ready=exportReady()&&!exportBusy;
  [$("shareBtn"),$("saveBtn")].forEach(button=>{if(button)button.disabled=!ready;});
}
function setExportStatus(message,error){
  const el=$("exportStatus");if(!el)return;
  el.textContent=message||"";el.classList.toggle("error",!!error);
}
function resetIdle(){
  clearTimeout(idleTimer);
  if($("review").classList.contains("active")){
    idleTimer=setTimeout(async()=>{
      photos=[];resetCreativeState();showScreen("timeout");await delay(650);showBoothReturnScreen();
    },120000);
  }
}

/* The admin preview runs the real cover renderer against a stand-in photo,
   so what the host tunes here is exactly what guests get. */
function renderAdminPreview(){
  if(adminPreviewTimer){clearTimeout(adminPreviewTimer);adminPreviewTimer=0;}
  const s=draftSettings(),c=$("adminPreviewCanvas"),ctx=c.getContext("2d");
  const land=adminOrientation==="landscape";
  const adminDraft=String(s.eventStatus||"DRAFT")==="DRAFT";

  if(adminPreviewType==="strip"){
    const photo=Covers.placeholder();
    renderStrip(ctx,c,[photo,photo,photo],s,adminOrientation,{frameStyle:"white",filterStyle:"original",branding:personalPreviewBranding(),draft:adminDraft});
    return;
  }

  /* Instant film has one shape, so the Polaroid preview ignores the
     landscape/portrait tabs — a session's orientation changes the crop
     inside the window, never the print. */
  if(adminPreviewType==="polaroid"){
    const geo=Polaroid.size(430);
    c.width=geo.W;c.height=geo.H;
    Polaroid.render(ctx,{
      width:430,img:Covers.placeholder(),
      copy:Polaroid.copyFor(s),
      hand:Fonts.stack("hand",s),transition:s.polaroidTransition,
      attribution:personalPreviewBranding()
    });
    drawDraftPreview(ctx,c.width,c.height,adminDraft);
    return;
  }

  const size=Covers.coverSize(adminOrientation,land?520:600);
  c.width=size.width;c.height=size.height;
  Covers.render(ctx,{
    img:Covers.placeholder(),
    width:size.width,height:size.height,
    copy:Covers.copyFor(s),
    fonts:Fonts.faces(s),
    accent:s.accent,
    template:adminPreviewType,
    edition:{no:14},
    branding:personalPreviewBranding()
  });
  drawDraftPreview(ctx,c.width,c.height,adminDraft);
}
function scheduleAdminPreview(){
  if(adminPreviewTimer)clearTimeout(adminPreviewTimer);
  adminPreviewTimer=setTimeout(()=>{adminPreviewTimer=0;renderAdminPreview();},90);
}

function setSetupStep(step){
  activeSetupStep=Math.max(0,Math.min(4,Number(step)||0));
  document.querySelectorAll("[data-setup-panel]").forEach(panel=>{
    const active=Number(panel.dataset.setupPanel)===activeSetupStep;
    panel.hidden=!active;panel.classList.toggle("active",active);
  });
  document.querySelectorAll("[data-setup-step]").forEach(button=>button.classList.toggle("active",Number(button.dataset.setupStep)===activeSetupStep));
  $("setupBack").hidden=activeSetupStep===0;
  $("setupNext").hidden=activeSetupStep===4;
  if(activeSetupStep===3||activeSetupStep===4)renderAdminPreview();
}
function openPersonalSettings(returnScreen){
  settingsReturnScreen=returnScreen||"landing";
  fillSettingsUI();setSetupStep(0);showScreen("settings");
  setTimeout(()=>{buildFontRoles();renderAdminPreview();renderEventGallery();},0);
}
function showSettingsSaveStatus(message){
  const el=$("settingsSaveStatus");
  if(!el)return;
  el.textContent=message;
  el.hidden=false;
  /* No focus() call: role="status" announces it politely, and stealing focus
     mid-typing would be its own defect. */
}
function clearSettingsSaveStatus(){
  const el=$("settingsSaveStatus");
  if(el)el.hidden=true;
}
async function configuredDraftFromForm(){
  let draft=draftSettings();
  const wantsPin=$("setGuestPinEnabled").checked;
  const pin=$("setGuestPin").value.trim();
  if(EVENT){
    if(!wantsPin)draft=EVENT.disableGuestPin(draft,{defaults:DEFAULTS});
    else if(pin)draft=await EVENT.enableGuestPin(draft,pin,{defaults:DEFAULTS});
    else if(settings.guestPinEnabled)draft=EVENT.migrateEventConfig({...draft,
      guestPinEnabled:true,guestPinSalt:settings.guestPinSalt,guestPinVerifier:settings.guestPinVerifier
    },{defaults:DEFAULTS});
    else throw new Error("Enter a four-digit Guest PIN, or turn Guest PIN off.");
  }
  return draft;
}
async function savePersonalSettings(showBooth){
  if(!capabilities.canPersonaliseEvent&&!legacyProfileAvailable){
    /* Never a bare return: the organiser has just filled this in. Their draft
       stays exactly as typed - nothing is cleared and nothing is written to
       the saved settings key - and they are told why and where to go next. */
    showSettingsSaveStatus("Saving your event needs Personal access. Your setup is still here — nothing has been lost. View Personal pricing to unlock it.");
    return false;
  }
  clearSettingsSaveStatus();
  try{settings=await configuredDraftFromForm();}
  catch(error){showSettingsSaveStatus(error.message);return false;}
  persistSettings();fillSettingsUI();invalidatePolaroid();buildReviewControls();
  if(boothExampleMode){temporarySettingsSnapshot=null;boothExampleMode=false;}
  if(showBooth)enterEventHome(false,true);
  return true;
}
async function previewPersonalSettings(){
  clearSettingsSaveStatus();
  try{
    if(!temporarySettingsSnapshot)temporarySettingsSnapshot=settings;
    settings=await configuredDraftFromForm();
    enterEventHome(false,true);
    return true;
  }catch(error){showSettingsSaveStatus(error.message);return false;}
}
function launchFreeBooth(){
  restoreTemporarySettings();
  if(!capabilities.canPersonaliseEvent&&!legacyProfileAvailable){
    temporarySettingsSnapshot=settings;
    settings=EVENT?EVENT.createEventConfig(DEFAULTS,{defaults:DEFAULTS}):{...DEFAULTS};
    fillSettingsUI();
  }
  boothExampleMode=false;setBoothReturnScreen("landing");enterBoothHistory();showExperienceChooser();
}
function previewExampleBooth(){
  enterEventHome(true);
}
function returnToProduct(){
  returnFromEventToProduct();
}

async function setupPassLink(){
  if(!EVENT)throw new Error("Setup Pass is unavailable in this browser.");
  const draft=await configuredDraftFromForm();
  const fragment=await EVENT.encodeSetupPass(draft,{defaults:DEFAULTS});
  return EVENT.buildSetupPassUrl(location.href,fragment);
}
async function copySetupPass(){
  const status=$("setupPassStatus");
  try{
    const url=await setupPassLink();
    await navigator.clipboard.writeText(url);
    status.textContent="Setup Pass copied. It carries configuration only—no photos or event clock.";
  }catch(error){status.textContent=error.message||"The Setup Pass could not be copied.";}
}
async function shareSetupPass(){
  const status=$("setupPassStatus");
  try{
    const url=await setupPassLink();
    if(navigator.share)await navigator.share({title:settings.eventTitle+" — Setup Pass",text:"Set up this MyBishBash Photobooth on another device.",url});
    else if(navigator.clipboard){await navigator.clipboard.writeText(url);status.textContent="Setup Pass copied.";}
    else throw new Error("Sharing is unavailable here. Try Copy Setup Pass link.");
  }catch(error){if(error&&error.name!=="AbortError")status.textContent=error.message||"The Setup Pass could not be shared.";}
}
async function importSetupPassFromLocation(){
  if(!EVENT||!/^#setup=/.test(location.hash))return false;
  try{
    settings=await EVENT.decodeSetupPass(location.href,{defaults:DEFAULTS});
    persistSettings();
    if(history.replaceState)history.replaceState(productHistoryState("personal"),"",location.pathname+location.search);
    openPersonalSettings("landing");
    showSettingsSaveStatus("Setup Pass imported on this device. It moved configuration only; the event remains a draft and its 48-hour clock has not started.");
    return true;
  }catch(error){
    showProductRoute("personal",false,true);
    const status=$("checkoutStatus");
    status.textContent=error.message||"That Setup Pass could not be opened.";
    status.className="checkout-status error";
    return false;
  }
}

function idempotencyKey(){
  if(window.crypto&&typeof window.crypto.randomUUID==="function")return window.crypto.randomUUID();
  return "mbb-"+Date.now()+"-"+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
}
async function jsonRequest(path,options){
  const response=await fetch(API_BASE+path,options||{});
  let data={};
  try{data=await response.json();}catch(e){}
  if(!response.ok)throw new Error(data.message||data.error||"This service is not available yet.");
  return data;
}
async function startCheckout(plan){
  const status=$("checkoutStatus");
  /* A visible planned price is not an offer to sell. Keep the purchase path
     closed until both billing and its authoritative API are deliberately on. */
  if(!BILLING_LIVE||!API_BASE){
    if(status){
      status.textContent="Personal plans are not on sale yet — we are finalising them. The free photobooth is ready to use now.";
      status.className="checkout-status";
    }
    return;
  }
  if(status){status.textContent="Opening secure checkout…";status.className="checkout-status";}
  try{
    const data=await jsonRequest("/v1/billing/checkout",{
      method:"POST",
      headers:{"Content-Type":"application/json","Idempotency-Key":idempotencyKey()},
      body:JSON.stringify({plan})
    });
    if(!data.checkoutUrl)throw new Error("Checkout returned no secure destination.");
    /* Redirecting opens Checkout; access is still granted only after the
       verified webhook changes server-side entitlement state. */
    location.assign(data.checkoutUrl);
  }catch(e){
    if(status){status.textContent=e.message||"Checkout is not connected in this preview.";status.className="checkout-status error";}
  }
}
async function requestRestoreAccess(){
  const email=$("restoreEmail"),button=$("requestRestoreBtn"),status=$("checkoutStatus");
  if(!email.checkValidity()){email.reportValidity();return;}
  button.disabled=true;
  status.textContent="Requesting a secure restore link…";status.className="checkout-status";
  try{
    const data=await jsonRequest("/v1/entitlements/restore/request",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.value.trim()})
    });
    status.textContent=data.message||"If that address has active access, a restore link will be sent.";
    status.className="checkout-status success";
  }catch(e){status.textContent=e.message||"A restore link could not be requested yet.";status.className="checkout-status error";}
  finally{button.disabled=false;}
}
function handleCheckoutReturn(){
  if(typeof URLSearchParams!=="function")return;
  const params=new URLSearchParams(location.search),result=params.get("checkout"),status=$("checkoutStatus");
  if(result!=="success"&&result!=="cancelled")return;
  if(result==="success"){
    status.textContent="Checkout returned successfully. Once the verified payment is processed, request a restore link using the email from Checkout.";
    status.className="checkout-status success";
    $("restoreAccessForm").hidden=false;
  }else{
    status.textContent="Checkout was cancelled. The free photobooth is still ready to use.";
    status.className="checkout-status";
  }
  /* The return is presentational only. Remove the Stripe session identifier
     from the address without treating it as entitlement evidence. */
  params.delete("checkout");params.delete("session_id");
  if(history.replaceState){const query=params.toString();history.replaceState(history.state,"",location.pathname+(query?"?"+query:"")+location.hash);}
  setTimeout(()=>$("pricing").scrollIntoView({behavior:"smooth",block:"start"}),0);
}
function verifiedAccessRecord(data,token,previousExpiry){
  const plan=String(data&&data.plan||"");
  const personalPlans=[ENTITLEMENTS.ONE_EVENT,ENTITLEMENTS.PERSONAL_6_MONTH,ENTITLEMENTS.PERSONAL_12_MONTH,ENTITLEMENTS.FOUNDING_LIFETIME];
  /* This restore path is Personal-only. Business guests use scoped event
     credentials and must never turn a browser restore token into organiser
     capabilities. */
  if(!PRODUCT||personalPlans.indexOf(plan)===-1)return null;
  const accessToken=String(data.accessToken||token||"");
  const accessTokenExpiresAt=String(data.accessTokenExpiresAt||previousExpiry||"");
  const expiry=Date.parse(accessTokenExpiresAt);
  if(!accessToken||!Number.isFinite(expiry)||expiry<=Date.now())return null;
  return {plan,accessToken,accessTokenExpiresAt,entitlements:data.entitlements||[],serverVerified:true,verifiedAt:new Date().toISOString()};
}
async function verifyRestoreToken(token){
  const data=await jsonRequest("/v1/entitlements/restore/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
  const record=verifiedAccessRecord(data,data.accessToken);
  if(!record)throw new Error("That restore link does not contain active Personal access.");
  setEntitlement(record.plan,record);return record;
}
async function loadVerifiedAccess(){
  let cached=null;
  try{cached=JSON.parse(localStorage.getItem(ACCESS_KEY)||"null");}catch(e){}
  if(!cached||!cached.accessToken)return;
  const expiry=Date.parse(cached.accessTokenExpiresAt||"");
  if(cached.serverVerified===true&&cached.plan&&Number.isFinite(expiry)&&expiry>Date.now())setEntitlement(cached.plan);
  else{try{localStorage.removeItem(ACCESS_KEY);}catch(e){}return;}
  try{
    const data=await jsonRequest("/v1/entitlements/current",{headers:{Authorization:"Bearer "+cached.accessToken}});
    const record=verifiedAccessRecord(data,cached.accessToken,cached.accessTokenExpiresAt);
    if(record)setEntitlement(record.plan,record);
    else{try{localStorage.removeItem(ACCESS_KEY);}catch(e){}setEntitlement(ENTITLEMENTS.FREE);}
  }catch(e){/* Keep the last server-verified offline grant until its expiry. */}
}

function syncBusinessConfigurator(){
  const collectEmail=$("businessCollectEmail"),requireEmail=$("businessRequireEmail"),marketing=$("businessMarketingConsent"),publicity=$("businessPublicityConsent"),collectPhotos=$("businessCollectPhotos");
  requireEmail.disabled=!collectEmail.checked;if(requireEmail.disabled)requireEmail.checked=false;
  marketing.disabled=!collectEmail.checked;if(marketing.disabled)marketing.checked=false;
  collectPhotos.disabled=!publicity.checked;if(collectPhotos.disabled)collectPhotos.checked=false;
  businessEventConfig=PRODUCT?PRODUCT.createBusinessEventConfig({
    collectEmail:collectEmail.checked,requireEmail:requireEmail.checked,
    allowShare:$("businessAllowShare").checked,allowSave:$("businessAllowSave").checked,
    collectMarketingConsent:marketing.checked,collectPublicityConsent:publicity.checked,
    collectConsentedPhotos:collectPhotos.checked
  }):businessEventConfig;
  $("businessEmailPreview").hidden=!businessEventConfig.collectEmail;
  $("businessMarketingPreview").hidden=!businessEventConfig.collectMarketingConsent;
  $("businessPublicityPreview").hidden=!businessEventConfig.collectPublicityConsent;
  const actions=document.querySelectorAll(".guest-actions button");
  if(actions[0])actions[0].hidden=!businessEventConfig.allowShare;
  if(actions[1])actions[1].hidden=!businessEventConfig.allowSave;
  applyBusinessEventFlow();
}
function updateBusinessBrandText(){
  const name=String($("businessBrandName").value||"").trim()||"Your brand";
  businessBrand.name=name;businessBrand.primaryColor=$("businessPrimary").value;businessBrand.secondaryColor=$("businessSecondary").value;
  document.querySelectorAll("#businessMarketingPreview b,#businessPublicityPreview b").forEach(el=>el.textContent=name);
  $("guestMarketingWording").textContent="I’d like to hear about news and offers from "+name+".";
  $("guestPublicityWording").textContent="I give "+name+" permission to use my photographs from this event for promotional purposes.";
}
function applyBusinessEventFlow(){
  const isBusiness=entitlement===ENTITLEMENTS.BUSINESS;
  const panel=$("businessCompletion");if(!panel)return;
  const needsForm=isBusiness&&(businessEventConfig.collectEmail||businessEventConfig.collectMarketingConsent||businessEventConfig.collectPublicityConsent);
  const waitingForCompletion=needsForm&&!businessCompletionSatisfied;
  panel.hidden=!waitingForCompletion;
  $("guestEmailField").hidden=!businessEventConfig.collectEmail;
  $("guestMarketingField").hidden=!businessEventConfig.collectMarketingConsent;
  $("guestPublicityField").hidden=!businessEventConfig.collectPublicityConsent;
  $("shareBtn").hidden=isBusiness&&(!businessEventConfig.allowShare||waitingForCompletion);
  $("saveBtn").hidden=isBusiness&&(!businessEventConfig.allowSave||waitingForCompletion);
}

function enterGuestBooth(){
  if(EVENT&&eventIsPersonalised()){
    settings=EVENT.refreshEventLifecycle(settings);
    if(settings.eventStatus==="ENDED"){
      persistSettings();updateWelcomeMode(false);return;
    }
  }
  if(settings.guestPinEnabled&&!guestPinUnlocked){
    updateWelcomeMode(false);
    $("welcomePinInput").focus();
    return;
  }
  setBoothReturnScreen("welcome");
  enterBoothHistory();
  showExperienceChooser();
}
async function submitGuestPin(event){
  event.preventDefault();
  if(!EVENT)return;
  const status=$("welcomePinStatus"),now=Date.now();
  const throttle=EVENT.guestPinThrottleStatus(guestPinThrottle,now);
  if(!throttle.allowed){
    status.textContent="Try again in "+Math.ceil(throttle.retryAfterMs/1000)+" seconds.";
    return;
  }
  const matched=await EVENT.verifyGuestPin(settings,$("welcomePinInput").value.trim());
  guestPinThrottle=EVENT.recordGuestPinAttempt(guestPinThrottle,matched,now);
  if(!matched){
    const next=EVENT.guestPinThrottleStatus(guestPinThrottle,now);
    status.textContent=next.allowed?"That PIN did not match. "+next.attemptsRemaining+" tries left.":"Too many tries. Wait 30 seconds, then try again.";
    $("welcomePinInput").select();
    return;
  }
  guestPinUnlocked=true;$("welcomePinInput").value="";status.textContent="";
  enterGuestBooth();
}
function previewEventAsGuest(){
  activationConfirmationPending=false;
  if(history.replaceState&&(history.state||{}).surface===HISTORY_SURFACE.EVENT_HOME){
    history.replaceState({...history.state,hostView:false},"",location.href);
  }
  updateWelcomeMode(false);
  $("startBtn").focus();
}
function activateEvent(){
  if(!EVENT)return;
  if(boothExampleMode||(!capabilities.canPersonaliseEvent&&!legacyProfileAvailable)){
    $("hostEventStatusText").textContent="One Party checkout is not open yet. You can preview this photobooth without starting its event clock.";
    return;
  }
  if(settings.eventStatus!=="DRAFT"){refreshHostEventStatus();return;}
  if(!activationConfirmationPending){
    activationConfirmationPending=true;
    refreshHostEventStatus();
    $("hostEventStatusText").textContent="Starting is deliberate: the 48-hour live period begins now and cannot be restarted. Press confirm when you are ready.";
    return;
  }
  settings=EVENT.startEvent(settings);
  persistSettings();
  activationConfirmationPending=false;
  refreshHostEventStatus();
  if(history.replaceState&&(history.state||{}).surface===HISTORY_SURFACE.EVENT_HOME){
    history.replaceState({...history.state,hostView:false},"",location.href);
  }
  updateWelcomeMode(false);
}

$("startBtn").onclick=enterGuestBooth;
$("previewEventBtn").onclick=previewEventAsGuest;
$("activateEventBtn").onclick=activateEvent;
$("welcomePinForm").onsubmit=submitGuestPin;
document.querySelectorAll("[data-experience]").forEach(button=>button.onclick=()=>beginSession(button.dataset.experience));
$("experienceHomeBtn").onclick=showBoothReturnScreen;
$("cancelCapture").onclick=cancelCapture;
$("retakeBtn").onclick=()=>beginSession(currentExperience);
$("nextGuestBtn").onclick=showExperienceChooser;
$("boothHomeBtn").onclick=showBoothReturnScreen;
/* Retry re-enters capture in place: no page reload, so a guest who fixes a
   permission prompt is still in the booth rather than back on the landing page. */
$("cameraErrorRetry").onclick=()=>{hideCameraError();beginSession(currentExperience);};
$("cameraErrorBack").onclick=()=>{hideCameraError();cancelCapture();};
$("shareBtn").onclick=shareCurrent;
$("saveBtn").onclick=saveCurrent;
$("stillPhotoBtn").onclick=async()=>{
  if(exportBusy)return;
  const exportSession=captureSessionId;
  exportBusy=true;refreshExportControls();setExportStatus("Preparing your still photo…");
  try{
    const blob=await polaroidPrintBlob();
    if(exportSession!==captureSessionId)return;
    download(blob,"png");setExportStatus("Still photo saved to this device.");
  }
  catch(error){if(exportSession===captureSessionId)setExportStatus(error.message||"The still photo could not be saved.",true);}
  finally{
    if(exportSession===captureSessionId){exportBusy=false;refreshExportControls();}
  }
};
$("changeCoverPhoto").onclick=()=>{
  coverIndex=null;
  $("magazinePickStep").hidden=false;
  $("magazineStyleStep").hidden=true;
  document.querySelectorAll(".photo-choice").forEach(x=>x.classList.remove("active"));
  renderWithFade();refreshExportControls();resetIdle();
};

$("openSettings").onclick=()=>openPersonalSettings("welcome");
$("closeSettings").onclick=()=>showScreen(settingsReturnScreen||"landing");
$("saveSettings").onclick=()=>savePersonalSettings(false);
$("launchCustomBooth").onclick=previewPersonalSettings;
$("copySetupPass").onclick=copySetupPass;
$("shareSetupPass").onclick=shareSetupPass;
$("setGuestPinEnabled").onchange=()=>{$("setGuestPinField").hidden=!$("setGuestPinEnabled").checked;if($("setGuestPinEnabled").checked)$("setGuestPin").focus();};
$("setLook").onchange=()=>{const look=eventLook($("setLook").value);$("setAccent").value=look.accent;scheduleAdminPreview();};
$("resetSettings").onclick=()=>{
  if(!confirm("Reset this booth to the MyBishBash defaults? Your local gallery will not be removed."))return;
  settings=EVENT?EVENT.createEventConfig(DEFAULTS,{defaults:DEFAULTS}):{...DEFAULTS};persistSettings();fillSettingsUI();renderAdminPreview();
};
$("clearGallery").onclick=async()=>{
  if(!confirm("Clear every locally saved session from this device? This cannot be undone."))return;
  await clearGallerySessions();await renderEventGallery();
};
$("setupBack").onclick=()=>setSetupStep(activeSetupStep-1);
$("setupNext").onclick=()=>setSetupStep(activeSetupStep+1);
document.querySelectorAll("[data-setup-step]").forEach(button=>button.onclick=()=>setSetupStep(button.dataset.setupStep));
document.querySelectorAll("[data-accent]").forEach(button=>button.onclick=()=>{
  $("setAccent").value=button.dataset.accent;refreshCoverPlaceholders();scheduleAdminPreview();
});
$("choosePersonalPlan").onclick=()=>{showProductRoute("personal",true);setTimeout(()=>$("pricing").scrollIntoView({behavior:"smooth"}),0);};
$("openPersonalSetup").onclick=()=>openPersonalSettings("landing");
$("openPersonalSetupSecondary").onclick=()=>openPersonalSettings("landing");
$("previewExampleBooth").onclick=previewExampleBooth;
$("backToProduct").onclick=returnToProduct;
window.addEventListener("mybishbash:preview-event",event=>{
  if(!event.detail)return;
  if(!temporarySettingsSnapshot)temporarySettingsSnapshot=settings;
  settings=EVENT?EVENT.createEventConfig({...DEFAULTS,...event.detail,eventStatus:"DRAFT"},{defaults:DEFAULTS}):{...DEFAULTS,...event.detail};
  boothExampleMode=false;
  enterEventHome(false,false);
});
document.querySelectorAll("[data-start-photobooth]").forEach(button=>button.onclick=launchFreeBooth);
document.querySelectorAll("[data-product-route]").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();showProductRoute(link.dataset.productRoute,true);}));
window.addEventListener("popstate",handleHistoryChange);
document.querySelectorAll("[data-checkout-plan]").forEach(button=>button.onclick=()=>startCheckout(button.dataset.checkoutPlan));
$("restoreAccessBtn").onclick=()=>{$("restoreAccessForm").hidden=!$("restoreAccessForm").hidden;if(!$("restoreAccessForm").hidden)$("restoreEmail").focus();};
$("requestRestoreBtn").onclick=requestRestoreAccess;
$("restoreAccessForm").onsubmit=async event=>{
  event.preventDefault();const status=$("checkoutStatus"),token=$("restoreCode").value.trim();
  if(!token)return;
  status.textContent="Verifying access…";status.className="checkout-status";
  try{await verifyRestoreToken(token);status.textContent="Personal access restored on this device.";status.className="checkout-status success";$("restoreAccessForm").hidden=true;}
  catch(e){status.textContent=e.message||"Access could not be restored.";status.className="checkout-status error";}
};

const businessToggleIds=["businessCollectEmail","businessRequireEmail","businessAllowShare","businessAllowSave","businessMarketingConsent","businessPublicityConsent","businessCollectPhotos"];
businessToggleIds.forEach(id=>$(id).addEventListener("change",syncBusinessConfigurator));
["businessBrandName","businessPrimary","businessSecondary"].forEach(id=>$(id).addEventListener("input",updateBusinessBrandText));
$("businessLogo").addEventListener("change",()=>{
  const file=$("businessLogo").files&&$("businessLogo").files[0],status=$("businessLogoStatus");
  if(!file){status.textContent="";return;}
  const okay=/^(image\/png|image\/jpeg)$/i.test(file.type)&&file.size<=2*1024*1024;
  status.textContent=okay?"Logo is valid for this local preview.":"Use a PNG or JPG under 2 MB. SVG requires trusted server sanitisation before use.";
});
$("businessContinue").onclick=()=>{
  const email=$("guestEmail"),submission={
    email:String(email.value||"").trim(),
    marketingConsent:$("guestMarketingConsent").checked,
    publicityConsent:$("guestPublicityConsent").checked
  };
  const decision=PRODUCT?PRODUCT.validateConsentSubmission(businessEventConfig,submission):{valid:email.checkValidity()};
  if(!decision.valid){email.focus();setExportStatus("Check the delivery email and the separate event choices before continuing.",true);return;}
  /* A live Business event must persist this decision through its scoped event
     API before setting this flag. The public product shell cannot grant those
     credentials, so this local branch is only the renderer/config preview. */
  businessCompletionSatisfied=true;applyBusinessEventFlow();setExportStatus("");
};

document.querySelectorAll(".admin-preview-tab").forEach(b=>b.onclick=()=>{
  adminPreviewType=b.dataset.preview;
  document.querySelectorAll(".admin-preview-tab").forEach(x=>x.classList.toggle("active",x.dataset.preview===adminPreviewType));
  renderAdminPreview();
});
document.querySelectorAll(".admin-orientation-tab").forEach(b=>b.onclick=()=>{
  adminOrientation=b.dataset.orientation;
  document.querySelectorAll(".admin-orientation-tab").forEach(x=>x.classList.toggle("active",x===b));
  renderAdminPreview();
});
document.querySelectorAll("#settings input,#settings select").forEach(el=>el.addEventListener("input",()=>{
  refreshCoverPlaceholders();
  refreshFontSpecimens();
  scheduleAdminPreview();
}));
window.addEventListener("resize",syncStripFramingGuide);
if(window.visualViewport)window.visualViewport.addEventListener("resize",syncStripFramingGuide);

fillSettingsUI();
setSetupStep(0);
syncBusinessConfigurator();
updateBusinessBrandText();
applyBusinessContact();
applyBillingState();
applySurfaceMetadata(routeFromLocation());
assertOriginConsistency();
bootstrapNavigation();
importSetupPassFromLocation();
handleCheckoutReturn();
loadVerifiedAccess();
if("serviceWorker" in navigator){
  let hasServiceWorkerController=Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    /* A first install does not need a reload; this page already came from the
       network. A changed controller does, but never during a guest's session. */
    const replacesExistingController=hasServiceWorkerController;
    hasServiceWorkerController=Boolean(navigator.serviceWorker.controller);
    if(replacesExistingController&&hasServiceWorkerController)requestServiceWorkerRefresh();
  });

  window.addEventListener("load",async()=>{
    let registration;
    let updateInFlight=false;
    try{
      registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
    }catch(error){
      console.warn("Offline mode could not start.",error);
      return;
    }

    const checkForUpdate=async()=>{
      if(updateInFlight)return;
      updateInFlight=true;
      try{await registration.update();}
      catch(error){if(navigator.onLine)console.warn("Could not check for a Photo Booth update.",error);}
      finally{updateInFlight=false;}
    };

    window.addEventListener("online",checkForUpdate);
    window.addEventListener("pageshow",checkForUpdate);
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible")checkForUpdate();
    });
    await checkForUpdate();
  });
}
