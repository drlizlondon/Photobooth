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
  if(mode==="magazine")$("magazinePanel").classList.add("active");

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
  const W=720,H=1680;c.width=W;c.height=H;
  const dark=stripStyle==="black"||stripStyle==="film";
  const bg=stripStyle==="editorial"?"#f7f1e8":dark?"#090909":"#fff";
  const ink=dark?"#fff":"#111";
  const t=typography();

  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=ink;ctx.textAlign="center";

  ctx.font=`400 34px ${t.serif}`;
  ctx.fillText(settings.title,360,54);
  ctx.font=`700 14px ${t.sans}`;
  ctx.globalAlpha=.66;
  ctx.fillText(settings.year,360,84);
  ctx.globalAlpha=1;

  const mx=42,gap=10,top=112,bottom=76,pw=W-2*mx,ph=(H-top-bottom-gap*2)/3;
  imgs.forEach((img,i)=>{
    const y=top+i*(ph+gap);
    ctx.save();
    ctx.filter=filterCSS();
    drawContain(ctx,img,mx,y,pw,ph,dark?"#111":"#f7f4ef");
    ctx.restore();
  });

  ctx.fillStyle=ink;
  ctx.font=`400 15px ${t.serif}`;
  ctx.fillText(settings.stripFooter,360,H-34);
}
function renderMagazine(ctx,c,imgs){
  const W=900,H=1200;c.width=W;c.height=H;
  const t=typography();
  const img=imgs[coverIndex];

  ctx.fillStyle=settings.theme==="luxury"?"#fbf7ef":"#fff";
  ctx.fillRect(0,0,W,H);

  /* Keep the selected photo intact within the cover window. */
  ctx.save();
  ctx.filter=filterCSS();
  drawContain(ctx,img,48,126,804,950,"#ece7df");
  ctx.restore();

  ctx.fillStyle="#111";
  ctx.textAlign="center";

  const mastSize=settings.theme==="party"?92:110;
  ctx.font=`700 ${mastSize}px ${t.mast}`;
  ctx.fillText(settings.magazineMasthead,450,96);

  ctx.textAlign="left";
  ctx.font=`700 17px ${t.sans}`;
  ctx.letterSpacing="2px";
  ctx.fillText(settings.magazineCaption1.toUpperCase(),68,170);

  ctx.font=`700 16px ${t.sans}`;
  ctx.fillText(settings.magazineCaption2.toUpperCase(),68,1045);

  ctx.textAlign="right";
  ctx.fillText(settings.magazineCaption3.toUpperCase(),832,1045);

  ctx.textAlign="left";
  ctx.font=`700 13px ${t.sans}`;
  ctx.fillText(`ISSUE 026  •  ${settings.year}`,68,1128);

  /* Faux barcode and issue details make it read as a real magazine. */
  const bx=690,by=1090,bw=145,bh=48;
  ctx.fillStyle="#fff";ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle="#111";ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);
  ctx.fillStyle="#111";
  for(let i=0;i<28;i++){
    const x=bx+8+i*4.4;
    const w=(i%3===0?2.2:1.2);
    ctx.fillRect(x,by+7,w,bh-18);
  }
  ctx.font=`700 9px ${t.sans}`;
  ctx.textAlign="center";
  ctx.fillText("026  2026  08",bx+bw/2,by+bh-4);
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
      photos=[];
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

$("openSettings").onclick=()=>{applySettings();showScreen("settings");};
$("closeSettings").onclick=()=>showScreen("welcome");

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
