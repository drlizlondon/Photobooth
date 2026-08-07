const DEFAULTS = {
  eventTitle:"Rae's 26th Birthday",
  date:"2026",

  stripTop:"THE BIRTHDAY ISSUE",
  stripSecond:"Rae's 26th Birthday",
  stripSignature:"Rae's 26th Birthday",
  stripDate:"2026",

  birthdayMasthead:"BIRTHDAY",
  birthdayScript:"Rae's 26th",
  birthdayLine1:"THE BIRTHDAY ISSUE",
  birthdayLine2:"CELEBRATING 26 YEARS OF RAE",
  birthdayLine3:"ONE NIGHT TO REMEMBER",
  birthdayIssue:"CELEBRATION EDITION · 2026",

  fashionMasthead:"RAE",
  fashionTop:"THE BIRTHDAY EDIT",
  fashionFeature1:"ONE NIGHT ONLY",
  fashionFeature2:"LONDON · 2026",
  fashionLarge:"TWENTY SIX",
  fashionBottom:"THE QUEEN OF HER DAY",
  fashionIssue:"SPECIAL BIRTHDAY EDITION",

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
const PROMPTS = ["Everyone in!","Squash together!","One more!"];

let settings=loadSettings();
let stream=null;
let photos=[];
let currentMode="strip";
let frameStyle="white";
let filterStyle="original";
let coverIndex=null;
let magazineStyle="fashion";
let sessionOrientation="landscape";
let captureSessionId=0;
let idleTimer=null;
let audioCtx=null;
let adminPreviewType="strip";
let adminOrientation="landscape";

const $=id=>document.getElementById(id);
const screens=["welcome","camera","review","timeout","settings"];

function loadSettings(){
  try{return {...DEFAULTS,...JSON.parse(localStorage.getItem("raePhotoBoothLiveSettings")||"{}")};}
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

  const map={
    setEventTitle:"eventTitle",setDate:"date",
    setStripTop:"stripTop",setStripSecond:"stripSecond",setStripSignature:"stripSignature",setStripDate:"stripDate",
    setBirthdayMasthead:"birthdayMasthead",setBirthdayScript:"birthdayScript",setBirthdayLine1:"birthdayLine1",setBirthdayLine2:"birthdayLine2",setBirthdayLine3:"birthdayLine3",setBirthdayIssue:"birthdayIssue",
    setFashionMasthead:"fashionMasthead",setFashionTop:"fashionTop",setFashionFeature1:"fashionFeature1",setFashionFeature2:"fashionFeature2",setFashionLarge:"fashionLarge",setFashionBottom:"fashionBottom",setFashionIssue:"fashionIssue"
  };
  Object.entries(map).forEach(([id,key])=>$(id).value=settings[key]);
  $("setAccent").value=settings.accent;
  $("setCountdown").value=String(settings.countdown);
  $("setMirror").checked=settings.mirror;
  $("setPrompts").checked=settings.prompts;
  $("setShutter").checked=settings.shutter;
  $("setFlash").checked=settings.flash;
  $("setConfetti").checked=settings.confetti;
}

function draftSettings(){
  return {
    ...settings,
    eventTitle:$("setEventTitle").value.trim()||DEFAULTS.eventTitle,
    date:$("setDate").value.trim(),
    stripTop:$("setStripTop").value.trim(),
    stripSecond:$("setStripSecond").value.trim(),
    stripSignature:$("setStripSignature").value.trim(),
    stripDate:$("setStripDate").value.trim(),
    birthdayMasthead:$("setBirthdayMasthead").value.trim(),
    birthdayScript:$("setBirthdayScript").value.trim(),
    birthdayLine1:$("setBirthdayLine1").value.trim(),
    birthdayLine2:$("setBirthdayLine2").value.trim(),
    birthdayLine3:$("setBirthdayLine3").value.trim(),
    birthdayIssue:$("setBirthdayIssue").value.trim(),
    fashionMasthead:$("setFashionMasthead").value.trim(),
    fashionTop:$("setFashionTop").value.trim(),
    fashionFeature1:$("setFashionFeature1").value.trim(),
    fashionFeature2:$("setFashionFeature2").value.trim(),
    fashionLarge:$("setFashionLarge").value.trim(),
    fashionBottom:$("setFashionBottom").value.trim(),
    fashionIssue:$("setFashionIssue").value.trim(),
    accent:$("setAccent").value,
    countdown:Number($("setCountdown").value),
    mirror:$("setMirror").checked,
    prompts:$("setPrompts").checked,
    shutter:$("setShutter").checked,
    flash:$("setFlash").checked,
    confetti:$("setConfetti").checked
  };
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
  magazineStyle="fashion";
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

  try{
    await startCamera();
    await delay(400);
    for(let i=0;i<3;i++){
      if(sid!==captureSessionId)return;
      $("shotLabel").textContent=`PHOTO ${i+1} / 3`;
      if(settings.prompts){
        $("promptText").textContent=PROMPTS[i];
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
  [["fashion","Premium Cover"],["birthday","Birthday Edition"]].forEach(([key,label])=>{
    const b=document.createElement("button");
    b.className="mag-style-choice"+(magazineStyle===key?" active":"");
    const pv=document.createElement("div");pv.className="mag-style-preview";pv.textContent=key==="birthday"?"BIRTHDAY":"RAE";
    const tx=document.createElement("span");tx.textContent=label;
    b.append(pv,tx);
    b.onclick=()=>{magazineStyle=key;buildReviewControls();renderWithFade();resetIdle();};
    $("magazineStyleChoices").appendChild(b);
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

function drawCover(ctx,img,x,y,w,h){
  const scale=Math.max(w/img.width,h/img.height);
  const sw=w/scale,sh=h/scale;
  const sx=(img.width-sw)/2,sy=(img.height-sh)/2;
  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
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
  if(currentMode==="strip")renderStrip(ctx,c,imgs,settings,sessionOrientation);
  else if(coverIndex===null)renderStrip(ctx,c,imgs,settings,sessionOrientation);
  else renderMagazine(ctx,c,imgs,settings,sessionOrientation,magazineStyle,coverIndex);
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

function renderMagazine(ctx,c,imgs,s,orientation,style,index){
  const t=typography(),img=imgs[index],land=orientation==="landscape";
  const W=land?1200:900,H=land?900:1200;c.width=W;c.height=H;

  /* Latest premium cover: original photo + transparent graphic layers only. */
  ctx.fillStyle="#111";ctx.fillRect(0,0,W,H);
  ctx.save();ctx.filter=filterCSS();drawCover(ctx,img,0,0,W,H);ctx.restore();

  const mast=style==="birthday"?(s.birthdayMasthead||"BIRTHDAY"):(s.fashionMasthead||"RAE");
  const leftHero=style==="birthday"?(s.birthdayLine3||"ONE NIGHT TO REMEMBER"):(s.fashionFeature1||"ONE NIGHT ONLY");
  const rightHero=style==="birthday"?(s.birthdayLine2||"THE QUEEN OF HER DAY"):(s.fashionBottom||"CONFIDENCE IS THE BEST OUTFIT");
  const big=style==="birthday"?(s.birthdayLarge||"26"):(s.fashionLarge||"TWENTY SIX");
  const issue=style==="birthday"?(s.birthdayIssue||"THE BIRTHDAY ISSUE"):(s.fashionIssue||"SPECIAL BIRTHDAY EDITION");

  function fit(text,maxw,start,font,weight=700,min=14){
    return fitText(ctx,(text||"").toUpperCase(),maxw,start,font,weight,min);
  }
  function rule(x1,y1,x2,y2){
    ctx.save();ctx.strokeStyle="rgba(255,255,255,.92)";ctx.lineWidth=land?2:1.5;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
  }
  ctx.fillStyle="#fff";
  ctx.shadowColor="rgba(0,0,0,.32)";ctx.shadowBlur=3;ctx.shadowOffsetY=1;

  rule(land?28:24,land?24:24,W-(land?28:24),land?24:24);
  rule(land?28:24,H-(land?24:24),W-(land?28:24),H-(land?24:24));

  ctx.textAlign="center";
  fit(mast,W-(land?70:50),land?230:205,t.serif,700,66);
  ctx.fillText((mast||"").toUpperCase(),W/2,land?175:180);

  ctx.textAlign="right";ctx.font=`800 ${land?12:10}px ${t.sans}`;
  wrapText(ctx,(issue||"").toUpperCase(),W-(land?38:30),land?38:34,land?270:220,land?16:14,3,"right");
  rule(W-(land?185:150),land?90:82,W-(land?38:30),land?90:82);

  ctx.textAlign="left";
  fit(leftHero,land?310:230,land?48:38,t.serif,700,21);
  wrapText(ctx,(leftHero||"").toUpperCase(),land?38:28,land?300:330,land?310:230,land?50:40,4,"left");
  rule(land?38:28,land?470:470,land?205:170,land?470:470);

  ctx.textAlign="right";
  fit(rightHero,land?320:245,land?39:30,t.serif,700,18);
  wrapText(ctx,(rightHero||"").toUpperCase(),W-(land?38:28),land?315:330,land?320:245,land?42:33,4,"right");
  rule(W-(land?220:175),land?490:500,W-(land?38:28),land?490:500);

  ctx.textAlign="right";
  fit(big,land?600:535,land?128:116,t.serif,700,48);
  wrapText(ctx,(big||"").toUpperCase(),W-(land?34:28),land?545:690,land?600:535,land?130:118,3,"right");
  rule(W-(land?300:235),land?805:930,W-(land?34:28),land?805:930);

  ctx.textAlign="left";ctx.font=`400 ${land?11:9}px ${t.sans}`;
  const detail=style==="birthday"?"CELEBRATE · REMEMBER · REPEAT":"CONFIDENCE · BEAUTY · ENERGY";
  wrapText(ctx,detail,land?38:30,H-(land?105:150),land?310:250,land?16:14,3,"left");

  if(style==="birthday"&&s.birthdayScript){
    ctx.font=`400 ${land?25:20}px ${t.script}`;
    ctx.fillText(s.birthdayScript,land?38:30,H-(land?68:105));
  }

  ctx.font=`800 ${land?10:8}px ${t.sans}`;
  wrapText(ctx,(issue||"").toUpperCase(),land?38:30,H-(land?36:42),land?350:280,land?13:12,2,"left");

  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  drawBarcode(ctx,W-(land?190:170),H-(land?72:76),land?145:138,46,t.sans,true);
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

function renderAdminPreview(){
  const s=draftSettings(),c=$("adminPreviewCanvas"),ctx=c.getContext("2d");
  const land=adminOrientation==="landscape",W=land?640:430,H=land?470:650;
  c.width=W;c.height=H;
  ctx.fillStyle="#fbf7f0";ctx.fillRect(0,0,W,H);
  const t=typography();

  if(adminPreviewType==="strip"){
    ctx.fillStyle="#111";ctx.textAlign="center";
    fitText(ctx,s.stripTop,W-50,10,t.sans,800,7);ctx.fillText((s.stripTop||"").toUpperCase(),W/2,19);
    fitText(ctx,s.stripSecond,W-50,land?19:16,t.serif,400,11);ctx.fillText(s.stripSecond||"",W/2,43);
    ctx.font=`800 8px ${t.sans}`;ctx.globalAlpha=.55;ctx.fillText(s.stripDate||"",W/2,59);ctx.globalAlpha=1;
    const mx=14,top=72,g=10,footer=78,ph=(H-top-footer-g*2)/3;
    for(let i=0;i<3;i++){ctx.fillStyle="#dfd8cf";ctx.fillRect(mx,top+i*(ph+g),W-mx*2,ph);}
    ctx.fillStyle="#111";fitText(ctx,s.stripSignature,W-45,land?25:20,t.script,400,12);ctx.fillText(s.stripSignature||"",W/2,H-38);
    ctx.font=`800 8px ${t.sans}`;ctx.fillText(s.stripDate||"",W/2,H-18);return;
  }

  if(adminPreviewType==="birthday"){
    ctx.fillStyle="#fbf3e8";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#dfd8cf";ctx.fillRect(land?180:75,land?38:120,land?430:335,land?390:470);
    ctx.fillStyle="#111";ctx.textAlign="left";fitText(ctx,s.birthdayMasthead,land?310:390,land?48:40,t.serif,700,18);ctx.fillText((s.birthdayMasthead||"").toUpperCase(),18,50);
    ctx.fillStyle="#c46d47";fitText(ctx,s.birthdayScript,land?180:280,land?24:22,t.script,400,12);ctx.fillText(s.birthdayScript||"",20,77);
    ctx.fillStyle="#111";ctx.font=`800 8px ${t.sans}`;wrapText(ctx,(s.birthdayLine1||"").toUpperCase(),20,120,land?135:120,11,3,"left");
    ctx.font=`800 9px ${t.sans}`;wrapText(ctx,(s.birthdayLine2||"").toUpperCase(),20,220,land?140:120,12,4,"left");
    return;
  }

  ctx.fillStyle="#303030";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#e1d9cf";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(0,0,0,.18)";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#fff";ctx.textAlign="center";fitText(ctx,s.fashionMasthead,W-30,land?70:58,t.serif,700,24);ctx.fillText((s.fashionMasthead||"").toUpperCase(),W/2,70);
  ctx.textAlign="right";ctx.font=`800 8px ${t.sans}`;wrapText(ctx,(s.fashionTop||"").toUpperCase(),W-18,28,land?150:120,10,3,"right");
  ctx.textAlign="left";ctx.font=`800 10px ${t.sans}`;wrapText(ctx,(s.fashionFeature1||"").toUpperCase(),18,190,land?115:100,13,4,"left");
  ctx.textAlign="right";ctx.font=`800 ${land?17:15}px ${t.serif}`;wrapText(ctx,(s.fashionLarge||"").toUpperCase(),W-18,300,land?150:120,20,3,"right");
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
$("saveSettings").onclick=()=>{settings=draftSettings();persistSettings();fillSettingsUI();showScreen("welcome");};
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
document.querySelectorAll("#settings input,#settings select").forEach(el=>el.addEventListener("input",renderAdminPreview));

fillSettingsUI();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
