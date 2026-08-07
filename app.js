const DEFAULTS = {
  title:"Rae's 26th Birthday",
  year:"2026",
  stripFooter:"Rae's Birthday • 2026",
  theme:"luxury",
  magazineMasthead:"RAE",
  magazineCaption1:"THE BIRTHDAY ISSUE",
  magazineCaption2:"CELEBRATING 26",
  magazineCaption3:"ONE NIGHT ONLY",
  polaroidCaption:"Rae's 26th Birthday • 2026",
  gridCaption:"Birthday crew • 2026",
  storyCaption:"Rae's 26th Birthday",
  accent:"#d86c8f",
  countdown:3,
  mirror:true,
  prompts:true,
  shutter:true,
  flash:true,
  magazineEnabled:true,
  polaroidEnabled:true,
  gridEnabled:true,
  storyEnabled:true
};

const FILTERS = [
  ["original","Original"],
  ["bw","B&W"],
  ["warm","Warm"],
  ["film","Film"],
  ["glow","Glow"],
  ["punchy","Party"]
];
const STRIP_STYLES = [
  ["white","White"],
  ["black","Black"],
  ["editorial","Editorial"],
  ["film","Film"]
];
const PROMPTS = ["Everyone in!","Squash together!","Closer!"];

let settings = loadSettings();
let stream = null;
let photos = [];
let currentMode = "strip";
let stripStyle = "white";
let filter = "original";
let coverIndex = 0;
let magazineVariant="birthday";
let adminPreviewType="strip";
let adminOrientation="landscape";
let sessionOrientation="landscape";
let idleTimer = null;
let captureSessionId = 0;
let audioCtx = null;

const $ = id => document.getElementById(id);
const screens = ["welcome","camera","review","timeout","settings"];

function loadSettings(){
  try{return {...DEFAULTS,...JSON.parse(localStorage.getItem("raeBoothProductionSettings")||"{}")};}
  catch{return {...DEFAULTS};}
}
function persist(){localStorage.setItem("raeBoothProductionSettings",JSON.stringify(settings));}
function showScreen(id){screens.forEach(s=>$(s).classList.toggle("active",s===id));}
function applySettings(){
  $("welcomeTitle").textContent=settings.title;
  $("welcomeSubtitle").textContent=settings.year;
  document.documentElement.style.setProperty("--accent",settings.accent);

  $("setTitle").value=settings.title;
  $("setYear").value=settings.year;
  $("setStripFooter").value=settings.stripFooter;
  $("setTheme").value=settings.theme;
  $("setMagazineMasthead").value=settings.magazineMasthead;
  $("setMagazineCaption1").value=settings.magazineCaption1;
  $("setMagazineCaption2").value=settings.magazineCaption2;
  $("setMagazineCaption3").value=settings.magazineCaption3;
  $("setPolaroidCaption").value=settings.polaroidCaption;
  $("setGridCaption").value=settings.gridCaption;
  $("setStoryCaption").value=settings.storyCaption;
  $("setAccent").value=settings.accent;
  $("setCountdown").value=String(settings.countdown);
  $("setMirror").checked=settings.mirror;
  $("setPrompts").checked=settings.prompts;
  $("setShutter").checked=settings.shutter;
  $("setFlash").checked=settings.flash;
  $("setMagazineEnabled").checked=settings.magazineEnabled;
  $("setPolaroidEnabled").checked=settings.polaroidEnabled;
  $("setGridEnabled").checked=settings.gridEnabled;
  $("setStoryEnabled").checked=settings.storyEnabled;
  updateVersionVisibility();
}
function updateVersionVisibility(){
  document.querySelector('[data-mode="magazine"]').style.display=settings.magazineEnabled?"":"none";
  document.querySelector('[data-mode="polaroid"]').style.display=settings.polaroidEnabled?"":"none";
  document.querySelector('[data-mode="grid"]').style.display=settings.gridEnabled?"":"none";
  document.querySelector('[data-mode="story"]').style.display=settings.storyEnabled?"":"none";
}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}

