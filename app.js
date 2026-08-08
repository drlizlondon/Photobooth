const DEFAULTS = {
  eventTitle:"Rae's 26th Birthday",
  date:"2026",

  stripTop:"THE BIRTHDAY ISSUE",
  stripSecond:"Rae's 26th Birthday",
  stripSignature:"Rae's 26th Birthday",
  stripDate:"2026",

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

  welcomeEyebrow:"",
  startLabel:"",
  startHint:"",
  cancelLabel:"",
  stripTabLabel:"",
  magazineTabLabel:"",
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

  accent:"#d86c8f",
  countdown:3,
  mirror:true,
  prompts:true,
  shutter:true,
  flash:true,
  confetti:true
};

const FRAMES = [["white","White"],["black","Black"],["editorial","Editorial"],["film","Film"]];
const FILTERS = [["original","Original"],["bw","B&W"],["vintage","Vintage"],["warm","Warm"],["glow","Glow"]];

/* Every word a guest can see. [settings key, shipped default, element id].
   Blank in settings means "use the default", which is what the admin field
   shows as its placeholder — same contract as the cover copy. */
const SCREEN_TEXT = [
  ["welcomeEyebrow","PHOTO BOOTH","welcomeEyebrow"],
  ["startLabel","START","startLabelText"],
  ["startHint","tap to begin","startHintText"],
  ["cancelLabel","CANCEL","cancelCapture"],
  ["stripTabLabel","Strip","stripTab"],
  ["magazineTabLabel","Magazine","magazineTab"],
  ["frameLabel","FRAME","frameLabelText"],
  ["filterLabel","FILTER","filterLabelText"],
  ["pickLabel","PICK YOUR COVER","pickLabelText"],
  ["styleLabel","CHOOSE A STYLE","styleLabelText"],
  ["changePhotoLabel","Choose a different photo","changeCoverPhoto"],
  ["shareLabel","Share","shareBtn"],
  ["saveLabel","Save","saveBtn"],
  ["nextLabel","Next guest →","nextGuestBtn"],
  ["retakeLabel","Retake photos","retakeBtn"],
  ["endEyebrow","SESSION COMPLETE","endEyebrow"],
  ["endMessage","Thank you ♡","endMessage"]
];
/* Not tied to an element: used while the camera is running. */
const SHOT_LABEL_DEFAULT = "PHOTO {n} / {total}";
const PROMPTS_DEFAULT = "Everyone in!, Squash together!, One more!";

function applyScreenText(){
  SCREEN_TEXT.forEach(([key,def,id])=>{
    const el=$(id);
    if(el)el.textContent=String(settings[key]||"").trim()||def;
  });
}
/* `prompts` is the on/off toggle; `promptLines` is the wording. */
function capturePrompts(){
  const raw=String(settings.promptLines||"").trim()||PROMPTS_DEFAULT;
  return raw.split(/\s*[,|]\s*/).filter(Boolean);
}
function shotLabel(n,total){
  const fmt=String(settings.shotLabelFormat||"").trim()||SHOT_LABEL_DEFAULT;
  return fmt.replace(/\{n\}/gi,n).replace(/\{total\}/gi,total);
}

let settings=loadSettings();
let stream=null;
let photos=[];
let currentMode="strip";
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

const $=id=>document.getElementById(id);
const screens=["welcome","camera","review","timeout","settings"];

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
  try{return {...DEFAULTS,...migrateSettings(JSON.parse(localStorage.getItem("raePhotoBoothLiveSettings")||"{}"))};}
  catch{return {...DEFAULTS};}
}

function openGalleryDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open("raePhotoBoothGallery",1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("sessions"))db.createObjectStore("sessions",{keyPath:"id"});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function saveSessionToGallery(sessionPhotos,orientation){
  if(!sessionPhotos||sessionPhotos.length!==3)return;
  try{
    const db=await openGalleryDB();
    const tx=db.transaction("sessions","readwrite");
    const store=tx.objectStore("sessions");
    const item={id:Date.now(),createdAt:new Date().toISOString(),orientation,photos:[...sessionPhotos]};
    store.put(item);
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
    db.close();
    await trimGallery(20);
  }catch(e){}
}
async function trimGallery(maxItems){
  try{
    const db=await openGalleryDB();
    const tx=db.transaction("sessions","readwrite"),store=tx.objectStore("sessions");
    const all=await new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});
    all.sort((a,b)=>b.id-a.id);
    all.slice(maxItems).forEach(x=>store.delete(x.id));
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
async function renderEventGallery(){
  const host=$("eventGallery");if(!host)return;
  const sessions=await getGallerySessions();
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
      sessionEdition=sessions.length-sessions.indexOf(session);
      resetCreativeState();
      buildReviewControls();
      showScreen("review");
      await renderWithFade();
      resetIdle();
    };
    host.appendChild(btn);
  });
}

