/* landing.js — the public site's experiential entrance and live event demo.
   It owns no booth state. The demo emits a configuration event; app.js decides
   whether that configuration is a temporary preview or a saved event. */
(function(global){
"use strict";

var ENTRANCE_KEY="mybishbashPhotoboothEntranceSeenV1";
var currentLook="lilac";
var LOOKS={
  lilac:{surface:"#eee6ff",accent:"#66519c",shape:"#ffdce8",ink:"#111111"},
  pink:{surface:"#ffdce8",accent:"#b52167",shape:"#dcecff",ink:"#111111"},
  sky:{surface:"#dcecff",accent:"#245f9f",shape:"#fff0aa",ink:"#111111"},
  butter:{surface:"#fff0aa",accent:"#9a5c00",shape:"#eee6ff",ink:"#111111"}
};

function byId(id){return document.getElementById(id);}
function text(value,max){return String(value||"").trim().slice(0,max||100);}
function title(value){return text(value,64)||"Your Event";}
function metaLine(location,date){return [text(location,48),text(date,32)].filter(Boolean).join(" · ");}

function demoConfig(){
  return {
    eventType:text(byId("landingEventType")&&byId("landingEventType").value,24)||"party",
    eventTitle:title(byId("landingEventName")&&byId("landingEventName").value),
    location:text(byId("landingEventLocation")&&byId("landingEventLocation").value,48),
    date:text(byId("landingEventDate")&&byId("landingEventDate").value,32),
    datePrecision:"exact",
    eventLine:text(byId("landingEventLine")&&byId("landingEventLine").value,72),
    look:currentLook
  };
}

function applyLook(node,key){
  var look=LOOKS[key]||LOOKS.lilac;
  if(!node)return;
  node.setAttribute("data-look",key);
  node.style.setProperty("--event-surface",look.surface);
  node.style.setProperty("--event-accent",look.accent);
  node.style.setProperty("--event-shape",look.shape);
  node.style.setProperty("--event-ink",look.ink);
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
  applyLook(preview,currentLook);
  var example=document.querySelector(".personal-welcome-browser .booth-example");
  applyLook(example,currentLook);
}

function chooseLook(button){
  var key=button&&button.getAttribute("data-landing-look");
  if(!LOOKS[key])return;
  currentLook=key;
  document.querySelectorAll("[data-landing-look]").forEach(function(item){
    var active=item===button;
    item.classList.toggle("active",active);
    item.setAttribute("aria-pressed",active?"true":"false");
  });
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
  if(form)form.addEventListener("input",renderDemo,false);
  document.querySelectorAll("[data-landing-look]").forEach(function(button){
    button.addEventListener("click",function(){chooseLook(button);},false);
  });
  var preview=byId("previewCreatedBooth");
  if(preview)preview.addEventListener("click",dispatchPreview,false);
  renderDemo();
}

function init(){initDemo();initEntrance();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,false);
else init();

global.MyBishBashLanding={demoConfig:demoConfig,renderDemo:renderDemo,revealSite:revealSite};
})(window);
