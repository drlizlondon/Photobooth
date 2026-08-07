const DEFAULTS = {
  title: "Rae's 26th Birthday",
  year: "2026",
  footer: "♡ 2026 ♡",
  accent: "#d9668c",
  countdown: 3,
  photoCount: 3,
  camera: "user",
  layout: "white",
  mirror: true,
  flash: true,
  sound: false,
  prompts: true,
  confetti: true,
  gold: true
};

const LAYOUTS = [
  ["white","White"],
  ["black","Black"],
  ["magazine","Magazine"],
  ["editorial","Editorial"],
  ["film","Film"]
];

const FILTERS = [
  ["original","Original"],
  ["bw","B&W"],
  ["vintage","Film"],
  ["warm","Warm"],
  ["glow","Glow"],
  ["contrast","Punchy"],
  ["matte","Matte"],
  ["party","Party"]
];

const POSE_PROMPTS = [
  "Get closer",
  "Cover star",
  "Serious face",
  "Birthday chaos",
  "One for the group chat",
  "Give us drama",
  "Best side",
  "Laugh like you mean it",
  "Main character energy",
  "One for Rae"
];

let settings = loadSettings();
let stream = null;
let photos = [];
let selectedLayout = settings.layout;
let selectedFilter = "original";
let goldEdition = false;

const $ = id => document.getElementById(id);
const screens = ["idleScreen","cameraScreen","developScreen","reviewScreen","settingsScreen"];

function loadSettings(){
  try{return {...DEFAULTS,...JSON.parse(localStorage.getItem("raeBoothSettingsV2")||"{}")};}
  catch{return {...DEFAULTS};}
}
function persistSettings(){localStorage.setItem("raeBoothSettingsV2",JSON.stringify(settings));}
function showScreen(id){screens.forEach(s=>$(s).classList.toggle("active",s===id));}
function applySettingsToUI(){
  $("idleTitle").textContent=settings.title;
  $("idleYear").textContent=settings.year;
  document.documentElement.style.setProperty("--accent",settings.accent);
  $("settingTitle").value=settings.title;
  $("settingYear").value=settings.year;
  $("settingFooter").value=settings.footer;
  $("settingAccent").value=settings.accent;
  $("settingCountdown").value=String(settings.countdown);
  $("settingPhotoCount").value=String(settings.photoCount);
  $("settingCamera").value=settings.camera;
  $("settingLayout").value=settings.layout;
  $("settingMirror").checked=settings.mirror;
  $("settingFlash").checked=settings.flash;
  $("settingSound").checked=settings.sound;
  $("settingPrompts").checked=settings.prompts;
  $("settingConfetti").checked=settings.confetti;
  $("settingGold").checked=settings.gold;
}

async function startCamera(){
  stopCamera();
  try{
    stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:settings.camera,width:{ideal:1920},height:{ideal:1080}},
      audio:false
    });
    $("video").srcObject=stream;
    $("video").classList.toggle("mirrored",settings.mirror&&settings.camera==="user");
    await $("video").play();
  }catch(e){
    alert("Camera access is needed. Please allow camera access in Safari and try again.");
    showScreen("idleScreen");
    throw e;
  }
}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
const delay=ms=>new Promise(r=>setTimeout(r,ms));

function showPrompt(index){
  if(!settings.prompts){$("posePrompt").classList.remove("show");return;}
  const prompt=POSE_PROMPTS[Math.floor(Math.random()*POSE_PROMPTS.length)];
  $("posePrompt").textContent=prompt;
  $("posePrompt").classList.add("show");
}
async function beep(){
  if(!settings.sound)return;
  try{
    const c=new (window.AudioContext||window.webkitAudioContext)();
    const o=c.createOscillator(),g=c.createGain();
    o.frequency.value=480;g.gain.value=.035;o.connect(g);g.connect(c.destination);
    o.start();o.stop(c.currentTime+.07);
  }catch{}
}
async function runCountdown(){
  for(let n=settings.countdown;n>=1;n--){
    $("countdown").textContent=n;
    beep();await delay(820);
    $("countdown").textContent="";
    await delay(180);
  }
}
function capturePhoto(){
  const v=$("video"),c=$("captureCanvas"),w=v.videoWidth||1280,h=v.videoHeight||720;
  c.width=w;c.height=h;
  const ctx=c.getContext("2d");
  ctx.save();
  if(settings.mirror&&settings.camera==="user"){ctx.translate(w,0);ctx.scale(-1,1);}
  ctx.drawImage(v,0,0,w,h);ctx.restore();
  if(settings.flash){
    $("flash").classList.add("on");
    setTimeout(()=>$("flash").classList.remove("on"),110);
  }
  return c.toDataURL("image/jpeg",.95);
}