function persistSettings(){localStorage.setItem("raePhotoBoothLiveSettings",JSON.stringify(settings));}
function showScreen(id){screens.forEach(s=>$(s).classList.toggle("active",s===id));}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}

function fillSettingsUI(){
  $("welcomeTitle").textContent=settings.eventTitle;
  $("welcomeDate").textContent=settings.date;
  document.documentElement.style.setProperty("--accent",settings.accent);
  applyScreenText();

  const map={
    setEventTitle:"eventTitle",setDate:"date",
    setStripTop:"stripTop",setStripSecond:"stripSecond",setStripSignature:"stripSignature",setStripDate:"stripDate"
  };
  COVER_FIELDS.concat(TEXT_FIELDS).forEach(([id,key])=>map[id]=key);
  Object.entries(map).forEach(([id,key])=>{if($(id))$(id).value=settings[key];});
  refreshCoverPlaceholders();
  $("setAccent").value=settings.accent;
  $("setCountdown").value=String(settings.countdown);
  $("setMirror").checked=settings.mirror;
  $("setPrompts").checked=settings.prompts;
  $("setShutter").checked=settings.shutter;
  $("setFlash").checked=settings.flash;
  $("setConfetti").checked=settings.confetti;
}

const inputId=key=>"set"+key.charAt(0).toUpperCase()+key.slice(1);
/* [input id, settings key] for every editable cover line. */
const COVER_FIELDS=Covers.copyKeys.map(k=>{
  const key="cover"+k.charAt(0).toUpperCase()+k.slice(1);
  return [inputId(key),key];
});
/* Same contract for the guest-facing screen wording. */
const TEXT_FIELDS=SCREEN_TEXT.map(([key])=>[inputId(key),key])
  .concat([[inputId("shotLabelFormat"),"shotLabelFormat"],[inputId("promptLines"),"promptLines"]]);

/* Blank fields show what the cover will auto-generate. */
function refreshCoverPlaceholders(){
  const derived=Covers.derive({eventTitle:$("setEventTitle").value.trim()||DEFAULTS.eventTitle,date:$("setDate").value.trim()});
  COVER_FIELDS.forEach(([id,key],i)=>{
    const el=$(id);if(!el)return;
    el.placeholder=derived[Covers.copyKeys[i]]||"";
  });
  SCREEN_TEXT.forEach(([key,def])=>{const el=$(inputId(key));if(el)el.placeholder=def;});
  if($(inputId("shotLabelFormat")))$(inputId("shotLabelFormat")).placeholder=SHOT_LABEL_DEFAULT;
  if($(inputId("promptLines")))$(inputId("promptLines")).placeholder=PROMPTS_DEFAULT;
}

function draftSettings(){
  const draft={
    ...settings,
    eventTitle:$("setEventTitle").value.trim()||DEFAULTS.eventTitle,
    date:$("setDate").value.trim(),
    stripTop:$("setStripTop").value.trim(),
    stripSecond:$("setStripSecond").value.trim(),
    stripSignature:$("setStripSignature").value.trim(),
    stripDate:$("setStripDate").value.trim(),
    accent:$("setAccent").value,
    countdown:Number($("setCountdown").value),
    mirror:$("setMirror").checked,
    prompts:$("setPrompts").checked,
    shutter:$("setShutter").checked,
    flash:$("setFlash").checked,
    confetti:$("setConfetti").checked
  };
  COVER_FIELDS.concat(TEXT_FIELDS).forEach(([id,key])=>{if($(id))draft[key]=$(id).value.trim();});
  return draft;
}