async function startCamera(){
  stopCamera();
  stream=await navigator.mediaDevices.getUserMedia({
    video:{facingMode:"user",width:{ideal:1920},height:{ideal:1080}},
    audio:false
  });
  $("video").srcObject=stream;
  $("video").classList.toggle("mirror",settings.mirror);
  await $("video").play();
  const vw=$("video").videoWidth||window.innerWidth;
  const vh=$("video").videoHeight||window.innerHeight;
  sessionOrientation=(vw>=vh)?"landscape":"portrait";
}
function stopCamera(){
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream=null;
  }
}
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
  const buffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.18),audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const env=Math.exp(-i/(data.length*.12));
    data[i]=(Math.random()*2-1)*env;
  }
  noise.buffer=buffer;
  const ng=audioCtx.createGain();
  ng.gain.setValueAtTime(.28,now);
  ng.gain.exponentialRampToValueAtTime(.001,now+.16);
  noise.connect(ng).connect(audioCtx.destination);
  noise.start(now);

  const o1=audioCtx.createOscillator(),g1=audioCtx.createGain();
  o1.type="square";
  o1.frequency.setValueAtTime(210,now);
  o1.frequency.exponentialRampToValueAtTime(75,now+.055);
  g1.gain.setValueAtTime(.15,now);
  g1.gain.exponentialRampToValueAtTime(.001,now+.07);
  o1.connect(g1).connect(audioCtx.destination);
  o1.start(now);o1.stop(now+.075);

  const o2=audioCtx.createOscillator(),g2=audioCtx.createGain();
  o2.type="triangle";
  o2.frequency.setValueAtTime(120,now+.065);
  o2.frequency.exponentialRampToValueAtTime(65,now+.12);
  g2.gain.setValueAtTime(.11,now+.065);
  g2.gain.exponentialRampToValueAtTime(.001,now+.14);
  o2.connect(g2).connect(audioCtx.destination);
  o2.start(now+.065);o2.stop(now+.145);
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
  if(settings.flash){
    $("flash").classList.add("on");
    setTimeout(()=>$("flash").classList.remove("on"),120);
  }
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
async function beginSession(){
  clearTimeout(idleTimer);
  captureSessionId++;
  const sessionId=captureSessionId;
  photos=[];
  currentMode="strip";
  stripStyle="white";
  filter="original";
  coverIndex=0;
  magazineVariant="birthday";
  document.querySelectorAll(".version-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode==="strip"));
  document.querySelectorAll(".mode-panel").forEach(p=>p.classList.remove("active"));
  $("stripPanel").classList.add("active");
  $("reviewHeading").textContent="Your strip";
  initAudio();
  showScreen("camera");

  try{
    await startCamera();
    await delay(450);

    for(let i=0;i<3;i++){
      if(sessionId!==captureSessionId)return;
      $("shotLabel").textContent=`PHOTO ${i+1} / 3`;

      if(settings.prompts){
        $("promptText").textContent=PROMPTS[i];
        $("promptText").classList.add("show");
        await delay(700);
        if(sessionId!==captureSessionId)return;
        $("promptText").classList.remove("show");
      }

      await runCountdown(sessionId);
      if(sessionId!==captureSessionId)return;
      photos.push(capturePhoto());
      await delay(420);
    }

    if(sessionId!==captureSessionId)return;
    stopCamera();
    buildControls();
    updateVersionVisibility();
    showScreen("review");
    resetIdle();
    await renderWithFade();
  }catch(err){
    if(err.message!=="cancelled"){
      stopCamera();
      alert("Please allow camera access in Safari and try again.");
      showScreen("welcome");
    }
  }
}

function buildControls(){
  $("stripStyles").innerHTML="";
  STRIP_STYLES.forEach(([k,l])=>{
    const b=document.createElement("button");
    b.className="choice"+(stripStyle===k?" active":"");
    b.textContent=l;
    b.onclick=()=>{stripStyle=k;buildControls();renderWithFade();resetIdle();};
    $("stripStyles").appendChild(b);
  });

  $("filters").innerHTML="";
  FILTERS.forEach(([k,l])=>{
    const b=document.createElement("button");
    b.className="choice"+(filter===k?" active":"");
    b.textContent=l;
    b.onclick=()=>{filter=k;buildControls();renderWithFade();resetIdle();};
    $("filters").appendChild(b);
  });

  let mv=$("magazineVariantChoices");
  if(!mv){mv=document.createElement("div");mv.id="magazineVariantChoices";mv.className="choice-row";$("magazinePanel").insertBefore(mv,$("photoPicker"));}
  mv.innerHTML="";
  [["birthday","Birthday Cover"],["fashion","Fashion Cover"]].forEach(([k,l])=>{const b=document.createElement("button");b.className="choice"+(magazineVariant===k?" active":"");b.textContent=l;b.onclick=()=>{magazineVariant=k;buildControls();renderWithFade();resetIdle();};mv.appendChild(b);});
  $("photoPicker").innerHTML="";
  photos.forEach((src,i)=>{
    const b=document.createElement("button");
    b.className="photo-thumb"+(coverIndex===i?" active":"");
    const img=document.createElement("img");
    img.src=src;
    b.appendChild(img);
    b.onclick=()=>{coverIndex=i;buildControls();renderWithFade();resetIdle();};
    $("photoPicker").appendChild(b);
  });
}
function switchMode(mode){
  if(mode==="magazine"&&!settings.magazineEnabled)return;
  if(mode==="polaroid"&&!settings.polaroidEnabled)return;
  if(mode==="grid"&&!settings.gridEnabled)return;
  if(mode==="story"&&!settings.storyEnabled)return;

  currentMode=mode;
  document.querySelectorAll(".version-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  document.querySelectorAll(".mode-panel").forEach(p=>p.classList.remove("active"));
  if(mode==="strip")$("stripPanel").classList.add("active");
  if(mode==="magazine"){
    $("magazinePanel").classList.add("active");
    const label=$("magazinePanel").querySelector(".panel-label");
    if(label)label.textContent="Pick your cover";
  }

  $("reviewHeading").textContent=({
    strip:"Your strip",
    magazine:"Magazine cover",
    polaroid:"Polaroid",
    grid:"Square grid",
    story:"Story"
  })[mode];

  renderWithFade();
  resetIdle();
}
document.querySelectorAll(".version-tab").forEach(b=>b.onclick=()=>switchMode(b.dataset.mode));

function filterCSS(){
  return {
    original:"none",
    bw:"grayscale(1) contrast(1.05)",
    warm:"sepia(.10) saturate(1.12) brightness(1.03)",
    film:"sepia(.18) saturate(.78) contrast(.97) brightness(1.03)",
    glow:"brightness(1.07) contrast(.92) saturate(.95)",
    punchy:"contrast(1.18) saturate(1.16)"
  }[filter]||"none";
}
function loadImage(src){
  return new Promise((res,rej)=>{
    const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;
  });
}
/* Preserve the original photograph framing. No artistic re-crop or face detection. */
function drawContain(ctx,img,x,y,w,h,bg="#fff"){
  ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);
  const scale=Math.min(w/img.width,h/img.height);
  const dw=img.width*scale,dh=img.height*scale;
  const dx=x+(w-dw)/2,dy=y+(h-dh)/2;
  ctx.drawImage(img,dx,dy,dw,dh);
}
async function renderWithFade(){
  const canvas=$("mainCanvas");
  canvas.classList.add("changing");
  await delay(80);
  await render();
  canvas.classList.remove("changing");
}
async function render(){
  const imgs=await Promise.all(photos.map(loadImage));
  const c=$("mainCanvas"),ctx=c.getContext("2d");
  if(currentMode==="strip")renderStrip(ctx,c,imgs);
  if(currentMode==="magazine")renderMagazine(ctx,c,imgs);
  if(currentMode==="polaroid")renderPolaroid(ctx,c,imgs);
  if(currentMode==="grid")renderGrid(ctx,c,imgs);
  if(currentMode==="story")renderStory(ctx,c,imgs);
}
function typography(){
  if(settings.theme==="romantic")return {
    serif:'Snell Roundhand,"Apple Chancery",cursive',
    mast:'Didot,"Bodoni 72",Georgia,serif',
    sans:'"Avenir Next",Arial,sans-serif'
  };
  if(settings.theme==="party")return {
    serif:'"Arial Black","Avenir Next",Arial,sans-serif',
    mast:'"Arial Black","Avenir Next",Arial,sans-serif',
    sans:'"Avenir Next",Arial,sans-serif'
  };
  return {
    serif:'Didot,"Bodoni 72",Georgia,serif',
    mast:'Didot,"Bodoni 72",Georgia,serif',
    sans:'"Avenir Next",Arial,sans-serif'
  };
}
function renderStrip(ctx,c,imgs){
  const first=imgs[0],landscape=sessionOrientation==="landscape",t=typography();

  /* Broad physical-booth proportions. The photograph is never cropped.
     The paper dimensions adapt to the session orientation. */
  const W=landscape?900:680;
  const side=14;
  const innerW=W-side*2;
  const sourceRatio=first.width/first.height;
  const naturalH=innerW/sourceRatio;
  const photoH=naturalH;
  const gap=8;
  const top=14;
  const signatureH=landscape?122:112;
  const H=Math.round(top+photoH*3+gap*2+signatureH);

  c.width=W;c.height=H;
  const dark=stripStyle==="black"||stripStyle==="film";
  const bg=stripStyle==="editorial"?"#f8f2e8":dark?"#090909":"#fff";
  const ink=dark?"#fff":"#111";
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  imgs.forEach((img,i)=>{
    const y=top+i*(photoH+gap);
    ctx.save();
    ctx.filter=filterCSS();
    drawContain(ctx,img,side,y,innerW,photoH,dark?"#111":"#f7f4ef");
    ctx.restore();
  });

  const base=top+photoH*3+gap*2;
  ctx.fillStyle=ink;ctx.textAlign="center";
  const script='Snell Roundhand,"Apple Chancery","Segoe Script",cursive';
  const signatureFont=settings.theme==="party"?t.sans:script;
  ctx.font=`400 ${landscape?34:30}px ${signatureFont}`;
  ctx.fillText(settings.stripFooter||settings.title,W/2,base+52);
  ctx.font=`700 12px ${t.sans}`;
  ctx.fillText(settings.year,W/2,base+82);
}
function drawBarcode(ctx,x,y,w,h,font){
  ctx.save();ctx.fillStyle="#fff";ctx.fillRect(x,y,w,h);ctx.strokeStyle="#111";ctx.strokeRect(x,y,w,h);ctx.fillStyle="#111";
  for(let i=0;i<24;i++){const xx=x+7+i*(w-14)/24;ctx.fillRect(xx,y+6,i%4===0?2.4:1.2,h-17);}
  ctx.font=`700 8px ${font}`;ctx.textAlign="center";ctx.fillText("026  2026",x+w/2,y+h-3);ctx.restore();
}
function renderMagazine(ctx,c,imgs){
  const img=imgs[Math.max(0,Math.min(coverIndex,imgs.length-1))];
  const landscape=sessionOrientation==="landscape";
  const t=typography();
  const W=landscape?1200:860,H=landscape?900:1180;
  c.width=W;c.height=H;
  ctx.fillStyle="#fbf7ef";ctx.fillRect(0,0,W,H);
  const script='Snell Roundhand,"Apple Chancery","Segoe Script",cursive';

  if(magazineVariant==="fashion"){
    /* Fashion cover: photograph dominates, editorial type sits over/around it. */
    ctx.save();ctx.filter=filterCSS();
    drawContain(ctx,img,22,22,W-44,H-44,"#e8e2d9");
    ctx.restore();

    ctx.fillStyle="#111";ctx.textAlign="center";
    ctx.font=`700 ${landscape?122:112}px ${t.mast}`;
    ctx.fillText((settings.magazineMasthead||"RAE").toUpperCase(),W/2,120);

    ctx.font=`700 ${landscape?16:15}px ${t.sans}`;
    ctx.textAlign="left";
    ctx.fillText(settings.magazineCaption1.toUpperCase(),44,184);
    ctx.fillText(settings.magazineCaption2.toUpperCase(),44,H-86);
    ctx.textAlign="right";
    ctx.fillText(settings.magazineCaption3.toUpperCase(),W-44,H-86);

    ctx.textAlign="left";ctx.font=`700 11px ${t.sans}`;
    ctx.fillText(`THE BIRTHDAY EDIT · ${settings.year}`,44,H-36);
    drawBarcode(ctx,W-190,H-72,142,45,t.sans);
    return;
  }

  /* Birthday cover: broad photo, script signature, restrained editorial details. */
  const photoTop=landscape?136:148;
  const photoBottom=88;
  ctx.save();ctx.filter=filterCSS();
  drawContain(ctx,img,22,photoTop,W-44,H-photoTop-photoBottom,"#e8e2d9");
  ctx.restore();

  ctx.fillStyle="#111";ctx.textAlign="center";
  ctx.font=`700 ${landscape?82:78}px ${t.mast}`;
  ctx.fillText("BIRTHDAY",W/2,78);
  ctx.font=`400 ${landscape?34:31}px ${script}`;
  ctx.fillText(settings.magazineMasthead||"Rae",W/2,116);

  ctx.font=`700 14px ${t.sans}`;ctx.textAlign="left";
  ctx.fillText(settings.magazineCaption1.toUpperCase(),42,photoTop+32);
  ctx.fillText(settings.magazineCaption2.toUpperCase(),42,H-40);
  ctx.textAlign="right";
  ctx.fillText(settings.magazineCaption3.toUpperCase(),W-42,H-40);
  drawBarcode(ctx,W-190,H-76,142,45,t.sans);
}
function renderPolaroid(ctx,c,imgs){
  const W=900,H=1200;c.width=W;c.height=H;
  const t=typography();
  ctx.fillStyle="#eee8df";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#fff";ctx.fillRect(105,65,690,1040);

  ctx.save();
  ctx.filter=filterCSS();
  drawContain(ctx,imgs[0],140,100,620,780,"#f0ece5");
  ctx.restore();

  ctx.fillStyle="#111";ctx.textAlign="center";
  ctx.font=`400 42px ${t.serif}`;
  ctx.fillText(settings.polaroidCaption,450,980);
}
function renderGrid(ctx,c,imgs){
  const W=1080,H=1080;c.width=W;c.height=H;
  const t=typography();
  ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);

  const gap=16,m=70,cell=(W-2*m-gap)/2;
  const use=[imgs[0],imgs[1],imgs[2],imgs[0]];
  use.forEach((img,i)=>{
    const x=m+(i%2)*(cell+gap),y=70+Math.floor(i/2)*(cell+gap);
    ctx.save();ctx.filter=filterCSS();
    drawContain(ctx,img,x,y,cell,cell,"#f3efe8");
    ctx.restore();
  });

  ctx.fillStyle="#111";ctx.textAlign="center";
  ctx.font=`400 24px ${t.serif}`;
  ctx.fillText(settings.gridCaption,540,1035);
}
function renderStory(ctx,c,imgs){
  const W=1080,H=1920;c.width=W;c.height=H;
  const t=typography();
  ctx.fillStyle="#111";ctx.fillRect(0,0,W,H);

  ctx.save();ctx.filter=filterCSS();
  drawContain(ctx,imgs[coverIndex],0,0,W,H,"#111");
  ctx.restore();

  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"rgba(0,0,0,.58)");
  g.addColorStop(.22,"rgba(0,0,0,0)");
  g.addColorStop(.78,"rgba(0,0,0,0)");
  g.addColorStop(1,"rgba(0,0,0,.6)");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  ctx.fillStyle="#fff";ctx.textAlign="center";
  ctx.font=`400 68px ${t.serif}`;
  ctx.fillText(settings.storyCaption,540,135);
  ctx.font=`700 22px ${t.sans}`;
  ctx.fillText(settings.year,540,1820);
}