async function startSequence(){
  photos=[];goldEdition=false;
  showScreen("cameraScreen");
  await startCamera();await delay(650);

  for(let i=0;i<settings.photoCount;i++){
    $("shotProgress").textContent=`PHOTO ${i+1} / ${settings.photoCount}`;
    showPrompt(i);
    await delay(900);
    $("posePrompt").classList.remove("show");
    await runCountdown();
    photos.push(capturePhoto());
    await delay(600);
  }

  stopCamera();
  goldEdition=settings.gold && Math.random()<0.10;
  selectedLayout=settings.layout;
  selectedFilter="original";

  showScreen("developScreen");
  await delay(1850);

  buildOptionButtons();
  showScreen("reviewScreen");
  await renderStrip();
  $("goldBadge").classList.toggle("show",goldEdition);
  if(settings.confetti)launchConfetti();
}

function buildOptionButtons(){
  $("layoutOptions").innerHTML="";
  LAYOUTS.forEach(([key,label])=>{
    const b=document.createElement("button");
    b.className=`layout-choice ${key}${selectedLayout===key?" active":""}`;
    b.title=label;
    b.setAttribute("aria-label",label);
    b.onclick=()=>{selectedLayout=key;buildOptionButtons();renderStrip();};
    $("layoutOptions").appendChild(b);
  });
  $("filterOptions").innerHTML="";
  FILTERS.forEach(([key,label])=>{
    const b=document.createElement("button");
    b.className=`filter-choice${selectedFilter===key?" active":""}`;
    b.textContent=label;
    b.onclick=()=>{selectedFilter=key;buildOptionButtons();renderStrip();};
    $("filterOptions").appendChild(b);
  });
}
function launchConfetti(){
  const layer=$("confettiLayer");layer.innerHTML="";
  for(let i=0;i<34;i++){
    const p=document.createElement("span");
    p.className="confetti";
    p.style.left=Math.random()*100+"%";
    p.style.animationDelay=(Math.random()*.7)+"s";
    p.style.opacity=.55+Math.random()*.45;
    p.style.transform=`rotate(${Math.random()*180}deg)`;
    layer.appendChild(p);
  }
  setTimeout(()=>layer.innerHTML="",3800);
}