async function startCamera(){
  stopCamera();
  stream=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:"user",width:{ideal:1920},height:{ideal:1080}},
    audio:false
  });
  $("video").srcObject=stream;
  $("video").classList.toggle("mirror",settings.mirror);
  await $("video").play();
  const w=$("video").videoWidth||window.innerWidth;
  const h=$("video").videoHeight||window.innerHeight;
  sessionOrientation=w>=h?"landscape":"portrait";
}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}

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
function cancelCapture(){
  captureSessionId++;
  $("countdown").textContent="";
  $("promptText").classList.remove("show");
  $("flash").classList.remove("on");
  stopCamera();
  photos=[];
  showScreen("welcome");
}
function resetCreativeState(){
  currentMode="strip";
  frameStyle="white";
  filterStyle="original";
  coverIndex=null;
  magazineStyle="keepsake";
  document.querySelectorAll(".mode-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode==="strip"));
  $("stripControls").classList.add("active");
  $("magazineControls").classList.remove("active");
  $("magazinePickStep").hidden=false;
  $("magazineStyleStep").hidden=true;
}

async function beginSession(){
  clearTimeout(idleTimer);
  captureSessionId++;
  const sid=captureSessionId;
  photos=[];
  resetCreativeState();
  initAudio();
  showScreen("camera");

  const promptList=capturePrompts();
  try{
    await startCamera();
    await delay(400);
    for(let i=0;i<3;i++){
      if(sid!==captureSessionId)return;
      $("shotLabel").textContent=shotLabel(i+1,3);
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
    stopCamera();
    await saveSessionToGallery(photos,sessionOrientation);
    sessionEdition=await countGallerySessions();
    buildReviewControls();
    showScreen("review");
    await renderWithFade();
    resetIdle();
    if(settings.confetti)launchConfetti();
  }catch(err){
    stopCamera();
    if(err.message!=="cancelled"){
      alert("Please allow camera access in Safari and try again.");
      showScreen("welcome");
    }
  }
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
    b.textContent=label;
    b.onclick=()=>{frameStyle=key;buildReviewControls();renderWithFade();resetIdle();};
    $("frameChoices").appendChild(b);
  });

  $("filterChoices").innerHTML="";
  FILTERS.forEach(([key,label])=>{
    const b=document.createElement("button");
    b.className="choice"+(filterStyle===key?" active":"");
    b.textContent=label;
    b.onclick=()=>{filterStyle=key;buildReviewControls();renderWithFade();resetIdle();};
    $("filterChoices").appendChild(b);
  });

  $("coverPhotoChoices").innerHTML="";
  photos.forEach((src,i)=>{
    const b=document.createElement("button");
    b.className="photo-choice"+(coverIndex===i?" active":"");
    const img=document.createElement("img");img.src=src;b.appendChild(img);
    b.onclick=()=>{
      coverIndex=i;
      $("magazinePickStep").hidden=true;
      $("magazineStyleStep").hidden=false;
      buildReviewControls();
      renderWithFade();
      resetIdle();
    };
    $("coverPhotoChoices").appendChild(b);
  });

  $("magazineStyleChoices").innerHTML="";
  Covers.TEMPLATES.forEach(tpl=>{
    const b=document.createElement("button");
    b.className="mag-style-choice"+(magazineStyle===tpl.key?" active":"");
    b.type="button";
    const cv=document.createElement("canvas");
    cv.className="mag-style-preview";
    cv.dataset.template=tpl.key;
    const tx=document.createElement("span");tx.textContent=tpl.label;
    const hint=document.createElement("small");hint.textContent=tpl.hint;
    b.append(cv,tx,hint);
    b.onclick=()=>{magazineStyle=tpl.key;buildReviewControls();renderWithFade();resetIdle();};
    $("magazineStyleChoices").appendChild(b);
  });
  renderStyleThumbs();
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
      width:size.width,height:size.height,
      copy,accent:settings.accent,
      template:cv.dataset.template,
      edition:{no:sessionEdition}
    });
  });
}