async function canvasBlob(){return await new Promise(r=>$("mainCanvas").toBlob(r,"image/png",1));}
async function shareCurrent(){
  resetIdle();
  const blob=await canvasBlob();
  const file=new File([blob],`photo-booth-${currentMode}-${Date.now()}.png`,{type:"image/png"});
  try{
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:settings.title,text:settings.title});
    }else{
      await saveCurrent();
    }
  }catch(e){}
}
async function saveCurrent(){
  resetIdle();
  const blob=await canvasBlob();
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`photo-booth-${currentMode}-${Date.now()}.png`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resetIdle(){
  clearTimeout(idleTimer);
  if($("review").classList.contains("active")){
    idleTimer=setTimeout(async()=>{
      photos=[];currentMode="strip";stripStyle="white";filter="original";coverIndex=0;magazineVariant="birthday";
      showScreen("timeout");
      await delay(700);
      showScreen("welcome");
    },120000);
  }
}

$("startBtn").onclick=beginSession;
$("cancelCapture").onclick=cancelCapture;
$("retakeBtn").onclick=beginSession;
$("nextGuestBtn").onclick=beginSession;
$("shareBtn").onclick=shareCurrent;
$("saveBtn").onclick=saveCurrent;

$("openSettings").onclick=()=>{applySettings();showScreen("settings");setTimeout(renderAdminPreview,0);};
$("closeSettings").onclick=()=>showScreen("welcome");


function draft(){
  return {title:$("setTitle").value||DEFAULTS.title,year:$("setYear").value,stripFooter:$("setStripFooter").value,
  theme:$("setTheme").value,mast:$("setMagazineMasthead").value||"RAE",c1:$("setMagazineCaption1").value,c2:$("setMagazineCaption2").value,c3:$("setMagazineCaption3").value};
}
function renderAdminPreview(){
  const d=draft(),c=$("adminPreviewCanvas"),x=c.getContext("2d"),land=adminOrientation==="landscape";
  const W=land?620:410,H=land?440:600;c.width=W;c.height=H;x.fillStyle="#fbf7ef";x.fillRect(0,0,W,H);
  const serif='Didot,"Bodoni 72",Georgia,serif',sans='"Avenir Next",Arial,sans-serif',script='Snell Roundhand,"Apple Chancery","Segoe Script",cursive';
  if(adminPreviewType==="strip"){
    const m=15,g=6,top=14,sig=72,ph=(H-top-sig-g*2)/3;
    for(let i=0;i<3;i++){x.fillStyle="#e2dcd3";x.fillRect(m,top+i*(ph+g),W-m*2,ph);}
    x.fillStyle="#111";x.textAlign="center";x.font=`400 ${land?23:20}px ${d.theme==="party"?sans:script}`;x.fillText(d.stripFooter||d.title,W/2,H-38);
    x.font=`700 9px ${sans}`;x.fillText(d.year,W/2,H-18);return;
  }
  if(adminPreviewType==="birthday"){
    x.fillStyle="#111";x.textAlign="center";x.font=`700 ${land?43:38}px ${serif}`;x.fillText("BIRTHDAY",W/2,46);
    x.font=`400 ${land?20:18}px ${script}`;x.fillText(d.mast,W/2,70);
    x.fillStyle="#e2dcd3";x.fillRect(16,86,W-32,H-135);
    x.fillStyle="#111";x.font=`700 8px ${sans}`;x.textAlign="left";x.fillText((d.c1||"").toUpperCase(),27,106);x.fillText((d.c2||"").toUpperCase(),27,H-24);x.textAlign="right";x.fillText((d.c3||"").toUpperCase(),W-27,H-24);return;
  }
  x.fillStyle="#e2dcd3";x.fillRect(15,15,W-30,H-30);x.fillStyle="#111";x.textAlign="center";x.font=`700 ${land?58:48}px ${serif}`;x.fillText(d.mast.toUpperCase(),W/2,68);
  x.font=`700 8px ${sans}`;x.textAlign="left";x.fillText((d.c1||"").toUpperCase(),28,100);x.fillText((d.c2||"").toUpperCase(),28,H-40);x.textAlign="right";x.fillText((d.c3||"").toUpperCase(),W-28,H-40);
}
document.querySelectorAll(".admin-p-tab").forEach(b=>b.addEventListener("click",()=>{adminPreviewType=b.dataset.p;document.querySelectorAll(".admin-p-tab").forEach(q=>q.classList.toggle("active",q===b));renderAdminPreview();}));
document.querySelectorAll(".admin-o-tab").forEach(b=>b.addEventListener("click",()=>{adminOrientation=b.dataset.o;document.querySelectorAll(".admin-o-tab").forEach(q=>q.classList.toggle("active",q===b));renderAdminPreview();}));
["setTitle","setYear","setStripFooter","setTheme","setMagazineMasthead","setMagazineCaption1","setMagazineCaption2","setMagazineCaption3"].forEach(id=>$(id).addEventListener("input",renderAdminPreview));

$("saveSettings").onclick=()=>{
  settings={
    ...settings,
    title:$("setTitle").value.trim()||DEFAULTS.title,
    year:$("setYear").value.trim(),
    stripFooter:$("setStripFooter").value.trim(),
    theme:$("setTheme").value,
    magazineMasthead:$("setMagazineMasthead").value.trim()||DEFAULTS.magazineMasthead,
    magazineCaption1:$("setMagazineCaption1").value.trim(),
    magazineCaption2:$("setMagazineCaption2").value.trim(),
    magazineCaption3:$("setMagazineCaption3").value.trim(),
    polaroidCaption:$("setPolaroidCaption").value.trim(),
    gridCaption:$("setGridCaption").value.trim(),
    storyCaption:$("setStoryCaption").value.trim(),
    accent:$("setAccent").value,
    countdown:Number($("setCountdown").value),
    mirror:$("setMirror").checked,
    prompts:$("setPrompts").checked,
    shutter:$("setShutter").checked,
    flash:$("setFlash").checked,
    magazineEnabled:$("setMagazineEnabled").checked,
    polaroidEnabled:$("setPolaroidEnabled").checked,
    gridEnabled:$("setGridEnabled").checked,
    storyEnabled:$("setStoryEnabled").checked
  };
  persist();applySettings();showScreen("welcome");
};
$("resetSettings").onclick=()=>{
  settings={...DEFAULTS};
  persist();applySettings();
};

applySettings();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
