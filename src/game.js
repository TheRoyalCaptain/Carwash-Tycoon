/* Carwash Tycoon v0.3 — top-down management simulation. No dependencies. */
(() => {
"use strict";
const canvas = document.querySelector("#game");
const context = canvas.getContext("2d", {alpha:false});
if (!context) {document.querySelector("#statusText").textContent = "Canvas wordt niet ondersteund"; return;}
const $ = (id) => document.getElementById(id);
const W=1600,H=1000,PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const cash=(n)=>"€ "+Math.floor(n).toLocaleString("nl-NL");
const rnd=(a,b)=>a+Math.random()*(b-a);
const defs={
  queue:{name:"Wachtrij",desc:"Vergroot de opstelruimte zodat meer klanten kunnen wachten.",base:600,max:4,rect:[285,408,265,175],effect:"Twee extra wachtplaatsen per upgrade"},
  prewash:{name:"Voorwasinstallatie",desc:"Krachtigere sproeiers en schuimboog versnellen de voorwas.",base:350,max:5,rect:[556,377,176,228],effect:"Voorwas duurt 15% korter per niveau"},
  belt:{name:"Transportband",desc:"Een soepelere en snellere automatische wasstraat.",base:650,max:6,rect:[741,365,417,245],effect:"Doorvoersnelheid +16% per niveau"},
  wax:{name:"Wax & programma's",desc:"Voeg een glansprogramma en betere shampoos toe.",base:950,max:4,rect:[1160,378,136,225],effect:"Meer omzet per gewassen voertuig"},
  marketing:{name:"Reclame en kantoor",desc:"Maak je wasstraat bekend en trek meer bezoekers.",base:550,max:5,rect:[110,168,345,183],effect:"Auto's komen vaker langs"},
  vacuum:{name:"Stofzuigplein",desc:"Bouw vier stofzuigplaatsen met complete installatie.",base:2400,max:1,rect:[570,691,356,237],effect:"Extra € 6 per afgeronde wasbeurt",need:8},
  detail:{name:"Interieurservice",desc:"Bouw een premium interieur- en verzorgingsruimte.",base:4200,max:1,rect:[995,691,314,237],effect:"Extra € 11 per afgeronde wasbeurt",need:24},
  second:{name:"Tweede wasstraat",desc:"Ruimte gereserveerd voor een tweede waslijn.",base:9000,max:0,rect:[600,71,704,98],effect:"Wordt toegevoegd in een latere versie"}
};
const init={cash:2500,washed:0,missed:0,reputation:3.5,total:0,upgrades:{queue:0,prewash:0,belt:0,wax:0,marketing:0,vacuum:0,detail:0,second:0}};
let old={},saved={};
try{old=JSON.parse(localStorage.getItem("carwash-v1"))||{}}catch{}
try{saved=JSON.parse(localStorage.getItem("carwash-v3"))||{}}catch{}
const s={...init,...saved,upgrades:{...init.upgrades,...saved.upgrades}};
if(!saved.version&&old&&typeof old.cash==="number"){s.cash=Math.max(0,old.cash);s.washed=Math.max(0,old.washed||0);s.reputation=clamp(old.rep||3.5,1,5)}
s.version=3;
const save=()=>{try{localStorage.setItem("carwash-v3",JSON.stringify(s))}catch{}};
const price=(id)=>Math.round(defs[id].base*Math.pow(1.5,s.upgrades[id]));
const allowed=(id)=>defs[id].max>s.upgrades[id]&&(s.washed>=(defs[id].need||0));
const canBuy=(id)=>allowed(id)&&s.cash>=price(id);
const cars=[],floaters=[],particles=[],smoke=[];
const palettes=["#df5b55","#4f99c0","#e0be6c","#f1f3e9","#407e71","#b38fbd","#445a70","#d98054"];
let carID=0, active=null, nextArrival=0, selected=null, panelType="",simTime=0,frame=performance.now(),accum=0,clock=0;
let view={x:850,y:500,zoom:1,scale:1,fit:1,w:1,h:1},dpr=1;
let cameraInitialized=false;
const reducedMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let speed=1,toastTimer=0,dirtyHud=true,lastHud=0,lastSave=0;
const pointers=new Map();let drag=false,lastPoint=null,pinchStart=0,pinchZoom=1,touchMoved=false;
const worldPoint=(x,y)=>({x:view.x+(x-view.w/2)/view.scale,y:view.y+(y-view.h/2)/view.scale});
function focusedZoom(){
 // Keep cars at a useful on-screen size: roughly 60 CSS pixels long on phones.
 // The world always scales UNIFORMLY, regardless of device aspect ratio.
 const wanted=(view.w<1100||view.h<540)?0.62:view.fit;
 return clamp(wanted/view.fit,1,5.4);
}
function resize(){
 const rect=canvas.getBoundingClientRect();
 const oldScale=view.scale;
 view.w=Math.max(1,rect.width);view.h=Math.max(1,rect.height);
 // Use actual backing pixels, with a memory budget for large desktop monitors.
 dpr=Math.max(1,Math.min(window.devicePixelRatio||1,3,Math.sqrt(5500000/(view.w*view.h))));
 const pixelW=Math.round(view.w*dpr),pixelH=Math.round(view.h*dpr);
 if(canvas.width!==pixelW)canvas.width=pixelW;
 if(canvas.height!==pixelH)canvas.height=pixelH;
 view.fit=Math.min(view.w/1710,view.h/1100);
 if(!cameraInitialized){
  view.zoom=focusedZoom();
  view.x=view.zoom>1.1?850:800;view.y=500;
  cameraInitialized=true;
 }else{
  // Preserve apparent object size while rotating a phone or resizing a window.
  view.zoom=clamp(oldScale/view.fit,1,5.4);
 }
 view.scale=view.fit*view.zoom;
 clampCamera();
}
window.addEventListener("resize",resize);resize();
function setZoom(z,atX=view.w/2,atY=view.h/2) {
 const pivot=worldPoint(atX,atY);
 view.zoom=clamp(z,1,5.4);view.scale=view.fit*view.zoom;
 view.x=pivot.x-(atX-view.w/2)/view.scale;
 view.y=pivot.y-(atY-view.h/2)/view.scale;
 clampCamera();
}
function clampCamera(){
 const h=view.h/(2*view.scale),w=view.w/(2*view.scale);
 view.x=clamp(view.x,Math.min(w,W/2),Math.max(W-w,W/2));
 view.y=clamp(view.y,Math.min(h,H/2),Math.max(H-h,H/2));
}
function resetCamera(){
 // First tap shows the whole plot. Second tap focuses back on the wash tunnel.
 const full=view.zoom>1.15;
 view.x=full?800:850;view.y=500;
 view.zoom=full?1:focusedZoom();view.scale=view.fit*view.zoom;
 clampCamera();
}
function toCanvas(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener("pointerdown",(e)=>{
 canvas.setPointerCapture(e.pointerId);const p=toCanvas(e);pointers.set(e.pointerId,p);
 if(pointers.size===1){lastPoint=p;touchMoved=false;drag=true;}
 if(pointers.size===2){const ps=[...pointers.values()];pinchStart=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);pinchZoom=view.zoom;touchMoved=true;}
});
canvas.addEventListener("pointermove",(e)=>{
 if(!pointers.has(e.pointerId))return;
 const p=toCanvas(e),prev=pointers.get(e.pointerId);pointers.set(e.pointerId,p);
 if(pointers.size===2){
   const ps=[...pointers.values()],dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);
   if(pinchStart>1)setZoom(pinchZoom*dist/pinchStart,(ps[0].x+ps[1].x)/2,(ps[0].y+ps[1].y)/2);
 }else if(drag&&lastPoint){
   const dx=p.x-lastPoint.x,dy=p.y-lastPoint.y;
   if(Math.abs(dx)+Math.abs(dy)>2)touchMoved=true;
   view.x-=dx/view.scale;view.y-=dy/view.scale;clampCamera();lastPoint=p;
 }
});
function pointerEnd(e){
 const p=toCanvas(e),wasTap=!touchMoved&&pointers.size===1;
 pointers.delete(e.pointerId);drag=false;lastPoint=null;
 if(wasTap){
  const w=worldPoint(p.x,p.y),entry=Object.entries(defs).reverse().find(([id,d])=>{const r=d.rect;return w.x>=r[0]&&w.x<=r[0]+r[2]&&w.y>=r[1]&&w.y<=r[1]+r[3]});
  if(entry)openZone(entry[0]);else closePanel();
 }
}
canvas.addEventListener("pointerup",pointerEnd);
canvas.addEventListener("pointercancel",(e)=>{pointers.delete(e.pointerId);drag=false});
canvas.addEventListener("wheel",(e)=>{e.preventDefault();const p=toCanvas(e);setZoom(view.zoom*(e.deltaY<0?1.12:.89),p.x,p.y)},{passive:false});
$("zoomIn").onclick=()=>setZoom(view.zoom*1.28);
$("zoomOut").onclick=()=>setZoom(view.zoom/1.28);
$("resetView").onclick=resetCamera;
$("speed").onclick=()=>{speed=speed===1?2:1;$("speed").textContent=speed+"×";toast("Simulatiesnelheid "+speed+"×");};
$("panelClose").onclick=closePanel;
$("navView").onclick=()=>{closePanel();resetCamera();};
$("navBuild").onclick=()=>openSummary("build");
$("navUpgrades").onclick=()=>openZone("belt");
$("navStats").onclick=()=>openSummary("stats");
function toggleNav(which){for(const b of document.querySelectorAll(".pill"))b.classList.toggle("active",b.id===which)}
function toast(message){const t=$("toast");t.textContent=message;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),2500)}
function closePanel(){selected=null;panelType="";$("panel").classList.remove("open");toggleNav("navView");}
function openZone(id){
 selected=id;panelType="zone";toggleNav("navUpgrades");
 const d=defs[id],level=s.upgrades[id],finished=level>=d.max;
 $("panelEyebrow").textContent=finished?(d.max===0?"Toekomstige uitbreiding":"Volledig gebouwd"):"Terrein / "+(d.need?"Uitbreiding":"Installatie");
 $("panelTitle").textContent=d.name;
 $("panelDesc").textContent=d.desc;
 const extra=d.need&&s.washed<d.need?"Vereist "+d.need+" gewassen auto's. Nog "+(d.need-s.washed)+" te gaan.":d.effect;
 $("panelBody").innerHTML='<div class="metric"><span>Huidig niveau</span><b>'+level+' / '+d.max+'</b></div><div class="metric"><span>Effect</span><b style="max-width:65%;text-align:right">'+extra+'</b></div>'+(finished?'<div class="panel-tip">'+(d.max===0?"Dit perceel wordt later speelbaar.":"Deze uitbreiding is maximaal ontwikkeld.")+'</div>':'<div class="metric"><span>Investering</span><b>'+cash(price(id))+'</b></div>');
 $("panelAction").style.display=finished?"none":"block";
 $("panelAction").textContent=level?"Verbeter installatie · "+cash(price(id)):"Bouw / verbeter · "+cash(price(id));
 $("panelAction").disabled=!canBuy(id);
 $("panelAction").onclick=()=>buy(id);
 $("panel").classList.add("open");
}
function openSummary(type){
 selected=null;panelType=type;toggleNav(type==="build"?"navBuild":"navStats");
 $("panelEyebrow").textContent=type==="build"?"Bouwmenu":"Management";
 $("panelTitle").textContent=type==="build"?"Breid je terrein uit":"Bedrijfsstatistieken";
 $("panelDesc").textContent=type==="build"?"Tik op een plek op de kaart of kies een uitbreiding.":"De prestaties van jouw wasstraat tot nu toe.";
 const ids=type==="build"?["vacuum","detail","queue","marketing","prewash","belt","wax","second"]:[];
 $("panelBody").innerHTML=type==="build"?ids.map(id=>{
   const d=defs[id],lv=s.upgrades[id],done=lv>=d.max;
   const reason=d.need&&s.washed<d.need?" · vanaf "+d.need+" auto's":"";
   return '<button class="build-item" data-zone="'+id+'" type="button"><span><b>'+d.name+'</b><small>'+d.effect+'</small></span><strong>'+(done?(d.max===0?"BINNENKORT":"GEBOUWD"):cash(price(id))+reason)+'</strong></button>';
 }).join(""):'<div class="summary"><div class="mini"><small>Auto’s gewassen</small><strong>'+s.washed+'</strong></div><div class="mini"><small>Totale omzet</small><strong>'+cash(s.total)+'</strong></div><div class="mini"><small>Gemiste klanten</small><strong>'+s.missed+'</strong></div><div class="mini"><small>Reputatie</small><strong>'+s.reputation.toFixed(1).replace(".",",")+' ★</strong></div></div><div class="panel-tip">Auto’s komen vanzelf binnen. Vergroot de wachtrij, versnel de wasstraat en investeer in diensten om je omzet te laten groeien.</div>';
 for(const b of $("panelBody").querySelectorAll("[data-zone]"))b.onclick=()=>openZone(b.dataset.zone);
 $("panelAction").style.display="none";$("panel").classList.add("open");
}
function buy(id){
 if(!canBuy(id)){toast("Nog niet beschikbaar of onvoldoende geld");return}
 s.cash-=price(id);s.upgrades[id]++;save();dirtyHud=true;
 toast(defs[id].name+" verbeterd!");
 if(s.upgrades[id]===1&&id==="vacuum")toast("Stofzuigplein geopend · +€ 6 per wasbeurt");
 openZone(id);
}
function spawn(){
 const waiting=cars.filter(c=>c.stage==="queue").length,maxWaiting=4+s.upgrades.queue*2;
 if(waiting>=maxWaiting){s.missed++;dirtyHud=true;return}
 if(cars.some(c=>c.x<35&&c.stage==="queue"))return;
 const kind=Math.floor(rnd(0,3)),program=Math.random()<.15?"Deluxe":Math.random()<.42?"Premium":"Basis";
 cars.push({id:++carID,kind,color:palettes[Math.floor(rnd(0,palettes.length))],program,x:-125,y:routeY(-125),prevX:-125,prevY:routeY(-125),v:0,stage:"queue",wet:0,glow:0,foam:0,paid:false});
}
function addParticles(x,y,type,n){
 if(reducedMotion)return;
 for(let i=0;i<n&&particles.length<125;i++)particles.push({x:x+rnd(-13,13),y:y+rnd(-33,33),vx:rnd(-26,26),vy:rnd(-48,45),life:rnd(.3,.78),max:.78,size:rnd(1.2,3.6),type});
}
function completed(car){
 if(car.paid)return;car.paid=true;
 const base={Basis:12,Premium:20,Deluxe:28}[car.program];
 const amount=base+s.upgrades.wax*3+s.upgrades.vacuum*6+s.upgrades.detail*11;
 s.cash+=amount;s.total+=amount;s.washed++;s.reputation=clamp(s.reputation+.008,1,5);
 floaters.push({x:1300,y:410,text:"+"+cash(amount),time:1.8});
 dirtyHud=true;save();
 if(s.washed===8||s.washed===24)toast("Nieuwe terreinuitbreiding beschikbaar!");
}
// A gently curved entrance and exit keep vehicle heading aligned with its route.
function smoothstep(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function routeY(x){return 501+29*(1-smoothstep(40,320,x))+24*smoothstep(1410,1680,x);}
function routeAngle(x){return Math.atan2(routeY(x+3)-routeY(x-3),6);}
function simulation(dt){
 simTime+=dt;nextArrival-=dt;
 if(nextArrival<=0){
  spawn();nextArrival=Math.max(2.4,rnd(5.0,8.0)-s.upgrades.marketing*.75);
 }
 const sorted=[...cars].sort((a,b)=>b.x-a.x);
 for(let i=0;i<sorted.length;i++){
  const car=sorted[i],lead=sorted[i-1];let desired=165;
  car.prevX=car.x;car.prevY=car.y;
  if(car.stage==="queue"){
    let stop=active!==null?550:1900;
    if(lead&&lead.stage!=="exit"&&lead.stage!=="vacuum")stop=Math.min(stop,lead.x-119);
    desired=clamp((stop-car.x)*1.75,0,165);
    if(active===null&&car.x>=570){active=car.id;car.stage="wash";desired=88;}
  }else if(car.stage==="wash"){
    const pre=car.x<742?1+s.upgrades.prewash*.15:1;
    desired=86*(1+s.upgrades.belt*.16)*pre;
    if(car.x>1275){car.stage="exit";active=null;completed(car)}
    car.wet=1;
    car.foam=car.x<1010&&car.x>625?1:Math.max(0,car.foam-dt*.35);
    if(car.x>590&&car.x<760)addParticles(car.x+25,car.y,"water",2);
    if(car.x>1170&&car.x<1265)addParticles(car.x+40,car.y,"mist",1);
  }else if(car.stage==="exit"){desired=180;car.wet=Math.max(0,car.wet-dt*.18);car.foam=Math.max(0,car.foam-dt*.3)}
  const acceleration=car.v<desired?210:350;
  car.v+=clamp(desired-car.v,-acceleration*dt,acceleration*dt);
  car.x+=car.v*dt;
  car.y=routeY(car.x);
 }
 for(let i=cars.length-1;i>=0;i--)if(cars[i].x>1740)cars.splice(i,1);
 for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;if(p.life<=0)particles.splice(i,1)}
 for(let i=floaters.length-1;i>=0;i--){floaters[i].time-=dt;floaters[i].y-=dt*22;if(floaters[i].time<=0)floaters.splice(i,1)}
}
function hud(){
 $("cash").textContent=cash(s.cash);
 $("washed").textContent=s.washed.toLocaleString("nl-NL");
 $("reputation").textContent=s.reputation.toFixed(1).replace(".",",")+" ★";
 $("queueCount").textContent=cars.filter(c=>c.stage==="queue").length+"/"+(4+s.upgrades.queue*2);
 $("statusText").textContent=active!==null?"Wasstraat actief":"Installatie gereed";
 if(panelType==="zone"&&selected){const a=$("panelAction");a.disabled=!canBuy(selected);}
 dirtyHud=false;
}
function rr(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function line(c,x1,y1,x2,y2,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function text(c,t,x,y,color="#eff6f5",size=15,weight=700){c.textAlign="center";c.textBaseline="middle";c.fillStyle=color;c.font=weight+" "+size+"px system-ui,sans-serif";c.fillText(t,x,y)}
function poly(c,pts,color){c.fillStyle=color;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill()}
function roof(c,x,y,w,h,color,label){
 rr(c,x+8,y+9,w,h,13,"rgba(2,15,20,.25)");rr(c,x,y,w,h,12,"#243f49");
 rr(c,x+5,y+4,w-10,h-15,8,color);rr(c,x+14,y+13,w-28,9,3,"rgba(255,255,255,.13)");
 for(let i=0;i<3;i++)rr(c,x+22+i*(w-90)/3,y+h-22,(w-115)/3,7,2,"#4a7783");
 text(c,label,x+w/2,y+h/2+4,"#e7f7f2",16,850);
}
function patch(c,x,y,w,h,enabled,title,sub){
 rr(c,x+5,y+8,w,h,15,"#142b30a8");
 rr(c,x,y,w,h,15,enabled?"#557c76":"#344e4d");
 c.strokeStyle=enabled?"#97d7c3":"#6c827e";c.lineWidth=3;c.setLineDash([13,9]);c.strokeRect(x+12,y+12,w-24,h-24);c.setLineDash([]);
 if(!enabled){rr(c,x+18,y+18,w-36,h-36,10,"rgba(18,37,38,.50)");text(c,title,x+w/2,y+h/2-13,"#e2ebe8",16,850);text(c,sub,x+w/2,y+h/2+17,"#b5cac4",12,650)}
}
function buildBase(){
 // Rasterize static scenery at 2x world resolution so zooming does not enlarge
 // a low-resolution image. Draw it back at WORLD dimensions in render().
 const c=document.createElement("canvas");c.width=W*2;c.height=H*2;
 const g=c.getContext("2d");g.setTransform(2,0,0,2,0,0);
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";
 g.fillStyle="#315b46";g.fillRect(0,0,W,H);
 let seed=73421;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<1600;i++){
  const x=random()*W,y=random()*H,r=random()*3+1;
  g.fillStyle=i%2?"rgba(178,207,157,.08)":"rgba(9,56,37,.10)";
  g.fillRect(x,y,r*2,r);
 }
 rr(g,55,48,1480,905,28,"#254d45");
 rr(g,75,65,1440,865,20,"#4e716d");
 rr(g,91,78,1408,841,18,"#557b74");
 // Grass islands and boundary
 rr(g,96,90,385,280,20,"#426e58");rr(g,488,91,850,275,16,"#416b57");
 rr(g,98,617,1360,304,17,"#456d57");
 // Perimeter fence lines
 g.strokeStyle="#a4b8a7";g.lineWidth=5;g.strokeRect(94,79,1407,844);
 for(let i=0;i<42;i++){let x=97+i*34;rr(g,x,74,4,10,1,"#b8c4b6");rr(g,x,917,4,10,1,"#b8c4b6")}
 // Main carriageway
 rr(g,-20,426,1640,159,13,"#a5a69d");
 rr(g,-20,438,1640,137,6,"#263943");
 rr(g,-20,457,1640,101,4,"#34444a");
 // Loading lane and queue apron
 rr(g,243,407,328,195,14,"#536469");
 rr(g,255,425,315,156,8,"#37474d");
 // Subtle tire tracks
 line(g,0,472,1600,472,"#394b51",2);
 line(g,0,543,1600,543,"#394b51",2);
 for(let x=8;x<1600;x+=95)rr(g,x,560,46,4,2,"#a7bcb099");
 for(let x=14;x<565;x+=42)rr(g,x,449,21,3,2,"#d3c88b");
 // Zebra and traffic zones
 for(let i=0;i<6;i++){rr(g,235+i*13,457,7,90,1,"rgba(255,255,255,.18)")}
 for(let i=0;i<6;i++)rr(g,1470+i*12,457,6,87,1,"#e6edd63d");
 // Edged garden sections
 for(const [x,y,w,h] of [[109,111,308,36],[117,621,335,29],[1330,115,150,253],[1380,641,89,234]]){
  rr(g,x,y,w,h,10,"#618c65");rr(g,x+6,y+5,w-12,h-10,8,"#3c6950");
 }
 // Parking drive aisles
 rr(g,563,667,370,267,16,"#87988f");rr(g,977,667,348,267,16,"#889990");
 rr(g,577,681,344,243,11,"#3e5558");rr(g,989,680,323,243,12,"#44585b");
 for(let i=0;i<4;i++){let x=602+i*77;line(g,x,745,x,864,"#c9d4c0",3)}
 for(let i=0;i<3;i++){let x=1028+i*90;line(g,x,753,x,862,"#c9d4c0",3)}
 // Trees
 for(const [x,y,r] of [[160,710,35],[233,746,29],[335,803,37],[450,858,25],[1414,224,31],[1409,317,25],[148,376,24],[450,208,21],[1440,839,30]]){
  g.fillStyle="#1b4234";g.beginPath();g.arc(x+5,y+7,r+3,0,7);g.fill();
  g.fillStyle="#347c5b";g.beginPath();g.arc(x,y,r,0,7);g.fill();
  g.fillStyle="#559269";g.beginPath();g.arc(x-9,y-9,r*.53,0,7);g.fill();
  g.fillStyle="#2a684d";g.beginPath();g.arc(x+11,y+9,r*.44,0,7);g.fill();
 }
 // Building shadows and base
 roof(g,119,174,310,178,"#284a5a","CARWASH  •  OFFICE");
 roof(g,815,200,283,128,"#2b5361","TECHNIEK");
 rr(g,743,362,414,247,14,"#263e48");
 rr(g,752,374,398,224,10,"#738f93");
 rr(g,761,395,378,179,6,"#425d65");
 rr(g,570,399,161,202,8,"#7a9697");
 rr(g,1159,399,133,203,8,"#7c9c9b");
 // Wash drains & track
 for(let x=593;x<1280;x+=36){rr(g,x,444,12,113,2,"#2b4c58");rr(g,x+3,449,6,103,2,"#426d78")}
 for(let x=782;x<1144;x+=48){line(g,x,388,x,423,"#b6e0d0",3);line(g,x,555,x,585,"#b6e0d0",3)}
 line(g,740,444,1149,444,"#b1cac3",7);line(g,740,560,1149,560,"#b1cac3",7);
 // Tunnel sides + canopy supports
 for(let x=775;x<1150;x+=67){rr(g,x,390,7,45,2,"#d7e5df");rr(g,x,565,7,30,2,"#d7e5df")}
 text(g,"ENTREE",136,415,"#d3e0d7",15,850);text(g,"UITRIT",1432,415,"#d3e0d7",15,850);
 // Road arrows
 for(const x of [185,470,1352,1490]){
  poly(g,[[x-14,496],[x+8,496],[x+8,482],[x+32,505],[x+8,528],[x+8,514],[x-14,514]],"#bccdc367");
 }
 return c;
}
const terrain=buildBase();
function machinery(g,t){
 // Prewash gantry
 rr(g,590,393,16,205,4,"#bfd2ca");rr(g,710,393,16,205,4,"#bfd2ca");
 rr(g,586,391,143,20,4,"#39798a");rr(g,586,581,143,19,4,"#39798a");
 rr(g,592,398,130,7,2,"#8ee0d9");text(g,"VOORWAS",655,384,"#effef7",13,850);
 // Tunnel rails, roof beams
 for(let x=785;x<=1130;x+=68){
  rr(g,x,382,12,230,4,"#1d4e5f");rr(g,x,382,12,15,3,"#94d2d0");rr(g,x,595,12,13,3,"#94d2d0");
 }
 rr(g,803,371,320,17,5,"#245d67");rr(g,803,604,320,17,5,"#245d67");
 text(g,"AUTOMATISCHE WASSTRAAT",961,356,"#e9f8f2",15,850);
 // Mechanical brushes
 for(const x of [875,1005]){
  for(const y of [454,555]){
    g.save();g.translate(x,y);g.rotate(t*(x===875?1.95:-1.6));
    g.fillStyle="#1d5667";g.beginPath();g.arc(0,0,34,0,7);g.fill();
    for(let i=0;i<16;i++){g.save();g.rotate(i*PI/8);rr(g,12,-4,29,8,3,i%2?"#57c9cf":"#b3e5d6");g.restore()}
    g.fillStyle="#d2f6ef";g.beginPath();g.arc(0,0,10,0,7);g.fill();g.restore();
  }
 }
 // Dryer
 rr(g,1170,392,14,202,4,"#abcbd0");rr(g,1260,392,14,202,4,"#abcbd0");
 rr(g,1169,393,105,20,4,"#246879");rr(g,1169,581,105,18,4,"#246879");
 text(g,"DROGER",1220,376,"#effff6",13,850);
 for(let i=0;i<6;i++)rr(g,1192+i*12,418,7,16,2,"#a4dbe4");
}
function unlockedBuildings(g){
 if(s.upgrades.vacuum){
  patch(g,575,692,344,224,true);
  for(let i=0;i<4;i++){
    const x=602+i*79;
    rr(g,x,703,67,26,5,"#356c7a");rr(g,x+7,711,53,8,3,"#78c9c7");
    rr(g,x+10,738,6,24,2,"#173d4b");
    g.strokeStyle="#e9d5a9";g.lineWidth=3;g.beginPath();g.arc(x+18,762,13,0,PI*1.4);g.stroke();
  }
  text(g,"STOFZUIGPLEIN",746,894,"#f4f8ed",17,850);
 }else patch(g,575,692,344,224,false,"STOFZUIGPLEIN","8 auto's · € 2.400");
 if(s.upgrades.detail){
  roof(g,1002,705,298,190,"#315e61","INTERIEURSERVICE");
  for(let i=0;i<3;i++)rr(g,1020+i*94,854,71,21,4,"#91d7c8");
 }else patch(g,1002,692,299,224,false,"INTERIEURSERVICE","24 auto's · € 4.200");
 patch(g,604,96,701,80,false,"TWEEDE WASLIJN","TOEKOMSTIGE UITBREIDING");
}
function sprite(g,car,alpha){
 const x=lerp(car.prevX??car.x,car.x,alpha);
 const y=lerp(car.prevY??car.y,car.y,alpha);
 const kind=car.kind,len=kind===2?112:kind===1?103:93,half=len/2;
 g.save();g.translate(x,y);g.rotate(routeAngle(x));g.scale(1.05,.88);
 rr(g,-half+5,-25,len,56,16,"rgba(8,19,27,.38)");
 for(const wx of [-half+19,half-21])for(const wy of [-27,20]){
  rr(g,wx-11,wy,24,11,4,"#0d1e25");rr(g,wx-8,wy+2,17,6,2,"#485a62");
 }
 const grad=g.createLinearGradient(0,-25,0,26);grad.addColorStop(0,"#e9f4f5");grad.addColorStop(.16,car.color);grad.addColorStop(.76,car.color);grad.addColorStop(1,"#142c3a");
 rr(g,-half,-25,len,50,kind===2?14:19,grad);
 g.strokeStyle="rgba(255,255,255,.35)";g.lineWidth=2;g.beginPath();g.roundRect(-half+4,-20,len-8,40,15);g.stroke();
 const cabinStart=kind===2?-13:-8,cabinEnd=kind===2?29:23;
 rr(g,cabinStart-23,-18,cabinEnd-cabinStart+46,36,11,"#1a3545");
 rr(g,cabinStart-14,-14,cabinEnd-cabinStart+25,28,9,"#87b0bf");
 g.fillStyle="#d7f0f966";g.beginPath();g.moveTo(cabinStart-8,-11);g.lineTo(cabinStart+5,-11);g.lineTo(cabinStart-5,11);g.lineTo(cabinStart-15,11);g.fill();
 line(g,cabinStart+7,-17,cabinStart+7,18,"#1c4050",4);
 rr(g,half-7,-20,7,13,2,"#f4e7a9");rr(g,half-7,7,7,13,2,"#f4e7a9");
 rr(g,-half,-19,7,11,2,"#dd6671");rr(g,-half,8,7,11,2,"#dd6671");
 if(car.foam>0){
  g.globalAlpha=clamp(car.foam*.68,0,.7);
  for(let i=0;i<9;i++){g.fillStyle=i%3?"#f7fffa":"#a9f2ec";g.beginPath();g.arc(-24+(i*17)%56,-18+(i*13)%37,6+(i%3)*2,0,7);g.fill()}
  g.globalAlpha=1;
 }
 if(car.wet>0){
  g.fillStyle="rgba(210,251,254,"+(car.wet*.18)+")";
  rr(g,-half+10,-17,len-22,14,8,g.fillStyle);
 }
 g.restore();
}
function effects(g,t){
 const washing=cars.find(c=>c.stage==="wash");
 if(washing){
  const x=washing.x;
  if(x>580&&x<748){
   for(const side of [420,582]){
     const anchor=x<645?604:710;
     for(let i=0;i<7;i++){
      const startY=side===420?419:584,endY=501+Math.sin(t*9+i)*23;
      line(g,anchor+(i-3)*3,startY,anchor+(i-3)*2,endY,"rgba(188,248,255,.25)",1+i%2);
     }
   }
  }
  if(x>1160&&x<1280){
   for(let i=0;i<15;i++){
     let px=1179+(i*31+t*35)%90;
     line(g,px,449,px+Math.sin(t*3+i)*9,551,"rgba(186,238,243,.13)",2);
   }
  }
 }
 for(const p of particles){
  g.globalAlpha=clamp(p.life/p.max,0,1);
  g.fillStyle=p.type==="water"?"#b2eefa":"#e0f5ed";g.beginPath();g.arc(p.x,p.y,p.size,0,7);g.fill();
 }
 g.globalAlpha=1;
 for(const f of floaters){g.globalAlpha=clamp(f.time,0,1);rr(g,f.x-47,f.y-19,94,34,10,"#133e3a");text(g,f.text,f.x,f.y,"#bcffc4",17,900);}
 g.globalAlpha=1;
}
function labels(g,t){
 // Small world labels used to collapse to illegible 3–6 CSS pixels on phones.
 // Keep them near 12 screen pixels at the zoomed-in mobile camera.
 const fontSize=clamp(12/Math.max(.1,view.scale),11,25);
 const badgeWidth=clamp(105/Math.max(.1,view.scale),108,190);
 const badgeHeight=clamp(29/Math.max(.1,view.scale),30,52);
 const spots=[["queue",412,396],["prewash",642,622],["belt",938,633],["wax",1221,622],["marketing",277,157]];
 for(const [id,x,y] of spots){
  const isSelected=selected===id,up=s.upgrades[id];
  rr(g,x-badgeWidth/2,y-badgeHeight/2,badgeWidth,badgeHeight,8,isSelected?"#3b9d97":"#102f3edc");
  text(g,id==="queue"?"WACHTRIJ":id==="prewash"?"VOORWAS":id==="belt"?"WASSTRAAT":id==="wax"?"WAX":"KANTOOR",x,y-1,isSelected?"#ecfffc":"#d3e9e6",fontSize,850);
  if(up>0){
   rr(g,x+badgeWidth/2-5,y-badgeHeight/2,20,19,4,"#bcecd1");
   text(g,""+up,x+badgeWidth/2+5,y-badgeHeight/2+10,"#143b35",12,900)
  }
 }
 if(selected&&defs[selected]){
  const r=defs[selected].rect;
  g.save();g.strokeStyle="#76ebd9";g.lineWidth=5;g.setLineDash([12,7]);g.lineDashOffset=-t*15;
  g.strokeRect(r[0]-7,r[1]-7,r[2]+14,r[3]+14);g.restore();
 }
}
function render(now){
 const g=context;
 // Use the exact backing-store ratio; avoid browser-side CSS stretching.
 g.setTransform(canvas.width/view.w,0,0,canvas.height/view.h,0,0);
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";
 g.fillStyle="#264938";g.fillRect(0,0,view.w,view.h);
 g.save();g.translate(view.w/2,view.h/2);
 g.scale(view.scale,view.scale);g.translate(-view.x,-view.y);
 // The high-density raster is mapped back to the same world dimensions.
 g.drawImage(terrain,0,0,W,H);unlockedBuildings(g);
 const visibleTime=simTime+accum;
 machinery(g,visibleTime);
 const ordered=[...cars].sort((a,b)=>a.y-b.y);
 const alpha=clamp(accum*60,0,1);
 for(const car of ordered)sprite(g,car,alpha);
 effects(g,visibleTime);labels(g,visibleTime);
 g.restore();
}
function loop(now){
 const dt=Math.min(.05,(now-frame)/1000);frame=now;accum+=dt*speed;
 let n=0;while(accum>=1/60&&n++<7){simulation(1/60);accum-=1/60;}
 render(now);clock+=dt;lastHud+=dt;lastSave+=dt;
 if((dirtyHud||lastHud>.4)){hud();lastHud=0}
 if(lastSave>20){save();lastSave=0}
 requestAnimationFrame(loop);
}
document.addEventListener("visibilitychange",()=>{if(document.hidden)save();frame=performance.now()});
window.addEventListener("beforeunload",save);
const status=$("statusText");status.textContent="Wasstraat wordt geopend...";
const welcome=s.washed>0?"Welkom terug! Je bedrijf draait weer.":"Welkom! De eerste klanten zijn onderweg.";
toast(welcome);
nextArrival=1;requestAnimationFrame(loop);hud();
})();