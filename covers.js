/* covers.js — editorial magazine cover engine.
   Four templates, each laid out for portrait and landscape from a shared
   copy model. Everything is measured off the canvas, not hard-coded, so a
   longer masthead or a brighter photo re-flows instead of colliding. */
(function(global){
"use strict";

const FONT={
  serif:'Didot,"Bodoni 72","Bodoni MT","Playfair Display",Georgia,"Times New Roman",serif',
  sans:'"Avenir Next",Avenir,"Helvetica Neue",Helvetica,Arial,sans-serif',
  script:'"Snell Roundhand","Apple Chancery","Segoe Script","Brush Script MT",cursive'
};

const TEMPLATES=[
  {key:"editorial",  label:"Editorial",   hint:"Full-bleed fashion"},
  {key:"noir",       label:"Noir",        hint:"Deep mono drama"},
  {key:"celebration",label:"Celebration", hint:"Warm, scripted"},
  {key:"press",      label:"Press",       hint:"Bold sidebar"}
];

/* Magazine trim: 1.3 : 1, flipped for landscape sessions. */
const RATIO=1.3;
function coverSize(orientation,base){
  const b=base||1200;
  return orientation==="landscape"?{width:Math.round(b*RATIO),height:b}:{width:b,height:Math.round(b*RATIO)};
}

/* ---------- copy ---------- */

const ONES=["ZERO","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
const TENS=["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];
function numberWords(n){
  n=Number(n);
  if(!Number.isFinite(n)||n<0||n>99)return String(n||"");
  if(n<20)return ONES[n];
  const o=n%10;
  return o?TENS[Math.floor(n/10)]+" "+ONES[o]:TENS[Math.floor(n/10)];
}
function ordinal(n){
  const v=n%100,suf=["th","st","nd","rd"];
  return n+(suf[(v-20)%10]||suf[v]||suf[0]);
}
function firstName(title){
  const m=String(title||"").trim().match(/^([\p{L}][\p{L}'’-]*)/u);
  if(!m)return "";
  return m[1].replace(/['’]s$/i,"");
}
function eventAge(title){
  const m=String(title||"").match(/\b(\d{1,3})\s*(?:st|nd|rd|th)\b/i)||String(title||"").match(/\b(\d{1,2})\b/);
  if(!m)return null;
  const n=Number(m[1]);
  return n>0&&n<=120?n:null;
}
function occasionWord(title){
  const words=String(title||"").trim().split(/\s+/).filter(Boolean);
  const last=words[words.length-1]||"";
  return /^[\p{L}]{4,}$/u.test(last)?last.toUpperCase():"CELEBRATION";
}

/* Defaults generated from the event title, so a brand new event gets a
   finished-looking cover before anyone opens the admin panel. */
function derive(s){
  const name=firstName(s&&s.eventTitle)||"TONIGHT";
  const age=eventAge(s&&s.eventTitle);
  const year=String((s&&s.date)||"").trim();
  return {
    masthead:name.toUpperCase(),
    occasion:occasionWord(s&&s.eventTitle),
    script:age?`${name}'s ${ordinal(age)}`:name,
    skyline1:age?`ISSUE ${age}`:"SPECIAL ISSUE",
    skyline2:year,
    skyline3:"COLLECTOR'S EDITION",
    f1Title:"ONE NIGHT ONLY",
    f1Dek:"A night. A legend. A memory forever.",
    f2Title:"Confidence is the best outfit",
    f2Dek:"Style. Energy. Era.",
    f3Title:"The next chapter",
    f3Dek:"New goals. Bigger dreams. Unstoppable.",
    big:age?numberWords(age):name.toUpperCase(),
    bigDek:age?"Not just an age. A whole vibe.":"One night. One story.",
    footer:"Confidence · Beauty · Energy",
    barcode:(age?String(age).padStart(3,"0"):"001")+"  "+(year||"")
  };
}
const COPY_KEYS=["masthead","occasion","script","skyline1","skyline2","skyline3","f1Title","f1Dek","f2Title","f2Dek","f3Title","f3Dek","big","bigDek","footer","barcode"];
function copyFor(s){
  const d=derive(s),out={};
  COPY_KEYS.forEach(k=>{
    const stored=s&&s["cover"+k.charAt(0).toUpperCase()+k.slice(1)];
    const v=typeof stored==="string"?stored.trim():"";
    out[k]=v||d[k]||"";
  });
  return out;
}

/* ---------- text ---------- */

function setFont(ctx,weight,size,family){ctx.font=`${weight} ${Math.max(1,Math.round(size*10)/10)}px ${family}`;}
function trackedWidth(ctx,text,track){
  const chars=Array.from(String(text||""));
  if(!chars.length)return 0;
  let w=0;for(const c of chars)w+=ctx.measureText(c).width+track;
  return w-track;
}
function drawTracked(ctx,text,x,y,track,align){
  const chars=Array.from(String(text||""));
  if(!chars.length)return 0;
  const w=trackedWidth(ctx,text,track);
  let cx=align==="center"?x-w/2:align==="right"?x-w:x;
  const prev=ctx.textAlign;
  ctx.textAlign="left";
  for(const c of chars){ctx.fillText(c,cx,y);cx+=ctx.measureText(c).width+track;}
  ctx.textAlign=prev;
  return w;
}
function fitTracked(ctx,text,maxW,startSize,family,weight,trackEm,minSize){
  let size=startSize;
  for(let i=0;i<80;i++){
    setFont(ctx,weight,size,family);
    if(trackedWidth(ctx,text,size*trackEm)<=maxW||size<=minSize)break;
    size=Math.max(minSize,size*0.95);
  }
  setFont(ctx,weight,size,family);
  return size;
}
function wrapTracked(ctx,text,maxW,track){
  const words=String(text||"").split(/\s+/).filter(Boolean);
  const lines=[];let line="";
  for(const w of words){
    const test=line?line+" "+w:w;
    if(line&&trackedWidth(ctx,test,track)>maxW){lines.push(line);line=w;}
    else line=test;
  }
  if(line)lines.push(line);
  return lines;
}
/* Shrink until the text fits both the width and the line budget. */
function fitBlock(ctx,text,maxW,startSize,family,weight,trackEm,maxLines,minSize){
  let size=startSize,lines=[],track=0;
  for(let i=0;i<80;i++){
    setFont(ctx,weight,size,family);
    track=size*trackEm;
    lines=wrapTracked(ctx,text,maxW,track);
    const widest=lines.reduce((m,l)=>Math.max(m,trackedWidth(ctx,l,track)),0);
    if((lines.length<=maxLines&&widest<=maxW)||size<=minSize)break;
    size=Math.max(minSize,size*0.94);
  }
  setFont(ctx,weight,size,family);
  return {size,track,lines:lines.slice(0,maxLines)};
}
function drawLines(ctx,lines,x,y,lineH,track,align){
  lines.forEach((l,i)=>drawTracked(ctx,l,x,y+i*lineH,track,align));
}

/* ---------- image + light ---------- */

function drawPhotoCover(ctx,img,x,y,w,h,anchorY){
  const iw=img.width||img.videoWidth||1,ih=img.height||img.videoHeight||1;
  const scale=Math.max(w/iw,h/ih);
  const sw=w/scale,sh=h/scale;
  ctx.drawImage(img,(iw-sw)/2,(ih-sh)*(anchorY===undefined?0.4:anchorY),sw,sh,x,y,w,h);
}
let sampler=null;
/* Average luminance of a region of the canvas, read through a 24px proxy
   so this stays cheap on an iPad. */
function regionLuma(ctx,x,y,w,h){
  try{
    x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));
    w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
    if(!sampler){sampler=document.createElement("canvas");sampler.width=24;sampler.height=24;}
    const sc=sampler.getContext("2d",{willReadFrequently:true});
    sc.clearRect(0,0,24,24);
    sc.drawImage(ctx.canvas,x,y,w,h,0,0,24,24);
    const d=sc.getImageData(0,0,24,24).data;
    let sum=0;
    for(let i=0;i<d.length;i+=4)sum+=(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])/255;
    return sum/(d.length/4);
  }catch(e){return 0.5;}
}
/* Type lives in the outer thirds of a band; a dark subject in the middle
   must not average the scrim down and wash that type out. */
function edgeLuma(L,edge,depth){
  const {ctx,W,H}=L;
  if(edge==="top")return Math.max(regionLuma(ctx,0,0,W*0.42,depth),regionLuma(ctx,W*0.58,0,W*0.42,depth));
  if(edge==="bottom")return Math.max(regionLuma(ctx,0,H-depth,W*0.42,depth),regionLuma(ctx,W*0.58,H-depth,W*0.42,depth));
  if(edge==="left")return regionLuma(ctx,0,H*0.3,depth,H*0.4);
  return regionLuma(ctx,W-depth,H*0.3,depth,H*0.4);
}
/* Bright photo -> heavier scrim, so white type never washes out. */
function adapt(luma,min,max){
  const t=Math.min(1,Math.max(0,(luma-0.28)/0.44));
  return min+(max-min)*t;
}
function bandScrim(L,edge,depth,alpha){
  const {ctx,W,H}=L;
  let g;
  if(edge==="top")g=ctx.createLinearGradient(0,0,0,depth);
  else if(edge==="bottom")g=ctx.createLinearGradient(0,H,0,H-depth);
  else if(edge==="left")g=ctx.createLinearGradient(0,0,depth,0);
  else g=ctx.createLinearGradient(W,0,W-depth,0);
  g.addColorStop(0,`rgba(0,0,0,${alpha})`);
  g.addColorStop(0.45,`rgba(0,0,0,${alpha*0.5})`);
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.save();ctx.fillStyle=g;
  if(edge==="top")ctx.fillRect(0,0,W,depth);
  else if(edge==="bottom")ctx.fillRect(0,H-depth,W,depth);
  else if(edge==="left")ctx.fillRect(0,0,depth,H);
  else ctx.fillRect(W-depth,0,depth,H);
  ctx.restore();
}
function vignette(ctx,W,H,a){
  const g=ctx.createRadialGradient(W/2,H*0.44,Math.min(W,H)*0.3,W/2,H*0.5,Math.max(W,H)*0.76);
  g.addColorStop(0,"rgba(0,0,0,0)");
  g.addColorStop(1,`rgba(0,0,0,${a})`);
  ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
}
let grainTile=null;
function grain(ctx,W,H,alpha){
  try{
    if(!grainTile){
      grainTile=document.createElement("canvas");grainTile.width=grainTile.height=110;
      const g=grainTile.getContext("2d"),d=g.createImageData(110,110);
      for(let i=0;i<d.data.length;i+=4){
        const v=128+(Math.random()*2-1)*54;
        d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;
      }
      g.putImageData(d,0,0);
    }
    const p=ctx.createPattern(grainTile,"repeat");
    if(!p)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation="overlay";
    ctx.fillStyle=p;ctx.fillRect(0,0,W,H);ctx.restore();
  }catch(e){}
}
/* A feathered pool of shade behind one block of type. Reads as lighting
   falloff rather than a box, and rescues display type that lands on a
   bright part of the photo. */
function softPlate(L,x,y,w,h,alpha){
  const {ctx}=L;
  const cx=x+w/2,cy=y+h/2,rx=w*0.82,ry=Math.max(1,h*0.95);
  ctx.save();
  ctx.translate(cx,cy);ctx.scale(rx/ry,1);
  /* Flat through the type, feathered only outside it. */
  const g=ctx.createRadialGradient(0,0,ry*0.1,0,0,ry);
  g.addColorStop(0,`rgba(0,0,0,${alpha})`);
  g.addColorStop(0.62,`rgba(0,0,0,${alpha*0.86})`);
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g;ctx.fillRect(-ry,-ry,ry*2,ry*2);
  ctx.restore();
}
function plateIfBright(L,x,y,w,h,maxAlpha){
  if(w<=0||h<=0)return;
  const l=regionLuma(L.ctx,x,y,w,h);
  if(l<0.33)return;
  softPlate(L,x,y,w,h,adapt(l,0.14,maxAlpha));
}
function wash(ctx,W,H,color,alpha,mode){
  ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation=mode||"overlay";
  ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.restore();
}
function paintPhoto(L,x,y,w,h,grade,anchorY){
  const {ctx}=L;
  ctx.save();
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.fillStyle="#0d0d0d";ctx.fillRect(x,y,w,h);
  const extra=L.photoFilter&&L.photoFilter!=="none"?L.photoFilter:"";
  const f=[grade,extra].filter(Boolean).join(" ");
  if(f)ctx.filter=f;
  if(L.img)drawPhotoCover(ctx,L.img,x,y,w,h,anchorY);
  ctx.restore();
}
function hairline(ctx,x,y,w,thick,alpha){
  ctx.save();ctx.globalAlpha=alpha===undefined?0.8:alpha;
  ctx.fillRect(x,y,w,Math.max(1,thick));ctx.restore();
}
function drawBarcode(ctx,x,y,w,h,caption){
  ctx.save();
  ctx.fillStyle="#ffffff";ctx.fillRect(x,y,w,h);
  const pad=w*0.05,top=y+h*0.13,barH=h*0.58,end=x+w-pad;
  let seed=7;for(const ch of String(caption||"026"))seed=(seed*31+ch.charCodeAt(0))%99991;
  let cx=x+pad;
  ctx.fillStyle="#111111";
  while(cx<end-1){
    seed=(seed*1103515245+12345)%2147483648;
    const bw=Math.max(1,1+(seed%3)*w*0.0055);
    const gap=Math.max(1,1+((seed>>7)%3)*w*0.005);
    if(cx+bw>end)break;
    ctx.fillRect(cx,top,bw,barH);
    cx+=bw+gap;
  }
  setFont(ctx,700,Math.max(7,h*0.18),FONT.sans);
  ctx.textAlign="center";
  ctx.fillText(String(caption||""),x+w/2,y+h-h*0.09);
  ctx.restore();
}

/* A kicker + rule + sub-line unit. Returns the baseline it ended on. */
function featureBlock(L,o){
  const {ctx,u}=L;
  ctx.fillStyle=o.ink;
  const kick=fitBlock(ctx,(o.kicker||"").toUpperCase(),o.w,o.kickerSize||42*u,FONT.serif,400,0.035,o.kickerLines||3,15*u);
  const kLH=kick.size*1.03;
  drawLines(ctx,kick.lines,o.x,o.y,kLH,kick.track,o.align);
  let y=o.y+(kick.lines.length-1)*kLH;
  if(o.rule!==false){
    const rw=o.ruleW||52*u;
    y+=kick.size*0.44;                 /* clear the descenders */
    hairline(ctx,o.align==="right"?o.x-rw:o.align==="center"?o.x-rw/2:o.x,y,rw,1.4*u,0.72);
  }
  if(o.dek){
    const dek=fitBlock(ctx,o.dek.toUpperCase(),o.w,o.dekSize||15*u,FONT.sans,700,0.14,3,9*u);
    const dLH=dek.size*1.65;
    y+=(o.rule===false?kick.size*0.36:20*u)+dek.size;
    ctx.fillStyle=o.ink;
    drawLines(ctx,dek.lines,o.x,y,dLH,dek.track,o.align);
    y+=(dek.lines.length-1)*dLH;
  }
  return y;
}

/* ---------- templates ---------- */

function tplEditorial(L){
  const {ctx,W,H,u,M,land,copy}=L;
  const ink="#ffffff";
  paintPhoto(L,0,0,W,H,"contrast(1.06) saturate(0.93) brightness(1.02)",land?0.42:0.34);

  const topH=land?H*0.38:H*0.32,botH=land?H*0.46:H*0.44;
  bandScrim(L,"top",topH,adapt(edgeLuma(L,"top",topH*0.72),0.18,0.58));
  bandScrim(L,"bottom",botH,adapt(edgeLuma(L,"bottom",botH),0.24,0.68));
  bandScrim(L,"left",W*0.36,adapt(edgeLuma(L,"left",W*0.32),0.1,0.4));
  bandScrim(L,"right",W*0.32,adapt(edgeLuma(L,"right",W*0.3),0.06,0.36));
  vignette(ctx,W,H,0.26);
  grain(ctx,W,H,0.045);
  ctx.fillStyle=ink;

  /* Masthead fills the measure; a short one leaves room for the skyline. */
  const short=(copy.masthead||"").replace(/\s+/g,"").length<=5;
  const skyW=(land?0.2:0.25)*W;
  const mastMax=short?W-2*M-skyW-0.035*W:W-2*M;
  const mSize=fitTracked(ctx,copy.masthead,mastMax,land?H*0.23:H*0.235,FONT.serif,700,0.012,26*u);
  const mBase=M+mSize*0.72;
  drawTracked(ctx,copy.masthead,M,mBase,mSize*0.012,"left");

  const sky=[copy.skyline1,copy.skyline2,copy.skyline3].filter(Boolean);
  const skySize=16*u,skyLH=27*u;
  setFont(ctx,700,skySize,FONT.sans);
  const skyTop=short?M+skySize+2*u:mBase+46*u;
  sky.forEach((t,i)=>drawTracked(ctx,t.toUpperCase(),W-M,skyTop+i*skyLH,skySize*0.2,"right"));

  const headBottom=Math.max(mBase,skyTop+Math.max(0,sky.length-1)*skyLH);
  const featTop=Math.max(headBottom+(land?70*u:88*u),H*(land?0.4:0.36));

  const colW=land?W*0.23:W*0.31;
  let leftBottom=featureBlock(L,{x:M,y:featTop,w:colW,align:"left",ink,
    kicker:copy.f1Title,dek:copy.f1Dek,kickerSize:land?40*u:48*u,dekSize:land?15*u:17*u});
  featureBlock(L,{x:W-M,y:featTop,w:land?W*0.21:W*0.27,align:"right",ink,
    kicker:copy.f2Title,dek:copy.f2Dek,kickerSize:land?36*u:42*u,dekSize:land?14*u:16*u});
  if(!land&&copy.f3Title){
    leftBottom=featureBlock(L,{x:M,y:leftBottom+66*u,w:colW,align:"left",ink,
      kicker:copy.f3Title,dek:copy.f3Dek,kickerSize:42*u,dekSize:16*u});
  }

  /* Bottom furniture, stacked upward from the trim. */
  const bottom=H-M;
  const bcW=land?170*u:180*u,bcH=54*u;
  drawBarcode(ctx,M,bottom-bcH,bcW,bcH,copy.barcode);
  ctx.fillStyle=ink;
  setFont(ctx,700,13*u,FONT.sans);
  drawTracked(ctx,(copy.footer||"").toUpperCase(),M,bottom-bcH-26*u,13*u*0.2,"left");
  if(copy.script){
    setFont(ctx,400,36*u,FONT.script);
    ctx.fillText(copy.script,M,bottom-bcH-64*u);
  }

  const dek=fitBlock(ctx,(copy.bigDek||"").toUpperCase(),land?W*0.34:W*0.5,16*u,FONT.sans,700,0.14,2,10*u);
  const dLH=dek.size*1.55;
  const dekLast=bottom-(land?16*u:12*u);
  const dekFirst=dekLast-(dek.lines.length-1)*dLH;

  const words=String(copy.big||"").trim().split(/\s+/).filter(Boolean);
  const bigLines=(!land&&words.length>1)?[words[0],words.slice(1).join(" ")]:[words.join(" ")];
  const bigMax=land?W*0.58:W*0.86;
  let bSize=land?H*0.19:H*0.155;
  bigLines.forEach(l=>{bSize=Math.min(bSize,fitTracked(ctx,l,bigMax,bSize,FONT.serif,700,0.008,28*u));});
  const limit=leftBottom+(land?36*u:30*u);
  let bigLast,bigTop;
  for(let i=0;i<40;i++){
    bigLast=dekFirst-(land?34*u:40*u);
    bigTop=bigLast-(bigLines.length-1)*bSize*0.94-bSize*0.72;
    if(bigTop>=limit||bSize<=40*u)break;
    bSize*=0.95;
  }
  setFont(ctx,700,bSize,FONT.serif);
  const bigW=bigLines.reduce((m,l)=>Math.max(m,trackedWidth(ctx,l,bSize*0.008)),0);
  plateIfBright(L,W-M-bigW,bigTop,bigW,bigLast-bigTop,0.5);
  setFont(ctx,700,bSize,FONT.serif);
  ctx.fillStyle=ink;
  bigLines.forEach((l,i)=>drawTracked(ctx,l,W-M,bigLast-(bigLines.length-1-i)*bSize*0.94,bSize*0.008,"right"));

  setFont(ctx,700,dek.size,FONT.sans);
  ctx.fillStyle=ink;
  drawLines(ctx,dek.lines,W-M,dekFirst,dLH,dek.track,"right");
}

function tplNoir(L){
  const {ctx,W,H,u,M,land,copy}=L;
  const ink="#f5f1ea";
  paintPhoto(L,0,0,W,H,"grayscale(1) contrast(1.28) brightness(0.86)",land?0.42:0.34);
  bandScrim(L,"top",H*0.36,adapt(edgeLuma(L,"top",H*0.26),0.3,0.66));
  bandScrim(L,"bottom",H*0.46,adapt(edgeLuma(L,"bottom",H*0.42),0.34,0.74));
  bandScrim(L,"left",W*0.34,adapt(edgeLuma(L,"left",W*0.3),0.12,0.46));
  bandScrim(L,"right",W*0.34,adapt(edgeLuma(L,"right",W*0.3),0.12,0.46));
  vignette(ctx,W,H,0.5);
  grain(ctx,W,H,0.06);
  ctx.fillStyle=ink;

  const mSize=fitTracked(ctx,copy.masthead,W-2*M-(land?W*0.16:W*0.1),land?H*0.14:H*0.13,FONT.serif,700,0.09,24*u);
  const mBase=M+mSize*0.78;
  drawTracked(ctx,copy.masthead,W/2,mBase,mSize*0.09,"center");
  hairline(ctx,M,mBase+26*u,W-2*M,1.3*u,0.5);

  const sky=[copy.skyline1,copy.skyline2,copy.skyline3].filter(Boolean).join("   ·   ");
  setFont(ctx,700,13*u,FONT.sans);
  drawTracked(ctx,sky.toUpperCase(),W/2,mBase+56*u,13*u*0.28,"center");

  const featY=H*(land?0.44:0.42);
  featureBlock(L,{x:M,y:featY,w:land?W*0.2:W*0.26,align:"left",ink,
    kicker:copy.f1Title,dek:copy.f1Dek,kickerSize:land?32*u:34*u,kickerLines:3});
  featureBlock(L,{x:W-M,y:featY,w:land?W*0.2:W*0.26,align:"right",ink,
    kicker:copy.f2Title,dek:copy.f2Dek,kickerSize:land?32*u:34*u,kickerLines:3});

  const bottom=H-M;
  const bcW=land?150*u:158*u,bcH=48*u;
  drawBarcode(ctx,W-M-bcW,bottom-bcH,bcW,bcH,copy.barcode);
  ctx.fillStyle=ink;
  setFont(ctx,700,12*u,FONT.sans);
  drawTracked(ctx,(copy.footer||"").toUpperCase(),M,bottom-14*u,12*u*0.22,"left");

  const dek=fitBlock(ctx,(copy.bigDek||"").toUpperCase(),W*0.62,15*u,FONT.sans,700,0.16,2,10*u);
  const dLH=dek.size*1.6;
  const dekFirst=bottom-bcH-34*u-(dek.lines.length-1)*dLH;
  const bigSize=fitTracked(ctx,copy.big,W-2*M-(land?W*0.1:0),land?H*0.16:H*0.145,FONT.serif,700,0.02,30*u);
  const bigBase=dekFirst-46*u;
  drawTracked(ctx,copy.big,W/2,bigBase,bigSize*0.02,"center");
  hairline(ctx,W/2-W*0.13,bigBase-bigSize*0.72-34*u,W*0.26,1.3*u,0.55);
  setFont(ctx,700,dek.size,FONT.sans);
  drawLines(ctx,dek.lines,W/2,dekFirst,dLH,dek.track,"center");
}

function tplCelebration(L){
  const {ctx,W,H,u,M,land,copy,accent}=L;
  const ink="#fffaf4";
  paintPhoto(L,0,0,W,H,"saturate(1.06) contrast(1.02) brightness(1.05)",land?0.42:0.34);
  wash(ctx,W,H,"#ffcf9e",0.16,"overlay");
  bandScrim(L,"top",H*0.34,adapt(edgeLuma(L,"top",H*0.26),0.16,0.56));
  bandScrim(L,"bottom",H*0.46,adapt(edgeLuma(L,"bottom",H*0.42),0.28,0.72));
  bandScrim(L,"left",W*0.36,adapt(edgeLuma(L,"left",W*0.32),0.12,0.44));
  vignette(ctx,W,H,0.22);
  grain(ctx,W,H,0.04);

  ctx.fillStyle=ink;
  /* The skyline always keeps its own column here, because the script line
     sits directly under the masthead. */
  const mast=(copy.occasion||copy.masthead||"").toUpperCase();
  const mSize=fitTracked(ctx,mast,W-2*M-(land?0.19:0.24)*W,land?H*0.2:H*0.175,FONT.serif,700,0.01,24*u);
  const mBase=M+mSize*0.72;
  drawTracked(ctx,mast,M,mBase,mSize*0.01,"left");

  if(copy.script){
    ctx.fillStyle=accent;
    const sSize=Math.min(H*0.062,mSize*0.42);
    setFont(ctx,400,sSize,FONT.script);
    ctx.fillText(copy.script,M+4*u,mBase+sSize*0.95);
    hairline(ctx,M+4*u,mBase+sSize*1.8,Math.min(W*0.34,ctx.measureText(copy.script).width),1.6*u,0.85);
  }

  ctx.fillStyle=ink;
  const sky=[copy.skyline1,copy.skyline2,copy.skyline3].filter(Boolean);
  setFont(ctx,700,15*u,FONT.sans);
  sky.forEach((t,i)=>drawTracked(ctx,t.toUpperCase(),W-M,M+16*u+i*26*u,15*u*0.2,"right"));

  const featY=H*(land?0.46:0.44);
  let leftBottom=featureBlock(L,{x:M,y:featY,w:land?W*0.24:W*0.32,align:"left",ink,
    kicker:copy.f1Title,dek:copy.f1Dek,kickerSize:land?36*u:42*u,dekSize:16*u});
  if(!land&&copy.f2Title){
    leftBottom=featureBlock(L,{x:M,y:leftBottom+60*u,w:W*0.32,align:"left",ink,
      kicker:copy.f2Title,dek:copy.f2Dek,kickerSize:38*u,dekSize:15*u});
  }

  const bottom=H-M;
  const bcW=land?150*u:158*u,bcH=48*u;
  drawBarcode(ctx,W-M-bcW,bottom-bcH,bcW,bcH,copy.barcode);
  ctx.fillStyle=ink;
  setFont(ctx,700,12*u,FONT.sans);
  drawTracked(ctx,(copy.footer||"").toUpperCase(),M,bottom-14*u,12*u*0.22,"left");

  const dek=fitBlock(ctx,(copy.bigDek||"").toUpperCase(),land?W*0.3:W*0.46,15*u,FONT.sans,700,0.14,2,10*u);
  const dLH=dek.size*1.6;
  const dekLast=bottom-bcH-30*u;
  const dekFirst=dekLast-(dek.lines.length-1)*dLH;

  const words=String(copy.big||"").trim().split(/\s+/).filter(Boolean);
  const bigLines=(!land&&words.length>1)?[words[0],words.slice(1).join(" ")]:[words.join(" ")];
  let bSize=land?H*0.16:H*0.145;
  bigLines.forEach(l=>{bSize=Math.min(bSize,fitTracked(ctx,l,land?W*0.46:W*0.78,bSize,FONT.serif,700,0.008,28*u));});
  let bigLast,bigTop;
  for(let i=0;i<40;i++){
    bigLast=dekFirst-38*u;
    bigTop=bigLast-(bigLines.length-1)*bSize*0.94-bSize*0.72;
    if(bigTop>=leftBottom+30*u||bSize<=40*u)break;
    bSize*=0.95;
  }
  setFont(ctx,700,bSize,FONT.serif);
  const bigW=bigLines.reduce((m,l)=>Math.max(m,trackedWidth(ctx,l,bSize*0.008)),0);
  /* Accent type needs more help than white does on a bright frame. */
  plateIfBright(L,W-M-bigW,bigTop,bigW,bigLast-bigTop,0.74);
  setFont(ctx,700,bSize,FONT.serif);
  ctx.fillStyle=accent;
  bigLines.forEach((l,i)=>drawTracked(ctx,l,W-M,bigLast-(bigLines.length-1-i)*bSize*0.94,bSize*0.008,"right"));
  ctx.fillStyle=ink;
  setFont(ctx,700,dek.size,FONT.sans);
  drawLines(ctx,dek.lines,W-M,dekFirst,dLH,dek.track,"right");
}

function tplPress(L){
  const {ctx,W,H,u,M,land,copy,accent}=L;
  const ink="#ffffff",card="#141210";
  ctx.fillStyle=card;ctx.fillRect(0,0,W,H);

  const barW=land?W:W*0.2,barH=land?H*0.19:H;
  const px=land?0:barW,py=land?barH:0,pw=land?W:W-barW,ph=land?H-barH:H;
  paintPhoto(L,px,py,pw,ph,"contrast(1.06) saturate(1.02)",land?0.42:0.34);

  /* The whole lower half of the photo is type, so the base has to carry it. */
  const baseH=ph*(land?0.72:0.56);
  const baseA=adapt(regionLuma(ctx,px,py+ph-baseH,pw,baseH),0.62,0.94);
  ctx.save();ctx.beginPath();ctx.rect(px,py,pw,ph);ctx.clip();
  const g=ctx.createLinearGradient(0,py+ph,0,py+ph-baseH);
  g.addColorStop(0,`rgba(10,9,8,${baseA})`);
  g.addColorStop(0.42,`rgba(10,9,8,${baseA*0.55})`);
  g.addColorStop(1,"rgba(10,9,8,0)");
  ctx.fillStyle=g;ctx.fillRect(px,py,pw,ph);
  ctx.restore();
  plateIfBright(L,px+M*0.4,py+ph-ph*0.36,Math.min(pw*0.82,pw-M),ph*0.32,0.55);
  grain(ctx,W,H,0.04);

  ctx.fillStyle=card;ctx.fillRect(0,0,barW,barH);

  /* Accent chip carries the issue line; masthead runs the length of the bar. */
  const chip=land?{x:W-W*0.22,y:0,w:W*0.22,h:barH}:{x:0,y:H*0.055,w:barW,h:H*0.17};
  ctx.fillStyle=accent;ctx.fillRect(chip.x,chip.y,chip.w,chip.h);
  ctx.fillStyle="#171412";
  const chipText=[copy.skyline1,copy.skyline2].filter(Boolean).join(" · ").toUpperCase();
  setFont(ctx,800,14*u,FONT.sans);
  if(land)drawTracked(ctx,chipText,chip.x+chip.w/2,chip.y+chip.h/2+5*u,14*u*0.2,"center");
  else{
    ctx.save();ctx.translate(chip.x+chip.w/2,chip.y+chip.h/2);ctx.rotate(-Math.PI/2);
    drawTracked(ctx,chipText,0,5*u,14*u*0.2,"center");ctx.restore();
  }

  ctx.fillStyle=ink;
  if(land){
    const mSize=fitTracked(ctx,copy.masthead,W-2*M-chip.w-W*0.04,barH*0.62,FONT.sans,800,0.06,24*u);
    drawTracked(ctx,copy.masthead.toUpperCase(),M,barH/2+mSize*0.36,mSize*0.06,"left");
  }else{
    const run=H-chip.y-chip.h-M*2;
    const mSize=fitTracked(ctx,copy.masthead,run,barW*0.66,FONT.sans,800,0.06,24*u);
    ctx.save();
    ctx.translate(barW/2+mSize*0.34,chip.y+chip.h+M+run/2);
    ctx.rotate(-Math.PI/2);
    drawTracked(ctx,copy.masthead.toUpperCase(),0,0,mSize*0.06,"center");
    ctx.restore();
  }

  /* Name + standfirst sit on the photo's dark base, stacked from the trim up. */
  const inX=px+(land?M:M*0.8),inW=pw-(land?M*2:M*1.6);
  const bottom=py+ph-(land?M*0.9:M*0.8);
  ctx.fillStyle=ink;
  setFont(ctx,800,14*u,FONT.sans);
  drawTracked(ctx,(copy.footer||"").toUpperCase(),inX,bottom,14*u*0.22,"left");

  const dek=fitBlock(ctx,copy.bigDek||"",Math.min(inW,land?W*0.42:W*0.68),17*u,FONT.sans,400,0.02,3,10*u);
  const dLH=dek.size*1.55;
  const dekFirst=bottom-42*u-(dek.lines.length-1)*dLH;
  ctx.fillStyle=ink;
  drawLines(ctx,dek.lines,inX,dekFirst,dLH,dek.track,"left");

  const nameSize=fitTracked(ctx,copy.big,inW,land?H*0.1:H*0.082,FONT.sans,800,0.02,24*u);
  const nameBase=dekFirst-dek.size-30*u;
  ctx.fillStyle=ink;
  drawTracked(ctx,String(copy.big||"").toUpperCase(),inX,nameBase,nameSize*0.02,"left");

  const kickSize=17*u;
  setFont(ctx,800,kickSize,FONT.sans);
  ctx.fillStyle=accent;
  const kickBase=nameBase-nameSize*0.78-26*u;
  drawTracked(ctx,(copy.f1Title||"").toUpperCase(),inX,kickBase,kickSize*0.22,"left");
  ctx.fillRect(inX,kickBase+kickSize*0.5,52*u,2*u);
}

const RENDERERS={editorial:tplEditorial,noir:tplNoir,celebration:tplCelebration,press:tplPress};

function render(ctx,opts){
  const W=opts.width,H=opts.height;
  const L={
    ctx,W,H,
    u:Math.min(W,H)/1200,
    M:Math.round(Math.min(W,H)*0.062),
    land:W>H,
    img:opts.img||null,
    copy:opts.copy,
    accent:opts.accent||"#d86c8f",
    photoFilter:opts.photoFilter||"none"
  };
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,W,H);
  ctx.textBaseline="alphabetic";
  ctx.textAlign="left";
  (RENDERERS[opts.template]||tplEditorial)(L);
  ctx.restore();
}

/* Stand-in "photo" so the admin preview shows the real renderer. */
let placeholderCanvas=null;
function placeholder(){
  if(placeholderCanvas)return placeholderCanvas;
  const c=document.createElement("canvas");c.width=1200;c.height=1500;
  const x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,0,1500);
  g.addColorStop(0,"#cfc4b6");g.addColorStop(0.55,"#b3a596");g.addColorStop(1,"#6f6559");
  x.fillStyle=g;x.fillRect(0,0,1200,1500);
  x.fillStyle="rgba(60,50,42,.42)";
  x.beginPath();x.ellipse(600,560,215,265,0,0,Math.PI*2);x.fill();
  x.beginPath();x.ellipse(600,1320,430,520,0,0,Math.PI*2);x.fill();
  placeholderCanvas=c;
  return c;
}

global.Covers={TEMPLATES,RATIO,coverSize,derive,copyFor,copyKeys:COPY_KEYS,render,placeholder,FONT};
})(window);