function setMode(mode){
  currentMode=mode;
  document.querySelectorAll(".mode-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $("stripControls").classList.toggle("active",mode==="strip");
  $("magazineControls").classList.toggle("active",mode==="magazine");
  if(mode==="magazine"){
    $("magazinePickStep").hidden=coverIndex!==null;
    $("magazineStyleStep").hidden=coverIndex===null;
  }
  renderWithFade();resetIdle();
}
document.querySelectorAll(".mode-tab").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

function filterCSS(){
  return {
    original:"none",
    bw:"grayscale(1) contrast(1.06)",
    vintage:"sepia(.18) saturate(.78) contrast(.97) brightness(1.03)",
    warm:"sepia(.10) saturate(1.12) brightness(1.03)",
    glow:"brightness(1.07) contrast(.92) saturate(.95)"
  }[filterStyle]||"none";
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
function typography(){
  return {
    serif:'Didot,"Bodoni 72","Bodoni MT",Georgia,serif',
    sans:'"Avenir Next",Avenir,Arial,sans-serif',
    script:'Snell Roundhand,"Apple Chancery","Segoe Script",cursive'
  };
}
function drawBarcode(ctx,x,y,w,h,font,light=false){
  ctx.save();
  ctx.fillStyle=light?"rgba(255,255,255,.92)":"#fff";ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=light?"#fff":"#111";ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#111";
  for(let i=0;i<26;i++){const xx=x+7+i*(w-14)/26;ctx.fillRect(xx,y+6,i%4===0?2.4:(i%3===0?1.8:1.1),h-18);}
  ctx.font=`700 8px ${font}`;ctx.textAlign="center";ctx.fillText("026  2026",x+w/2,y+h-4);
  ctx.restore();
}

async function renderWithFade(){
  $("mainCanvas").classList.add("changing");
  await delay(70);
  await render();
  $("mainCanvas").classList.remove("changing");
}
async function render(){
  if(!photos.length)return;
  const imgs=await Promise.all(photos.map(loadImage));
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
    accent:settings.accent,
    template:magazineStyle,
    edition:{no:sessionEdition}
  });
}

function renderStrip(ctx,c,imgs,s,orientation){
  const t=typography(),land=orientation==="landscape",first=imgs[0];
  const W=land?900:690,side=26,innerW=W-side*2;
  const ratio=first.width/first.height,photoH=innerW/ratio;
  const gap=20,headerH=130,footerH=142,H=Math.round(headerH+photoH*3+gap*2+footerH);
  c.width=W;c.height=H;

  let bg="#fff",ink="#111",photoBg="#f6f2ec";
  if(frameStyle==="black"){bg="#090909";ink="#fff";photoBg="#111";}
  if(frameStyle==="editorial"){bg="#f7f0e5";ink="#111";photoBg="#eee7dd";}
  if(frameStyle==="film"){bg="#090909";ink="#fff";photoBg="#111";}

  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  if(frameStyle==="editorial"){
    ctx.strokeStyle="rgba(17,17,17,.28)";ctx.lineWidth=1;ctx.strokeRect(12,12,W-24,H-24);
    ctx.beginPath();ctx.moveTo(44,100);ctx.lineTo(W-44,100);ctx.stroke();
  }
  if(frameStyle==="film"){
    ctx.fillStyle="#fff";
    for(let y=24;y<H-24;y+=44){ctx.fillRect(8,y,14,24);ctx.fillRect(W-22,y,14,24);}
  }

  ctx.fillStyle=ink;ctx.textAlign="center";
  fitText(ctx,s.stripTop||"",W-90,14,t.sans,800,9);
  ctx.globalAlpha=.78;ctx.fillText((s.stripTop||"").toUpperCase(),W/2,32);ctx.globalAlpha=1;
  fitText(ctx,s.stripSecond||"",W-90,land?28:25,t.serif,400,16);
  ctx.fillText(s.stripSecond||"",W/2,68);
  fitText(ctx,s.stripDate||"",W-90,12,t.sans,800,9);
  ctx.globalAlpha=.58;ctx.fillText(s.stripDate||"",W/2,94);ctx.globalAlpha=1;

  imgs.forEach((img,i)=>{
    const y=headerH+i*(photoH+gap);
    ctx.save();ctx.filter=filterCSS();
    drawContain(ctx,img,side,y,innerW,photoH,photoBg);
    ctx.restore();
  });

  const base=headerH+photoH*3+gap*2;
  ctx.fillStyle=ink;ctx.textAlign="center";
  fitText(ctx,s.stripSignature||"",W-90,land?38:32,t.script,400,20);
  ctx.fillText(s.stripSignature||"",W/2,base+64);
  fitText(ctx,s.stripDate||"",W-90,12,t.sans,800,9);
  ctx.fillText(s.stripDate||"",W/2,base+98);
}