function filterString(key){
  return {
    original:"none",
    bw:"grayscale(1) contrast(1.07)",
    vintage:"sepia(.22) saturate(.72) contrast(.96) brightness(1.04)",
    warm:"sepia(.10) saturate(1.12) brightness(1.03)",
    glow:"brightness(1.08) contrast(.91) saturate(.93)",
    contrast:"contrast(1.22) saturate(1.05)",
    matte:"contrast(.87) brightness(1.07) saturate(.82)",
    party:"saturate(1.42) contrast(1.08)"
  }[key]||"none";
}
function loadImage(src){
  return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});
}
function drawCover(ctx,img,x,y,w,h){
  const scale=Math.max(w/img.width,h/img.height);
  const sw=w/scale,sh=h/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;
  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
function fitFont(ctx,text,max,start,font){
  let s=start;
  while(s>20){ctx.font=`400 ${s}px ${font}`;if(ctx.measureText(text).width<=max)break;s-=2;}
  return s;
}
async function renderStrip(){
  const canvas=$("outputCanvas"),ctx=canvas.getContext("2d");
  const imgs=await Promise.all(photos.map(loadImage));
  const W=720,H=1800;
  canvas.width=W;canvas.height=H;

  const serif='Didot, "Bodoni 72", Georgia, serif';
  const sans='"Avenir Next", Arial, sans-serif';
  const isDark=selectedLayout==="black"||selectedLayout==="film";
  const bg=goldEdition?"#f2e8cf":(selectedLayout==="editorial"?"#f4efe6":isDark?"#0a0a0a":"#ffffff");
  const ink=isDark?"#ffffff":"#111111";
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  if(selectedLayout==="magazine"){
    const img=imgs[0];
    ctx.save();ctx.filter=filterString(selectedFilter);
    drawCover(ctx,img,44,140,632,1510);ctx.restore();
    ctx.strokeStyle="#111";ctx.lineWidth=7;ctx.strokeRect(44,140,632,1510);

    ctx.fillStyle="#111";ctx.textAlign="center";
    ctx.font=`700 82px ${serif}`;ctx.fillText("BIRTHDAY",360,96);

    let s=fitFont(ctx,settings.title,540,34,serif);
    ctx.textAlign="left";ctx.font=`italic 400 ${s}px ${serif}`;ctx.fillText(settings.title,72,202);
    ctx.font=`700 20px ${sans}`;ctx.fillText(settings.year,72,240);

    ctx.textAlign="right";ctx.font=`700 17px ${sans}`;ctx.fillText("SPECIAL EDITION",648,238);
    ctx.textAlign="left";ctx.font=`700 18px ${sans}`;ctx.fillText("BEST DRESSED",68,1570);
    ctx.textAlign="right";ctx.fillText("ICONIC MOMENTS",652,1570);

    ctx.textAlign="center";ctx.font=`700 16px ${sans}`;
    ctx.fillText(goldEdition?"GOLD EDITION • 2026":"RAE • 2026",360,1735);
    return;
  }

  const marginX=selectedLayout==="editorial"?70:54;
  const gap=16;
  const header=205;
  const footer=130;
  const photoW=W-(marginX*2);
  const available=H-header-footer-gap*(imgs.length-1);
  const ph=available/imgs.length;

  if(selectedLayout==="film"){
    for(let y=44;y<H-44;y+=72){
      ctx.fillStyle="#eee";
      ctx.fillRect(18,y,22,38);ctx.fillRect(W-40,y,22,38);
    }
  }

  ctx.fillStyle=ink;ctx.textAlign="center";
  let size=fitFont(ctx,settings.title,590,44,serif);
  ctx.font=`400 ${size}px ${serif}`;ctx.fillText(settings.title,360,78);
  ctx.font=`700 18px ${sans}`;ctx.globalAlpha=.72;ctx.fillText(settings.year,360,118);
  ctx.globalAlpha=.5;ctx.font=`700 12px ${sans}`;ctx.fillText(goldEdition?"GOLD EDITION":"PHOTO BOOTH",360,155);
  ctx.globalAlpha=1;

  imgs.forEach((img,i)=>{
    const y=header+i*(ph+gap);
    ctx.save();ctx.filter=filterString(selectedFilter);drawCover(ctx,img,marginX,y,photoW,ph);ctx.restore();
  });

  ctx.fillStyle=ink;ctx.textAlign="center";ctx.font=`700 16px ${sans}`;
  ctx.fillText(settings.footer||`♡ ${settings.year} ♡`,360,H-68);
}

async function canvasBlob(){return await new Promise(r=>$("outputCanvas").toBlob(r,"image/png",1));}
async function shareStrip(){
  const blob=await canvasBlob();
  const file=new File([blob],`rae-photo-booth-${Date.now()}.png`,{type:"image/png"});
  try{
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:settings.title,text:settings.title});
    }else{await saveStrip();alert("Direct file sharing is not available here, so the strip was saved instead.");}
  }catch(e){if(e.name!=="AbortError")alert("Sharing was unavailable. You can still save the image.");}
}
async function saveStrip(){
  const blob=await canvasBlob(),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=`rae-photo-booth-${Date.now()}.png`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function resetGuest(){photos=[];goldEdition=false;showScreen("idleScreen");}

$("startButton").onclick=startSequence;
$("cancelCapture").onclick=()=>{stopCamera();showScreen("idleScreen");};
$("retakeButton").onclick=startSequence;
$("nextGuestButton").onclick=resetGuest;
$("shareButton").onclick=shareStrip;
$("saveButton").onclick=saveStrip;
$("adminButton").onclick=()=>{applySettingsToUI();showScreen("settingsScreen");};
$("closeSettings").onclick=()=>showScreen("idleScreen");

$("saveSettings").onclick=()=>{
  settings={
    ...settings,
    title:$("settingTitle").value.trim()||DEFAULTS.title,
    year:$("settingYear").value.trim(),
    footer:$("settingFooter").value.trim(),
    accent:$("settingAccent").value,
    countdown:Number($("settingCountdown").value),
    photoCount:Number($("settingPhotoCount").value),
    camera:$("settingCamera").value,
    layout:$("settingLayout").value,
    mirror:$("settingMirror").checked,
    flash:$("settingFlash").checked,
    sound:$("settingSound").checked,
    prompts:$("settingPrompts").checked,
    confetti:$("settingConfetti").checked,
    gold:$("settingGold").checked
  };
  persistSettings();applySettingsToUI();showScreen("idleScreen");
};
$("resetSettings").onclick=()=>{settings={...DEFAULTS};persistSettings();applySettingsToUI();};

applySettingsToUI();
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));}