async function canvasBlob(){return new Promise(r=>$("mainCanvas").toBlob(r,"image/png",1));}
async function shareCurrent(){
  resetIdle();
  const blob=await canvasBlob(),file=new File([blob],`photo-booth-${currentMode}-${Date.now()}.png`,{type:"image/png"});
  try{
    if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:settings.eventTitle,text:settings.eventTitle});
    else await saveCurrent();
  }catch(e){}
}
async function saveCurrent(){
  resetIdle();
  const blob=await canvasBlob(),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`photo-booth-${currentMode}-${Date.now()}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resetIdle(){
  clearTimeout(idleTimer);
  if($("review").classList.contains("active")){
    idleTimer=setTimeout(async()=>{
      photos=[];resetCreativeState();showScreen("timeout");await delay(650);showScreen("welcome");
    },120000);
  }
}

/* The admin preview runs the real cover renderer against a stand-in photo,
   so what the host tunes here is exactly what guests get. */
function renderAdminPreview(){
  const s=draftSettings(),c=$("adminPreviewCanvas"),ctx=c.getContext("2d");
  const land=adminOrientation==="landscape";

  if(adminPreviewType==="strip"){
    const t=typography(),W=land?640:430,H=land?470:650;
    c.width=W;c.height=H;
    ctx.fillStyle="#fbf7f0";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#111";ctx.textAlign="center";
    fitText(ctx,s.stripTop,W-50,10,t.sans,800,7);ctx.fillText((s.stripTop||"").toUpperCase(),W/2,19);
    fitText(ctx,s.stripSecond,W-50,land?19:16,t.serif,400,11);ctx.fillText(s.stripSecond||"",W/2,43);
    ctx.font=`800 8px ${t.sans}`;ctx.globalAlpha=.55;ctx.fillText(s.stripDate||"",W/2,59);ctx.globalAlpha=1;
    const mx=14,top=72,g=10,footer=78,ph=(H-top-footer-g*2)/3;
    for(let i=0;i<3;i++){ctx.fillStyle="#dfd8cf";ctx.fillRect(mx,top+i*(ph+g),W-mx*2,ph);}
    ctx.fillStyle="#111";fitText(ctx,s.stripSignature,W-45,land?25:20,t.script,400,12);ctx.fillText(s.stripSignature||"",W/2,H-38);
    ctx.font=`800 8px ${t.sans}`;ctx.fillText(s.stripDate||"",W/2,H-18);
    return;
  }

  const size=Covers.coverSize(adminOrientation,land?520:600);
  c.width=size.width;c.height=size.height;
  Covers.render(ctx,{
    img:Covers.placeholder(),
    width:size.width,height:size.height,
    copy:Covers.copyFor(s),
    accent:s.accent,
    template:adminPreviewType,
    edition:{no:14}
  });
}

$("startBtn").onclick=beginSession;
$("cancelCapture").onclick=cancelCapture;
$("retakeBtn").onclick=beginSession;
$("nextGuestBtn").onclick=beginSession;
$("shareBtn").onclick=shareCurrent;
$("saveBtn").onclick=saveCurrent;
$("changeCoverPhoto").onclick=()=>{coverIndex=null;$("magazinePickStep").hidden=false;$("magazineStyleStep").hidden=true;buildReviewControls();renderWithFade();resetIdle();};

$("openSettings").onclick=()=>{fillSettingsUI();showScreen("settings");setTimeout(()=>{renderAdminPreview();renderEventGallery();},0);};
$("closeSettings").onclick=()=>showScreen("welcome");
$("saveSettings").onclick=()=>{settings=draftSettings();persistSettings();fillSettingsUI();buildReviewControls();showScreen("welcome");};
$("resetSettings").onclick=()=>{settings={...DEFAULTS};persistSettings();fillSettingsUI();renderAdminPreview();};
$("clearGallery").onclick=async()=>{await clearGallerySessions();await renderEventGallery();};

document.querySelectorAll(".admin-preview-tab").forEach(b=>b.onclick=()=>{
  adminPreviewType=b.dataset.preview;
  document.querySelectorAll(".admin-preview-tab").forEach(x=>x.classList.toggle("active",x===b));
  renderAdminPreview();
});
document.querySelectorAll(".admin-orientation-tab").forEach(b=>b.onclick=()=>{
  adminOrientation=b.dataset.orientation;
  document.querySelectorAll(".admin-orientation-tab").forEach(x=>x.classList.toggle("active",x===b));
  renderAdminPreview();
});
document.querySelectorAll("#settings input,#settings select").forEach(el=>el.addEventListener("input",()=>{
  refreshCoverPlaceholders();
  renderAdminPreview();
}));

fillSettingsUI();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
