/* ================================================================
   ลงกา · วิถีแห่งกรรม — 8-bit Roguelike (ออฟไลน์ 100%)
   ระบบ: ดันเจี้ยนสุ่ม / เทิร์นเบส / เลเวล / ของ / ร้านค้า / เควสต์
         อาคม / กรรม-ปุญ / บอส / มินิแมป / เซฟ-โหลด / เสียงชิปจูน
         [อัปเกรด]: เอฟเฟกต์ต่อสู้ (พุ่งชน/ฟันดาบ/สะเก็ดไฟ/ศัตรูกระพริบ)
                   มอนสเตอร์บึกบึน / สลับของไม่หาย / จำหมอกแผนที่
   ================================================================ */
'use strict';
/* ── พื้นฐาน ── */
const $=id=>document.getElementById(id);
const W=42,H=32,VW=20,VH=15,T=16,FINAL=20,SAVE_KEY='lanka_save_v1',HALL_KEY='lanka_hall_v1',KARMA_KEY='lanka_karma_v1',SKEL_KEY='lanka_skeleton_v1',ACH_KEY='lanka_ach_v1',CODEX_KEY='lanka_codex_v1',SETTINGS_KEY='lanka_settings_v1';
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rng=Math.random, floorR=Math.random;
const R=n=>Math.floor(rng()*n), pick=a=>a[R(a.length)], clamp=(v,a,b)=>v<a?a:v>b?b:v;
function thaiNum(n){return String(n).replace(/\d/g,d=>'๐๑๒๓๔๕๖๗๘๙'[d])}

const cv=$('game'),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
const mcv=$('minimap'),mctx=mcv.getContext('2d');
const stage=$('stage'),logEl=$('log');

/* ── เสียง (WebAudio) ── */
let AC=null,soundOn=true,droneNodes=null;
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  AC=new (window.AudioContext||window.webkitAudioContext)();
  startDrone(); startBgm();
}

let bgmTimer = null, bgmStep = 0;
const RAGA_SCALE = [130.81, 146.83, 164.81, 196.00, 220.00, 246.94, 261.63, 293.66]; // สเกลภารตะเรโทร
function playBgmNote(){
  if(!AC || !soundOn || state !== 'play') return;
  const noteIdx = [0, 2, 4, 3, 5, 4, 2, 1, 0, 3, 5, 7, 5, 3, 2, 0][bgmStep % 16];
  const freq = RAGA_SCALE[noteIdx % RAGA_SCALE.length];
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'triangle';
  o.frequency.value = freq;
  g.gain.value = 0.018;
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.38);
  o.connect(g); g.connect(AC.destination);
  o.start(); o.stop(AC.currentTime + 0.4);
  bgmStep++;
}
function startBgm(){
  if(bgmTimer) clearInterval(bgmTimer);
  bgmTimer = setInterval(playBgmNote, 320);
}

function startDrone(){ // เสียงพื้นแทนปูรา
  if(!AC||droneNodes)return;
  const g=AC.createGain();g.gain.value=.028;g.connect(AC.destination);
  const o1=AC.createOscillator(),o2=AC.createOscillator(),o3=AC.createOscillator();
  o1.type='sawtooth';o1.frequency.value=65.4;
  o2.type='sine';o2.frequency.value=98;
  o3.type='sine';o3.frequency.value=130.8;
  const lfo=AC.createOscillator(),lg=AC.createGain();
  lfo.frequency.value=.13;lg.gain.value=.013;lfo.connect(lg);lg.connect(g.gain);
  [o1,o2,o3,lfo].forEach(o=>o.start());
  droneNodes={g,os:[o1,o2,o3,lfo]};
}
function beep(f,d=.09,type='square',v=.13,slide=0){
  if(!AC||!soundOn)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.value=f;
  if(slide)o.frequency.linearRampToValueAtTime(Math.max(30,f+slide),AC.currentTime+d);
  g.gain.value=v;g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
  o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);
}
const sfx={
  hit:()=>beep(170,.07,'square',.15,-70),
  hurt:()=>beep(110,.2,'sawtooth',.18,-50),
  pick:()=>{beep(660,.06,'triangle',.12);setTimeout(()=>beep(880,.08,'triangle',.12),60)},
  gold:()=>{beep(988,.05,'triangle',.12);setTimeout(()=>beep(1319,.09,'triangle',.12),50)},
  level:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.12,'square',.13),i*90)),
  cast:()=>beep(392,.22,'triangle',.15,220),
  stairs:()=>beep(200,.35,'triangle',.15,-130),
  dead:()=>[220,185,147,110].forEach((f,i)=>setTimeout(()=>beep(f,.22,'sawtooth',.15),i*170)),
  boss:()=>beep(65,.6,'sawtooth',.25,-25),
  buy:()=>beep(784,.1,'triangle',.13),
  slash:()=>beep(440,.06,'sawtooth',.12,300),
};
function toggleSound(){
  soundOn=!soundOn;
  if(droneNodes)droneNodes.g.gain.value=soundOn?.028:0;
  $('btnSnd').textContent=soundOn?'♪':'✕';
}

/* ── สไปรต์ 8 บิต (ปรับสัดส่วนให้หนาแน่น ทรงพลัง ไม่ก้าง) ── */
const PAL={k:'#14080f',w:'#f4ecdc',g:'#f5c542',o:'#ff8b1f',r:'#d43d2a',t:'#2ec4a6',
  b:'#3a6ea5',p:'#8d55c9',s:'#e8b06a',d:'#7a4a22',f:'#ffe9a3',e:'#43b05c',
  m:'#8f2438',E:'#7fae7a',c:'#c9a86a','0':'#000000'};
const SPRD={
"warrior": [
  "......ffff......",
  ".....fggggf.....",
  "....fggggggf....",
  "....gssssssg....",
  "...gssk00kssg...",
  "...gssssssssg...",
  "..ggrrrrrrrrg...",
  ".ggggrrrrrrgggg.",
  ".ggg.rrrrrr.ggg.",
  ".....rrrrrr.....",
  "....gwwwwwwg....",
  "....gwwwwwwg....",
  "...dd.wwww.dd...",
  "...dd......dd...",
  "..ddd......ddd..",
  "................"
],
"brahmin": [
  ".....fwwwwf.....",
  "....fwwwwwwf....",
  "....fwwwwwwf....",
  "....wwssssww....",
  "...wwsk00ksww...",
  "...wwssssssww...",
  "..wwwwowoowwww..",
  "..wwwwowoowwww..",
  "..ww.ww..ww.ww..",
  ".....wwwwww.....",
  "....wwwwwwww....",
  "....wwwwwwww....",
  "....dd....dd....",
  "...ddd....ddd...",
  "...dd......dd...",
  "................"
],
"vanara": [
  "....ww....ww....",
  "...wwww..wwww...",
  "..wwwwwwwwwwww..",
  "..wwkwwwwwwkww..",
  "..wwwk0000kwww..",
  "...wwssssssww...",
  "..ggggwwwwgggg..",
  ".gggggwwwwggggg.",
  ".ggg..wwww..ggg.",
  "......wwww......",
  "....wwwwwwww....",
  "...wwww..wwww...",
  "...wwww..wwww...",
  "...ww......ww...",
  "..www......www..",
  "................"
],
"rishi": [
  "......kkkk......",
  ".....kkkkkk.....",
  "....kksssskk....",
  "....kkskkskk....",
  "....kksssskk....",
  "....wwwwwwww....",
  "..wwooooooooww..",
  "..wwooooooooww..",
  "..d.oooooooo.d..",
  "....oooooooo....",
  "....oooooooo....",
  "...dooooooood...",
  "...dd......dd...",
  "..ddd......ddd..",
  "..ddd......ddd..",
  "................"
],
"preta": [
  "......EEEE......",
  ".....EEEEEE.....",
  "....EEE00EEE....",
  "....EEEEEEEE....",
  ".....EEEEEE.....",
  "......EEEE......",
  ".....EEEEEE.....",
  "....EEEEEEEE....",
  "...EE.EEEE.EE...",
  "...E..EEEE..E...",
  "......EEEE......",
  ".....EEEEEE.....",
  "....EE....EE....",
  "...EEE....EEE...",
  "...E........E...",
  "................"
],
"asura": [
  "....rr....rr....",
  "...rrrr..rrrr...",
  "..rrrrrrrrrrrr..",
  "..rrgrrrrrrgrr..",
  "..rrg00rr00grr..",
  "..rrrrrrrrrrrr..",
  ".mmmmmmmmmmmmmm.",
  ".mmmmmmmmmmmmmm.",
  ".mm.mmmmmmmm.mm.",
  "....mmmmmmmm....",
  "....mmmmmmmm....",
  "...rrmm..mmrr...",
  "...rr......rr...",
  "..rrr......rrr..",
  "..rrr......rrr..",
  "................"
],
"naga": [
  ".....tttttt.....",
  "...tttttttttt...",
  "..tttttttttttt..",
  "..tttg0000gttt..",
  "..tttttttttttt..",
  "...tttttttttt...",
  "....tttttttt....",
  ".....tttttt.....",
  ".....tttttt.....",
  "....tttttttt....",
  "...tttt..tttt...",
  "...tttt..tttt...",
  "....tttttttt....",
  ".....tttttt.....",
  "......tttt......",
  "................"
],
"rakshasa": [
  "....pp....pp....",
  "...pppp..pppp...",
  "..pppppppppppp..",
  "..ppgppggppgpp..",
  "..ppg00gg00gpp..",
  "..ppwwwwwwwwpp..",
  ".pppppppppppppp.",
  ".pppppppppppppp.",
  ".pp.pppppppp.pp.",
  "....pppppppp....",
  "....pppppppp....",
  "...pppp..pppp...",
  "...pp......pp...",
  "..ppp......ppp..",
  "..ppp......ppp..",
  "................"
],
"yaksha": [
  "...ddggggggdd...",
  "..ddeeeeeeeedd..",
  "..dde00ee00edd..",
  "..ddeeeeeeeedd..",
  "..d.eewwwwee.d..",
  ".gggggggggggggg.",
  ".ggrrrrrrrrrrgg.",
  ".ggrrrrrrrrrrgg.",
  "....rrrrrrrr....",
  "....eeeeeeee....",
  "....eeeeeeee....",
  "...eeee..eeee...",
  "...dd......dd...",
  "..ddd......ddd..",
  "..ddd......ddd..",
  "................"
],
"boss": [
  "...ffggggggff...",
  "..ffffggggffff..",
  ".ffggeeeeeeggff.",
  ".fggge00ee00ggf.",
  ".fgggeewwwweeggf",
  ".gggggeeeeeegggg",
  "ggrrrrrrrrrrrrgg",
  "ggrrrrrrrrrrrrgg",
  "gg.rrrrrrrrrr.gg",
  "...rrrrrrrrrr...",
  "...rrrrrrrrrr...",
  "...rrrr..rrrr...",
  "...rr......rr...",
  "..rrr......rrr..",
  "..rrr......rrr..",
  "................"
],
"merchant": [
  "......oooo......",
  ".....oooooo.....",
  "....ooosssko....",
  "....oos00sko....",
  "....ooosssko....",
  "...gggggggggg...",
  "..gggggggggggg..",
  "..ggggg..ggggg..",
  "..gg.gggggg.gg..",
  ".....oooooo.....",
  "....oooooooo....",
  "...oooooooooo...",
  "...dd......dd...",
  "..ddd......ddd..",
  "..ddd......ddd..",
  "................"
],
"hermit": [
  "......kkkk......",
  ".....kkkkkk.....",
  "....kksssskk....",
  "....kkskkskk....",
  "....kksssskk....",
  "....wwwwwwww....",
  "..wwooooooooww..",
  "..wwooooooooww..",
  "..wwooooooooww..",
  "....oooooooo....",
  "....oooooooo....",
  "...oooooooooo...",
  "...dd......dd...",
  "..ddd......ddd..",
  "..ddd......ddd..",
  "................"
],
"pot": [
  "......wwww......",
  "......wwww......",
  ".....rrrrrr.....",
  "....rrrrrrrr....",
  "...rrrrrrrrrr...",
  "..rrrrwwwwrrrr..",
  "..rrrrrrrrrrrr..",
  "..rrrrrrrrrrrr..",
  "...rrrrrrrrrr...",
  "....rrrrrrrr....",
  ".....rrrrrr.....",
  "................",
  "................",
  "................",
  "................",
  "................"
],
"mana": [
  "......wwww......",
  "......wwww......",
  ".....tttttt.....",
  "....tttttttt....",
  "...tttttttttt...",
  "..ttttwwwwtttt..",
  "..tttttttttttt..",
  "..tttttttttttt..",
  "...tttttttttt...",
  "....tttttttt....",
  ".....tttttt.....",
  "................",
  "................",
  "................",
  "................",
  "................"
],
"gold": [
  "................",
  ".....gggggg.....",
  "...gggggggggg...",
  "..ggggffffgggg..",
  "..gggffffffggg..",
  ".gggfffffffffgg.",
  ".gggffffffffggg.",
  ".gggffffffffggg.",
  ".gggffffffffggg.",
  "..gggffffffggg..",
  "..ggggffffgggg..",
  "...gggggggggg...",
  ".....gggggg.....",
  "................",
  "................",
  "................"
],
"wpn": [
  ".........www....",
  "........wwww....",
  ".......wwwww....",
  "......wwwww.....",
  ".....wwwww......",
  "....wwwww.......",
  "...ggggg........",
  "..gggggg........",
  "...ggggg........",
  "....dd..........",
  ".....dd.........",
  "......dd........",
  "................",
  "................",
  "................",
  "................"
],
"arm": [
  "...cc......cc...",
  "..cccc....cccc..",
  ".cccccc..cccccc.",
  ".cccccccccccccc.",
  ".cccccccccccccc.",
  ".cccccccccccccc.",
  "..cccccccccccc..",
  "..cccccccccccc..",
  "...cccccccccc...",
  "....cccccccc....",
  ".....cccccc.....",
  "......cccc......",
  "................",
  "................",
  "................",
  "................"
],
"scr": [
  "....wwwwwwww....",
  "...wwwwwwwwww...",
  "..wwkkkkkkkkww..",
  "..wwwwwwwwwwww..",
  "..wwkkkkkkkkww..",
  "..wwwwwwwwwwww..",
  "..wwkkkkkkkkww..",
  "..wwwwwwwwwwww..",
  "...wwwwwwwwww...",
  "....wwwwwwww....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
]
};
const SPR={};
for(const name in SPRD){
  const rows=SPRD[name];
  const sw=rows[0].length,sh=rows.length;
  const c=document.createElement('canvas');c.width=sw;c.height=sh;
  const g=c.getContext('2d');
  rows.forEach((row,y)=>{for(let x=0;x<sw;x++){const ch=row[x];
    if(ch!=='.'&&PAL[ch]){g.fillStyle=PAL[ch];g.fillRect(x,y,1,1);}}});
  SPR[name]=c;
}
function drawSpr(s,dx,dy,w=16,h=16,flipX=false,squash=0){
  const img=SPR[s];
  if(!img)return;
  if(flipX || squash > 0){
    ctx.save();
    ctx.translate(dx + (w >> 1), dy + (h >> 1));
    if(flipX) ctx.scale(-1, 1);
    if(squash > 0) ctx.scale(1.25, 0.75); // เด้งยุบตัวเมื่อโดนโจมตี
    ctx.drawImage(img, 0, 0, img.width, img.height, -(w >> 1), -(h >> 1), w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, w, h);
  }
}


/* ── ธีมฉาก ๕ โซนตามระดับชั้น (Dynamic Biomes) ── */
const BIOMES = [
  { name: 'โถงวิหารศิลา', tint: 'rgba(245,197,66,0.06)', particle: '#f5c542' },
  { name: 'ถ้ำบาดาลนาคราช', tint: 'rgba(46,196,166,0.08)', particle: '#2ec4a6' },
  { name: 'คุกมารเพลิงกัลป์', tint: 'rgba(255,139,31,0.09)', particle: '#ff8b1f' },
  { name: 'ท้องพระโรงทศกัณฐ์', tint: 'rgba(229,72,46,0.07)', particle: '#f5c542' },
  { name: 'ห้วงสุญญากาศอเวจี', tint: 'rgba(141,85,201,0.09)', particle: '#8d55c9' }
];

function getBiome(fl){
  if(fl <= 5) return BIOMES[0];
  if(fl <= 10) return BIOMES[1];
  if(fl <= 15) return BIOMES[2];
  if(fl <= 20) return BIOMES[3];
  return BIOMES[4];
}

/* ── แผ่นกระเบื้อง (วาดแบบสุ่มมีพื้นผิว) ── */
const TILEC=[];
(function(){
  for(const v of [0,1]){
    const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
    g.fillStyle='#54372a';g.fillRect(0,0,T,T);
    g.fillStyle='#3d2418';
    g.fillRect(0,3,T,1);g.fillRect(0,11,T,1);
    for(let x=(v?6:2);x<T;x+=7)g.fillRect(x,0,1,3);
    for(let x=(v?2:9);x<T;x+=7)g.fillRect(x,4,1,7);
    for(let x=(v?8:4);x<T;x+=7)g.fillRect(x,12,1,4);
    g.fillStyle='#6b4634';g.fillRect(0,0,T,1);
    TILEC[0]=TILEC[0]||[];TILEC[0].push(c);
  }
  for(const v of [0,1]){
    const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
    g.fillStyle='#241322';g.fillRect(0,0,T,T);
    g.fillStyle='#2e1a2c';
    for(let i=0;i<7;i++)g.fillRect((v*5+i*5)%15,(i*7+v*3)%15,1,1);
    if(v){g.fillStyle='#5c4a1e';g.fillRect(11,5,1,1);}
    TILEC[1]=TILEC[1]||[];TILEC[1].push(c);
  }
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#0b0512';g.fillRect(0,0,T,T);
   g.strokeStyle='#2ec4a6';g.beginPath();g.arc(8,8,5,0,5);g.stroke();
   g.strokeStyle='#f5c542';g.beginPath();g.arc(8,8,2.5,1,6);g.stroke();
   g.fillStyle='#f5c542';g.fillRect(7,7,2,2);TILEC[2]=[c];}
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#241322';g.fillRect(0,0,T,T);
   g.fillStyle='#6e1f2b';g.fillRect(2,9,12,6);
   g.fillStyle='#8f2438';g.fillRect(3,10,10,1);
   g.fillStyle='#f5c542';g.fillRect(3,8,10,1);g.fillRect(6,4,4,5);g.fillRect(7,2,2,2);
   TILEC[3]=[c];}
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#241322';g.fillRect(0,0,T,T);
   g.fillStyle='#4a1620';g.fillRect(2,9,12,6);g.fillStyle='#7a5a10';g.fillRect(6,4,4,5);
   TILEC[4]=[c];}
  // สระน้ำอมฤต (5)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#122830';g.fillRect(0,0,T,T);
   g.strokeStyle='#2ec4a6';g.strokeRect(1,1,14,14);
   g.fillStyle='#185a5e';g.fillRect(3,3,10,10);
   g.fillStyle='#6fe0cd';g.fillRect(6,6,4,4);
   TILEC[5]=[c];}
  // กับดักบนพื้น (6)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#241322';g.fillRect(0,0,T,T);
   g.strokeStyle='#d43d2a';g.strokeRect(3,3,10,10);
   g.fillStyle='#ff5a4d';g.fillRect(6,6,4,4);
   TILEC[6]=[c];}
  // แท่นบูชาบาปอสูรสีดำ (7)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#120409';g.fillRect(0,0,T,T);
   g.strokeStyle='#d43d2a';g.strokeRect(2,2,12,12);
   g.fillStyle='#8f2438';g.fillRect(4,8,8,6);
   g.fillStyle='#ff5a4d';g.fillRect(7,3,2,5);
   TILEC[7]=[c];}
  // กอเถาวัลย์/หญ้าโบราณ (8)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#1c2b18';g.fillRect(0,0,T,T);
   g.fillStyle='#326322';
   for(let x=2;x<14;x+=4){g.fillRect(x,4,2,8);g.fillRect(x+1,2,2,4);}
   g.fillStyle='#5cb33e';
   for(let x=3;x<13;x+=4){g.fillRect(x,3,1,4);g.fillRect(x+1,5,1,3);}
   TILEC[8]=[c];}
  // แอ่งน้ำธรรมชาติ (9)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#10232a';g.fillRect(0,0,T,T);
   g.fillStyle='#1a4854';g.fillRect(2,2,12,12);
   g.fillStyle='#3692a8';g.fillRect(4,4,8,8);
   g.fillStyle='#8ae2f5';g.fillRect(6,6,3,2);
   TILEC[9]=[c];}
  // แท่นศิลาถวายคำสัตย์แห่งพระอินทร์ (10)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#15091c';g.fillRect(0,0,T,T);
   g.strokeStyle='#f5c542';g.strokeRect(2,2,12,12);
   g.fillStyle='#41236d';g.fillRect(4,4,8,8);
   g.fillStyle='#ffe9a3';g.fillRect(7,6,2,4);
   TILEC[10]=[c];}
  // เตาหลอมโอสถทิพย์แห่งหิมพานต์ (11)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#1c1209';g.fillRect(0,0,T,T);
   g.strokeStyle='#f5c542';g.strokeRect(2,2,12,12);
   g.fillStyle='#7a4a22';g.fillRect(3,6,10,7);
   g.fillStyle='#2ec4a6';g.fillRect(5,7,6,3); // น้ำยาฟองเดือด
   g.fillStyle='#ff8b1f';g.fillRect(6,12,4,2); // เปลวไฟใต้เตา
   TILEC[11]=[c];}
  // ศิลาจารึกวิญญาณโบราณ (12)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#120a16';g.fillRect(0,0,T,T);
   g.strokeStyle='#2ec4a6';g.strokeRect(3,2,10,12);
   g.fillStyle='#2c1524';g.fillRect(4,3,8,10);
   g.fillStyle='#6fe0cd';g.fillRect(6,5,4,2);g.fillRect(6,8,4,2);
   TILEC[12]=[c];}
  // ตลาดมืดอสูร (13)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#100306';g.fillRect(0,0,T,T);
   g.strokeStyle='#d43d2a';g.strokeRect(2,2,12,12);
   g.fillStyle='#5c1422';g.fillRect(4,4,8,8);
   g.fillStyle='#ff2200';g.fillRect(6,6,4,4); // ตราสัญลักษณ์มาร
   TILEC[13]=[c];}
  // บ่อนสกาพญาพาลี (14)
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#1c1006';g.fillRect(0,0,T,T);
   g.strokeStyle='#f5c542';g.strokeRect(2,2,12,12);
   g.fillStyle='#7a4a22';g.fillRect(3,3,10,10);
   g.fillStyle='#ffffff';g.fillRect(5,5,3,3);g.fillRect(8,8,3,3); // ลูกเต๋าขาวคู่
   g.fillStyle='#000000';g.fillRect(6,6,1,1);g.fillRect(9,9,1,1);
   TILEC[14]=[c];}
})();

/* ── ตารางข้อมูล ── */

/* ── ระบบแนะนำเบื้องต้นสำหรับผู้เล่นใหม่ (New Player Hints & Tooltips) ── */
function showHint(id, text){
  try {
    if(localStorage.getItem('lanka_hint_' + id)) return;
    localStorage.setItem('lanka_hint_' + id, '1');
  } catch(e){}

  let banner = $('hintBanner');
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'hintBanner';
    banner.style.position = 'fixed';
    banner.style.top = '14px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.background = 'linear-gradient(135deg, #1d1222, #0d0611)';
    banner.style.border = '2px solid var(--teal)';
    banner.style.boxShadow = '0 0 20px rgba(46,196,166,.5), 0 4px 14px #000';
    banner.style.padding = '8px 16px';
    banner.style.borderRadius = '6px';
    banner.style.zIndex = '550';
    banner.style.maxWidth = '360px';
    banner.style.width = '90%';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';
    banner.style.fontSize = '12.5px';
    banner.style.color = '#fff';
    banner.style.lineHeight = '1.45';
    banner.style.transition = 'opacity .4s, transform .4s';
    banner.style.cursor = 'pointer';
    document.body.appendChild(banner);
    banner.onclick = () => { banner.style.opacity = '0'; banner.style.transform = 'translateX(-50%) translateY(-20px)'; };
  }

  banner.innerHTML = '<span style="font-size:22px;flex-shrink:0">💡</span><div>' + text + '<br><small class="dim" style="font-size:10.5px">(แตะเพื่อปิดคำแนะนำ)</small></div>';
  banner.style.opacity = '1';
  banner.style.transform = 'translateX(-50%) translateY(0)';
  sfx.pick();

  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 7500);
}


/* ── ๕. ระบบฉายาแห่งกรรม (Dynamic Hero Titles & Epithets) ── */
function checkHeroTitle(){
  if(player.killsTotal >= 35 && player.title !== '«เพชฌฆาตไร้ปรานี»'){
    player.title = '«เพชฌฆาตไร้ปรานี»';
    msg('👑 ได้รับสมญาใหม่: ' + player.title + ' (โจมตีแรงขึ้นเมื่อเลือดต่ำ)', 'good');
    sfx.level();
  } else if(player.punya >= 100 && player.title !== '«มหาบุญญาธิการ»'){
    player.title = '«มหาบุญญาธิการ»';
    msg('👑 ได้รับสมญาใหม่: ' + player.title + ' (เทวาลัยและยาฟื้นเลือด x๑.๕ เท่า)', 'good');
    sfx.level();
  }
}


/* ── ๔. ระบบขุดสายแร่ & ตีหลอมอาวุธเฉพาะตัว (Mining & Blacksmith) ── */
const ORES = [
  { id: 'ore_iron', name: 'แร่เหล็กไหลหิมพานต์', icon: '🪨', boostAtk: 4, desc: 'หลอมเพิ่มพลังโจมตี +๔ ถาวร', r: 'rare', lore: 'ก้อนแร่เหล็กเนื้อตันลึกลับที่ดูดซับไอธรณี' },
  { id: 'ore_gold', name: 'แร่ทองคำบริสุทธิ์', icon: '🪙', boostGold: 35, desc: 'หลอมเพิ่มอัตราดรอปเงิน +๓๕%', r: 'rare', lore: 'ทองคำสุกปลั่งบริสุทธิ์จากสะดือวิหาร' },
  { id: 'ore_meteor', name: 'แร่อุกกาบาตดาวตก', icon: '☄️', boostCrit: 15, desc: 'หลอมเพิ่มคริติคอล +๑๕% และอัสนีบาต', r: 'legendary', lore: 'สะเก็ดดาวตกจากสรวงสวรรค์ อาบรังสีอัสนีบาต' }
];

function genOre(){
  const o = pick(ORES);
  return {
    t: 'ore',
    oreId: o.id,
    name: o.name,
    icon: o.icon,
    desc: o.desc,
    boostAtk: o.boostAtk || 0,
    boostGold: o.boostGold || 0,
    boostCrit: o.boostCrit || 0,
    r: o.r,
    lore: o.lore,
    price: 40 + floor * 2
  };
}

function smithInfuseWeapon(oreItem, invIdx){
  if(!player.wpn){ msg('ไม่มีอาวุธที่จะหลอมแร่…', 'warn'); return; }
  player.wpn.infusedOres = player.wpn.infusedOres || [];
  player.wpn.infusedOres.push(oreItem);
  if(oreItem.boostAtk) player.wpn.v += oreItem.boostAtk;
  player.wpn.name += ' (หลอม' + oreItem.name.replace('แร่', '') + ')';
  player.inv.splice(invIdx, 1);
  sfx.level(); flash = 0.6; shake = 6;
  msg('🔨 ช่างตีดาบหลอมรวม «' + oreItem.name + '» เข้ากับ «' + player.wpn.name + '» สำเร็จ! ' + oreItem.desc, 'good');
  floats.push({x: player.x, y: player.y, t: 'หลอมศัสตราสำเร็จ!', c: '#f5c542', life: 2});
  updateHud();
}


/* ── ๓. ระบบบ่อนสกา & เสี่ยงโชคอสูร (Gambling Den) ── */
function openGamblingModal(gx, gy){
  let ov = $('gambleOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'gambleOv';
    ov.className = 'ov';
    ov.style.zIndex = '370';
    document.body.appendChild(ov);
  }

  let html = '<div class="panel" style="max-width:420px;border-color:var(--gold);box-shadow:0 0 28px rgba(245,197,66,.45);text-align:center">';
  html += '<div class="deva">द्यूतक्रीडा</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 6px;font-size:22px">🎲 บ่อนสกาพญาพาลี & เบี้ยอสูร</h2>';
  html += '<p style="font-size:13px;color:var(--ink);margin:0 0 12px">“ลงเดิมพันด้วยเหรียญทองกษาปณ์ ทอยลูกเต๋าคู่แข่งกับเจ้าสำนักสกา!”</p>';
  html += '<div class="chip gold" style="font-size:13px;margin-bottom:12px">เหรียญทองของคุณ: <b>◉ ' + player.gold + '</b></div>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">';
  html += '<button class="btn" id="btnBet10" ' + (player.gold >= 10 ? '' : 'disabled') + '>ทอยเดิมพัน ๑๐ ◉ (ลุ้นรับ ๒๐ ◉)</button>';
  html += '<button class="btn" id="btnBet25" ' + (player.gold >= 25 ? '' : 'disabled') + '>ทอยเดิมพัน ๒๕ ◉ (ลุ้นรับ ๕๐ ◉ + อัญมณีลับ)</button>';
  html += '<button class="btn" id="btnBet50" ' + (player.gold >= 50 ? '' : 'disabled') + '>ทอยเดิมพัน ๕๐ ◉ (ลุ้นรับ ๑๐๐ ◉ + คัมภีร์เทวะ)</button>';
  html += '<button class="btn ghost" id="btnCloseGamble">เดินออกจากวงสกา</button>';
  html += '</div></div>';

  ov.innerHTML = html;
  show(ov);

  const rollDice = (bet) => {
    player.gold -= bet;
    const playerRoll = 1 + R(6) + 1 + R(6);
    const houseRoll = 1 + R(6) + 1 + R(6);
    sfx.pick();

    if(playerRoll > houseRoll){
      const winGold = bet * 2;
      player.gold += winGold;
      let extra = '';
      if(bet >= 25 && rng() < 0.5){
        const gm = genGem(); player.inv.push(gm);
        extra = ' และได้รับ «' + gm.name + '»!';
      }
      msg('🎲 เจ้าทอยได้ ' + playerRoll + ' ชนะเจ้าสำนัก (' + houseRoll + ')! ได้รับ ◉' + winGold + extra, 'good');
      floats.push({x: player.x, y: player.y, t: 'ชนะสกา +◉' + winGold, c: '#f5c542', life: 2});
      sfx.gold();
    } else if(playerRoll < houseRoll){
      msg('🎲 เจ้าทอยได้ ' + playerRoll + ' พ่ายแพ้แก่เจ้าสำนัก (' + houseRoll + ')! เสียเหรียญ ◉' + bet, 'warn');
      sfx.hurt();
    } else {
      player.gold += bet;
      msg('🎲 เสมอกัน (' + playerRoll + ')! ได้รับเหรียญเดิมพันคืน', 'good');
    }
    updateHud();
    hide(ov);
  };

  $('btnBet10').onclick = () => rollDice(10);
  $('btnBet25').onclick = () => rollDice(25);
  $('btnBet50').onclick = () => rollDice(50);
  $('btnCloseGamble').onclick = () => hide(ov);
}


/* ── ๒. ระบบร่างอวตาร / ทรงเจ้าเทวฤทธิ์ (Ultimate Awakening) ── */
const AVATAR_POWERS = {
  ksatriya: { name: 'พระนารายณ์ ๔ กร', icon: '👑', desc: 'กวาดดาบ ๔ ทิศรอบตัวทุกก้าว และเป็นอมตะชั่วคราว!' },
  vanara: { name: 'หนุมาน ๔ หน้า ๘ กร', icon: '🐒', desc: 'หาวเป็นดาวเป็นเดือน เดินไวเบิ้ล ๒ ก้าว และหลบหลีก ๘๐%!' },
  brahmin: { name: 'พระพิฆเนศวรปัญญา', icon: '📿', desc: 'ร่ายคาถาทุกบท ๐ MP และดาเมจเวทมนตร์ x๒ เท่า!' },
  rishi: { name: 'พระศิวะเบิกเนตรที่สาม', icon: '🧘', desc: 'ระเบิดเพลิงเผาผลาญกิเลสศัตรูทั้งห้อง ๑๔ ดาเมจทุกเทิร์น!' },
  bibhek: { name: 'พญายักษ์เทวราช', icon: '👁️', desc: 'สะท้อนการโจมตีและเวทมนตร์กลับใส่ศัตรู ๑๐๐%!' },
  garuda: { name: 'พญาปักษาเพลิงกาฬ', icon: '🦅', desc: 'สยายปีกไฟพุ่งบินชนทะลุศัตรูและกำแพง ๒๒ ดาเมจ!' }
};

function triggerAwaken(){
  if(state !== 'play' || !player) return;
  if(player.awakenGauge < player.maxAwaken){
    msg('เกจเทวฤทธิ์ยังไม่เต็ม! (' + player.awakenGauge + '/' + player.maxAwaken + '%)', 'warn');
    return;
  }
  const av = AVATAR_POWERS[player.cls] || AVATAR_POWERS.ksatriya;
  player.isAwakened = 12; // อยู่ได้ 12 เทิร์น
  player.awakenGauge = 0;
  flash = 0.8; shake = 10; sfx.boss();
  floats.push({x: player.x, y: player.y, t: '✦ ทรงเครื่อง ' + av.name + '!', c: '#f5c542', life: 2.5});
  msg('✦ ทรงเจ้าเทวฤทธิ์! เจ้าอวตารเป็น «' + av.name + '»! ' + av.desc, 'good');
  updateHud();
}


/* ── ๑. ระบบสภาพอากาศ & ปรากฏการณ์อาถรรพ์ (Floor Omens & Weather) ── */
let currentOmen = null;

const OMENS = [
  { id: 'eclipse', name: 'สุริยุปราคา', icon: '🌑', desc: 'ความมืดมิดครอบคลุม คบไฟหดสั้น ศัตรูคริติคอล x๒ แต่แต้มปุญ x๒ เท่า!' },
  { id: 'rain', name: 'พิรุณโบกขรพรรษ', icon: '🌧️', desc: 'ฝนทิพย์ตก แอ่งน้ำผุดทั่วห้อง ฮีลแรง x๒ และสายฟ้าช็อตกระจาย x๒!' },
  { id: 'tremor', name: 'เพลิงกัลป์ปะทุ', icon: '🌋', desc: 'ธรณีสั่นไหว รอยแยกลาวาและไฟไหม้สุ่มเกิดตามทางเดิน มอนสเตอร์ไฟตีแรงขึ้น' },
  { id: 'mist', name: 'หมอกอสูรลวงตา', icon: '🌫️', desc: 'หมอกควันหนาทึบ มอนสเตอร์สร้างเงาลวงตา ต้องสังเกตหาตัวจริง' }
];


/* ── ๕. ระบบเพลิงกรรมท้าทาย (Ascension / Heat Modifiers) ── */
let heatSettings = {
  toughFoes: false,   // ศัตรูเลือด +30%
  moreTraps: false,   // กับดัก ๒ เท่า
  costlyShops: false, // ร้านค้าแพงขึ้น 50%
  darkTorches: false  // คบไฟมืดสนิท
};

function getHeatMultiplier(){
  let mult = 1.0;
  if(heatSettings.toughFoes) mult += 0.35;
  if(heatSettings.moreTraps) mult += 0.30;
  if(heatSettings.costlyShops) mult += 0.35;
  if(heatSettings.darkTorches) mult += 0.50;
  return mult;
}

function openHeatModal(){
  let ov = $('heatOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'heatOv';
    ov.className = 'ov';
    ov.style.zIndex = '360';
    document.body.appendChild(ov);
  }

  let html = '<div class="panel" style="max-width:420px;border-color:#ff8b1f;box-shadow:0 0 28px rgba(255,139,31,.45);text-align:center">';
  html += '<div class="deva" style="color:#ff8b1f">तपस्</div>';
  html += '<h2 style="font-family:Chakra Petch;color:#ff8b1f;margin:2px 0 6px;font-size:22px">🔥 เพลิงกรรมท้าทาย (Heat Modifiers)</h2>';
  html += '<p style="font-size:12.5px;color:var(--ink);margin:0 0 12px">เปิดรับบททดสอบอันหนักหน่วง เพื่อรับแต้มบารมีสะสมทวีคูณ (x' + getHeatMultiplier().toFixed(2) + ')</p>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;text-align:left;margin-bottom:14px;font-size:13px">';
  
  html += '<label class="row" style="cursor:pointer"><span>👹 อสูรกายคลั่ง (ศัตรูเลือด +๓๐%)</span><input type="checkbox" id="chkHeat1" ' + (heatSettings.toughFoes ? 'checked' : '') + '></label>';
  html += '<label class="row" style="cursor:pointer"><span>⚙️ ดงขวากหนาม (กับดักในวิหาร x๒ เท่า)</span><input type="checkbox" id="chkHeat2" ' + (heatSettings.moreTraps ? 'checked' : '') + '></label>';
  html += '<label class="row" style="cursor:pointer"><span>💰 ตลาดขูดรีด (ร้านค้าราคาแพงขึ้น ๕๐%)</span><input type="checkbox" id="chkHeat3" ' + (heatSettings.costlyShops ? 'checked' : '') + '></label>';
  html += '<label class="row" style="cursor:pointer"><span>🌑 ราตรีทมิฬ (คบไฟมืดสนิทเหลือ ๒.๕ ช่อง)</span><input type="checkbox" id="chkHeat4" ' + (heatSettings.darkTorches ? 'checked' : '') + '></label>';

  html += '</div>';
  html += '<button class="btn" id="btnCloseHeat" style="width:100%">ยืนยันบททดสอบ</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  $('chkHeat1').onchange = (e) => { heatSettings.toughFoes = e.target.checked; };
  $('chkHeat2').onchange = (e) => { heatSettings.moreTraps = e.target.checked; };
  $('chkHeat3').onchange = (e) => { heatSettings.costlyShops = e.target.checked; };
  $('chkHeat4').onchange = (e) => { heatSettings.darkTorches = e.target.checked; };

  $('btnCloseHeat').onclick = () => hide(ov);
}


/* ── ๔. ระบบกับดักพกพาของผู้เล่น (Deployable Traps & Player Tools) ── */
const PLAYER_TOOLS = [
  { id: 'bear_trap', name: 'กับดักหนามพับได้', icon: '⚙️', desc: 'วางดักบนพื้น ศัตรูเหยียบโดนดาเมจ ๑๕ และล็อคขา ๓ เทิร์น', lore: 'กับดักเหล็กกล้าฟันปลา ล่อมอนสเตอร์มาเหยียบเพื่อสกัดการเคลื่อนที่' },
  { id: 'smoke_bomb', name: 'ระเบิดควันพรางตัว', icon: '💨', desc: 'ระเบิดม่านควันหนาทึบ ศัตรูในควันตาบอดตีไม่โดน ๕ เทิร์น', lore: 'ควันสมุนไพรฉุนแสบตา ทำให้ศัตรูสูญเสียทัศนวิสัย' },
  { id: 'decoy_straw', name: 'หุ่นฟางล่อเป้า', icon: '🎎', desc: 'วางหุ่นจำลองล่อให้ศัตรูทั้งห้องรุมเข้าไปตีหุ่นแทนเรา', lore: 'หุ่นฟางลงยันต์ลวงตา ดึงดูดความสนใจของอสูรร้าย' }
];

function genPlayerTool(){
  const t = pick(PLAYER_TOOLS);
  return {
    t: 'player_tool',
    toolId: t.id,
    name: t.name,
    icon: t.icon,
    desc: t.desc,
    r: 'rare',
    lore: t.lore,
    price: 35 + floor * 2
  };
}

let playerDeployedTraps = []; // รายการกับดักที่ผู้เล่นวาง {x, y, id, life}


/* ── ๒. ระบบเสบียงอาหาร & พลังกาย (Hunger & Sacred Rations) ── */
const RATIONS = [
  { id: 'banana', name: 'กล้วยทิพย์', icon: '🍌', hunger: 35, heal: 6, desc: 'ฟื้นฟูพลังกาย +๓๕ และฟื้นเลือด +๖', lore: 'กล้วยป่าในหิมพานต์ หวานหอมเพิ่มกำลังวังชา' },
  { id: 'cashew', name: 'มะม่วงหิมพานต์', icon: '🥜', hunger: 55, haste: 15, desc: 'ฟื้นฟูพลังกาย +๕๕ และเดินไว ๑๕ เทิร์น', lore: 'เม็ดมะม่วงหิมพานต์คั่วไฟ ปลุกสัญชาตญาณความปราดเปรียว' },
  { id: 'jujube', name: 'พุทราทองคำ', icon: '🍎', hunger: 100, heal: 20, desc: 'อิ่มเต็ม ๑๐๐% ฟื้นเลือด +๒๐ และล้างดีบัฟ', lore: 'ผลไม้สวรรค์ที่ร่วงหล่นจากต้นกัลปพฤกษ์ ชุบชูพลังกายใจบริสุทธิ์' }
];

function genRation(){
  const r = pick(RATIONS);
  return {
    t: 'ration',
    rationId: r.id,
    name: r.name,
    icon: r.icon,
    hunger: r.hunger,
    heal: r.heal || 0,
    haste: r.haste || 0,
    desc: r.desc,
    r: 'common',
    lore: r.lore,
    price: 15 + floor * 2
  };
}


/* ── ๑. ระบบเจาะรูฝังอัญมณีนพเก้า (Gem Socketing) ── */
const GEMS = [
  { id: 'gem_ruby', name: 'ทับทิมเพลิง', icon: '🔴', color: '#ff3b30', desc: 'โจมตีธาตุไฟ +๕ และเผาศัตรู ๓ เทิร์น', lore: 'พลอยสีชาดแห่งสุริยเทพ ร้อนแรงแผดเผาอสูร' },
  { id: 'gem_emerald', name: 'มรกตนาคินทร์', icon: '🟢', color: '#34c759', desc: 'โจมตีเคลือบพิษ +๔ และต้านทานพิษ', lore: 'อัญมณีสีเขียวเหนี่ยวนำพิษพญานาค หลั่งไอพิษใส่ศัตรู' },
  { id: 'gem_sapphire', name: 'ไพลินวารี', icon: '🔵', color: '#007aff', desc: 'โจมตีธาตุเย็น ทำให้ศัตรูชะงักสโลว์ ๒ เทิร์น', lore: 'แก้วสีน้ำเงินมหาสมุทร แช่แข็งโลหิตอสูรให้ชะงักงัน' },
  { id: 'gem_moonstone', name: 'มุกดาหาร', icon: '⚪', color: '#f4ecdc', desc: 'ฟื้นฟูมานา +๒ MP ทุกครั้งที่ฟันโดน', lore: 'ไข่มุกราตรีแห่งจันทรา ซึมซับไอวิญญาณเปลี่ยนเป็นพลังมนตร์' },
  { id: 'gem_diamond', name: 'เพชรน้ำเอก', icon: '💎', color: '#f5c542', desc: 'พลังโจมตีเพียวๆ +๖ และคริ +๑๐%', lore: 'ยอดเพชรแห่งวิษณุเทพ คมกล้าตัดสรรพสิ่งไร้รอยต่อ' }
];

function genGem(){
  const g = pick(GEMS);
  return {
    t: 'gem',
    gemId: g.id,
    name: g.name,
    icon: g.icon,
    color: g.color,
    desc: g.desc,
    r: 'rare',
    lore: g.lore,
    price: 50 + floor * 3
  };
}

function socketGemToEquip(gemItem, invIdx){
  if(!player.wpn){ msg('ไม่มีอาวุธที่จะฝังอัญมณี…', 'warn'); return; }
  player.wpn.gems = player.wpn.gems || [];
  if(player.wpn.gems.length >= 2){
    msg('«' + player.wpn.name + '» ช่องฝังอัญมณีเต็มแล้ว (สูงสุด ๒ เม็ด)', 'warn');
    return;
  }
  player.wpn.gems.push(gemItem);
  player.wpn.name += ' [' + gemItem.name + ']';
  player.inv.splice(invIdx, 1);
  sfx.level(); flash = 0.5;
  msg('💎 ฝัง «' + gemItem.name + '» ลงใน «' + player.wpn.name + '» สำเร็จ! ' + gemItem.desc, 'good');
  floats.push({x: player.x, y: player.y, t: 'ฝังอัญมณีสำเร็จ!', c: gemItem.color, life: 1.8});
  updateHud();
}


/* ── ช่องสวมใส่ชิ้นที่ ๔: มงกุฎ / ชฎา / หน้ากาก (Headgear) ── */
const HEADGEAR_BASE = [
  { n: 'ผ้าโพกศีรษะโยคี', r: 'common', def: 1, mp: 6, desc: 'ป้องกัน +๑, มานา +๖', lore: 'ผ้าฝ้ายทอมือของนักพรต สวมใส่สบายจิตใจสงบ' },
  { n: 'รัดเกล้าทองแดง', r: 'common', def: 2, crit: 6, desc: 'ป้องกัน +๒, คริติคอล +๖%', lore: 'รัดเกล้าโบราณ เสริมความแม่นยำในการจู่โจม' },
  { n: 'ชฎาทองคำอโยธยา', r: 'rare', def: 2, mp: 16, mBoost: 25, desc: 'ป้องกัน +๒, มานา +๑๖, คาถาแรงขึ้น +๒๕%', lore: 'ชฎาทรงยอดแหลมทองคำสลักลายกนก เปล่งรัศมีแห่งพระเวท' },
  { n: 'หน้ากากพญายักษ์', r: 'rare', def: 4, atk: 2, desc: 'ป้องกัน +๔, โจมตี +๒, ข่มขวัญศัตรู', lore: 'หน้ากากอสูรเขี้ยวโง้ง น่าเกรงขามดุจนายทัพลงกา' },
  { n: 'รัดเกล้าเพชรสุริยะ', r: 'legendary', def: 3, crit: 18, atk: 4, desc: 'ป้องกัน +๓, คริติคอล +๑๘%, โจมตี +๔', lore: 'รัดเกล้าประดับเพชรน้ำเอก เปล่งรัศมีสุริยเทพตัดจุดตาย' },
  { n: 'หน้ากากวานรเผือก', r: 'legendary', def: 3, dodge: 18, desc: 'ป้องกัน +๓, หลบหลีก +๑๘%, คล่องตัวสูง', lore: 'หน้ากากรูปหนุมาน สวมใส่แล้วว่องไวดุจลมกรด' },
  { n: 'มงกุฎชัยพิชัยพรหมมาสตร์', r: 'mythic', def: 6, atk: 6, mp: 25, desc: 'โจมตี +๖, ป้องกัน +๖, มานา +๒๕, คริ +๑๐%', lore: 'ยอดมงกุฎแห่งพระราม ผู้ใดสวมใส่จะได้รับชัยชนะในทุกสมรภูมิ' }
];

function genHeadgear(tier){
  const t = clamp(tier || (1 + Math.floor(floorR() * (floor > 12 ? HEADGEAR_BASE.length : 4))), 1, HEADGEAR_BASE.length);
  const base = HEADGEAR_BASE[t - 1] || HEADGEAR_BASE[0];
  return {
    t: 'head',
    name: base.n,
    baseName: base.n,
    def: base.def || 0,
    atk: base.atk || 0,
    mp: base.mp || 0,
    crit: base.crit || 0,
    dodge: base.dodge || 0,
    mBoost: base.mBoost || 0,
    r: base.r,
    desc: base.desc,
    lore: base.lore,
    price: (t * 35) + 20
  };
}


const CLASS_TALENTS = {
  ksatriya: [
    { id: 'k_rage', name: 'ขัตติยมานะ', icon: '👑', desc: 'เมื่อเลือดต่ำกว่า ๓๕% พลังโจมตีและคริติคอลเพิ่มเป็น ๒ เท่า' },
    { id: 'k_fort', name: 'เกราะปราการ', icon: '🛡️', desc: 'พลังป้องกันถาวร +๓ และสะท้อนดาเมจ ๓ หน่วยใส่ศัตรู' },
    { id: 'k_cleave', name: 'สังหารต่อเนื่อง', icon: '⚔️', desc: 'เมื่อสังหารศัตรู มีโอกาส ๖๐% ฟันฟรีใส่ศัตรูรอบข้างทันที' },
    { id: 'k_heart', name: 'หทัยราชันย์', icon: '❤️', desc: 'เลือดสูงสุด +๒๐ และพลังโจมตีกายภาพ +๔ ถาวร' },
    { id: 'k_pierce', name: 'เพลงดาบอโยธยา', icon: '🗡️', desc: 'คริติคอล +๑๕% และโจมตีทะลุเกราะศัตรู ๒๕%' },
    { id: 'k_fury', name: 'โทสะกษัตริย์', icon: '🔥', desc: 'ทุกครั้งที่โดนโจมตี พลังโจมตีเพิ่มขึ้น +๑ ในห้องนั้น (สูงสุด +๘)' }
  ],
  brahmin: [
    { id: 'b_boost', name: 'ฌานเพ่ง', icon: '✹', desc: 'คาถาอัคนีและวัชระแรงขึ้น ๓๕%' },
    { id: 'b_drain', name: 'มนตราดูดวิญญาณ', icon: '🔮', desc: 'สังหารศัตรูด้วยคาถา ฟื้นมานาคืน ๕ หน่วยทันที' },
    { id: 'b_shield', name: 'รัศมีคุ้มกาย', icon: '✨', desc: 'ใช้พลังมนตร์ซับดาเมจแทนเลือด ๕๐% เมื่อโดนโจมตี' },
    { id: 'b_vaju', name: 'มหาเวทวายุ', icon: '❋', desc: 'คาถาวายุรัศมีกว้างขึ้นเป็น ๓ ช่อง และผลักศัตรูกระเด็น' },
    { id: 'b_amrita', name: 'อมฤตทิพย์', icon: '✚', desc: 'คาถาอมฤตฟื้นเลือดแรงขึ้น +๑๕ และล้างพิษ/ไฟให้อัตโนมัติ' },
    { id: 'b_pure', name: 'จิตบริสุทธิ์', icon: '📿', desc: 'พลังมนตร์สูงสุด +๒๐ และลดค่าร่ายทุกคาถาลง ๒ หน่วย' }
  ],
  vanara: [
    { id: 'v_counter', name: 'ลิงลมเหยียบหัว', icon: '🐒', desc: 'เมื่อหลบหลีกการโจมตีสำเร็จ จะฟันสวนกลับ (Counter) ทันที' },
    { id: 'v_crit', name: 'เปิดจุดตาย', icon: '🎯', desc: 'อัตราคริติคอลพุ่งขึ้น +๒๐% ถาวร' },
    { id: 'v_haste', name: 'ก้าวพริบตา', icon: '⚡', desc: 'มีโอกาส ๓๕% โจมตีแล้วไม่เสียเทิร์น (โจมตีเบิ้ลฟรี)' },
    { id: 'v_throw', name: 'ตรีเพชรซัด', icon: '🏹', desc: 'อาวุธขว้างแรงขึ้น ๒ เท่า และระยะขว้าง +๒ ช่อง' },
    { id: 'v_stealth', name: 'วานรแปลงกาย', icon: '🍃', desc: 'หลบหลีกถาวร +๑๕% และศัตรูมองเห็นเรายากขึ้น' },
    { id: 'v_wind', name: 'ลิงลมคะนอง', icon: '💨', desc: 'เมื่อเลือดเต็ม อัตราหลบหลีกเพิ่มเป็น ๕๐%' }
  ],

  bibhek: [
    { id: 'bi_sight', name: 'ญาณหยั่งรู้', icon: '👁️', desc: 'มองเห็นกับดักและห้องลับทั้งหมดบนแผนที่โดยอัตโนมัติ' },
    { id: 'bi_heart', name: 'ถอดดวงใจ', icon: '💎', desc: 'เมื่อโดนดาเมจถึงตาย มีโอกาส ๕๐% วาร์ปหนีพร้อมฟื้นเลือดครึ่งหนึ่ง' },
    { id: 'bi_divine', name: 'โหราศาสตร์เทวะ', icon: '✨', desc: 'ได้รับเหรียญและแต้มปุญจากทุกแหล่งเพิ่มขึ้น ๕๐%' },
    { id: 'bi_curse', name: 'มนต์สะกดมาร', icon: '📜', desc: 'ศัตรูทุกตัวในห้องมีโอกาส ๓๐% ติดสถานะมึนงงตั้งแต่เริ่มเห็น' },
    { id: 'bi_shield', name: 'ยันต์เกราะเพชร', icon: '🛡️', desc: 'พลังป้องกันถาวร +๔ และสะท้อนเวทมนตร์' },
    { id: 'bi_moksha', name: 'เนตรธรรมะ', icon: '🪷', desc: 'คาถาทุกบทใช้พลังมนตร์ลดลง ๓ หน่วย และแรงขึ้น ๒๕%' }
  ],
  garuda: [
    { id: 'ga_fly', name: 'เวหาเหิน', icon: '🪶', desc: 'บินลอยเหนือพื้นดิน ไม่มีวันเหยียบโดนกับดักใดๆ ในดันเจี้ยน' },
    { id: 'ga_naga', name: 'ศัตรูคู่นาคิน', icon: '🐍', desc: 'โจมตีศัตรูประเภทนาคพิษแรงขึ้นเป็น ๒ เท่า และต้านพิษ ๑๐๐%' },
    { id: 'ga_wind', name: 'ปีกพายุหมุน', icon: '🌪️', desc: 'เมื่อโจมตี จะสะบัดพายุกวาดศัตรูรอบตัวกระเด็น ๑ ช่อง' },
    { id: 'ga_dive', name: 'โฉบทะลวง', icon: '⚡', desc: 'ก้าวแรกที่เดินเข้าตีศัตรู การันตีคริติคอล ๑๐๐%' },
    { id: 'ga_talon', name: 'กรงเล็บเพชร', icon: '🦅', desc: 'พลังโจมตีกายภาพ +๕ และเพิ่มอัตราคริติคอล +๒๐%' },
    { id: 'ga_roan', name: 'เสียงร้องก้องนภา', icon: '📢', desc: 'ทุกครั้งที่ฆ่าศัตรู ศัตรูตัวอื่นในห้องจะชะงักหยุดเดิน ๑ เทิร์น' }
  ],
  rishi: [
    { id: 'r_rest', name: 'ตบะฌาน', icon: '🧘', desc: 'ทุกครั้งที่กดยืนพักสำรวมลมปราณ (●) จะฟื้นเลือด ๓ หน่วย' },
    { id: 'r_punya', name: 'ปุญฤทธิ์', icon: '✦', desc: 'พลังโจมตีและป้องกันเพิ่มขึ้นตามแต้มปุญ (ทุก ๕๐ ปุญ = ATK+๑, DEF+๑)' },
    { id: 'r_sight', name: 'ตาทิพย์', icon: '👁️', desc: 'มองเห็นกับดักบนพื้นทั้งหมด และขยายระยะมองเห็น +๒ ช่อง' },
    { id: 'r_indra', name: 'พรพระอินทร์', icon: '🛕', desc: 'เทวาลัยและสระอมฤตมอบบัฟสเตตัสถาวรเพิ่มขึ้น ๒ เท่า' },
    { id: 'r_immune', name: 'กายทิพย์', icon: '🛡️', desc: 'ต้านทานสถานะติดพิษและติดไฟโดยสมบูรณ์' },
    { id: 'r_rebirth', name: 'มนต์ชุบวิญญาณ', icon: '💎', desc: 'เมื่อเลือดหมด มีโอกาส ๕๐% ชุบชีวิตฟื้นคืนชีพ ๑ ครั้ง' }
  ]
};


const RARITY_COLORS = {
  common: '#f4ecdc',
  rare: '#2ec4a6',
  legendary: '#f5c542',
  mythic: '#e5482e'
};

const RARITY_NAMES = {
  common: 'ทั่วไป',
  rare: 'หายาก',
  legendary: 'ตำนาน',
  mythic: 'เทวะ/มาร'
};

const WEAPON_TYPES = {
  dagger: { name: 'มีดสั้น/กริช', icon: '🗡️', desc: 'โอกาสฟันเบิ้ล ๒ ครั้งติด และคริติคอลสูง' },
  spear: { name: 'หอกยาว/ตรีศูล', icon: '🔱', desc: 'แทงทะลุระยะ ๒ ช่องโดยไม่ต้องประชิด' },
  mace: { name: 'กระบองหนัก', icon: '🔨', desc: 'ดาเมจทะลุเกราะ ๕๐% และทุบกระเด็น ๑ ช่อง' },
  cleave: { name: 'อาวุธกวาด', icon: '🪓', desc: 'ฟันกวาดศัตรูทุกตัวรอบตัวพร้อมกัน' },
  bow: { name: 'ธนู/หน้าไม้', icon: '🏹', desc: 'ยิงทะลวงระยะไกล ๕ ช่องโดยไม่ต้องเสี่ยงประชิด' },
  whip: { name: 'แส้อัสนีบาต', icon: '⚡', desc: 'ฟาดระยะ ๒ ช่อง และกระตุกดึงศัตรูเข้ามาหาตัว' },
  claw: { name: 'กรงเล็บวานร', icon: '🐾', desc: 'รัวกรงเล็บ ๓ ฮิตติดกันอย่างบ้าคลั่ง' },
  fan: { name: 'พัดวายุสลายมาร', icon: '🪭', desc: 'พัดคลื่นลมกระแทกศัตรูกระเด็นถอยหลัง ๓ ช่อง' }
};

const WEAPON_BASE = [
  // Tier 1
  { n: 'มีดทองแดง', type: 'dagger', a: 3, r: 'common', lore: 'มีดสั้นหล่อจากทองแดงโบราณ น้ำหนักเบาว่องไว' },
  { n: 'หอกไม้ไผ่เหลา', type: 'spear', a: 3, r: 'common', lore: 'หอกไม้ไผ่ปลายแหลม แทงทะลวงได้ไกล ๒ ช่อง' },
  { n: 'กระบองศิลา', type: 'mace', a: 4, r: 'common', lore: 'กระบองหินเนื้อตัน ทุบหนักหน่วงกระเด็น' },
  { n: 'ขวานสำริด', type: 'cleave', a: 3, r: 'common', lore: 'ขวานด้ามสั้น คมกว้างตวัดฟันกวาดรอบตัว' },

  // Tier 2
  { n: 'กริชลายกนก', type: 'dagger', a: 5, r: 'rare', lore: 'กริชคดสลักลายกนก คมกริบแทงจุดตายฉับพลัน' },
  { n: 'หอกเหล็กกล้า', type: 'spear', a: 6, r: 'rare', lore: 'หอกเหล็กเหนียวใบพาย แทงทะลวงเกราะระยะ ๒ ช่อง' },
  { n: 'กระบองหนามเหล็ก', type: 'mace', a: 7, r: 'rare', lore: 'กระบองหุ้มเหล็กมีหนามแหลม ทุบกระดูกป่นทะลุเกราะ' },
  { n: 'ขรรค์อัคนี', type: 'cleave', a: 6, r: 'rare', lore: 'ขรรค์เพลิงสะบัดฟันเป็นวงกว้างรอบทิศ' },

  // Tier 3
  { n: 'กริชราพณ์', type: 'dagger', a: 9, r: 'legendary', lore: 'กริชอาถรรพ์ของอสูรรากษส ฟันเร็วประดุจสายลมพัด' },
  { n: 'ตรีศูลมหาราช', type: 'spear', a: 10, r: 'legendary', lore: 'ตรีศูลสามง่ามอันทรงฤทธานุภาพ แทงทะลวงวิญญาณ' },
  { n: 'กระบองยักษ์ทวารบาล', type: 'mace', a: 12, r: 'legendary', lore: 'กระบองยักษ์สลักยันต์ ทุบกระเด็นสะเทือนปฐพี' },
  { n: 'ขวานรามสูร', type: 'cleave', a: 11, r: 'legendary', lore: 'ขวานศักดิ์สิทธิ์ที่เคยสะบัดฟันล่อแก้วมณีเมขลา' },

  // Tier 4 (Epic / Mythic)
  { n: 'ขรรค์เพชรจุติ', type: 'dagger', a: 13, r: 'mythic', lore: 'กริชประกายเพชร ตัดเกราะมารได้ดุจตัดกระดาษ' },
  { n: 'หอกโมกขศักดิ์', type: 'spear', a: 15, r: 'mythic', lore: 'หอกวิเศษของกุมภกรรณ ไร้พ่ายในระยะ ๒ ช่อง' },
  { n: 'คทาพรหมมาสตร์', type: 'mace', a: 17, r: 'mythic', lore: 'คทาเทวะแห่งพระพรหม ทุบมารสะท้านตรีโลก' },
  { n: 'จักรสุทรรศน์', type: 'cleave', a: 16, r: 'mythic', lore: 'กงจักรประกายรังสีของพระนารายณ์ กวาดล้างอสูรสิ้น' },
  // Tier 5 (Supreme & Cursed - สเตตัสสูงมากแต่มีผลเสียต่อผู้ใช้)
  { n: 'ขรรค์กระหายเลือด', type: 'dagger', a: 22, r: 'mythic', cursed: 'blood_drain', curseDesc: 'สูบเลือดผู้ใช้ ๒ HP ทุกครั้งที่ฟันโดนศัตรู', lore: 'กริชอาถรรพ์ที่กระหายโลหิต ยิ่งฟันยิ่งบ้าคลั่งแต่สูบพลังชีวิตเจ้าของ' },
  { n: 'หอกวิญญาณสถิต', type: 'spear', a: 24, r: 'mythic', cursed: 'no_dodge', curseDesc: 'ระยะแทง ๒ ช่อง แต่ทำให้หลบหลีกกลายเป็น ๐%', lore: 'หอกโบราณที่ล่ามตรวนวิญญาณผู้ถือไว้กับพื้น แทงทะลวงไกลแต่ไร้ซึ่งความพริ้วไหว' },
  { n: 'กระบองมารพญายม', type: 'mace', a: 26, r: 'mythic', cursed: 'sluggish', curseDesc: 'ทุบกระเด็น ๒ ช่อง เจาะเกราะ ๑๐๐% แต่ตัวหนักอึ้งทุกๆ ๓ ก้าว', lore: 'กระบองเหล็กนรกที่หนักอึ้งดุจขุนเขา ทุบมารแหลกสลายแต่ถ่วงการก้าวเดิน' },
  { n: 'จักรโลหิตกาลกิณี', type: 'cleave', a: 25, r: 'mythic', cursed: 'max_half_heal', curseDesc: 'ฟันกวาดรอบทิศ คริ ๓๕% แต่ดื่มยาอมฤตได้ไม่เกินครึ่งหลอด', lore: 'กงจักรเปื้อนเลือดที่ปลุกสัญชาตญาณมาร กวาดล้างศัตรูแต่ปิดกั้นการฟื้นฟูกาย' }

];

const ARMOR_BASE = [
  { n: 'ผ้ามัสลิน', d: 1, r: 'common', lore: 'ผ้าฝ้ายทอเนื้อบาง สวมสบายคล่องตัว' },
  { n: 'เกราะหนังจามรี', d: 3, r: 'common', lore: 'เกราะหนังหนาเย็บสองชั้น ป้องกันคมดาบเบื้องต้น' },
  { n: 'เกราะโซ่ถัก', d: 5, r: 'rare', lore: 'เกราะห่วงเหล็กกล้าถักเหนียวแน่น ป้องกันการแทง' },
  { n: 'เกราะเกล็ดนาค', d: 8, r: 'legendary', lore: 'เกราะเกล็ดนาคเขียวมรกต แข็งแกร่งและเบาสบาย' },
  { n: 'เกราะวัชรัง', d: 11, r: 'legendary', lore: 'เกราะเพชรห่อหุ้มกาย ดาบมารแทงไม่ระคาย' },
  { n: 'เกราะสุริยะเทวะ', d: 15, r: 'mythic', lore: 'เกราะทองคำเปล่งรังสีสุริยเทพ ป้องกันสูงสุดในสามโลก' },
  { n: 'เกราะกระดูกอสูรทมิฬ', d: 18, r: 'mythic', cursed: 'drain_mp', curseDesc: 'เกราะหนามหาศาล แต่เผาผลาญพลังมนตร์ ๒ MP ทุกเทิร์น', lore: 'เกราะกระดูกของพญามารโบราณ แข็งแกร่งจนดาบแทงไม่ระคายแต่สูบกลืนไอเวท' },
  { n: 'เสื้อยันต์เพลิงอเวจี', d: 12, r: 'mythic', cursed: 'fire_vuln', curseDesc: 'พลังโจมตี +๖ สะท้อนไฟ แต่รับดาเมจจากไฟและพิษแรงขึ้น ๒ เท่า', lore: 'ผ้ายันต์อาบเปลวเพลิงนรก เพิ่มพลังรุกรานแต่ทำให้ผู้สวมทนไฟและพิษไม่ได้' }

];

const RELICS = [
  { id: 'naga_sash', name: 'สังวาลย์นาคราช', icon: '📿', r: 'rare', desc: 'ต้านทานพิษ ๑๐๐% และโจมตีศัตรูติดพิษ', lore: 'สายสังวาลย์ถักจากเกล็ดพญานาค หลั่งน้ำทิพย์ดับพิษร้าย' },
  { id: 'beads', name: 'ประคำร้อยแปด', icon: '📿', r: 'rare', desc: 'ลดการใช้พลังมนตร์คาถาลง ๕๐%', lore: 'ประคำไม้กฤษณานักพรต จิตบริสุทธิ์ใช้พลังมนตร์น้อยลง' },
  { id: 'ankh', name: 'มณีโมกษะ', icon: '💎', r: 'mythic', desc: 'ชุบชีวิตฟื้นคืนชีพ ๑ ครั้งเมื่อเลือดหมด!', lore: 'มณีศักดิ์สิทธิ์จากแดนสรวง ฉุดดวงวิญญาณกลับจากยมโลก' },
  { id: 'vanara_bangle', name: 'กำไลพญาวานร', icon: '💍', r: 'rare', desc: 'เพิ่มอัตราการหลบหลีก +๒๕%', lore: 'กำไลทองคำที่หนุมานประทานพร ร่างกายพลิ้วไหวดุจสายลม' },
  { id: 'diamond_ring', name: 'ธำมรงค์เพชร', icon: '💍', r: 'legendary', desc: 'เงินดรอป +๕๐% และคริติคอล +๑๕%', lore: 'แหวนเพชรเม็ดงาม ดึงดูดทรัพย์และโชคลาภการรบ' },
  { id: 'heart_ravana', name: 'ดวงใจทศกัณฐ์', icon: '❤️‍🔥', r: 'mythic', desc: 'โจมตี +๑๐ และดูดเลือด ๕ หน่วยเมื่อฆ่าศัตรู (แต่ศัตรูตีแรงขึ้น ๒๕%)', cursed: 'harder_foes', curseDesc: 'ศัตรูทั้งหมดในวิหารตีแรงขึ้น ๒๕%', lore: 'กล่องดวงใจของพญายักษ์ที่ยังเต้นตุบๆ มอบพลังมารมหาศาลแลกกับความคลั่งของศัตรู' },
  { id: 'ring_greed', name: 'ธำมรงค์คนโลภ', icon: '💍', r: 'legendary', desc: 'เงินดรอปเพิ่มเป็น ๒.๕ เท่า (แต่ทำเหรียญหล่นเมื่อโดนตี)', cursed: 'lose_gold_hit', curseDesc: 'ทำเหรียญทองหล่นหายตามดาเมจที่โดนตี', lore: 'แหวนทองคำสลักยันต์ดึงดูดทรัพย์ ยิ่งโลภยิ่งมั่งคั่งแต่เมื่อเพลี่ยงพล้ำทรัพย์ย่อมร่วงโรย' },
  { id: 'skull_rosary', name: 'ประคำกระดูกมาร', icon: '📿', r: 'mythic', desc: 'ร่ายคาถาทุกบทฟรี ๐ MP (แต่เสียพลังชีวิตแทน MP)', cursed: 'blood_magic', curseDesc: 'จ่ายพลังชีวิตแทนพลังมนตร์เมื่อร่ายอาคม', lore: 'สายประคำร้อยจากกะโหลกอสูร แลกไอโลหิตของตนเป็นมนตราทำลายล้าง' }

];


const WPN_AFFIXES = [
  { id: 'flame', name: 'เพลิงกัลป์', d: 'เผาศัตรู ๓ เทิร์น', c: '#ff8b1f' },
  { id: 'vamp', name: 'สูบโลหิต', d: 'ดูดเลือด ๒๕% จากดาเมจ', c: '#d43d2a' },
  { id: 'thunder', name: 'อัสนีบาต', d: 'มีโอกาสสตั๊น ๑ เทิร์น', c: '#f5c542' },
  { id: 'venom', name: 'พิษนาค', d: 'เคลือบพิษ ๔ เทิร์น', c: '#43b05c' },
  { id: 'sharp', name: 'คมกริบ', d: 'คริติคอลบ่อยขึ้น +๑๕%', c: '#2ec4a6' },
];

const ARM_AFFIXES = [
  { id: 'thorns', name: 'หนามอสูร', d: 'สะท้อนดาเมจ ๓ หน่วย', c: '#e5482e' },
  { id: 'regen', name: 'อมฤตชำระ', d: 'ฟื้นเลือด ๑ ทุก ๓ เทิร์น', c: '#2ec4a6' },
  { id: 'dodge', name: 'วายุพริ้ว', d: 'หลบหลีก +๑๕%', c: '#f5c542' },
  { id: 'resist', name: 'มนตราคุ้มกาย', d: 'ลดดาเมจไฟและพิษ ๕๐%', c: '#8d55c9' },
];


const TOOL_HOOK = {
  t: 'hook',
  name: 'ตะขอเกี่ยวศิลา',
  r: 'rare',
  icon: '🪝',
  lore: 'ตะขอเหล็กกล้าผูกเชือกสายสิญจน์ ใช้สอยเกี่ยวสมบัติที่ซ่อนอยู่ในซอกกำแพงหินลึก',
  price: 25
};

const THROWABLES = [
  { name: 'ศรพระราม', dmg: 22, range: 6, c: '#f5c542' },
  { name: 'หอกซัดเหล็ก', dmg: 14, range: 4, c: '#e8b06a' },
  { name: 'จักรกฤษณ์', dmg: 18, range: 5, c: '#2ec4a6' },
  { name: 'หม้อเพลิงอัคนี', dmg: 12, range: 4, c: '#ff8b1f', burn: 3 },
];

const CLASSES={
  ksatriya:{name:'กษัตริย์',sprite:'warrior',hp:30,mp:8,atk:6,def:3,dodge:5,
    mantras:['vajra@3'],desc:'ทายาทกรุงอโยธยา — เลือดและโจมตีสูงสุด'},
  brahmin:{name:'พราหมณ์',sprite:'brahmin',hp:20,mp:20,atk:4,def:2,dodge:5,
    mantras:['agni','heal'],desc:'ผู้ถือมนตรา เริ่มด้วยอัคนีและอมฤต'},
  vanara:{name:'วานร',sprite:'vanara',hp:24,mp:10,atk:5,def:2,dodge:20,
    mantras:['vaju@3'],desc:'ทหารลิงผู้ว่องไว หลบหลีก ๒๐%'},

  bibhek:{name:'พิเภก',sprite:'bibhek',hp:24,mp:24,atk:4,def:3,dodge:10,
    mantras:['heal','vajra'],desc:'พญายักษ์ผู้เปี่ยมญาณทิพย์ — มองเห็นกับดักและห้องลับทั้งหมดตั้งแต่ก้าวแรก',
    unlocked:false,req:'ชนะผ่านชั้น ๑๐ (ปราบมารีศ)'},
  garuda:{name:'พญาครุฑ',sprite:'garuda',hp:28,mp:12,atk:7,def:2,dodge:20,
    mantras:['vaju'],desc:'พญาราชปักษาแห่งเวหา — บินข้ามกับดักได้ และโจมตีนาคพิษแรงเป็น ๒ เท่า',
    unlocked:false,req:'สังหารนาคพิษสะสมครบ ๑๕ ตน'},
  rishi:{name:'ฤๅษี',sprite:'rishi',hp:22,mp:16,atk:3,def:2,dodge:8,
    mantras:['heal','agni@4'],desc:'นักพรตแห่งป่าทัณฑก สมดุลทุกด้าน'},
};
const MANTRAS={
  agni:{n:'อัคนี',mp:5,ic:'✹',d:'เพลิงสังหารศัตรูที่มองเห็น'},
  heal:{n:'อมฤต',mp:6,ic:'✚',d:'ฟื้นฟู ๑๐ + ๒×เลเวล'},
  vaju:{n:'วายุ',mp:8,ic:'❋',d:'พายุรอบตัว รัศมี ๒ ช่อง'},
  vajra:{n:'วัชระ',mp:12,ic:'⌁',d:'สายฟ้าพระอินทร์ โจมตีรุนแรง'},
};
const FOES=[
  {id:'preta',name:'เปรต',sprite:'preta',hp:8,atk:4,def:0,xp:6,g:3,min:1,max:7},
  {id:'asura',name:'อสุรกาย',sprite:'asura',hp:14,atk:6,def:1,xp:11,g:5,min:2,max:12},
  {id:'naga',name:'นาคพิษ',sprite:'naga',hp:12,atk:5,def:1,xp:13,g:6,min:3,max:13,ranged:true},
  {id:'rakshasa',name:'รากษส',sprite:'rakshasa',hp:22,atk:8,def:2,xp:19,g:9,min:6,max:16},
  {id:'yaksha',name:'ยักษ์ทวารบาล',sprite:'yaksha',hp:32,atk:10,def:3,xp:27,g:13,min:9,max:18},
];
const BOSSES={
  5:{name:'พญาขร',title:'นายทัพหน้าแห่งลงกา',sprite:'rakshasa',hp:65,atk:9,def:2,xp:70,g:30},
  10:{name:'มารีศ',title:'อสูรจำแลงกวางทอง',sprite:'asura',hp:110,atk:12,def:3,xp:120,g:50},
  15:{name:'กุมภกรรณ',title:'พญายักษ์หอกโมกขศักดิ์',sprite:'yaksha',hp:170,atk:15,def:5,xp:180,g:80},
  20:{name:'ทศกัณฐ์',title:'พญายักษ์ ๑๐ หน้า ๒๐ กร จ้าวแห่งลงกา',sprite:'boss',hp:260,atk:19,def:6,xp:0,g:120},
};
const WEAPONS=[null,{n:'ขรรค์เหล็ก',a:2},{n:'ขรรค์อัคนี',a:4},{n:'ตรีศูล',a:7},
  {n:'วัชระ',a:10},{n:'จักรสุทรรศน์',a:14}];
const ARMORS=[null,{n:'ผ้ามัสลิน',d:1},{n:'เกราะโซ่',d:3},{n:'เกราะเกล็ดนาค',d:5},
  {n:'เกราะวัชรัง',d:8},{n:'เกราะเทพ',d:11}];
const FLOOR_TITLES=['ประตูวิหาร','โถงเทียน','ระเบียงอสูร','คุกเปรต','ลานรากษส','ห้องมนตรา','อุโมงค์นาค','ท้องพระโรง'];
const ABYSS_TITLES=['ห้วงอเวจี','วังวนกรรม','เพลิงกัลป์','ลานวิญญาณ','ทะเลมาร','วิหารร้าง','มิติมายา','สังสารวัฏ'];

function getFoePool(fl){
  const pool = FOES.filter(f => fl >= f.min && fl <= f.max);
  return pool.length ? pool : FOES.slice(2); // ถ้าเกินชั้น 18 ให้ใช้ศัตรูระดับสูง (นาค, รากษส, ยักษ์)
}

function getBoss(fl){
  if(BOSSES[fl])return BOSSES[fl];
  if(fl%5===0 && fl>20){
    const cycle = Math.floor(fl/5) - 4;
    const btype = (Math.floor(fl/5)-1)%4;
    const names = ['พญาขร อเวจี', 'มารีศ อวตาร', 'กุมภกรรณ มารคลั่ง', 'ทศกัณฐ์ จุติใหม่'];
    const sprites = ['rakshasa', 'asura', 'yaksha', 'boss'];
    const baseHps = [85, 140, 210, 310];
    const baseAtks = [12, 15, 18, 23];
    return {
      name: names[btype] + ' (วัฏฏะ ' + thaiNum(cycle) + ')',
      sprite: sprites[btype],
      hp: baseHps[btype] + fl * 4,
      atk: baseAtks[btype] + Math.floor(fl * 0.4),
      def: 3 + Math.floor(fl * 0.2),
      xp: 160 + fl * 10,
      g: 50 + fl * 3
    };
  }
  return null;
}


/* ── สถานะเกม & เอฟเฟกต์ ── */

const PET_TYPES = {
  monkey: { name: 'ลูกลิงลม', s: 'vanara', desc: 'เก็บเหรียญทองรอบตัวอัตโนมัติ' },
  bird: { name: 'ลูกนกเวหา', s: 'garuda', desc: 'บินส่องเปิดหมอกสงครามล่วงหน้า' },
  naga: { name: 'ลูกพญานาค', s: 'naga', desc: 'พ่นพิษใส่ศัตรูระยะไกลเทิร์นละ ๑ ครั้ง' }
};

let dustParticles = [];
let bossSplash = null;

let state='title',map,seen,vis,player=null,enemies=[],npcs=[],items=[],traps=[];
let floor=1,seed=0,stairs={x:0,y:0,locked:false},kills={},time=0,endless=false;
let shake=0,flash=0,floats=[],logs=[];
let slashes=[],sparks=[]; // เอฟเฟกต์คมดาบและประกายไฟ
let playerBump={x:0,y:0,time:0}; // อนิเมชันพุ่งกระแทก


/* ── ระบบสังสารวัฏบารมี & กองอัฐิชาติก่อน ── */
function getKarma(){
  try {
    return JSON.parse(localStorage.getItem(KARMA_KEY)) || {
      pts: 0, goldLvl: 0, bagLvl: 0, hpLvl: 0, mpLvl: 0, luckLvl: 0, nagaKills: 0,
      unlockedBibhek: false, unlockedGaruda: false
    };
  } catch(e){
    return { pts: 0, goldLvl: 0, bagLvl: 0, hpLvl: 0, mpLvl: 0, luckLvl: 0, nagaKills: 0, unlockedBibhek: false, unlockedGaruda: false };
  }
}

function saveKarma(data){
  try { localStorage.setItem(KARMA_KEY, JSON.stringify(data)); } catch(e){}
}

function getSkel(){
  try { return JSON.parse(localStorage.getItem(SKEL_KEY)) || null; } catch(e){ return null; }
}

function openKarmaModal(){
  let ov = $('karmaOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'karmaOv';
    ov.className = 'ov';
    ov.style.zIndex = '350';
    document.body.appendChild(ov);
  }

  const k = getKarma();

  let html = '<div class="panel" style="max-width:440px;border-color:var(--gold);box-shadow:0 0 24px rgba(245,197,66,.4);text-align:center">';
  html += '<div class="deva">कर्म</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 4px;font-size:24px">🪷 หอพระบารมี (อัปเกรดถาวร)</h2>';
  html += '<p class="dim" style="font-size:13px;margin:0 0 10px">สะสมแต้มบารมีจากสังสารวัฏ เพื่อส่งต่อพลังสู่ชาติถัดไป</p>';
  html += '<div class="chip punya" style="font-size:14px;padding:6px 14px;margin-bottom:14px;display:inline-block">✦ แต้มบารมีคงเหลือ: <b>' + k.pts + '</b></div>';

  const upgrades = [
    { key: 'goldLvl', name: 'ทุนทรัพย์ชาติต้น', desc: 'เกิดมาพร้อมเหรียญทองติดตัว (+๒๐ ต่อขั้น)', max: 5, cost: 25 },
    { key: 'bagLvl', name: 'ถุงผ้าย่นระยะ', desc: 'ขยายช่องเก็บของในถุงผ้าถาวร (+๑ ช่องต่อขั้น)', max: 4, cost: 40 },
    { key: 'hpLvl', name: 'กายาคงกระพัน', desc: 'พลังชีวิตสูงสุดเริ่มต้นเพิ่มขึ้น (+๕ เลือดต่อขั้น)', max: 5, cost: 30 },
    { key: 'mpLvl', name: 'จิตสมาธิ', desc: 'พลังมนตร์สูงสุดเริ่มต้นเพิ่มขึ้น (+๔ มนตร์ต่อขั้น)', max: 5, cost: 30 },
    { key: 'luckLvl', name: 'โชคลาภแห่งกรรม', desc: 'เพิ่มอัตราดรอปอาวุธระดับหายากและหีบสมบัติ', max: 5, cost: 35 }
  ];

  html += '<div style="display:flex;flex-direction:column;gap:8px;text-align:left;margin-bottom:14px">';
  upgrades.forEach(u => {
    const cur = k[u.key] || 0;
    const nextCost = u.cost * (cur + 1);
    const isMax = cur >= u.max;
    html += '<div class="row" style="background:#1b0a17;padding:8px;border:1px solid var(--line)">';
    html += '<div><b>' + u.name + '</b> <span class="teal">(ขั้น ' + thaiNum(cur) + '/' + thaiNum(u.max) + ')</span><br><small class="dim">' + u.desc + '</small></div>';
    if(isMax){
      html += '<span class="gold" style="font-size:12px;font-weight:700">★ เต็มขั้น</span>';
    } else {
      html += '<button class="mini-btn" ' + (k.pts >= nextCost ? '' : 'disabled') + ' onclick="buyKarmaUp(\'' + u.key + '\',' + nextCost + ')">✦ ' + nextCost + '</button>';
    }
    html += '</div>';
  });
  html += '</div>';

  html += '<button class="btn ghost" id="btnCloseKarma" style="width:100%">ปิด</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  $('btnCloseKarma').onclick = () => hide(ov);
}

function buyKarmaUp(key, cost){
  const k = getKarma();
  if(k.pts < cost) return;
  k.pts -= cost;
  k[key] = (k[key] || 0) + 1;
  saveKarma(k);
  sfx.level();
  openKarmaModal();
}


/* ── ระบบเหรียญตราความสำเร็จ (Achievements) ── */
const ACHIEVEMENTS = [
  // ง่าย (Bronze)
  { id: 'first_step', t: 'ก้าวแรกสู่ลงกา', d: 'พิชิตผ่านชั้น ๑ สำเร็จ', tier: 'bronze', icon: '👣' },
  { id: 'hook_secret', t: 'ผู้สอยความลับ', d: 'สอยสมบัติออกจากซอกกำแพงสำเร็จ ๑ ครั้ง', tier: 'bronze', icon: '🪝' },
  { id: 'first_blood', t: 'โลหิตแรก', d: 'สังหารมอนสเตอร์ตัวแรกในวิหาร', tier: 'bronze', icon: '🗡️' },
  { id: 'rest_peace', t: 'สำรวมจิต', d: 'สำรวมลมปราณพักผ่อนฟื้นฟูมานา', tier: 'bronze', icon: '🧘' },
  { id: 'gold_pocket', t: 'เหรียญแรกเริ่ม', d: 'สะสมเหรียญทองครบ ๑๐๐ ◉', tier: 'bronze', icon: '💰' },

  // ปานกลาง (Silver)
  { id: 'boss_khara', t: 'ทัพหน้าแตกพ่าย', d: 'ปราบพญาขรที่ชั้น ๕ สำเร็จ', tier: 'silver', icon: '👹' },
  { id: 'boss_maricha', t: 'มารจำแลงสิ้นท่า', d: 'ปราบมารีศที่ชั้น ๑๐ สำเร็จ', tier: 'silver', icon: '🦌' },
  { id: 'mage_master', t: 'จอมขมังเวท', d: 'สังหารศัตรูด้วยคาถาอาคมสะสมครบ ๑๐ ครั้ง', tier: 'silver', icon: '✹' },
  { id: 'relic_equip', t: 'เครื่องรางคู่กาย', d: 'สวมใส่เครื่องรางเทวะ ๑ ชิ้น', tier: 'silver', icon: '📿' },
  { id: 'upgrade_plus', t: 'ศัสตราคมกล้า', d: 'ตีบวกอาวุธด้วยคัมภีร์ประสิทธิ์ประสาท', tier: 'silver', icon: '📜' },
    { id: 'karma_mercy', t: 'เมตตาธรรมค้ำจุนโลก', d: 'สละยาอมฤตช่วยเหลืออสูรที่บาดเจ็บ', tier: 'silver', icon: '🙏' },
  { id: 'vow_master', t: 'ผู้ถือสัจจบารมี', d: 'ปฏิบัติตามคำสัตย์แห่งพระอินทร์จนสำเร็จครบถ้วน', tier: 'gold', icon: '📿' },
  { id: 'quest_delivery', t: 'ผู้ส่งสาส์นศักดิ์สิทธิ์', d: 'ส่งมอบสาส์นลับพระเวทให้แก่ฤๅษีในชั้นลึกสำเร็จ', tier: 'gold', icon: '📜' },
  { id: 'talent_unlocked', t: 'บรรลุวิชา', d: 'สำเร็จวิชาพรสวรรค์เลเวล ๕', tier: 'silver', icon: '✨' },

  // ยาก (Gold)
  { id: 'boss_kumbha', t: 'ยักษ์หลับลืมตา', d: 'ปราบกุมภกรรณที่ชั้น ๑๕ สำเร็จ', tier: 'gold', icon: '🗿' },
  { id: 'victory_moksha', t: 'ผู้บรรลุโมกษะ', d: 'ปราบทศกัณฐ์ชั้น ๒๐ และหลุดพ้นจากสังสารวัฏ', tier: 'gold', icon: '🪷' },
  { id: 'revive_ankh', t: 'ปาฏิหาริย์คืนชีพ', d: 'ฟื้นคืนชีพจากความตายด้วยมณีโมกษะ', tier: 'gold', icon: '💎' },
  { id: 'slayer_50', t: 'นักล่าอสูร', d: 'สังหารศัตรูสะสมครบ ๕๐ ตนในการเล่นรอบเดียว', tier: 'gold', icon: '⚔️' },
  { id: 'affix_full', t: 'พลังแฝงคู่บุญ', d: 'สวมใส่อาวุธและเกราะที่มีพลังแฝงพร้อมกัน', tier: 'gold', icon: '🛡️' },

  // ขั้นเทพ / อเวจี (Platinum / Mythic)
  { id: 'abyss_conqueror', t: 'ผู้เหยียบย่ำอเวจี', d: 'ก้าวลงสู่ชั้น ๒๕ ในโหมดอเวจีไม่สิ้นสุด', tier: 'platinum', icon: '☠️' },
  { id: 'abyss_deep', t: 'ผู้ไร้ที่สิ้นสุด', d: 'พิชิตลึกถึงชั้น ๓๐ ในโหมดอเวจี', tier: 'platinum', icon: '👑' },
  { id: 'slayer_100', t: 'สังหารมารนับร้อย', d: 'สังหารศัตรูสะสมครบ ๑๐๐ ตนในการเล่นรอบเดียว', tier: 'platinum', icon: '🔥' },
  { id: 'rich_man', t: 'คลังทองอสูร', d: 'สะสมเหรียญทองครบ ๕๐๐ ◉ ในการเล่นรอบเดียว', tier: 'platinum', icon: '🏆' }
];

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#f5c542',
  platinum: '#2ec4a6'
};

function getAchData(){
  try { return JSON.parse(localStorage.getItem(ACH_KEY)) || {}; } catch(e){ return {}; }
}

function unlockAch(id){
  const achs = getAchData();
  if(achs[id]) return; // ปลดล็อกไปแล้ว
  const item = ACHIEVEMENTS.find(a => a.id === id);
  if(!item) return;
  achs[id] = Date.now();
  try { localStorage.setItem(ACH_KEY, JSON.stringify(achs)); } catch(e){}

  // แจ้งเตือนแบนเนอร์สีทองเด้งขึ้นมาบนจอ
  showAchBanner(item);
  triggerHaptic('level');
}

function showAchBanner(a){
  let banner = $('achBanner');
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'achBanner';
    banner.style.position = 'fixed';
    banner.style.top = '12px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.background = 'linear-gradient(135deg, #2a1220, #140810)';
    banner.style.border = '2px solid var(--gold)';
    banner.style.boxShadow = '0 0 20px rgba(245,197,66,.5), 0 4px 12px #000';
    banner.style.padding = '8px 16px';
    banner.style.borderRadius = '4px';
    banner.style.zIndex = '500';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';
    banner.style.transition = 'opacity .5s, transform .5s';
    banner.style.pointerEvents = 'none';
    document.body.appendChild(banner);
  }

  banner.innerHTML = '<span style="font-size:24px">' + a.icon + '</span>' +
    '<div style="text-align:left"><div style="font-size:10.5px;color:var(--gold);font-weight:700;letter-spacing:1px">🏆 ปลดล็อกความสำเร็จ!</div>' +
    '<div style="font-family:Chakra Petch;color:#fff;font-size:14px;font-weight:700">' + a.t + '</div>' +
    '<div style="font-size:11px;color:var(--dim)">' + a.d + '</div></div>';

  banner.style.opacity = '1';
  banner.style.transform = 'translateX(-50%) translateY(0)';
  sfx.level();

  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 4500);
}

function openAchModal(){
  let ov = $('achOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'achOv';
    ov.className = 'ov';
    ov.style.zIndex = '360';
    document.body.appendChild(ov);
  }

  const userAchs = getAchData();
  const unlockedCount = Object.keys(userAchs).length;
  const pct = Math.floor((unlockedCount / ACHIEVEMENTS.length) * 100);

  let html = '<div class="panel" style="max-width:440px;border-color:var(--gold);box-shadow:0 0 24px rgba(245,197,66,.4);text-align:center">';
  html += '<div class="deva">सिद्धि</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 4px;font-size:22px">🏆 ทำเนียบเกียรติยศ (Achievements)</h2>';
  html += '<p class="dim" style="font-size:12.5px;margin:0 0 8px">ปลดล็อกแล้ว <b>' + unlockedCount + '/' + ACHIEVEMENTS.length + '</b> ตรา (' + pct + '%)</p>';
  html += '<div style="width:100%;height:8px;background:#150914;border:1px solid var(--line);margin-bottom:14px;border-radius:4px;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,var(--teal),var(--gold));width:' + pct + '%"></div></div>';

  html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;text-align:left;padding-right:4px;margin-bottom:12px">';
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = !!userAchs[a.id];
    const col = TIER_COLORS[a.tier] || '#fff';
    html += '<div class="row" style="background:#1b0c19;padding:6px 10px;border:1px solid ' + (isUnlocked ? col : '#3d1b28') + ';opacity:' + (isUnlocked ? '1' : '0.5') + '">';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<span style="font-size:22px;filter:' + (isUnlocked ? 'none' : 'grayscale(1)') + '">' + a.icon + '</span>';
    html += '<div><b style="color:' + (isUnlocked ? col : 'var(--dim)') + ';font-size:13.5px;font-family:Chakra Petch">' + (isUnlocked ? a.t : '???') + '</b>';
    html += '<div style="font-size:11.5px;color:var(--dim)">' + a.d + '</div></div>';
    html += '</div>';
    html += isUnlocked ? '<span style="color:' + col + ';font-size:11px;font-weight:700">✓ สำเร็จ</span>' : '<span class="dim" style="font-size:11px">🔒</span>';
    html += '</div>';
  });
  html += '</div>';

  html += '<button class="btn ghost" id="btnCloseAch" style="width:100%">ปิด</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);
  $('btnCloseAch').onclick = () => hide(ov);
}

/* ── ระบบสารานุกรมลงกา (Lanka Codex & Bestiary) ── */
function getCodexData(){
  try {
    return JSON.parse(localStorage.getItem(CODEX_KEY)) || { foes: {}, items: {} };
  } catch(e){ return { foes: {}, items: {} }; }
}

function discoverFoe(foeId){
  const cd = getCodexData();
  cd.foes[foeId] = (cd.foes[foeId] || 0) + 1;
  try { localStorage.setItem(CODEX_KEY, JSON.stringify(cd)); } catch(e){}
}

function discoverItem(name){
  const cd = getCodexData();
  cd.items[name] = true;
  try { localStorage.setItem(CODEX_KEY, JSON.stringify(cd)); } catch(e){}
}

const BESTIARY_DATA = [
  { id: 'preta', name: 'เปรต', s: 'preta', desc: 'วิญญาณบาปทนทุกข์ ลำตัวโปร่งแสง มีไอหมอกลอยละล่อง เดินเงียบกริบในเงามืด', tip: 'เลือดน้อยแต่โจมตีไว อย่าปล่อยให้รุม' },
  { id: 'asura', name: 'อสุรกาย', s: 'asura', desc: 'มารอสูรสีแดงเพลิง เขี้ยวโง้ง ลำตัวหนาแน่นบึกบึน ดวงตาดุร้ายกระหายเลือด', tip: 'พลังโจมตีสูง ควรล่อเข้าซอกแคบหรือใช้หอกยาวแทง' },
  { id: 'naga', name: 'นาคพิษ', s: 'naga', desc: 'พญางูใหญ่สีมรกต แผ่พังพานสง่างาม พ่นควันพิษร้ายแรงได้จากระยะ ๕ ช่อง', tip: 'อันตรายระยะไกล! ใช้อาวุธขว้างปาสังหาร หรือถือสังวาลย์นาคราช' },
  { id: 'rakshasa', name: 'รากษส', s: 'rakshasa', desc: 'ยักษ์อสูรสีม่วงทมิฬ สวมหน้ากากเขี้ยวขาวโง้ง เกราะกระดูกแข็งแกร่ง', tip: 'พลังป้องกันสูงมาก ใช้อาวุธมีดคริติคอลหรือกระบองเจาะเกราะ' },
  { id: 'yaksha', name: 'ยักษ์ทวารบาล', s: 'yaksha', desc: 'ยักษ์ใหญ่สีเขียวมรกต ผู้พิทักษ์ประตูวิหาร ถือกระบองเหล็กยักษ์คู่กาย', tip: 'ทนทาน เลือดเยอะ ดาเมจทุบสะเทือน อย่าปะทะแลกหมัดตรงๆ' },
  { id: 'boss_5', name: 'พญาขร (บอสชั้น ๕)', s: 'rakshasa', desc: 'นายทัพหน้าแห่งลงกา น้องชายทศกัณฐ์ ผู้มีฤทธาฟาดฟันศัตรูไม่หวั่นเกรง', tip: 'ระวังการจู่โจมคริติคอล พยายามใช้คาถาอมฤตหล่อเลี้ยงเลือด' },
  { id: 'boss_10', name: 'มารีศ (บอสชั้น ๑๐)', s: 'asura', desc: 'อสูรผู้เชี่ยวชาญการจำแลงแปลงกายเป็นกวางทอง ล่อลวงผู้กล้าสู่ความตาย', tip: 'เคลื่อนไหวว่องไว ควรใช้คาถาวายุหรือกระบองหนักทุบกระเด็น' },
  { id: 'boss_15', name: 'กุมภกรรณ (บอสชั้น ๑๕)', s: 'yaksha', desc: 'พญายักษ์ผู้ถือหอกโมกขศักดิ์ ยามตื่นจากบรรทมจะมีพละกำลังมหาศาลดุจภูผา', tip: 'เกราะหนาและโจมตีระยะ ๒ ช่อง ให้ใช้คาถาวัชระสายฟ้าโจมตีทะลวงเกราะ' },
  { id: 'boss_20', name: 'ทศกัณฐ์ (บอสใหญ่ชั้น ๒๐)', s: 'boss', desc: 'พญายักษ์ ๑๐ หน้า ๒๐ กร จ้าวแห่งกรุงลงกา ผู้ครอบครองฤทธาไร้เทียมทาน', tip: 'บอสใหญ่สุดแกร่ง ต้องเตรียมยาอมฤต อาวุธตีบวก และเครื่องรางมณีโมกษะให้พร้อม!' }
];

function openCodexModal(){
  let ov = $('codexOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'codexOv';
    ov.className = 'ov';
    ov.style.zIndex = '360';
    document.body.appendChild(ov);
  }

  const cd = getCodexData();

  let html = '<div class="panel" style="max-width:440px;border-color:var(--teal);box-shadow:0 0 24px rgba(46,196,166,.35);text-align:center">';
  html += '<div class="deva">शास्त्र</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--teal);margin:2px 0 4px;font-size:22px">📖 สารานุกรมอสูรและศาสตราวุธ</h2>';
  html += '<p class="dim" style="font-size:12.5px;margin:0 0 12px">บันทึกข้อมูลอสูรและของวิเศษที่ค้นพบในวิหารลงกา</p>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto;text-align:left;padding-right:4px;margin-bottom:12px">';
  BESTIARY_DATA.forEach(m => {
    const kills = cd.foes[m.id] || (cd.foes[m.id.replace('boss_','')] || 0);
    const seen = kills > 0 || (floor >= 5 && m.id === 'preta');

    html += '<div class="row" style="background:#140a16;padding:8px;border:1px solid var(--line);align-items:flex-start">';
    html += '<div style="display:flex;gap:10px">';
    html += '<canvas id="codex_' + m.id + '" width="36" height="36" style="image-rendering:pixelated;background:#1b0e1d;border:2px solid var(--line);flex-shrink:0"></canvas>';
    html += '<div>';
    html += '<b style="color:' + (seen ? 'var(--gold)' : 'var(--dim)') + ';font-size:14px;font-family:Chakra Petch">' + (seen ? m.name : '??? (ยังไม่เคยพบเจอ)') + '</b>';
    if(seen){
      html += '<div style="font-size:11.5px;color:var(--ink);margin:3px 0">' + m.desc + '</div>';
      html += '<div style="font-size:11px;color:var(--teal)">💡 <b>จุดแก้ทาง:</b> ' + m.tip + '</div>';
      html += '<div class="dim" style="font-size:10.5px;margin-top:2px">ยอดสังหารสะสม: ' + thaiNum(kills) + ' ตน</div>';
    } else {
      html += '<div class="dim" style="font-size:11px;margin-top:4px">เดินทางลึกเข้าไปในวิหารเพื่อค้นพบอสูรตนนี้…</div>';
    }
    html += '</div></div></div>';
  });
  html += '</div>';

  html += '<button class="btn ghost" id="btnCloseCodex" style="width:100%">ปิด</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  // วาดสไปรต์ในสารานุกรม
  BESTIARY_DATA.forEach(m => {
    const scv = $('codex_' + m.id);
    if(scv){
      const sg = scv.getContext('2d');
      sg.imageSmoothingEnabled = false;
      const kills = cd.foes[m.id] || (cd.foes[m.id.replace('boss_','')] || 0);
      const seen = kills > 0 || (floor >= 5 && m.id === 'preta');
      const img = SPR[m.s];
      if(img){
        if(!seen) sg.filter = 'brightness(0)';
        sg.drawImage(img, 0, 0, img.width, img.height, 2, 2, 32, 32);
      }
    }
  });

  $('btnCloseCodex').onclick = () => hide(ov);
}

/* ── ระบบตั้งค่า (Settings & Haptics) ── */
function getSettings(){
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { sfx: true, bgm: true, haptic: true, crt: true }; }
  catch(e){ return { sfx: true, bgm: true, haptic: true, crt: true }; }
}

function saveSettings(s){
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch(e){}
}

function triggerHaptic(type){
  const st = getSettings();
  if(!st.haptic || !navigator.vibrate) return;
  try {
    if(type === 'crit') navigator.vibrate(45);
    else if(type === 'hurt') navigator.vibrate([60, 30, 60]);
    else if(type === 'trap') navigator.vibrate(85);
    else if(type === 'level') navigator.vibrate([40, 40, 90]);
  } catch(e){}
}

function openSettingsModal(){
  let ov = $('settingsOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'settingsOv';
    ov.className = 'ov';
    ov.style.zIndex = '370';
    document.body.appendChild(ov);
  }

  const st = getSettings();

  let html = '<div class="panel" style="max-width:380px;border-color:var(--gold);text-align:center">';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 10px;font-size:22px">⚙️ ตั้งค่าเกม (Settings)</h2>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;text-align:left;margin-bottom:14px;font-size:13.5px">';
  
  html += '<div class="row"><span>🔊 เสียงเอฟเฟกต์ (SFX)</span>';
  html += '<button class="mini-btn" id="togSfx">' + (soundOn ? 'เปิด' : 'ปิด') + '</button></div>';

  html += '<div class="row"><span>🎶 ดนตรีบรรยากาศ (BGM)</span>';
  html += '<button class="mini-btn" id="togBgm">' + (st.bgm ? 'เปิด' : 'ปิด') + '</button></div>';

  html += '<div class="row"><span>📳 สั่นตอบสนอง (Haptics)</span>';
  html += '<button class="mini-btn" id="togHap">' + (st.haptic ? 'เปิด' : 'ปิด') + '</button></div>';

  html += '<div class="row"><span>📺 เส้นสแกนเรโทร CRT</span>';
  html += '<button class="mini-btn" id="togCrt">' + (st.crt ? 'เปิด' : 'ปิด') + '</button></div>';

  html += '</div>';

  html += '<button class="btn" id="btnCloseSettings" style="width:100%">เสร็จสิ้น</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  $('togSfx').onclick = () => { toggleSound(); $('togSfx').textContent = soundOn ? 'เปิด' : 'ปิด'; };
  $('togBgm').onclick = () => {
    st.bgm = !st.bgm; saveSettings(st);
    $('togBgm').textContent = st.bgm ? 'เปิด' : 'ปิด';
    if(droneNodes) droneNodes.g.gain.value = st.bgm ? 0.028 : 0;
  };
  $('togHap').onclick = () => {
    st.haptic = !st.haptic; saveSettings(st);
    $('togHap').textContent = st.haptic ? 'เปิด' : 'ปิด';
    if(st.haptic) triggerHaptic('crit');
  };
  $('togCrt').onclick = () => {
    st.crt = !st.crt; saveSettings(st);
    $('togCrt').textContent = st.crt ? 'เปิด' : 'ปิด';
    const appEl = $('app');
    if(appEl){
      // Toggle scanline overlay
      if(st.crt) appEl.classList.remove('no-crt');
      else appEl.classList.add('no-crt');
    }
  };

  $('btnCloseSettings').onclick = () => hide(ov);
}


/* ── เสาหลักที่ ๑: ระบบธาตุและสิ่งแวดล้อม (Elemental Interactions) ── */
let fireTiles = []; // รายการช่องที่ไฟกำลังลุกไหม้ {x, y, turns}

function isWater(x, y){
  const t = map[y * W + x];
  return t === 5 || t === 9;
}

function isGrass(x, y){
  return map[y * W + x] === 8;
}

// ระบบสายฟ้าช็อตทั่วผืนน้ำ (Water Electrification)
function electrifyWater(startX, startY, sourceDmg = 12){
  const visited = new Set();
  const queue = [[startX, startY]];
  const shockedTiles = [];

  while(queue.length > 0){
    const [cx, cy] = queue.shift();
    const key = cy * W + cx;
    if(visited.has(key)) continue;
    visited.add(key);
    shockedTiles.push([cx, cy]);

    // ตรวจสอบศัตรูที่ยืนอยู่ในน้ำ
    const foe = enemyAt(cx, cy);
    if(foe){
      const sDmg = Math.max(4, sourceDmg + R(4) - (foe.def >> 2));
      foe.hp -= sDmg; foe.flash = 6; foe.stun = 1;
      triggerSlash(cx, cy, '#f5c542');
      floats.push({x: cx, y: cy, t: 'ช็อตสตั๊น -' + sDmg, c: '#f5c542', life: 1.4});
      if(foe.hp <= 0) killFoe(foe);
    }

    // ตรวจสอบตัวผู้เล่นถ้ายืนอยู่ในน้ำ
    if(player.x === cx && player.y === cy){
      const pDmg = Math.max(2, Math.floor(sourceDmg * 0.4));
      player.hp -= pDmg; flash = 0.5; shake = 6;
      floats.push({x: cx, y: cy, t: 'โดนไฟช็อต -' + pDmg, c: '#f5c542', life: 1.2});
      msg('⚡ ไฟฟ้าแล่นผ่านผืนน้ำช็อตโดนเจ้า! -' + pDmg + ' HP', 'warn');
      if(player.hp <= 0) die();
    }

    // กระจายไปยังช่องน้ำรอบข้าง
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for(const [dx, dy] of dirs){
      const nx = cx + dx, ny = cy + dy;
      if(nx >= 0 && ny >= 0 && nx < W && ny < H && isWater(nx, ny) && !visited.has(ny * W + nx)){
        queue.push([nx, ny]);
      }
    }
  }

  // ประกายสายฟ้าแตกแขนงทั่วผิวน้ำ
  for(const [sx, sy] of shockedTiles){
    for(let i=0; i<4; i++){
      sparks.push({
        x: sx * T + 8, y: sy * T + 8,
        vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
        c: '#f5c542', life: 0.9
      });
    }
  }
  sfx.stairs();
  msg('⚡ กระแสอัสนีบาตแล่นกระจายทั่วผืนน้ำ! ช็อตสตั๊นทุกชีวิตในน้ำ!', 'good');
}

// จุดไฟเผากอเถาวัลย์ (Ignite Grass into Fire Surface)
function igniteGrass(gx, gy){
  if(!isGrass(gx, gy)) return;
  map[gy * W + gx] = 1; // เถาวัลย์ไหม้กลายเป็นพื้น
  if(!fireTiles.some(f => f.x === gx && f.y === gy)){
    fireTiles.push({ x: gx, y: gy, turns: 3 });
    triggerSlash(gx, gy, '#ff8b1f');
    for(let i=0; i<6; i++){
      sparks.push({
        x: gx * T + 8, y: gy * T + 8,
        vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3,
        c: '#ff8b1f', life: 1
      });
    }
    msg('🔥 เปลวเพลิงลุกลามไหม้กอเถาวัลย์กลายเป็นทะเลเพลิง!', 'warn');
  }
}


/* ── เสาหลักที่ ๒: ทางแยกแห่งกรรม (Moral & Karma Dilemmas) ── */
function openDilemmaModal(n){
  let ov = $('dilemmaOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'dilemmaOv';
    ov.className = 'ov';
    ov.style.zIndex = '350';
    document.body.appendChild(ov);
  }

  const potCount = player.inv.filter(it => it.t === 'pot').length;

  let html = '<div class="panel" style="max-width:420px;border-color:var(--teal);box-shadow:0 0 24px rgba(46,196,166,.4);text-align:center">';
  html += '<div class="deva">दया</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 6px;font-size:22px">ทางแยกแห่งกรรม: อสูรบาดเจ็บ</h2>';
  html += '<div style="display:flex;justify-content:center;margin:8px 0"><canvas id="dilemmaSprite" width="48" height="48" style="image-rendering:pixelated;background:#1b0c19;border:2px solid var(--line)"></canvas></div>';
  html += '<p style="font-size:13px;color:var(--ink);line-height:1.5;margin:0 0 12px;font-style:italic">“ได้โปรดเถิดผู้กล้า… ข้าสำนึกผิดแล้ว บาดเจ็บเจียนตาย หากท่านเมตตามอบยาอมฤต ๑ ขวดมารักษาข้า ข้าขอปฏิญาณว่าจะกลับมาตอบแทนบุญคุณท่านอย่างแน่นอน…”</p>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">';
  html += '<button class="btn" id="btnMercy" style="background:#158574;color:#fff;border-color:#2ec4a6"' + (potCount > 0 ? '' : ' disabled') + '>🙏 เมตตาช่วยเหลือ (เสียยาอมฤต ๑ ขวด, ปุญ +๓๕)' + (potCount > 0 ? '' : ' <small>[ไม่มียา]</small>') + '</button>';
  html += '<button class="btn" id="btnSlaughter" style="background:#8f2438;color:#fff;border-color:#e5482e">⚔ สังหารเด็ดขาด (+๕๐ EXP, +๓๕ ◉, ได้แต้มบาป)</button>';
  html += '<button class="btn ghost" id="btnLeaveDilemma">เดินผ่าน (ไม่ยุ่งเกี่ยว)</button>';
  html += '</div></div>';

  ov.innerHTML = html;
  show(ov);

  // วาดสไปรต์อสูรบาดเจ็บ
  const scv = $('dilemmaSprite');
  if(scv){
    const sg = scv.getContext('2d');
    sg.imageSmoothingEnabled = false;
    const img = SPR['asura'];
    if(img) sg.drawImage(img, 0, 0, img.width, img.height, 8, 8, 32, 32);
  }

  $('btnMercy').onclick = () => {
    hide(ov);
    const pIdx = player.inv.findIndex(it => it.t === 'pot');
    if(pIdx >= 0) player.inv.splice(pIdx, 1);
    player.punya += 35;
    player.sparedAsura = true;
    n.resolved = true;
    n.used = true;
    msg('✦ เจ้าสละยาอมฤตช่วยชีวิตอสูร! ปุญบารมีเพิ่มขึ้น +๓๕ อย่างยิ่งใหญ่', 'good');
    floats.push({x: player.x, y: player.y, t: 'เมตตาบารมี +๓๕', c: '#2ec4a6', life: 2});
    sfx.level(); flash = 0.5;
    unlockAch('karma_mercy');
    updateHud();
    endTurn();
  };

  $('btnSlaughter').onclick = () => {
    hide(ov);
    n.resolved = true;
    n.used = true;
    player.xp += 50;
    player.gold += 35;
    player.sin = (player.sin || 0) + 1;
    player.punya = Math.max(0, player.punya - 15);
    msg('☠ เจ้าสังหารอสูรที่ยอมแพ้! ได้รับ +๕๐ EXP, +๓๕ ◉ แต่ดวงจิตแปดเปื้อนบาปกรรม (-๑๕ ปุญ)', 'warn');
    floats.push({x: player.x, y: player.y, t: 'บาปกรรม (+๑ บาป)', c: '#d43d2a', life: 2});
    sfx.hit(); shake = 6;
    updateHud();
    checkLevel();
    endTurn();
  };

  $('btnLeaveDilemma').onclick = () => hide(ov);
}

function openVowModal(vx, vy){
  let ov = $('vowOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'vowOv';
    ov.className = 'ov';
    ov.style.zIndex = '350';
    document.body.appendChild(ov);
  }

  let html = '<div class="panel" style="max-width:420px;border-color:var(--gold);box-shadow:0 0 24px rgba(245,197,66,.45);text-align:center">';
  html += '<div class="deva">सत्य</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 6px;font-size:22px">🪷 ศิลาถวายคำสัตย์แห่งพระอินทร์</h2>';
  html += '<p style="font-size:13px;color:var(--ink);margin:0 0 12px">พระอินทร์เสด็จลงมาทดสอบความแน่วแน่ ยินดีจะถือสัจจบารมีเพื่อแลกกับพรเทวะหรือไม่?</p>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;text-align:left">';
  html += '<button class="btn" id="btnVowBlade" style="font-size:13px;text-align:left;padding:8px 10px;background:#1e0c19;color:var(--ink);border-color:var(--gold)">' +
    '<b class="gold">๑. สัจจะละเว้นมีดสั้น (๓ ชั้น)</b><br><small class="teal">พรที่ได้: ป้องกันถาวร +๔ และฟื้นมนตร์เต็ม (ห้ามใช้มีด/กริช)</small></button>';
  html += '<button class="btn" id="btnVowFasting" style="font-size:13px;text-align:left;padding:8px 10px;background:#1e0c19;color:var(--ink);border-color:var(--gold)">' +
    '<b class="gold">๒. สัจจะอดทนต่อเวทนา (๒ ชั้น)</b><br><small class="teal">พรที่ได้: พลังโจมตีถาวร +๕ (ห้ามดื่มยาอมฤต)</small></button>';
  html += '<button class="btn ghost" id="btnLeaveVow" style="text-align:center">ไม่ขอผูกมัดคำสัตย์ (เดินผ่าน)</button>';
  html += '</div></div>';

  ov.innerHTML = html;
  show(ov);

  $('btnVowBlade').onclick = () => {
    hide(ov);
    map[vy * W + vx] = 4; // ศิลามอดดับ
    player.def += 4;
    player.mp = player.mmp;
    player.vow = { type: 'no_dagger', endFloor: floor + 3, name: 'สัจจะละเว้นมีดสั้น' };
    msg('📿 เจ้าถวายสัจจะละเว้นมีดสั้น ๓ ชั้น! พระอินทร์ประสาทพร: ป้องกัน +๔ ถาวร!', 'good');
    sfx.level(); flash = 0.5;
    updateHud();
    endTurn();
  };

  $('btnVowFasting').onclick = () => {
    hide(ov);
    map[vy * W + vx] = 4;
    player.atk += 5;
    player.vow = { type: 'no_pot', endFloor: floor + 2, name: 'สัจจะอดทนต่อเวทนา' };
    msg('📿 เจ้าถวายสัจจะอดทนต่อเวทนา ๒ ชั้น! สุริยเทพประสาทพร: โจมตี +๕ ถาวร!', 'good');
    sfx.level(); flash = 0.5;
    updateHud();
    endTurn();
  };

  $('btnLeaveVow').onclick = () => hide(ov);
}


/* ── เสาหลักที่ ๓: ดันเจี้ยนประจำวัน & ระบบแชร์ Seed (Daily & Seeded Run) ── */
let currentSeed = 0;
let isDailyRun = false;

function getDailySeed(){
  const d = new Date().toISOString().slice(0, 10);
  let h = 0;
  for(let i=0; i<d.length; i++) h = (Math.imul(31, h) + d.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function openCustomSeedPrompt(){
  const input = prompt('กรอกรหัส Seed ดันเจี้ยนของเพื่อน (ตัวเลข):', '');
  if(!input) return;
  const sNum = parseInt(input.replace(/[^0-9]/g, ''));
  if(isNaN(sNum) || sNum <= 0){
    alert('รหัส Seed ไม่ถูกต้อง กรุณากรอกเป็นตัวเลข');
    return;
  }
  currentSeed = sNum;
  isDailyRun = false;
  initAudio();
  hide($('title'));
  show($('classSel'));
}

function startDailyRun(cls){
  currentSeed = getDailySeed();
  isDailyRun = true;
  startRun(cls, currentSeed);
}

/* ── สร้างดันเจี้ยน ── */
function genFloor(fl){
  floor=fl;floorR=mulberry32((seed^(fl*2654435761))>>>0);
  map=new Uint8Array(W*H);seen=new Uint8Array(W*H);vis=new Uint8Array(W*H);
  enemies=[];npcs=[];items=[];kills={};slashes=[];sparks=[];
  const rooms=[];
  for(let i=0;i<70&&rooms.length<10;i++){
    const w=4+Math.floor(floorR()*7),h=3+Math.floor(floorR()*5);
    const x=1+Math.floor(floorR()*(W-w-2)),y=1+Math.floor(floorR()*(H-h-2));
    if(rooms.some(r=>x<r.x+r.w+1&&x+w+1>r.x&&y<r.y+r.h+1&&y+h+1>r.y))continue;
    rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});
  }
  const carve=(x,y)=>{if(x>0&&y>0&&x<W-1&&y<H-1)map[y*W+x]=1;};
  rooms.forEach(r=>{for(let yy=r.y;yy<r.y+r.h;yy++)for(let xx=r.x;xx<r.x+r.w;xx++)map[yy*W+xx]=1;});
  for(let i=1;i<rooms.length;i++){
    const a=rooms[i-1],b=rooms[i];let x=a.cx,y=a.cy;
    while(x!==b.cx){carve(x,y);x+=Math.sign(b.cx-x);}
    while(y!==b.cy){carve(x,y);y+=Math.sign(b.cy-y);}
    carve(x,y);
  }
  const fr=rooms[0],lr=rooms[rooms.length-1];
  player.x=fr.cx;player.y=fr.cy;
  stairs={x:lr.cx,y:lr.cy,locked:!!getBoss(fl)};
  map[stairs.y*W+stairs.x]=2;
  traps=[];
  for(const r of rooms.slice(1,-1)){
    // เทวาลัย (ลดอัตราเกิดให้หายากและมีค่า)
    if(floorR()<.12){map[(r.y+1)*W+r.x+1]=3;}
    // สระน้ำอมฤตศักดิ์สิทธิ์ (สุ่มเกิดเฉลี่ย 1 สระต่อ 2-3 ชั้น)
    if(floorR()<.08){map[(r.y+2)*W+r.x+2]=5;}
    // แท่นบูชาบาปอสูรสีดำ
    if(floorR()<.08 && fl > 2){map[(r.y+2)*W+r.x+1]=7;}
    // เตาหลอมโอสถทิพย์แห่งหิมพานต์ (11)
    if(floorR()<.12){map[(r.y+1)*W+r.x+3]=11;}
    // ศิลาจารึกวิญญาณโบราณ (12)
    if(floorR()<.10 && fl > 1){map[(r.y+2)*W+r.x+3]=12;}
    // ตลาดมืดอสูร (13) สุ่มพบบนชั้น ๗, ๑๔ หรือชั้นอเวจี
    if((fl === 7 || fl === 14 || (fl > 20 && floorR() < 0.18))){map[(r.y+1)*W+r.x+2]=13;}
    // กับดักซ่อนเร้น
    if(floorR() < (heatSettings.moreTraps ? 0.70 : 0.35)){
      const tx = r.x + 1 + Math.floor(floorR()*(r.w-2));
      const ty = r.y + 1 + Math.floor(floorR()*(r.h-2));
      if(map[ty*W+tx]===1 && !(tx===player.x && ty===player.y)){
        const tType = pick(['spike','fire','poison','warp']);
        traps.push({x:tx, y:ty, type:tType, revealed:false});
      }
    }
  }
  const nItems=5+Math.floor(floorR()*4);
  for(let i=0;i<nItems;i++){
    const r=rooms[1+Math.floor(floorR()*(rooms.length-1))];
    const x=r.x+Math.floor(floorR()*r.w),y=r.y+Math.floor(floorR()*r.h);
    if(map[y*W+x]!==1||(x===player.x&&y===player.y))continue;
    if(items.some(it=>it.x===x&&it.y===y))continue;
    items.push({x,y,...genGroundItem()});
  }

  // 🪨 สุ่มสร้าง "สมบัติซ่อนในซอกกำแพง" (Secret Wall Treasures) ๑-๒ จุดต่อชั้น
  for(let s=0; s<2; s++){
    const r = pick(rooms.slice(1));
    const wx = floorR() < 0.5 ? r.x : r.x + r.w - 1;
    const wy = r.y + 1 + Math.floor(floorR()*(r.h - 2));
    if(!items.some(it=>it.x===wx && it.y===wy)){
      const secretItem = genGroundItem();
      items.push({ x: wx, y: wy, ...secretItem, inWall: true });
    }
  }
  if(fl%3===0){ // วาณิช + เควสต์
    const r=rooms[rooms.length-2]||rooms[0];
    const qfoes=getFoePool(fl);
    const qt=qfoes[Math.floor(floorR()*qfoes.length)];
    const priceMult = heatSettings.costlyShops ? 1.5 : 1.0;
    const stock=[
      {t:'pot',name:'อมฤต',heal:14+fl*2,r:'common',lore:'น้ำอมฤตฟื้นฟูเลือด',price:Math.floor((18+fl)*priceMult)},
      {t:'mana',name:'น้ำโสม',mana:12+fl*2,r:'common',lore:'น้ำสกัดจากโสมพันปี',price:16+fl},
      genPetEgg(), // ไข่สัตว์เลี้ยงมีขายในร้านแน่นอน
      genW(clamp(Math.floor(fl/4)+1, 1, 4)),
      genA(clamp(Math.floor(fl/4)+1, 1, 6)),
      genScrollUpg(),
      {...TOOL_HOOK}
    ];
    npcs.push({type:'merchant',x:r.cx,y:r.cy,sprite:'merchant',stock,
      q:{id:qt.id,name:qt.name,need:3+Math.floor(floorR()*3),got:0,reward:0,claimed:true}});
    const q=npcs[npcs.length-1].q;
    q.reward=q.need*(10+fl*2);q.claimed=false;
  }
  if(fl%4===1&&fl>1){ // พระดาบส
    const r=rooms[Math.floor(floorR()*rooms.length)];
    npcs.push({type:'hermit',x:r.cx,y:r.cy,sprite:'hermit',used:false});
  }
  // ทางแยกแห่งกรรม: อสูรบาดเจ็บ (ชั้น ๔, ๘, ๑๒, ๑๖)
  if(fl % 4 === 0 && fl <= 16){
    const r = rooms[Math.floor(floorR()*rooms.length)];
    npcs.push({type:'dilemma_asura', x:r.cx, y:r.cy, sprite:'asura', resolved:false, used:false});
  }
  // แท่นศิลาถวายคำสัตย์แห่งพระอินทร์ (ชั้น ๓, ๗, ๑๑)
  if((fl === 3 || fl === 7 || fl === 11) && !player.vow){
    const r = pick(rooms.slice(1));
    map[(r.y+1)*W + r.x+2] = 10;
  }
  const boss=getBoss(fl);
  const n=boss?5:Math.min(12,4+Math.floor(fl*0.9));
  for(let i=0;i<n;i++){
    const r=rooms[1+Math.floor(floorR()*(rooms.length-1))];
    const x=r.x+Math.floor(floorR()*r.w),y=r.y+Math.floor(floorR()*r.h);
    if(map[y*W+x]!==1||(Math.abs(x-player.x)+Math.abs(y-player.y))<6)continue;
    if(enemies.some(e=>e.x===x&&e.y===y))continue;
    const pool=getFoePool(fl);
    const b=pool[Math.floor(floorR()*pool.length)];
    const isElite = floorR() < 0.20 && fl > 1;
    const spawnedF = spawnFoe(b,x,y);
    if(isElite){
      spawnedF.elite = true;
      spawnedF.name = 'จอม' + b.name;
      spawnedF.maxhp = Math.floor(spawnedF.maxhp * 1.5);
      spawnedF.hp = spawnedF.maxhp;
      spawnedF.atk = Math.floor(spawnedF.atk * 1.35);
      spawnedF.g *= 2;
    }
    enemies.push(spawnedF);
  }
  if(boss){
    const b={...boss,id:'boss_'+fl,boss:true,ranged:false,awake:false};
    enemies.push(spawnFoe(b,lr.cx,Math.min(H-2,lr.cy+1)));
  }
  
  // ตรวจสอบกองอัฐิชาติก่อน
  const curSkel = getSkel();
  if(curSkel && curSkel.floor === fl){
    // วางกองอัฐิไว้ตรงจุดเดิมหรือห้องแรก
    let sx = curSkel.x, sy = curSkel.y;
    if(map[sy*W+sx] !== 1){ sx = rooms[0].cx + 1; sy = rooms[0].cy; }
    items.push({ x: sx, y: sy, t: 'skel', name: 'กองอัฐิชาติก่อน', gold: curSkel.gold, wpn: curSkel.wpn });
  }

  if(player.cls === 'bibhek' || player.talents.some(t => t.id === 'bi_sight')){
    for(const tr of traps){ map[tr.y*W+tr.x] = 6; }
    msg('👁️ ญาณทิพย์แห่งพิเภกเบิกกว้าง — กับดักทั้งหมดถูกเปิดเผย!', 'good');
  }
  // ลูกนกเวหาบินส่องสำรวจห้องข้างหน้าล่วงหน้า ๑ ห้อง
  if(player && player.pet && player.pet.type === 'bird' && rooms.length > 2){
    const nextRoom = rooms[1];
    for(let yy=nextRoom.y; yy<nextRoom.y+nextRoom.h; yy++){
      for(let xx=nextRoom.x; xx<nextRoom.x+nextRoom.w; xx++){
        seen[yy*W+xx] = 1;
      }
    }
    msg('🦅 ลูกนกเวหาบินสำรวจ — เปิดเผยหมอกสงครามห้องเบื้องหน้าให้แล้ว!', 'good');
  }
    // สุ่มสร้างกอเถาวัลย์และแอ่งน้ำธรรมชาติ (เสาหลักที่ ๑)
  for(const r of rooms.slice(1)){
    // เถาวัลย์โบราณ
    if(floorR() < 0.40){
      const count = 3 + Math.floor(floorR() * 4);
      for(let g=0; g<count; g++){
        const gx = r.x + 1 + Math.floor(floorR() * (r.w - 2));
        const gy = r.y + 1 + Math.floor(floorR() * (r.h - 2));
        if(map[gy * W + gx] === 1) map[gy * W + gx] = 8;
      }
    }
    // แอ่งน้ำธรรมชาติ (โดยเฉพาะถ้ำบาดาลนาคราช ชั้น ๖-๑๐)
    if((floorR() < 0.25) || (fl >= 6 && fl <= 10 && floorR() < 0.55)){
      const count = 2 + Math.floor(floorR() * 4);
      for(let w=0; w<count; w++){
        const wx = r.x + 1 + Math.floor(floorR() * (r.w - 2));
        const wy = r.y + 1 + Math.floor(floorR() * (r.h - 2));
        if(map[wy * W + wx] === 1) map[wy * W + wx] = 9;
      }
    }
  }
  fireTiles = [];
  if(rooms.length > 1){
    showHint('elements', 'ปฏิกิริยาธาตุ: แอ่งน้ำช่วยดับไฟและนำสายฟ้าช็อตศัตรู · กอเถาวัลย์ใช้ซุ่มโจมตีคริติคอล ๑๐๐%!');
  }
  // สุ่มสภาพอากาศประจำชั้น (Omens)
  currentOmen = (floorR() < 0.25 && fl > 1) ? pick(OMENS) : null;
  if(currentOmen){
    msg(currentOmen.icon + ' ปรากฏการณ์ ' + currentOmen.name + '! ' + currentOmen.desc, 'warn');
  }

  // บ่อนสกาพญาพาลี (สุ่มพบบนชั้น ๕, ๑๐, ๑๕ หรือชั้นเลขคี่)
  if(fl % 5 === 0 || floorR() < 0.12){
    const r = pick(rooms.slice(1));
    map[(r.y+1)*W + r.x+1] = 14;
  }


  
  // ✦ ผลตอบแทนแห่งกรรมดี: อสูรที่เคยช่วยชีวิตโผล่มาช่วยเปิดแผลบอส!
  if(boss && player.sparedAsura && !player.asuraHelped){
    player.asuraHelped = true;
    const bFoe = enemies.find(e => e.boss);
    if(bFoe){
      bFoe.hp = Math.max(1, bFoe.hp - 35);
      bFoe.flash = 6;
      triggerSlash(bFoe.x, bFoe.y, '#2ec4a6');
      shake = 8; sfx.level();
      msg('✦ อสูรที่เจ้าเคยเมตตาช่วยเหลือไว้ ปรากฏกายตอบแทนคุณ! พุ่งเสียบเปิดแผลใส่ ' + bFoe.name + ' -๓๕ HP!', 'good');
    }
  }

  if(fl===1){
    msg('เจ้าก้าวเข้าสู่เงามืดของลงกา…');
    showHint('start', 'แตะบนกระเบื้องเพื่อเดินอัตโนมัติ หรือใช้ปุ่มลูกศร · แตะที่หลอดเลือดเพื่อดูหน้าต่างสเตตัสเต็ม');
  }
  else {
    const tList = fl > 20 ? ABYSS_TITLES : FLOOR_TITLES;
    msg('ชั้น '+thaiNum(fl)+' — '+tList[(fl-1)%tList.length]+(fl>20?' (อเวจี)':''));
  }
  if(boss){
    msg('☠ นายทัพ '+boss.name+' ครองชั้นนี้!','warn');sfx.boss();
    bossSplash = { name: boss.name, title: boss.title || 'พญามารแห่งวิหารลงกา', time: 90 };
  }
    // สุ่มสภาพอากาศประจำชั้น (Omens)
  currentOmen = (floorR() < 0.25 && fl > 1) ? pick(OMENS) : null;
  if(currentOmen){
    msg(currentOmen.icon + ' ปรากฏการณ์ ' + currentOmen.name + '! ' + currentOmen.desc, 'warn');
  }

  // บ่อนสกาพญาพาลี (สุ่มพบบนชั้น ๕, ๑๐, ๑๕ หรือชั้นเลขคี่)
  if(fl % 5 === 0 || floorR() < 0.12){
    const r = pick(rooms.slice(1));
    map[(r.y+1)*W + r.x+1] = 14;
  }
  computeFov();
}
function spawnFoe(base,x,y){
  let hpBonus = Math.floor(floor * 1.3);
  if(heatSettings.toughFoes) hpBonus = Math.floor(hpBonus * 1.35 + 6);
  const atkBonus = Math.floor(floor * 0.4);
  const gBase = (base.g && !isNaN(base.g)) ? base.g : 8;
  return {...base,x,y,awake:false,maxhp:base.hp+hpBonus,hp:base.hp+hpBonus,
    atk:base.atk+atkBonus,g:gBase+(floor>>1),flash:0,bumpX:0,bumpY:0};
}
function genW(tier){
  // สเกลเทียร์ตามความลึกของชั้น: ชั้น 1-5 = T1-T2, ชั้น 6-12 = T2-T3, ชั้น 13-18 = T3-T4, ชั้น 19+ = T4-T5
  let maxT = 2;
  if(floor >= 19) maxT = 5;
  else if(floor >= 13) maxT = 4;
  else if(floor >= 6) maxT = 3;

  const t = clamp(tier || (1 + Math.floor(floorR() * maxT)), 1, 5);
  const pool = WEAPON_BASE.filter((_, idx) => Math.floor(idx / 4) + 1 === t);
  const base = pick(pool.length ? pool : WEAPON_BASE);
  const plus = floor > 20 ? Math.floor((floor - 20) / 3) + 1 : 0;
  const pName = plus ? ' +' + thaiNum(plus) : '';

  const it = {
    t: 'wpn',
    name: base.n + pName,
    baseName: base.n,
    type: base.type,
    v: base.a + plus * 2,
    tier: t,
    plus: plus,
    r: base.r,
    cursed: base.cursed || null,
    curseDesc: base.curseDesc || null,
    lore: base.lore,
    price: (t * 45) + (plus * 30)
  };

  // สุ่มพลังแฝงพิเศษ ยิ่งชั้นลึกโอกาสยิ่งสูง
  const affixChance = Math.min(0.9, 0.15 + floor * 0.035);
  if (floorR() < affixChance) {
    const af = pick(WPN_AFFIXES);
    it.affix = af.id;
    it.afName = af.name;
    it.afDesc = af.d;
    it.afColor = af.c;
    it.name += ' [' + af.name + ']';
    it.price += 25 + floor * 3;
    if(it.r === 'common') it.r = 'rare';
    else if(it.r === 'rare') it.r = 'legendary';
  }
  return it;
}
function genA(tier){
  let maxT = 3;
  if(floor >= 19) maxT = ARMOR_BASE.length;
  else if(floor >= 12) maxT = 5;
  else if(floor >= 6) maxT = 4;

  const t = clamp(tier || (1 + Math.floor(floorR() * maxT)), 1, ARMOR_BASE.length);
  const base = ARMOR_BASE[t - 1] || ARMOR_BASE[0];
  const plus = floor > 20 ? Math.floor((floor - 20) / 3) + 1 : 0;
  const pName = plus ? ' +' + thaiNum(plus) : '';

  const it = {
    t: 'arm',
    name: base.n + pName,
    baseName: base.n,
    v: base.d + plus * 2,
    tier: t,
    plus: plus,
    r: base.r,
    cursed: base.cursed || null,
    curseDesc: base.curseDesc || null,
    lore: base.lore,
    price: (t * 40) + (plus * 25)
  };

  const affixChance = Math.min(0.9, 0.15 + floor * 0.035);
  if (floorR() < affixChance) {
    const af = pick(ARM_AFFIXES);
    it.affix = af.id;
    it.afName = af.name;
    it.afDesc = af.d;
    it.afColor = af.c;
    it.name += ' [' + af.name + ']';
    it.price += 25 + floor * 3;
    if(it.r === 'common') it.r = 'rare';
    else if(it.r === 'rare') it.r = 'legendary';
  }
  return it;
}
function genScr(){
  const keys=['agni','heal','vaju','vajra'];
  const k=keys[Math.floor(floorR()*4)];
  return{t:'scr',key:k,name:'คัมภีร์'+MANTRAS[k].n,r:'rare',lore:'คัมภีร์มนตราแห่งพระเวท ศึกษาเพื่อเรียนรู้หรือแปลงเป็นปุญ',price:35};
}



const SCROLL_TYPES = [
  { id: 'map', name: 'คัมภีร์เบิกเนตร', desc: 'เปิดหมอกสงครามทั้งชั้นให้เห็นห้องทั้งหมดทันที', r: 'rare', lore: 'คัมภีร์มหาเนตรทิพย์ แผ่รังสีญาณส่องสว่างวิหารทั้งมิติ' },
  { id: 'curse', name: 'คัมภีร์ชำระคำสาป', desc: 'ลบล้างผลเสียของอุปกรณ์ต้องสาปทิ้งอย่างถาวร!', r: 'legendary', lore: 'คัมภีร์น้ำทิพย์พระเวท ชำระล้างไออสูรออกจากอาวุธและเกราะต้องสาป' },
  { id: 'summon', name: 'คัมภีร์อัญเชิญทวยหาญ', desc: 'อัญเชิญทหารวานร ๒ ตัวมาช่วยรุมศัตรูในห้อง', r: 'rare', lore: 'คัมภีร์มหายันต์หนุมาน เรียกวิญญาณทหารเอกมาร่วมรบ' },
  { id: 'teleport', name: 'คัมภีร์ย้ายมิติ', desc: 'วาร์ปหนีออกจากจุดวิกฤตไปสู่ห้องที่ปลอดภัยทันที', r: 'common', lore: 'คัมภีร์มนตราล่องนภา สลับมิติพาร่างกายหนีวงล้อมอสูร' }
];

function genTacticalScroll(){
  const s = pick(SCROLL_TYPES);
  return {
    t: 'scroll_tac',
    scrollId: s.id,
    name: s.name,
    desc: s.desc,
    r: s.r,
    lore: s.lore,
    price: 35 + floor * 2
  };
}

const POTION_ELIXIRS = [
  { id: 'ironskin', name: 'ยาผิวเหล็กไหล', turns: 12, desc: 'เพิ่มป้องกัน +๑๐ ชั่วคราว ๑๒ เทิร์น', r: 'rare', lore: 'โอสถเคี่ยวจากแร่เหล็กไหลพันปี ดื่มแล้วผิวกายแข็งแกร่งดุจศิลา' },
  { id: 'invis', name: 'ยาแปลงกายล่องหน', turns: 8, desc: 'ศัตรูมองไม่เห็น ๘ เทิร์น โจมตีติดคริติคอล ๑๐๐%', r: 'legendary', lore: 'น้ำมันว่านล่องหน ทาชโลมกายแล้วอำพรางร่างจากสายตามาร' },
  { id: 'coating', name: 'ยาน้ำมันชโลมดาบ', turns: 15, desc: 'โจมตีติดไฟและพิษพร้อมกัน ๑๕ ครั้ง', r: 'rare', lore: 'น้ำมันยางไม้หิมพานต์ ชโลมคมดาบให้เผาไหม้และอาบพิษร้าย' }
];

function genElixir(id = null){
  const el = id ? POTION_ELIXIRS.find(e => e.id === id) : pick(POTION_ELIXIRS);
  return {
    t: 'elixir',
    elixirId: el.id,
    name: el.name,
    turns: el.turns,
    desc: el.desc,
    r: el.r,
    lore: el.lore,
    price: 45 + floor * 2
  };
}

function genPetEgg(){
  const pKeys = ['monkey', 'bird', 'naga'];
  const pk = pick(pKeys);
  const pInfo = PET_TYPES[pk];
  return {
    t: 'egg',
    petType: pk,
    name: 'ไข่' + pInfo.name,
    icon: '🥚',
    r: 'legendary',
    desc: pInfo.desc,
    lore: 'ไข่สัตว์อสูรวิเศษที่ตกทอดในวิหาร ใช้ฟักเป็นสัตว์เลี้ยงคู่ใจผจญภัย',
    price: 65 + floor * 3
  };
}

function genRelic(){
  const base = pick(RELICS);
  return {
    t: 'relic',
    id: base.id,
    name: base.name,
    icon: base.icon,
    r: base.r,
    desc: base.desc,
    lore: base.lore,
    price: 65 + floor * 4
  };
}

function genScrollUpg(){
  return {
    t: 'upg',
    name: 'คัมภีร์ประสิทธิ์ประสาท',
    r: 'rare',
    lore: 'คัมภีร์มนตราจารึกบนใบลาน ใช้ตีบวกอาวุธหรือเกราะที่ถืออยู่ +๑ อย่างถาวร',
    price: 55 + floor * 3
  };
}

function genGroundItem(){
  const r=floorR();
  if(r<.07) return {t:'pot', name:'อมฤต', heal:12+floor*2, r:'common', lore:'น้ำอมฤตบริสุทธิ์ ฟื้นฟูพลังชีวิต'};
  if(r<.14) return genRation(); // เสบียงอาหาร
  if(r<.20) return genGem(); // อัญมณีนพเก้า
  if(r<.24) return genPlayerTool(); // กับดักผู้เล่น
  if(r<.29) return genOre(); // แร่ขุดศักดิ์สิทธิ์
  if(r<.34) return {t:'mana', name:'น้ำโสม', mana:10+floor*2, r:'common', lore:'น้ำสกัดจากโสมพันปี ฟื้นฟูพลังมนตร์'};
  if(r<.42) return {t:'gold', amt:8+Math.floor(floorR()*(10+floor*3))};
  if(r<.48) return genTacticalScroll(); // คัมภีร์ยุทธวิธี
  if(r<.56) return genElixir(); // ยาวิเศษ
  if(r<.66){
    const th = pick(THROWABLES);
    return {t:'throw', name: th.name, dmg: th.dmg + Math.floor(floor * 0.8), range: th.range, c: th.c, burn: th.burn||0, r:'common', lore:'อาวุธขว้างโจมตีระยะไกล ' + thaiNum(th.range) + ' ช่อง', price: 20 + floor*2};
  }
  if(r<.73) return genScrollUpg(); // คัมภีร์ตีบวก
  if(r<.78) return genRelic(); // เครื่องราง
  if(r<.82) return genHeadgear(); // มงกุฎ/ชฎา
  if(r<.85) return {...TOOL_HOOK};
  if(r<.88) return genPetEgg(); // ไข่สัตว์เลี้ยง
  if(r<.94){ const t = clamp(1 + Math.floor((floor-1)/4), 1, 5); return genW(t); }
  if(r<.98){ const t = clamp(1 + Math.floor((floor-1)/4), 1, ARMOR_BASE.length); return genA(t); }
  return genScr();
}

/* ── FOV / LOS ── */
function los(x0,y0,x1,y1){
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
  while(!(x0===x1&&y0===y1)){
    if(map[y0*W+x0]===0)return false;
    const e2=2*err;
    if(e2>-dy){err-=dy;x0+=sx;}
    if(e2<dx){err+=dx;y0+=sy;}
  }
  return true;
}
function computeFov(){
  vis.fill(0);const RAD=6;
  for(let y=Math.max(0,player.y-RAD);y<=Math.min(H-1,player.y+RAD);y++)
  for(let x=Math.max(0,player.x-RAD);x<=Math.min(W-1,player.x+RAD);x++){
    const d2=(x-player.x)**2+(y-player.y)**2;
    if(d2>RAD*RAD+2)continue;
    if(los(player.x,player.y,x,y)){vis[y*W+x]=1;seen[y*W+x]=1;}
  }
}

/* ── เอฟเฟกต์ต่อสู้ ── */
function triggerSlash(x,y,color='#ffffff'){
  slashes.push({x,y,color,life:1});
  sfx.slash();
  // สร้างสะเก็ดไฟกระจาย
  for(let i=0;i<6;i++){
    const ang=Math.random()*Math.PI*2,spd=1+Math.random()*2.5;
    sparks.push({
      x:x*T+8,y:y*T+8,
      vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
      c:color,life:1
    });
  }
}


function triggerTrap(tr){
  sfx.hurt(); flash=.35; shake=5;
  if(tr.type === 'spike'){
    const d = 4 + Math.floor(floor * 0.6);
    player.hp -= d;
    msg('⚠ กับดักขวากหนามผุดแทง! -' + d + ' เลือด', 'warn');
    floats.push({x:player.x, y:player.y, t:'-' + d, c:'#ff5a4d', life:1});
  } else if(tr.type === 'fire'){
    player.burn = (player.burn||0) + 3;
    msg('⚠ เปลวเพลิงพวยพุ่งขึ้นจากพื้น! ติดไฟ ๓ เทิร์น', 'warn');
    floats.push({x:player.x, y:player.y, t:'ติดไฟ!', c:'#ff8b1f', life:1});
  } else if(tr.type === 'poison'){
    player.poison = (player.poison||0) + 4;
    msg('⚠ ควันพิษนาคราชระเบิด! ติดพิษ ๔ เทิร์น', 'warn');
    floats.push({x:player.x, y:player.y, t:'ติดพิษ!', c:'#43b05c', life:1});
  } else if(tr.type === 'warp'){
    msg('🌀 ค่ายกลย้ายมิติทำงาน! เจ้าถูกวาร์ปไปยังอีกห้องหนึ่ง', 'good');
    player.x = 2 + Math.floor(rng()*(W-4));
    player.y = 2 + Math.floor(rng()*(H-4));
    while(map[player.y*W+player.x]!==1){
      player.x = 2 + Math.floor(rng()*(W-4));
      player.y = 2 + Math.floor(rng()*(H-4));
    }
    floats.push({x:player.x, y:player.y, t:'วาร์ป!', c:'#8d55c9', life:1.5});
  }
  
  // ตรวจสอบมณีโมกษะ (ชุบชีวิตฟื้นคืนชีพ 1 ครั้ง)
  if(player.hp <= 0 && player.relic && player.relic.id === 'ankh'){
    player.relic = null;
    player.hp = Math.floor(player.mhp * 0.8);
    player.mp = player.mmp;
    player.poison = 0; player.burn = 0;
    flash = 0.8; sfx.level();
    floats.push({x:player.x, y:player.y, t:'✦ ชุบชีวิต!', c:'#f5c542', life:2});
    msg('💎 มณีโมกษะเปล่งประกายเจิดจ้าแล้วแตกสลาย — วิญญาณของเจ้าหวนคืนชีพ!', 'good'); unlockAch('revive_ankh');
    updateHud();
    return;
  }

  if(player.hp <= 0) die();
}


function openCursedAltarModal(ax, ay){
  let ov = $('cursedAltarOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'cursedAltarOv';
    ov.className = 'ov';
    ov.style.zIndex = '340';
    document.body.appendChild(ov);
  }

  const costHp = Math.max(5, Math.floor(player.mhp * 0.40));

  let html = '<div class="panel" style="max-width:400px;border-color:var(--red);box-shadow:0 0 24px rgba(229,72,46,.45);text-align:center">';
  html += '<div class="deva" style="color:var(--red)">रक्त</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--red);margin:2px 0 6px;font-size:22px">🩸 แท่นบูชาบาปอสูร</h2>';
  html += '<p style="font-size:13px;color:var(--ink);margin:0 0 12px">เปลวเพลิงโลหิตกระหายการสังเวย ยอมเสียสละเลือด <b>' + costHp + ' หน่วย</b> เพื่อแลกกับสิ่งตอบแทนหรือไม่?</p>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">';
  html += '<button class="btn" id="btnSacWpn" style="background:#8f2438;color:#fff;border-color:#e5482e">⚔ สังเวยเลือดรับ ศาสตราวุธเทวะ (-' + costHp + ' HP)</button>';
  html += '<button class="btn" id="btnSacGold" style="background:#5c2a3a;color:#f5c542;border-color:#f5c542">◉ สังเวยเลือดรับ ทองคำ ๑๕๐ ◉ (-' + costHp + ' HP)</button>';
  html += '<button class="btn ghost" id="btnLeaveCursed">เดินผ่าน (ไม่สนใจ)</button>';
  html += '</div></div>';

  ov.innerHTML = html;
  show(ov);

  $('btnSacWpn').onclick = () => {
    hide(ov);
    map[ay*W+ax] = 4; // มอดดับ
    player.hp -= costHp; flash = 0.6; shake = 6; sfx.hurt();
    player.usedCursedAltar = true;
    const godWpn = genW(4);
    if(player.inv.length < (player.bagMax||10)) player.inv.push(godWpn);
    else items.push({x:player.x, y:player.y, ...godWpn});
    msg('🩸 เลือดถูกสูบสังเวย! ได้รับ «' + godWpn.name + '» จากแท่นบูชาบาป!', 'good');
    updateHud();
    if(player.hp <= 0) die();
  };

  $('btnSacGold').onclick = () => {
    hide(ov);
    map[ay*W+ax] = 4;
    player.hp -= costHp; flash = 0.6; shake = 6; sfx.hurt();
    player.usedCursedAltar = true;
    player.gold += 150;
    msg('🩸 เลือดถูกสูบสังเวย! ได้รับเหรียญทอง ◉๑๕๐ จากแท่นบูชาบาป!', 'good');
    updateHud();
    if(player.hp <= 0) die();
  };

  $('btnLeaveCursed').onclick = () => hide(ov);
}


/* ── ระบบเตาหลอมโอสถทิพย์ & ปรุงยาวิเศษ (Alchemy & Concoctions) ── */
function openAlchemyModal(cx, cy){
  let ov = $('alchemyOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'alchemyOv';
    ov.className = 'ov';
    ov.style.zIndex = '350';
    document.body.appendChild(ov);
  }

  const potCount = player.inv.filter(it => it.t === 'pot' || it.t === 'mana').length;

  let html = '<div class="panel" style="max-width:440px;border-color:var(--gold);box-shadow:0 0 26px rgba(245,197,66,.4);text-align:center">';
  html += '<div class="deva">रसायन</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 6px;font-size:22px">⚗️ เตาหลอมโอสถทิพย์หิมพานต์</h2>';
  html += '<p style="font-size:13px;color:var(--ink);margin:0 0 12px">นำยาโอสถพื้นฐาน ๒ ขวดในถุงผ้า มาเคี่ยวสกัดเป็นยาวิเศษชั้นสูง</p>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;text-align:left;margin-bottom:14px">';
  POTION_ELIXIRS.forEach(el => {
    html += '<div class="row" style="background:#1b0c18;padding:8px;border:1px solid var(--line)">';
    html += '<div><b class="gold">' + el.name + '</b><br><small class="teal">' + el.desc + '</small></div>';
    html += '<button class="mini-btn" ' + (potCount >= 2 ? '' : 'disabled') + ' onclick="brewElixir(\'' + el.id + '\',' + cx + ',' + cy + ')">เคี่ยว (ใช้ยา ๒ ขวด)</button>';
    html += '</div>';
  });
  html += '</div>';

  html += '<button class="btn ghost" id="btnCloseAlchemy" style="width:100%">ปิด</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  $('btnCloseAlchemy').onclick = () => hide(ov);
}

function brewElixir(elixirId, cx, cy){
  // ลบยา 2 ขวดออกจากถุงผ้า
  let removed = 0;
  for(let i = player.inv.length - 1; i >= 0 && removed < 2; i--){
    if(player.inv[i].t === 'pot' || player.inv[i].t === 'mana'){
      player.inv.splice(i, 1);
      removed++;
    }
  }

  const elItem = genElixir(elixirId);
  player.inv.push(elItem);
  sfx.level(); flash = 0.5;
  msg('⚗️ เตาหลอมเดือดพล่าน! สกัดได้ «' + elItem.name + '» สำเร็จ!', 'good');
  floats.push({x: player.x, y: player.y, t: 'หลอมโอสถสำเร็จ!', c: '#2ec4a6', life: 2});

  hide($('alchemyOv'));
  map[cy * W + cx] = 1; // เตาถูกใช้แล้วกลายเป็นพื้น
  updateHud();
  endTurn();
}


/* ── ๓. ระบบตลาดมืดอสูร (Black Market / Demon Smuggler) ── */
function openBlackMarketModal(bx, by){
  let ov = $('blackMarketOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'blackMarketOv';
    ov.className = 'ov';
    ov.style.zIndex = '370';
    document.body.appendChild(ov);
  }

  const itemsForSale = [
    { name: 'น้ำยาอมตะพญามาร', desc: 'ป้องกันดาเมจ ๑๐๐% นาน ๕ เทิร์น', costHp: 15, item: { t: 'elixir', elixirId: 'invuln', name: 'น้ำยาอมตะพญามาร', turns: 5, desc: 'อมตะไร้เทียมทาน ๕ เทิร์น', r: 'mythic', lore: 'โอสถโลหิตอสูร ป้องกันความเสียหายทุกชนิด' } },
    { name: 'คัมภีร์ชำระคำสาป', desc: 'ล้างผลเสียอุปกรณ์ต้องสาปทิ้งอย่างถาวร', costHp: 10, item: { t: 'scroll_tac', scrollId: 'curse', name: 'คัมภีร์ชำระคำสาป', desc: 'ล้างผลเสียอุปกรณ์ต้องสาป', r: 'legendary', lore: 'ชำระไออสูร' } },
    { name: 'มณีโมกษะ', desc: 'ชุบชีวิตฟื้นคืนชีพ ๑ ครั้งเมื่อเลือดหมด', costHp: 20, item: { t: 'relic', id: 'ankh', name: 'มณีโมกษะ', icon: '💎', r: 'mythic', desc: 'ชุบชีวิตฟื้นคืนชีพ ๑ ครั้ง', lore: 'มณีฉุดวิญญาณจากยมโลก' } },
    { name: 'ขรรค์เพชรจุติ +๓', desc: 'อาวุธเทวะระดับ ๔ ตีบวก +๓ ทันที', costHp: 18, item: genW(4) }
  ];

  let html = '<div class="panel" style="max-width:440px;border-color:var(--red);box-shadow:0 0 28px rgba(229,72,46,.5);text-align:center">';
  html += '<div class="deva" style="color:var(--red)">तस्कर</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--red);margin:2px 0 6px;font-size:22px">🏴 ตลาดมืดอสูร (Demon Smuggler)</h2>';
  html += '<p style="font-size:13px;color:var(--ink);margin:0 0 12px">“ที่นี่ไม่รับเศษเหรียญทอง… เราต้องการเพียงโลหิตสดๆ จากร่างของเจ้าแลกกับของวิเศษ!”</p>';

  html += '<div style="display:flex;flex-direction:column;gap:8px;text-align:left;margin-bottom:14px">';
  itemsForSale.forEach((prod, idx) => {
    html += '<div class="row" style="background:#1b060d;padding:8px;border:1px solid #5c1422">';
    html += '<div><b style="color:#ff7a5c">' + prod.name + '</b><br><small class="dim">' + prod.desc + '</small></div>';
    html += '<button class="mini-btn" style="background:#8f2438;color:#fff;border-color:#e5482e" ' + (player.hp > prod.costHp ? '' : 'disabled') + ' onclick="buyBlackMarketItem(' + idx + ',' + bx + ',' + by + ')">สังเวย ' + prod.costHp + ' HP</button>';
    html += '</div>';
  });
  html += '</div>';

  html += '<button class="btn ghost" id="btnCloseBlackMarket" style="width:100%">เดินผ่าน</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  window._bmProducts = itemsForSale;
  $('btnCloseBlackMarket').onclick = () => hide(ov);
}

function buyBlackMarketItem(idx, bx, by){
  const prod = window._bmProducts[idx];
  if(!prod || player.hp <= prod.costHp) return;
  player.hp -= prod.costHp;
  player.sin = (player.sin || 0) + 1;
  flash = 0.6; shake = 6; sfx.hurt();

  if(player.inv.length < (player.bagMax || 10)){
    player.inv.push(prod.item);
  } else {
    items.push({x: player.x, y: player.y, ...prod.item});
  }

  msg('🩸 เจ้าสละเลือด ' + prod.costHp + ' HP ซื้อ «' + prod.name + '» จากตลาดมืด! (+๑ บาป)', 'good');
  sfx.level();
  hide($('blackMarketOv'));
  updateHud();
  if(player.hp <= 0) die();
}

/* ── การกระทำของผู้เล่น ── */
function canWalk(x,y){return x>=0&&y>=0&&x<W&&y<H&&map[y*W+x]!==0}
function enemyAt(x,y){return enemies.find(e=>e.x===x&&e.y===y&&e.hp>0)}
function npcAt(x,y){return npcs.find(n=>n.x===x&&n.y===y)}
function tryMove(dx,dy){
  if(state!=='play')return;
  const nx=player.x+dx,ny=player.y+dy;
  if(dx < 0) player.facing = -1;
  else if(dx > 0) player.facing = 1;
  if(!canWalk(nx,ny)){
    // ตรวจสอบว่ามีสมบัติซ่อน/ฝังอยู่ในซอกกำแพงตรงหน้าหรือไม่!
    const wallItemIdx = items.findIndex(it => it.x === nx && it.y === ny);
    if(wallItemIdx >= 0){
      const it = items[wallItemIdx];
      const hasSpear = player.wpn && player.wpn.type === 'spear';
      const hasMace = player.wpn && player.wpn.type === 'mace';
      const hasHook = player.inv.some(invIt => invIt.t === 'hook');

      if(hasSpear || hasMace || hasHook){
        // ดึงของออกจากกำแพงมาที่เท้าของผู้เล่น!
        items.splice(wallItemIdx, 1);
        items.push({ x: player.x, y: player.y, ...it });
        triggerSlash(nx, ny, '#f5c542');
        sfx.pick(); shake = 4; unlockAch('hook_secret');
        if(hasSpear){
          msg('🔱 เจ้าใช้ปลาย «' + player.wpn.name + '» สอยเกี่ยว «' + it.name + '» ออกมาจากซอกกำแพง!', 'good');
        } else if(hasMace){
          msg('🔨 เจ้าใช้ «' + player.wpn.name + '» ทุบซอกหินแตก «' + it.name + '» หลุดกระเด็นออกมา!', 'good');
        } else {
          msg('🪝 เจ้าเหวี่ยง «ตะขอเกี่ยวศิลา» ดึง «' + it.name + '» ออกมาจากซอกกำแพงสำเร็จ!', 'good');
        }
        // เก็บเข้ากระเป๋าทันที
        const gi = items.findIndex(i => i.x === player.x && i.y === player.y);
        if(gi >= 0) pickup(gi);
        endTurn();
        return;
      } else {
        msg('🔍 มี «' + it.name + '» ซ่อนอยู่ในซอกกำแพง! (ต้องใช้หอกยาว, กระบอง หรือตะขอเกี่ยวออกมา)', 'warn');
        showHint('wall_secret', 'ซอกกำแพงหินมีแสงทองวิบวับ! ถือหอกยาว/กระบองเดินชน หรือกดใช้ตะขอเกี่ยว สอยสมบัติออกมาได้');
        floats.push({ x: nx, y: ny, t: 'ซ่อนอยู่!', c: '#f5c542', life: 1.2 });
        return;
      }
    }
    return;
  }
  const e=enemyAt(nx,ny);
  if(e){
    playerBump={x:dx*8,y:dy*8,time:4};
    attackFoe(e, dx, dy);endTurn();return;
  }

  // ระบบหอกยาว/ตรีศูล/แส้/ธนู: โจมตีทะลวงระยะไกล!
  if(player.wpn && (player.wpn.type === 'spear' || player.wpn.type === 'whip' || player.wpn.type === 'bow')){
    const reachMax = (player.wpn.type === 'bow') ? 5 : 2;
    for(let dist = 2; dist <= reachMax; dist++){
      const tx = player.x + dx * dist, ty = player.y + dy * dist;
      const targetFoe = enemyAt(tx, ty);
      if(targetFoe){
        // เช็คว่าไม่มีกำแพงขวางทาง
        if(los(player.x, player.y, tx, ty)){
          playerBump={x:dx*8, y:dy*8, time:4};
          triggerSlash(tx, ty, player.wpn.type === 'bow' ? '#f5c542' : '#2ec4a6');
          msg((player.wpn.type === 'bow' ? '🏹 แผลงศร «' : '🔱 «') + player.wpn.name + '» โจมตีระยะไกลใส่ ' + targetFoe.name + '!', 'good');
          attackFoe(targetFoe, dx, dy);
          endTurn();
          return;
        }
      }
    }
  }
  const n=npcAt(nx,ny);
  if(n){interact(n);return;}
  player.x=nx;player.y=ny;
  const gi=items.findIndex(i=>i.x===nx&&i.y===ny);
  
  if(gi>=0)pickup(gi);
  if(map[ny*W+nx]===2){
    if(stairs.locked){msg('มนตร์ดำผนึกบันไดไว้ — ต้องสังหารนายทัพเสียก่อน!','warn');}
    else{
      if(floor>=FINAL && !endless){victory();return;}
      const nextB=getBoss(floor+1); $('stairsInfo').textContent='เบื้องล่างคือชั้น '+thaiNum(floor+1)+(nextB?' …มีไอสังหารแรงกล้า ('+nextB.name+')':'');
      show($('stairsOv'));
    }
  }else if(map[ny*W+nx]===3){show($('altarOv'));}
  else if(map[ny*W+nx]===14){
    openGamblingModal(nx, ny);
  }
  else if(map[ny*W+nx]===13){
    openBlackMarketModal(nx, ny);
  }
  else if(map[ny*W+nx]===11){
    openAlchemyModal(nx, ny);
  }
  else if(map[ny*W+nx]===12){
    map[ny*W+nx] = 1; // อ่านแล้วกลายเป็นพื้น
    player.xp += 60; player.punya += 25;
    sfx.level(); flash = 0.4;
    floats.push({x: player.x, y: player.y, t: '+๖๐ EXP +๒๕ ปุญ', c: '#2ec4a6', life: 2});
    msg('📜 เจ้าอ่านศิลาจารึกวิญญาณโบราณ — จิตใจผ่องแผ้ว ได้รับ +๖๐ EXP และปุญบารมี +๒๕!', 'good');
    updateHud(); checkLevel(); endTurn();
    return;
  }
  else if(map[ny*W+nx]===10){
    openVowModal(nx, ny);
  }
  else if(map[ny*W+nx]===7){
    openCursedAltarModal(nx, ny);
  }
  else if(map[ny*W+nx]===5){
    // ดื่มน้ำในสระอมฤต
    map[ny*W+nx]=1; // ใช้แล้วกลายเป็นพื้น
    player.hp=player.mhp; player.mp=player.mmp;
    player.poison=0; player.burn=0;
    msg('🪷 เจ้าดื่มน้ำจากสระอมฤต — ร่างกายฟื้นเต็ม ล้างพิษและเปลวเพลิงสิ้น!','good');
    floats.push({x:player.x, y:player.y, t:'บริสุทธิ์!', c:'#2ec4a6', life:1.5});
    sfx.level();
  }
  // เช็คกับดักที่ช่องเดิน
  if(player.cls === 'garuda' || player.talents.some(t => t.id === 'ga_fly')){
    // พญาครุฑบินลอยข้ามกับดัก ไม่เหยียบโดน!
  } else {
    const trapIdx = traps.findIndex(tr => tr.x===nx && tr.y===ny);
  if(trapIdx >= 0){
    const tr = traps[trapIdx];
    map[ny*W+nx] = 6; // เผยกับดักบนแมพ
    triggerTrap(tr);
  }
  }
  endTurn();
}
function waitTurn(){
  if(state!=='play')return;
  unlockAch('rest_peace');
  player.mp=Math.min(player.mmp,player.mp+1);
  if(player.talents.some(t => t.id === 'r_rest')){
    player.hp = Math.min(player.mhp, player.hp + 3);
    floats.push({x:player.x, y:player.y, t:'+๓ เลือด', c:'#2ec4a6', life:1});
  }
  msg('เจ้าสำรวมลมปราณ…');
  endTurn();
}
function attackFoe(e, dirX=0, dirY=0){
  // ตรวจสอบสัจจะละเว้นมีดสั้น
  if(player.vow && player.vow.type === 'no_dagger' && player.wpn && player.wpn.type === 'dagger'){
    player.hp -= 15; flash = 0.8; shake = 8; sfx.hurt();
    msg('⚡ อัสนีบาตฟาดลงทัณฑ์ผู้ตระบัดสัตย์! เจ้าฝ่าฝืนสัจจะละเว้นมีดสั้น! -๑๕ HP', 'warn');
    player.vow = null;
    if(player.hp <= 0){ die(); return; }
  }
  const wpn = player.wpn || {};
    // ซุ่มโจมตีจากกอเถาวัลย์: การันตีคริติคอล ๑๐๐%
  const isStealthAmbush = isGrass(player.x, player.y);
  let critRate = isStealthAmbush ? 1.0 : 0.15;
  if(wpn.type === 'dagger') critRate += 0.20; // มีดสั้นคริติคอลสูง
  if(wpn.affix === 'sharp') critRate += 0.15;
  if(player.relic && player.relic.id === 'diamond_ring') critRate += 0.15;
  const crit = rng() < critRate;

  // คำนวณดาเมจพื้นฐาน (กระบองหนักเจาะเกราะ 50%)
  const defCut = (wpn.type === 'mace') ? (e.def >> 2) : (e.def >> 1);
  let d = Math.max(1, player.atk + wpn.v + R(4) - defCut);
  if(player.talents.some(t => t.id === 'k_rage') && player.hp <= Math.floor(player.mhp * 0.35)){
    d *= 2;
    msg('👑 ขัตติยมานะสำแดงฤทธิ์! เลือดวิกฤตพลังโจมตีทวีคูณ!', 'warn');
  }
  if(crit) d <<= 1;
  e.hp -= d; e.awake = true; e.flash = 5;

  let slashColor = crit ? '#f5c542' : '#f4ecdc';

  // พลังสังวาลย์นาคราช: ตีติดพิษ
  if(player.relic && player.relic.id === 'naga_sash'){
    e.poison = (e.poison || 0) + 3;
    slashColor = '#43b05c';
  }

  // เอฟเฟกต์พิเศษของอาวุธ
  if(player.wpn && player.wpn.affix && player.arm && player.arm.affix) unlockAch('affix_full');
  if(wpn.affix === 'flame'){
    e.burn = (e.burn || 0) + 3; if(isGrass(e.x, e.y)) igniteGrass(e.x, e.y);
    slashColor = '#ff8b1f';
    floats.push({x:e.x, y:e.y-0.4, t:'เผาไหม้!', c:'#ff8b1f', life:1});
  } else if(wpn.affix === 'venom'){
    e.poison = (e.poison || 0) + 4;
    slashColor = '#43b05c';
    floats.push({x:e.x, y:e.y-0.4, t:'พิษ!', c:'#43b05c', life:1});
  } else if(wpn.affix === 'vamp'){
    const drain = Math.max(1, Math.floor(d * 0.25));
    player.hp = Math.min(player.mhp, player.hp + drain);
    slashColor = '#d43d2a';
    floats.push({x:player.x, y:player.y, t:'+' + drain + ' HP', c:'#d43d2a', life:1});
  } else if(wpn.affix === 'thunder'){
    if(isWater(e.x, e.y)) electrifyWater(e.x, e.y, d);
    if(rng() < 0.25){
      e.stun = 1;
      slashColor = '#f5c542';
      floats.push({x:e.x, y:e.y-0.4, t:'มึนงง!', c:'#f5c542', life:1.2});
    }
  }

  
  // ผลกระทบจากอัญมณีที่ฝังในอาวุธ
  if(wpn.gems && wpn.gems.length){
    for(const gm of wpn.gems){
      if(gm.gemId === 'gem_ruby'){
        d += 5; e.burn = (e.burn || 0) + 3;
        floats.push({x: e.x, y: e.y - 0.5, t: 'ทับทิมเพลิง +๕', c: '#ff3b30', life: 1});
      } else if(gm.gemId === 'gem_emerald'){
        d += 4; e.poison = (e.poison || 0) + 3;
        floats.push({x: e.x, y: e.y - 0.5, t: 'มรกตพิษ +๔', c: '#34c759', life: 1});
      } else if(gm.gemId === 'gem_sapphire'){
        d += 4; e.stun = 1;
        floats.push({x: e.x, y: e.y - 0.5, t: 'ไพลินเยือกแข็ง', c: '#007aff', life: 1});
      } else if(gm.gemId === 'gem_moonstone'){
        player.mp = Math.min(player.mmp, player.mp + 2);
        floats.push({x: player.x, y: player.y, t: '+๒ MP', c: '#6fe0cd', life: 1});
      } else if(gm.gemId === 'gem_diamond'){
        d += 6;
      }
    }
  }

  triggerSlash(e.x, e.y, slashColor);
  floats.push({x:e.x, y:e.y, t:'-'+d, c:crit?'#f5c542':'#ffffff', life:1});
  shake = crit ? 8 : 4; sfx.hit();
  if(player.awakenGauge < player.maxAwaken){ player.awakenGauge = Math.min(player.maxAwaken, player.awakenGauge + 4); }
  // คำสาปขรรค์กระหายเลือด: สูบเลือดผู้ใช้ 2 HP ทุกครั้งที่ฟันโดน
  if(wpn.cursed === 'blood_drain'){
    player.hp -= 2;
    floats.push({x: player.x, y: player.y, t: '-๒ สูบเลือด', c: '#d43d2a', life: 0.8});
    msg('🩸 «' + wpn.name + '» กัดกินไอชีวิตของเจ้า! -๒ HP', 'warn');
    if(player.hp <= 0){ die(); return; }
  }
  // ☠ บอสเฟส ๒ และท่าไม้ตายเมื่อเลือดต่ำกว่า ๕๐%
  if(e.boss && !e.phase2 && e.hp <= Math.floor(e.maxhp * 0.5)){
    e.phase2 = true;
    sfx.boss(); shake = 9; flash = 0.6;
    if(floor === 5){
      msg('☠ พญาขรคำรามก้องวิหาร! สรรพกำลังเปรตผุดขึ้นจากธรณี!', 'warn');
      for(let s=0; s<2; s++){
        const ptx = e.x + (s===0?1:-1), pty = e.y;
        if(canWalk(ptx, pty) && !enemyAt(ptx, pty)) enemies.push(spawnFoe(FOES[0], ptx, pty));
      }
    } else if(floor === 15){
      msg('☠ กุมภกรรณตื่นจากบรรทมเต็มตา! เงื้อหอกโมกขศักดิ์พุ่งทะลวง!', 'warn');
      triggerSlash(player.x, player.y, '#e5482e');
      hurtPlayer(16, 'หอกโมกขศักดิ์');
    } else if(floor === 20){
      msg('☠ ทศกัณฐ์เปิดเนตร ๑๐ หน้า ๒๐ กร! เพลิงกัลป์ปะทุรอบทิศ!', 'warn');
      e.atk += 6;
      player.burn = (player.burn || 0) + 3;
      for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++){
        triggerSlash(e.x+dx, e.y+dy, '#ff8b1f');
      }
    }
  }
 if(crit) triggerHaptic('crit');

  // กลไกมีดสั้น: มีโอกาส 45% ฟันเบิ้ล ๒ ครั้งติด (Double Strike)
  if(wpn.type === 'dagger' && e.hp > 0 && rng() < 0.45){
    const d2 = Math.max(1, Math.floor(d * 0.75));
    e.hp -= d2; e.flash = 4;
    floats.push({x:e.x, y:e.y-0.3, t:'ฟันเบิ้ล -' + d2, c:'#2ec4a6', life:1.2});
    msg('🗡️ «' + wpn.name + '» ตวัดฟันเบิ้ลติดกัน ๒ ครั้ง! -' + d2, 'good');
    triggerSlash(e.x, e.y, '#2ec4a6');
  }

  // กลไกธนู/หน้าไม้: โจมตีเจาะเกราะจากระยะไกล
  if(wpn.type === 'bow'){
    slashColor = '#f5c542';
    // ธนูพระรามยิงแสงทิพย์
    if(wpn.name.includes('พระราม')) d = Math.floor(d * 1.3);
  }

  // กลไกแส้อัสนีบาต: ตีระยะ ๒ ช่อง และกระตุกดึงศัตรูเข้ามาหาตัว ๑ ช่อง
  if(wpn.type === 'whip' && e.hp > 0 && (dirX || dirY)){
    const pullX = e.x - dirX, pullY = e.y - dirY;
    if(canWalk(pullX, pullY) && !enemyAt(pullX, pullY) && !(pullX === player.x && pullY === player.y)){
      e.x = pullX; e.y = pullY; e.bumpX = -dirX * 8; e.bumpY = -dirY * 8;
      msg('⚡ «' + wpn.name + '» ฟาดตวัดกระตุก ' + e.name + ' เข้ามาหาตัว!', 'good');
    }
  }

  // กลไกกรงเล็บวานร: รัวโจมตี ๓ ฮิตติดกัน!
  if(wpn.type === 'claw' && e.hp > 0 && rng() < 0.50){
    const d3 = Math.max(1, Math.floor(d * 0.45));
    e.hp -= d3 * 2; e.flash = 4;
    floats.push({x: e.x, y: e.y - 0.4, t: 'รัว ๓ ฮิต! -' + (d3*2), c: '#ff7a5c', life: 1.2});
    msg('🐾 «' + wpn.name + '» รัวกรงเล็บฉีกร่าง ๓ ครั้งซ้อน! -' + (d3*2), 'good');
    triggerSlash(e.x, e.y, '#ff7a5c');
  }

  // กลไกพัดวายุสลายมาร: พัดกระแทกศัตรูกระเด็นถอยหลัง ๓ ช่อง
  if(wpn.type === 'fan' && e.hp > 0 && (dirX || dirY)){
    let curX = e.x, curY = e.y;
    for(let k=0; k<3; k++){
      const nextX = curX + dirX, nextY = curY + dirY;
      if(canWalk(nextX, nextY) && !enemyAt(nextX, nextY) && !npcAt(nextX, nextY)){
        curX = nextX; curY = nextY;
      } else break;
    }
    if(curX !== e.x || curY !== e.y){
      e.x = curX; e.y = curY; e.bumpX = dirX * 14; e.bumpY = dirY * 14;
      msg('🪭 «' + wpn.name + '» โบกพัดคลื่นพายุกระแทก ' + e.name + ' กระเด็นไกล!', 'good');
    }
  }

  // กลไกกระบองหนัก: ทุบศัตรูกระเด็นถอยหลัง ๑ ช่อง (Knockback)
  if(wpn.type === 'mace' && e.hp > 0 && (dirX || dirY)){
    const kx = e.x + dirX, ky = e.y + dirY;
    if(canWalk(kx, ky) && !enemyAt(kx, ky) && !npcAt(kx, ky)){
      e.x = kx; e.y = ky; e.bumpX = dirX * 10; e.bumpY = dirY * 10;
      msg('🔨 แรงทุบกระแทกของ «' + wpn.name + '» ทำให้ ' + e.name + ' กระเด็นถอยหลัง!', 'good');
      // ถ้ากระเด็นไปตกกับดัก
      const trIdx = traps.findIndex(tr => tr.x===kx && tr.y===ky);
      if(trIdx >= 0){
        map[ky*W+kx] = 6;
        e.hp -= 8;
        floats.push({x:kx, y:ky, t:'กับดัก -๘', c:'#e5482e', life:1});
      }
    } else {
      // ชนกำแพง รับดาเมจกระแทกเพิ่ม
      e.hp -= 4;
      floats.push({x:e.x, y:e.y, t:'กระแทก -๔', c:'#e5482e', life:1});
    }
  }

  // กลไกอาวุธกวาด/ขวาน/จักร: ฟันกวาดศัตรูทุกตัวในระยะ ๑ ช่องพร้อมกัน (Cleave)
  if(wpn.type === 'cleave'){
    for(const o of enemies.slice()){
      if(o !== e && Math.max(Math.abs(o.x - player.x), Math.abs(o.y - player.y)) <= 1){
        const cd = Math.max(1, Math.floor(d * 0.6));
        o.hp -= cd; o.flash = 4;
        triggerSlash(o.x, o.y, '#ff8b1f');
        floats.push({x:o.x, y:o.y, t:'กวาด -' + cd, c:'#ff8b1f', life:1});
        if(o.hp <= 0) killFoe(o);
      }
    }
  }

  if(e.id === 'naga' && (player.cls === 'garuda' || player.talents.some(t => t.id === 'ga_naga'))){
    d *= 2;
    msg('🦅 พญาครุฑกรงเล็บสังหารนาคิน ดาเมจทวีคูณ!', 'good');
  }
  if(isStealthAmbush){
    msg('🌿 ซุ่มโจมตีจากกอเถาวัลย์! คมขรรค์แทงจุดตายวิกฤต ๑๐๐%! -' + d, 'good');
  } else if(e.hp <= 0){
    killFoe(e);
  } else {
    msg((crit?'✦ คมขรรค์ฟันจุดตาย! ':'')+'เจ้าฟัน'+e.name+' -'+d);
  }
}
function killFoe(e){
  // สลายร่างเป็นกลุ่มควันวิญญาณ ไม่ทิ้งซากศพเกะกะ
  for(let spk=0; spk<8; spk++){
    sparks.push({
      x: e.x * T + 8, y: e.y * T + 8,
      vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
      c: e.boss ? '#f5c542' : '#8d55c9', life: 0.8
    });
  }
  player.xp+=e.xp;player.killsTotal++;
  if(player.awakenGauge < player.maxAwaken){ player.awakenGauge = Math.min(player.maxAwaken, player.awakenGauge + 8); }
  checkHeroTitle();
    if(player.relic && player.relic.id === 'heart_ravana'){
    player.hp = Math.min(player.mhp, player.hp + 5);
    floats.push({x: player.x, y: player.y, t: '+๕ ดวงใจมาร', c: '#ff7a5c', life: 1});
  }
  unlockAch('first_blood');
  if(player.killsTotal >= 50) unlockAch('slayer_50');
  if(player.killsTotal >= 100) unlockAch('slayer_100');
  discoverFoe(e.id);kills[e.id]=(kills[e.id]||0)+1;
  const g = (e.g && !isNaN(e.g)) ? e.g + R(Math.max(1, e.g)) : 8;
  if(player.relic && player.relic.id === 'diamond_ring') g = Math.floor(g * 1.5);
  if(player.relic && player.relic.id === 'ring_greed') g = Math.floor(g * 2.5);
  player.gold = (!isNaN(player.gold) ? player.gold : 0) + g;
  msg(e.name+'แตกดับ! +'+e.xp+' ประสบการณ์ +'+g+' เหรียญ');
  const r=rng();
  if(r<.06)items.push({x:e.x,y:e.y,t:'pot',name:'อมฤต',heal:12+floor*2});
  else if(r<.2)items.push({x:e.x,y:e.y,t:'gold',amt:5+R(10)});
  else if(r<.27)items.push({x:e.x,y:e.y,...genGroundItem()});
  
  if(e.id === 'naga'){
    const k = getKarma();
    k.nagaKills = (k.nagaKills || 0) + 1;
    if(k.nagaKills >= 15) k.unlockedGaruda = true;
    saveKarma(k);
  }

  enemies=enemies.filter(o=>o!==e);
  if(e.elite){
    msg('👑 ล้มจอม' + e.name + 'สำเร็จ! หีบสมบัติล้ำค่าหล่นลงพื้น!', 'good');
    items.push({ x: e.x, y: e.y, ...genW(clamp(Math.floor(floor/4)+1, 1, 4)) });
  }
  if(e.boss){
    if(floor === 5) unlockAch('boss_khara');
    if(floor === 10) unlockAch('boss_maricha');
    if(floor === 15) unlockAch('boss_kumbha');
    if(floor === 20) unlockAch('victory_moksha');
    if(floor===FINAL && !endless){victory();return;}
    stairs.locked=false;sfx.stairs();
    msg('ผนึกบันไดสลายแล้ว! ทางลงเปิดออก…','good');
    items.push({x:e.x,y:e.y,...genGroundItem()});
    player.gold+=30+floor*2;
  }
  checkLevel();
}
function checkLevel(){
  let up=false;
  while(player.xp>=xpNeed(player.lvl)){
    player.xp-=xpNeed(player.lvl);player.lvl++;up=true;
    player.mhp+=7;player.mmp+=4;player.atk+=2;player.def+=1;
    player.hp=Math.min(player.mhp,player.hp+(player.mhp>>1));
    player.mp=player.mmp;
    // ทุกๆ ๕ เลเวล รับ ๑ แต้มพรสวรรค์
    if(player.lvl % 5 === 0){
      player.talentPoints = (player.talentPoints || 0) + 1;
    }
    for(const s of CLASSES[player.cls].mantras){
      if(!s.includes('@'))continue;
      const [k,l]=s.split('@');
      if(player.lvl>=+l&&!player.mantras.includes(k)){
        player.mantras.push(k);msg('รู้แจ้งอาคม «'+MANTRAS[k].n+'» แล้ว!','good');
      }
    }
  }
  if(up){
    msg('⟐ เลื่อนขั้นเป็นระดับ '+thaiNum(player.lvl)+'!','good');
    floats.push({x:player.x,y:player.y,t:'LEVEL UP',c:'#f5c542',life:1.4});
    sfx.level();
    if(player.talentPoints > 0){
      triggerTalentChoice();
    }
  }
}
const xpNeed=l=>l*25+(l-1)*(l-1)*5;
function hurtPlayer(d,src,attacker=null){
  let dodgeRate = player.dodge;
  if(player.wpn && player.wpn.cursed === 'no_dodge') dodgeRate = 0; // คำสาปหอกวิญญาณสถิต
  if(player.relic && player.relic.id === 'vanara_bangle') dodgeRate += 25;
  if(player.arm && player.arm.affix === 'dodge') dodgeRate += 15;
  if(rng()*100 < dodgeRate){
    msg('เจ้าพลิกตัวหลบ'+src+'ได้!');
    floats.push({x:player.x,y:player.y,t:'พลาด!',c:'#2ec4a6',life:1});
    if(attacker && player.talents.some(t => t.id === 'v_counter')){
      const cDmg = Math.max(2, Math.floor((player.atk + player.wpn.v) * 0.8));
      attacker.hp -= cDmg; attacker.flash = 4;
      triggerSlash(attacker.x, attacker.y, '#2ec4a6');
      floats.push({x:attacker.x, y:attacker.y, t:'เหยียบหัวสวน -'+cDmg, c:'#2ec4a6', life:1.2});
      msg('🐒 ลิงลมเหยียบหัวสวนกลับใส่ ' + attacker.name + ' -' + cDmg, 'good');
      if(attacker.hp <= 0) killFoe(attacker);
    }
    return;
  }

  // เกราะป้องกันธาตุ
  if(player.arm && player.arm.affix === 'resist' && (src.includes('พิษ') || src.includes('ไฟ'))){
    d = Math.max(1, Math.floor(d * 0.5));
  }

  if(player.talents.some(t => t.id === 'b_shield') && player.mp > 0){
    const absorb = Math.min(player.mp, Math.ceil(d * 0.5));
    player.mp -= absorb;
    d -= absorb;
    floats.push({x:player.x, y:player.y, t:'ม่านมนตร์ -' + absorb + ' MP', c:'#6fe0cd', life:1});
  }
  player.hp -= d; flash = .4; shake = 6; sfx.hurt();
    // คำสาปธำมรงค์คนโลภ: ทำเหรียญทองหล่นตามดาเมจที่โดนตี
  if(player.relic && player.relic.id === 'ring_greed' && player.gold > 0){
    const lostG = Math.min(player.gold, d * 2);
    player.gold -= lostG;
    floats.push({x: player.x, y: player.y, t: '-' + lostG + ' ◉', c: '#f5c542', life: 1});
    msg('💰 เจ้าทำเหรียญทองหล่นกระจาย! -' + lostG + ' ◉', 'warn');
  } triggerHaptic('hurt');
  triggerSlash(player.x, player.y, '#e5482e');
  floats.push({x:player.x, y:player.y, t:'-'+d, c:'#ff5a4d', life:1});
  msg(src+'ทำร้ายเจ้า -'+d, 'warn');

  // เกราะหนามสะท้อนกลับ
  if(attacker && player.arm && player.arm.affix === 'thorns'){
    const ref = 3 + Math.floor(floor * 0.2);
    attacker.hp -= ref; attacker.flash = 4;
    floats.push({x:attacker.x, y:attacker.y, t:'หนาม -'+ref, c:'#e5482e', life:1});
    msg('เกราะหนามแทงสะท้อนกลับ'+attacker.name+' -'+ref, 'good');
    if(attacker.hp <= 0) killFoe(attacker);
  }

  
  // ตรวจสอบมณีโมกษะ (ชุบชีวิตฟื้นคืนชีพ 1 ครั้ง)
  if(player.hp <= 0 && player.relic && player.relic.id === 'ankh'){
    player.relic = null;
    player.hp = Math.floor(player.mhp * 0.8);
    player.mp = player.mmp;
    player.poison = 0; player.burn = 0;
    flash = 0.8; sfx.level();
    floats.push({x:player.x, y:player.y, t:'✦ ชุบชีวิต!', c:'#f5c542', life:2});
    msg('💎 มณีโมกษะเปล่งประกายเจิดจ้าแล้วแตกสลาย — วิญญาณของเจ้าหวนคืนชีพ!', 'good'); unlockAch('revive_ankh');
    updateHud();
    return;
  }

  if(player.hp <= 0) die();
}

/* ── เทิร์นศัตรู ── */
function enemiesAct(){
  for(const e of enemies){
    if(e.hp<=0)continue;
    if(e.stun > 0){
      e.stun--;
      floats.push({x:e.x, y:e.y, t:'มึนงง!', c:'#f5c542', life:1});
      continue; // ข้ามเทิร์น
    }
    const dx=player.x-e.x,dy=player.y-e.y,dist=Math.max(Math.abs(dx),Math.abs(dy));
    if(vis[e.y*W+e.x]&&dist<=9)e.awake=true;
    if(!e.awake){
      if(rng()<.15){const d=[[1,0],[-1,0],[0,1],[0,-1]][R(4)];
        if(canWalk(e.x+d[0],e.y+d[1])&&!enemyAt(e.x+d[0],e.y+d[1])&&!npcAt(e.x+d[0],e.y+d[1])
          &&!(player.x===e.x+d[0]&&player.y===e.y+d[1])){e.x+=d[0];e.y+=d[1];}}
      continue;
    }
    const playerArmDef = player.arm ? player.arm.v : 0;
    if(dist===1){
      // ศัตรูพุ่งกระแทกเข้าหาผู้เล่น
      e.bumpX = Math.sign(dx)*6; e.bumpY = Math.sign(dy)*6;
      let eAtkVal = e.atk;
      if(player.relic && player.relic.id === 'heart_ravana') eAtkVal = Math.floor(eAtkVal * 1.25);
      let d=Math.max(1,eAtkVal+R(3)-((player.def+playerArmDef)>>1));
      if(rng()<.08){d<<=1;msg(e.name+'จู่โจมเข้าจุดตาย!','warn');}
      hurtPlayer(d,e.name,e);
      continue;
    }
    if(e.ranged&&dist<=5&&dist>1&&los(e.x,e.y,player.x,player.y)){
      // พ่นพิษคิดเกราะป้องกันด้วย
      let eRAtkVal = e.atk;
      if(player.relic && player.relic.id === 'heart_ravana') eRAtkVal = Math.floor(eRAtkVal * 1.25);
      const d=Math.max(1,eRAtkVal+R(2)-((player.def+playerArmDef)>>1));
      hurtPlayer(d,e.name+' (พ่นพิษ)',e);
      triggerSlash(player.x,player.y,'#43b05c');
      continue;
    }
    const sx=Math.sign(dx),sy=Math.sign(dy);
    const order=Math.abs(dx)>Math.abs(dy)?[[sx,0],[0,sy]]:[[0,sy],[sx,0]];
    for(const[mx,my]of order){
      if(!mx&&!my)continue;
      const nx=e.x+mx,ny=e.y+my;
      if(canWalk(nx,ny)&&!enemyAt(nx,ny)&&!npcAt(nx,ny)&&!(nx===player.x&&ny===player.y)){
        e.x=nx;e.y=ny;break;
      }
    }
  }
}
function endTurn(){
  if(state!=='play')return;
  enemiesAct();
  if(player.hp<=0)return;
  time++;

  // ประมวลผลสถานะติดไฟ / ติดพิษ ของผู้เล่น
  if(player.poison > 0){
    player.poison--;
    const pDmgP = (player.arm && player.arm.cursed === 'fire_vuln') ? 2 : 1;
    player.hp -= pDmgP;
    floats.push({x:player.x, y:player.y, t:'-' + thaiNum(pDmgP) + ' พิษ', c:'#43b05c', life:0.9});
    if(player.hp <= 0){ die(); return; }
  }
  if(player.burn > 0){
    player.burn--;
    const pDmgF = (player.arm && player.arm.cursed === 'fire_vuln') ? 4 : 2;
    player.hp -= pDmgF;
    floats.push({x:player.x, y:player.y, t:'-' + thaiNum(pDmgF) + ' ไฟ', c:'#ff8b1f', life:0.9});
    if(player.hp <= 0){ die(); return; }
  }

  // ฟื้นเลือดอัตโนมัติเฉพาะผู้ที่สวมเกราะอมฤตเท่านั้น (ตัดการรีเจนฟรี เพื่อความท้าทาย)
  if(player.arm && player.arm.affix === 'regen' && time % 3 === 0 && player.hp < player.mhp){
    player.hp++;
    floats.push({x:player.x, y:player.y, t:'+๑ อมฤต', c:'#2ec4a6', life:0.8});
  }

  // ประมวลผลสถานะติดไฟ / พิษ ของศัตรู
  for(const e of enemies.slice()){
    if(e.hp <= 0) continue;
    let dot = 0;
    if(e.poison > 0){ e.poison--; dot += 2; floats.push({x:e.x, y:e.y, t:'-๒ พิษ', c:'#43b05c', life:0.8}); }
    if(e.burn > 0){ e.burn--; dot += 3; floats.push({x:e.x, y:e.y, t:'-๓ ไฟ', c:'#ff8b1f', life:0.8}); }
    if(dot > 0){
      e.hp -= dot; e.flash = 3;
      if(e.hp <= 0) killFoe(e);
    }
  }

  
  // 🐾 สัตว์เลี้ยงออกปฏิบัติการ
  if(player.pet){
    if(player.pet.type === 'monkey'){
      // ลูกลิงลมช่วยเก็บเหรียญทองรอบตัว ๓ ช่อง
      const nearGoldIdx = items.findIndex(it => it.t === 'gold' && Math.max(Math.abs(it.x-player.x), Math.abs(it.y-player.y)) <= 3);
      if(nearGoldIdx >= 0){
        const gIt = items.splice(nearGoldIdx, 1)[0];
        player.gold += gIt.amt;
        sfx.gold();
        msg('🐒 ลูกลิงลมกระโดดเก็บเหรียญ ◉' + gIt.amt + ' มาให้!', 'good');
      }
    } else if(player.pet.type === 'naga' && time % 2 === 0){
      // ลูกพญานาคพ่นพิษใส่ศัตรู
      const visFoe = enemies.find(e => vis[e.y*W+e.x] && Math.max(Math.abs(e.x-player.x), Math.abs(e.y-player.y)) <= 4);
      if(visFoe){
        visFoe.poison = (visFoe.poison || 0) + 2; visFoe.flash = 3;
        triggerSlash(visFoe.x, visFoe.y, '#43b05c');
        floats.push({x:visFoe.x, y:visFoe.y, t:'พิษพญานาค!', c:'#43b05c', life:1});
      }
    }
  }

  
  // ประมวลผลทะเลเพลิงลุกลาม (Fire Surfaces & Propagation)
  for(let fi = fireTiles.length - 1; fi >= 0; fi--){
    const ft = fireTiles[fi];
    ft.turns--;

    // ถ้าตัวเรายืนอยู่บนไฟ
    if(player.x === ft.x && player.y === ft.y){
      player.hp -= 3;
      player.burn = (player.burn || 0) + 2;
      floats.push({x: player.x, y: player.y, t: '-๓ ไฟลวก', c: '#ff8b1f', life: 0.9});
      if(player.hp <= 0){ die(); return; }
    }

    // ถ้าศัตรูยืนอยู่บนไฟ
    const foeOnFire = enemyAt(ft.x, ft.y);
    if(foeOnFire){
      foeOnFire.hp -= 4; foeOnFire.flash = 4;
      foeOnFire.burn = (foeOnFire.burn || 0) + 2;
      floats.push({x: foeOnFire.x, y: foeOnFire.y, t: '-๔ ไฟลวก', c: '#ff8b1f', life: 0.9});
      if(foeOnFire.hp <= 0) killFoe(foeOnFire);
    }

    // ไฟลามไปยังกอเถาวัลย์ช่องข้างเคียง
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for(const [dx, dy] of dirs){
      const nx = ft.x + dx, ny = ft.y + dy;
      if(nx >= 0 && ny >= 0 && nx < W && ny < H && isGrass(nx, ny)){
        igniteGrass(nx, ny);
      }
    }

    if(ft.turns <= 0) fireTiles.splice(fi, 1);
  }

  // ปฏิกิริยาน้ำ + ไฟ: ถ้าติดไฟแล้วยืนอยู่ในน้ำ ไฟจะดับทันทีเกิดไอน้ำ
  if(player.burn > 0 && isWater(player.x, player.y)){
    player.burn = 0;
    msg('💧 น้ำชำระล้างเปลวเพลิงมอดสนิท! เกิดกลุ่มไอน้ำฟุ้งกระจาย', 'good');
    for(let i=0; i<6; i++){
      sparks.push({x: player.x*T+8, y: player.y*T+8, vx:(Math.random()-0.5)*2, vy:-Math.random()*2, c:'#f4ecdc', life:1});
    }
  }
  for(const e of enemies){
    if(e.burn > 0 && isWater(e.x, e.y)){
      e.burn = 0;
      for(let i=0; i<4; i++){
        sparks.push({x: e.x*T+8, y: e.y*T+8, vx:(Math.random()-0.5)*2, vy:-Math.random()*2, c:'#f4ecdc', life:0.8});
      }
    }
  }

    // คำสาปเกราะกระดูกอสูรทมิฬ: สูบกลืนไอเวท ๒ MP ทุกเทิร์น (ถ้า MP หมดจะสูบเลือดแทน)
  if(player.arm && player.arm.cursed === 'drain_mp'){
    if(player.mp >= 2){
      player.mp -= 2;
      floats.push({x: player.x, y: player.y, t: '-๒ MP', c: '#6fe0cd', life: 0.7});
    } else {
      player.hp -= 2;
      floats.push({x: player.x, y: player.y, t: '-๒ HP', c: '#d43d2a', life: 0.8});
      if(player.hp <= 0){ die(); return; }
    }
  }
  
  // ประมวลผลบัฟยาวิเศษ
  if(player.buffIronskin > 0) player.buffIronskin--;
  if(player.buffInvis > 0) player.buffInvis--;
  if(player.buffCoating > 0) player.buffCoating--;

  // ทหารวานรช่วยสู้
  if(player.summons > 0){
    const nearFoe = enemies.find(e => vis[e.y*W+e.x] && Math.max(Math.abs(e.x-player.x), Math.abs(e.y-player.y)) <= 3);
    if(nearFoe){
      const sAtk = 8 + R(5);
      nearFoe.hp -= sAtk; nearFoe.flash = 4;
      triggerSlash(nearFoe.x, nearFoe.y, '#f5c542');
      floats.push({x: nearFoe.x, y: nearFoe.y, t: 'วานรช่วย -' + sAtk, c: '#f5c542', life: 1});
      msg('🐒 ทหารวานรเข้าจู่โจมใส่ ' + nearFoe.name + ' -' + sAtk, 'good');
      if(nearFoe.hp <= 0) killFoe(nearFoe);
    }
  }

  
  // ระบบลดพลังกาย (Hunger)
  if(time % 8 === 0 && player.hunger > 0){
    player.hunger--;
  }
  if(player.hunger <= 0){
    if(time % 4 === 0){
      player.hp -= 1;
      floats.push({x: player.x, y: player.y, t: 'หิวโซ! -๑', c: '#ff8b1f', life: 0.8});
      msg('⚠ เจ้าหิวโซจนหมดเรี่ยวแรง! -๑ HP (ควรกินเสบียงอาหาร)', 'warn');
      if(player.hp <= 0){ die(); return; }
    }
  }

  // ประมวลผลกับดักที่ผู้เล่นวาง
  for(let ti = playerDeployedTraps.length - 1; ti >= 0; ti--){
    const pt = playerDeployedTraps[ti];
    pt.life--;
    const foeOnTrap = enemyAt(pt.x, pt.y);
    if(foeOnTrap){
      if(pt.id === 'bear_trap'){
        foeOnTrap.hp -= 16; foeOnTrap.stun = 3; foeOnTrap.flash = 6;
        triggerSlash(pt.x, pt.y, '#d43d2a');
        floats.push({x: pt.x, y: pt.y, t: 'กับดักหนาม -๑๖ ล็อคขา!', c: '#ff3b30', life: 1.5});
        msg('⚙️ ' + foeOnTrap.name + ' เดินเหยียบกับดักหนามพับได้! โดนหนามแทง -๑๖ และล็อคขา!', 'good');
        playerDeployedTraps.splice(ti, 1);
        if(foeOnTrap.hp <= 0) killFoe(foeOnTrap);
      }
    }
    if(pt.life <= 0) playerDeployedTraps.splice(ti, 1);
  }

  
  // ประมวลผลสถานะร่างอวตาร (Awakening)
  if(player.isAwakened > 0){
    player.isAwakened--;
    // กษัตริย์ทรงเครื่องพระนารายณ์ ๔ กร: ฟันกวาด ๔ ทิศรอบตัว
    if(player.cls === 'ksatriya'){
      for(const oe of enemies.slice()){
        if(Math.max(Math.abs(oe.x-player.x), Math.abs(oe.y-player.y)) <= 1){
          oe.hp -= 12; oe.flash = 4;
          triggerSlash(oe.x, oe.y, '#f5c542');
          floats.push({x: oe.x, y: oe.y, t: 'นารายณ์ฟัน -๑๒', c: '#f5c542', life: 1});
          if(oe.hp <= 0) killFoe(oe);
        }
      }
    } else if(player.cls === 'rishi'){
      // ฤๅษีพระศิวะเบิกเนตร: ระเบิดเพลิงเผาศัตรูทั้งห้อง
      for(const oe of enemies.slice()){
        if(vis[oe.y*W+oe.x]){
          oe.hp -= 8; oe.burn = (oe.burn||0) + 2; oe.flash = 4;
          triggerSlash(oe.x, oe.y, '#ff8b1f');
          floats.push({x: oe.x, y: oe.y, t: 'เนตรศิวะ -๘', c: '#ff8b1f', life: 1});
          if(oe.hp <= 0) killFoe(oe);
        }
      }
    }
    if(player.isAwakened === 0){
      msg('ร่างอวตารคลายมนตร์… กลับคืนสู่สภาพเดิม');
    }
  }

  computeFov();updateHud();saveGame();
}

/* ── ของ / ร้านค้า / อาคม / เทวาลัย ── */
function pickup(gi){
  const it=items[gi];
  if(!it) return;
  items.splice(gi,1);
  if(it.t==='skel'){
    player.gold += it.gold;
    sfx.level(); flash = 0.5;
    let recMsg = '💀 เจ้าพบกองอัฐิตนเองในชาติก่อน! กู้คืนเหรียญ ◉' + it.gold;
    if(it.wpn && player.inv.length < (player.bagMax || 10)){
      player.inv.push(it.wpn);
      recMsg += ' และอาวุธ «' + it.wpn.name + '»';
    }
    msg(recMsg, 'good');
    try { localStorage.removeItem(SKEL_KEY); } catch(e){}
    updateHud();
    return;
  }
  if(it.t==='gold'){player.gold+=it.amt;msg('เก็บเหรียญกษาปณ์ +'+it.amt);sfx.gold();return;}
  if(player.inv.length >= (player.bagMax || 10)){msg('ถุงผ้าเต็ม! ของถูกทิ้งไว้…','warn');items.push(it);return;}
  player.inv.push(it);sfx.pick(); discoverItem(it.baseName || it.name);
  msg('เก็บ «'+it.name+'»'+statTxt(it));
}
function statTxt(it){
  let s = '';
  if(it.t==='wpn') s = ' โจมตี+'+it.v;
  else if(it.t==='arm') s = ' ป้องกัน+'+it.v;
  else if(it.t==='pot') s = ' ฟื้นเลือด+'+it.heal;
  else if(it.t==='mana') s = ' ฟื้นมนตร์+'+it.mana;
  else if(it.t==='throw') s = ' ปาไกล ' + thaiNum(it.range) + ' ช่อง ดาเมจ ' + thaiNum(it.dmg);
  else s = ' (อาคม)';
  if(it.afDesc) s += ' ✦' + it.afDesc;
  return s;
}
function useItem(i){
  const it=player.inv[i];if(!it)return;
  if(it.t==='throw'){
    // หาเป้าหมายที่มองเห็นได้ในระยะ
    const inRange = enemies.filter(e => vis[e.y*W+e.x] && Math.max(Math.abs(e.x-player.x), Math.abs(e.y-player.y)) <= (it.range||5))
      .sort((a,b) => (Math.abs(a.x-player.x)+Math.abs(a.y-player.y)) - (Math.abs(b.x-player.x)+Math.abs(b.y-player.y)));
    if(!inRange.length){
      msg('ไม่มีศัตรูในระยะขว้าง ' + thaiNum(it.range||5) + ' ช่อง', 'warn');
      return;
    }
    const t = inRange[0];
    const d = Math.max(2, it.dmg + R(4) - (t.def >> 1));
    t.hp -= d; t.awake = true; t.flash = 6;
    if(it.burn) t.burn = (t.burn||0) + it.burn;
    triggerSlash(t.x, t.y, it.c || '#f5c542');
    floats.push({x:t.x, y:t.y, t:'-' + d, c:it.c || '#f5c542', life:1});
    msg('เจ้าขว้าง «' + it.name + '» ใส่' + t.name + ' -' + d);
    sfx.slash();
    player.inv.splice(i, 1);
    if(t.hp <= 0) killFoe(t);
    hide($('invOv'));
    endTurn();
    return;
  }
  // ตรวจสอบสัจจะอดทนต่อเวทนา (ห้ามดื่มยา)
  if(it.t==='pot' && player.vow && player.vow.type === 'no_pot'){
    player.hp -= 12; flash = 0.6; shake = 6; sfx.hurt();
    msg('⚡ เจ้าฝ่าฝืนสัจจะอดทนต่อเวทนา! มนต์พระอินทร์ลงทัณฑ์ผู้ตระบัดสัตย์!', 'warn');
    player.vow = null;
    if(player.hp <= 0){ die(); return; }
  }
  if(it.t==='pot'){
    const maxCap = (player.wpn && player.wpn.cursed === 'max_half_heal') ? Math.floor(player.mhp * 0.5) : player.mhp;
    player.hp = Math.min(maxCap, player.hp + it.heal);
    msg('ดื่มอมฤต ฟื้นเลือด +'+it.heal,'good');sfx.pick();
    player.inv.splice(i,1);}
  else if(it.t==='mana'){player.mp=Math.min(player.mmp,player.mp+it.mana);
    msg('ดื่มน้ำโสม ฟื้นมนตร์ +'+it.mana,'good');sfx.pick();
    player.inv.splice(i,1);}
  else if(it.t==='wpn'){
    // สลับอาวุธเดิมกลับเข้ากระเป๋า ไม่สูญหาย
    const oldWpn=player.wpn;
    player.wpn=it;
    player.inv.splice(i,1);
    if(oldWpn&&oldWpn.tier>0)player.inv.push(oldWpn);
    msg('ถือ «'+it.name+'» โจมตี+'+it.v);sfx.pick();
  }
  else if(it.t==='arm'){
    const oldArm=player.arm;
    player.arm=it;
    player.inv.splice(i,1);
    if(oldArm&&oldArm.tier>0)player.inv.push(oldArm);
    msg('สวม «'+it.name+'» ป้องกัน+'+it.v);sfx.pick();
  }
        else if(it.t==='ore'){
    smithInfuseWeapon(it, i);
    renderInv();
    return;
  }
  else if(it.t==='gem'){
    socketGemToEquip(it, i);
    renderInv();
    return;
  }
  else if(it.t==='ration'){
    player.hunger = Math.min(player.maxHunger, player.hunger + it.hunger);
    if(it.heal) player.hp = Math.min(player.mhp, player.hp + it.heal);
    if(it.haste) player.buffHaste = (player.buffHaste || 0) + it.haste;
    sfx.pick(); flash = 0.3;
    msg('🍎 กิน «' + it.name + '» พลังกายเพิ่มเป็น ' + player.hunger + '%', 'good');
    floats.push({x: player.x, y: player.y, t: '+' + it.hunger + ' พลังกาย', c: '#f5c542', life: 1.5});
    player.inv.splice(i, 1);
    updateHud();
    endTurn();
    return;
  }
  else if(it.t==='player_tool'){
    // วางกับดักของผู้เล่นลงบนพื้น
    playerDeployedTraps.push({ x: player.x, y: player.y, id: it.toolId, life: 8 });
    msg('⚙️ วาง «' + it.name + '» ลงบนพื้นเรียบร้อย!', 'good');
    sfx.pick();
    player.inv.splice(i, 1);
    updateHud();
    endTurn();
    return;
  }
  else if(it.t==='head'){
    const oldHead = player.head;
    player.head = it;
    player.inv.splice(i, 1);
    if(oldHead) player.inv.push(oldHead);
    msg('สวมมงกุฎ/ชฎา «' + it.name + '» ' + it.desc, 'good');
    sfx.level();
  }
  else if(it.t==='scroll_tac'){
    // คัมภีร์ยุทธวิธี
    if(it.scrollId === 'map'){
      seen.fill(1);
      msg('📜 คัมภีร์เบิกเนตรส่องสว่าง! แผนที่วิหารทั้งชั้นถูกเปิดเผยทั้งหมด!', 'good');
      sfx.level(); flash = 0.5;
    } else if(it.scrollId === 'curse'){
      // ล้างคำสาปอุปกรณ์
      let cleansed = false;
      if(player.wpn && player.wpn.cursed){
        player.wpn.cursed = null; player.wpn.curseDesc = null;
        player.wpn.name = player.wpn.name.replace('[ต้องสาป]', '[ชำระแล้ว]');
        cleansed = true;
      }
      if(player.arm && player.arm.cursed){
        player.arm.cursed = null; player.arm.curseDesc = null;
        player.arm.name = player.arm.name.replace('[ต้องสาป]', '[ชำระแล้ว]');
        cleansed = true;
      }
      player.poison = 0; player.burn = 0;
      sfx.level(); flash = 0.8;
      msg('✨ คัมภีร์ชำระคำสาป! ลบล้างผลเสียของอุปกรณ์ต้องสาปทิ้งอย่างถาวร!', 'good');
    } else if(it.scrollId === 'summon'){
      // อัญเชิญทหารวานร
      player.summons = (player.summons || 0) + 3;
      msg('📜 คัมภีร์อัญเชิญสำแดงฤทธิ์! ทหารวานรผุดขึ้นมาร่วมรบ!', 'good');
      sfx.level();
    } else if(it.scrollId === 'teleport'){
      // วาร์ปหนีฉุกเฉิน
      msg('🌀 คัมภีร์ย้ายมิติทำงาน! เจ้าถูกเคลื่อนย้ายไปสู่ห้องปลอดภัย', 'good');
      player.x = 2 + Math.floor(rng()*(W-4)); player.y = 2 + Math.floor(rng()*(H-4));
      while(map[player.y*W+player.x] !== 1){ player.x = 2 + Math.floor(rng()*(W-4)); player.y = 2 + Math.floor(rng()*(H-4)); }
      sfx.cast();
    }
    player.inv.splice(i, 1);
    updateHud();
    endTurn();
    return;
  }
  else if(it.t==='elixir'){
    // ยาวิเศษ
    if(it.elixirId === 'ironskin') player.buffIronskin = (player.buffIronskin || 0) + it.turns;
    else if(it.elixirId === 'invis') player.buffInvis = (player.buffInvis || 0) + it.turns;
    else if(it.elixirId === 'coating') player.buffCoating = (player.buffCoating || 0) + it.turns;
    sfx.level(); flash = 0.4;
    msg('🧪 ดื่ม «' + it.name + '» ' + it.desc, 'good');
    player.inv.splice(i, 1);
    updateHud();
    endTurn();
    return;
  }
  else if(it.t==='egg'){
    player.pet = { ...PET_TYPES[it.petType], type: it.petType };
    player.inv.splice(i, 1);
    sfx.level(); flash = 0.5;
    floats.push({x:player.x, y:player.y, t:'สัตว์เลี้ยงฟัก!', c:'#f5c542', life:2});
    msg('🐣 ' + it.name + ' ฟักออกเป็น «' + player.pet.name + '» เดินตามช่วยผจญภัย!', 'good');
    updateHud();
    renderInv();
    return;
  }
  else if(it.t==='relic'){
    const oldRelic = player.relic;
    player.relic = it; unlockAch('relic_equip');
    player.inv.splice(i, 1);
    if(oldRelic) player.inv.push(oldRelic);
    msg('สวมใส่เครื่องราง «' + it.name + '» ' + it.desc, 'good');
    sfx.level();
  }
  else if(it.t==='hook'){
    // ตรวจสอบกำแพงทั้ง 4 ทิศรอบตัวผู้เล่น
    const dirs = [[0,-1],[0,1],[-1,0],[1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    let found = false;
    for(const [dx, dy] of dirs){
      const hx = player.x + dx, hy = player.y + dy;
      const wIdx = items.findIndex(wIt => wIt.x === hx && wIt.y === hy);
      if(wIdx >= 0){
        const wItem = items.splice(wIdx, 1)[0];
        items.push({ x: player.x, y: player.y, ...wItem });
        triggerSlash(hx, hy, '#f5c542');
        sfx.pick();
        msg('🪝 เจ้าเหวี่ยงตะขอเกี่ยว «' + wItem.name + '» ออกมาจากซอกกำแพงสำเร็จ!', 'good');
        const gi = items.findIndex(i => i.x === player.x && i.y === player.y);
        if(gi >= 0) pickup(gi);
        found = true;
        hide($('invOv'));
        endTurn();
        break;
      }
    }
    if(!found){
      msg('ไม่มีสมบัติในซอกกำแพงรอบตัวในระยะตะขอ…', 'warn');
    }
    return;
  }
  else if(it.t==='upg'){
    // คัมภีร์ตีบวกอาวุธ
    if(!player.wpn){ msg('ไม่มีอาวุธที่จะตีบวก…', 'warn'); return; }
    player.wpn.plus = (player.wpn.plus || 0) + 1;
    player.wpn.v += 2;
    player.wpn.name = player.wpn.baseName + ' +' + thaiNum(player.wpn.plus) + (player.wpn.afName ? ' [' + player.wpn.afName + ']' : '');
    player.inv.splice(i, 1);
    sfx.level(); flash = 0.5;
    floats.push({x:player.x, y:player.y, t:'อัปเกรด +๑!', c:'#f5c542', life:1.6}); unlockAch('upgrade_plus');
    msg('✦ คัมภีร์ประสิทธิ์ประสาท! «' + player.wpn.name + '» พลังโจมตีเพิ่มขึ้นเป็น ' + player.wpn.v + ' อย่างถาวร!', 'good');
  }
  else if(it.t==='scr'){
    if(player.mantras.includes(it.key)){player.punya+=5;msg('รู้แจ้งอยู่แล้ว — แปลงเป็นปุญ +๕','good');}
    else{player.mantras.push(it.key);msg('ศึกษา «'+MANTRAS[it.key].n+'» สำเร็จ!','good');sfx.cast();}
    player.inv.splice(i,1);
  }
  updateHud();
}
function castMantra(key){
  if(state!=='play')return;
  const m=MANTRAS[key];
  const reqMp = (player.relic && player.relic.id === 'beads') ? Math.max(1, Math.ceil(m.mp / 2)) : m.mp;
  if(player.mp < reqMp){msg('พลังมนตร์ไม่พอ… (ต้องการ '+reqMp+')','warn');return;}
  let used=true;
  if(key==='agni'||key==='vajra'){
    const visF=enemies.filter(e=>vis[e.y*W+e.x])
      .sort((a,b)=>(Math.abs(a.x-player.x)+Math.abs(a.y-player.y))-(Math.abs(b.x-player.x)+Math.abs(b.y-player.y)));
    if(!visF.length){msg('ไม่มีศัตรูในระยะมองเห็น','warn');return;}
    const t=visF[0];
    const d=key==='agni'?6+player.lvl*2:12+player.lvl*3;
    t.hp-=d;t.flash=6;
        if(isGrass(t.x, t.y)){
      igniteGrass(t.x, t.y);
    }
    triggerSlash(t.x,t.y,key==='agni'?'#ff8b1f':'#f5c542');
    floats.push({x:t.x,y:t.y,t:'-'+d,c:key==='agni'?'#ff8b1f':'#f5c542',life:1});
    msg((key==='agni'?'✹ เปลวเพลิง':'⌁ สายฟ้าพระอินทร์')+'สังหาร'+t.name+' -'+d);
    if(key === 'vajra' && isWater(t.x, t.y)) electrifyWater(t.x, t.y, d);
    if(t.hp<=0){
      player.spellKills = (player.spellKills || 0) + 1;
      if(player.spellKills >= 10) unlockAch('mage_master');
      if(player.talents.some(tal => tal.id === 'b_drain')){
        player.mp = Math.min(player.mmp, player.mp + 5);
        floats.push({x:player.x, y:player.y, t:'+๕ MP', c:'#6fe0cd', life:1});
      }
      killFoe(t);
    }
  }else if(key==='heal'){
    const h=10+player.lvl*2;player.hp=Math.min(player.mhp,player.hp+h);
    msg('✚ อมฤตชำระกาย ฟื้นเลือด +'+h,'good');
    floats.push({x:player.x,y:player.y,t:'+'+h,c:'#2ec4a6',life:1});
    for(let i=0;i<8;i++){
      sparks.push({x:player.x*T+8,y:player.y*T+8,vx:(Math.random()-.5)*3,vy:-Math.random()*3,c:'#2ec4a6',life:1});
    }
  }else if(key==='vaju'){
    let hitAny=false;
    for(const e of enemies.slice()){
      if(Math.max(Math.abs(e.x-player.x),Math.abs(e.y-player.y))<=2){
        const d=5+player.lvl;e.hp-=d;e.flash=5;hitAny=true;
        triggerSlash(e.x,e.y,'#2ec4a6');
        floats.push({x:e.x,y:e.y,t:'-'+d,c:'#2ec4a6',life:1});
        if(e.hp<=0)killFoe(e);
      }
    }
    msg('❋ พายุวายุพัดกระหน่ำ'+(hitAny?'!':' — แต่ไม่มีใครอยู่ในรัศมี'));
        // คาถาวายุพัดกระจาย: ดับไฟบนตัวผู้เล่นทันที
    if(player.burn > 0){
      player.burn = 0;
      msg('❋ ลมพายุวายุพัดดับเปลวเพลิงบนร่างเจ้ามอดสนิท!', 'good');
    }
  }
  if(used){
  let used=true;
  if(player.relic && player.relic.id === 'skull_rosary'){
    const hpCost = Math.max(2, Math.ceil(m.mp * 0.75));
    player.hp -= hpCost; flash = 0.5; shake = 4; sfx.hurt();
    floats.push({x: player.x, y: player.y, t: '-' + hpCost + ' HP', c: '#d43d2a', life: 1});
    msg('📿 ประคำกระดูกมารสูบไอโลหิต ' + hpCost + ' HP ร่ายอาคม!', 'warn');
    if(player.hp <= 0){ die(); return; }
  } else {
    player.mp -= reqMp;
  }
sfx.cast();hide($('mantraOv'));endTurn();}
}
function interact(n){
  if(n.type==='dilemma_asura'){
    if(!n.resolved) openDilemmaModal(n);
    else msg('อสูรนอนนิ่งสงบ… การตัดสินใจได้สิ้นสุดลงแล้ว');
    return;
  }
  if(n.type==='merchant'){
    renderShop(n);show($('shopOv'));sfx.gold();
  }
  else if(n.type==='hermit'){
    // เควสต์ส่งสาส์นลับ: ตรวจสอบว่าผู้เล่นมีสาส์นมาส่งในชั้นลึกหรือไม่ (ชั้น ๑๓ ขึ้นไป)
    const sIdx = player.inv.findIndex(it => it.t === 'quest_scroll');
    if(sIdx >= 0 && floor >= 13){
      player.inv.splice(sIdx, 1);
      player.deliveryDone = true;
      player.punya += 50;
      const rewardRelic = genRelic();
      if(player.inv.length < (player.bagMax||10)) player.inv.push(rewardRelic);
      else items.push({x:player.x, y:player.y, ...rewardRelic});
      msg('🪷 พระฤๅษีรับสาส์นลับด้วยความปีติ! มอบ «' + rewardRelic.name + '» และปุญบารมี +๕๐!', 'good');
      sfx.level(); flash = 0.6;
      unlockAch('quest_delivery');
      updateHud();
      return;
    }

    if(!n.used){
      n.used = true;
      player.hp = player.mhp; player.mp = player.mmp;
      sfx.level(); updateHud();

      // ในชั้นต้นๆ (ชั้น ๕ หรือ ๙) มอบสาส์นลับให้ผู้เล่นนำไปส่ง
      if(floor <= 9 && !player.hasDeliveryScroll && !player.deliveryDone){
        player.hasDeliveryScroll = true;
        const qScroll = {
          t: 'quest_scroll',
          name: 'สาส์นลับพระเวท',
          r: 'mythic',
          lore: 'ม้วนสาส์นใบลานศักดิ์สิทธิ์จากพระดาบส ต้องนำไปส่งให้พระฤๅษีในชั้นลึก (ชั้น ๑๓ ขึ้นไป)',
          price: 0
        };
        if(player.inv.length < (player.bagMax||10)) player.inv.push(qScroll);
        else items.push({x:player.x, y:player.y, ...qScroll});
        msg('📜 พระดาบสประสาทพรฟื้นเต็ม! และฝาก «สาส์นลับพระเวท» ให้ช่วยนำไปส่งมอบให้แก่ฤๅษีในชั้นลึก!', 'good');
      } else {
        msg('พระดาบสประสาทพร — ร่างกายฟื้นเต็ม!', 'good');
      }
    } else {
      msg('พระดาบสเข้าฌาน ไม่ตอบสนอง…');
    }
  }
}
function sellItem(i, n){
  const it = player.inv.splice(i, 1)[0];
  if(!it) return;
  const sellPrice = Math.max(5, Math.floor((it.price || 20) * 0.45));
  player.gold = (!isNaN(player.gold) ? player.gold : 0) + sellPrice;
  msg('ขาย «' + it.name + '» ได้เหรียญ +◉' + sellPrice, 'good');
  sfx.gold();
  updateHud();
  renderShop(n);
}

function renderShop(n){
  if(isNaN(player.gold)) player.gold = 0;
  $('shopTalk').textContent='“ยินดีต้อนรับผู้กล้า มีทั้งของดีและรับซื้อของในถุงผ้า…”';
  $('shopGold').textContent='◉ '+player.gold;
  const q=$('shopQuest');
  if(n.q&&!n.q.claimed){
    const done=kills[n.q.id]||0;
    q.innerHTML='<div class="row"><span>📜 เควสต์: ล่า '+n.q.name+' '+done+'/'+n.q.need+
      ' — รางวัล ◉'+n.q.reward+'</span><button class="mini-btn" id="qClaim"'+
      (done>=n.q.need?'':' disabled')+'>รับรางวัล</button></div>';
    const b=$('qClaim');
    if(b)b.onclick=()=>{
      player.gold+=n.q.reward;player.punya+=5;msg('เควสต์สำเร็จ! รับ ◉'+n.q.reward+' และปุญ +๕','good');
      const qf=getFoePool(floor);
      const qt=qf[Math.floor(rng()*qf.length)];
      n.q={id:qt.id,name:qt.name,need:3+R(3),got:0,reward:0,claimed:false};
      n.q.reward=n.q.need*(10+floor*2);
      sfx.buy();updateHud();renderShop(n);
    };
  }else q.innerHTML='<div class="row dim">— ไม่มีเควสต์ —</div>';

  // รายการสินค้าของวาณิช
  const s=$('shopStock');s.innerHTML='<h4 style="margin:8px 0 4px;color:var(--gold);font-size:13px">🛒 สินค้าของวาณิช</h4>';
  n.stock.forEach((it,si)=>{
    const r=document.createElement('div');r.className='row';
    r.innerHTML='<span>'+it.name+statTxt(it)+'</span>';
    const b=document.createElement('button');b.className='mini-btn';
    b.textContent='◉ '+it.price;b.disabled=player.gold<it.price;
    b.onclick=()=>{
      player.gold-=it.price;sfx.buy();
      if(it.t==='gold'){player.gold+=it.amt;}
      else if(player.inv.length >= (player.bagMax||10)){msg('ถุงผ้าเต็ม!','warn');player.gold+=it.price;return;}
      else player.inv.push({...it});
      msg('ซื้อ «'+it.name+'»');updateHud();renderShop(n);
    };
    r.appendChild(b);s.appendChild(r);
  });

  // ส่วนรับซื้อของจากผู้เล่น
  const sellBox = document.createElement('div');
  sellBox.style.marginTop = '12px';
  sellBox.innerHTML = '<h4 style="margin:8px 0 4px;color:var(--teal);font-size:13px">💰 รับซื้อของในถุงผ้า</h4>';
  if(!player.inv.length){
    sellBox.innerHTML += '<div class="row dim">ไม่มีของในถุงผ้าที่จะขาย</div>';
  } else {
    player.inv.forEach((it, i) => {
      const sellPrice = Math.max(5, Math.floor((it.price || 20) * 0.45));
      const r = document.createElement('div'); r.className = 'row';
      r.innerHTML = '<span>' + it.name + '</span>';
      const b = document.createElement('button'); b.className = 'mini-btn';
      b.textContent = 'ขาย +◉' + sellPrice;
      b.style.background = '#8f2438'; b.style.color = '#fff'; b.style.borderColor = '#d43d2a';
      b.onclick = () => sellItem(i, n);
      r.appendChild(b);
      sellBox.appendChild(r);
    });
  }
  s.appendChild(sellBox);
}
function pray(free){
  hide($('altarOv'));
  if(isNaN(player.gold)) player.gold = 0;
  if(!free && player.gold < 20){ msg('เหรียญไม่พอถวาย…','warn'); return; }
  const idx = player.y * W + player.x;
  map[idx] = 4; // เทวาลัยมอดดับลงทันที ใช้ได้ครั้งเดียวเท่านั้น!
  if(!free){ player.gold -= 20; player.punya += 10; msg('เจ้าถวายเครื่องสักการะ ปุญ +๑๐','good'); }
  const luck=rng()+Math.min(.25,player.punya/200);
  if(luck>.8){const s=['atk','def','mhp'][R(3)];
    if(s==='atk')player.atk++;else if(s==='def')player.def++;else{player.mhp+=5;player.hp+=5;}
    msg('🛕 เทพประทานพร! '+(s==='atk'?'โจมตี':s==='def'?'ป้องกัน':'เลือดสูงสุด')+' +ถาวร','good');sfx.level();}
  else if(luck>.45){player.hp=player.mhp;player.mp=player.mmp;
    msg('🛕 แสงศักดิ์สิทธิ์ชำระกาย — ฟื้นเต็ม!','good');sfx.level();}
  else if(luck>.12){msg('🛕 เทพนิ่งเงียบ… ไม่มีสิ่งใดเกิดขึ้น');}
  else{player.hp-=6;msg('🛕 คำสาปจากวิหาร! -๖ เลือด','warn');sfx.hurt();
    if(player.hp<=0){die();return;}}
  updateHud();endTurn();
}
function descend(){
  // ตรวจสอบความสำเร็จแห่งคำสัตย์ปฏิญาณ
  if(player.vow && (floor + 1) >= player.vow.endFloor){
    player.punya += 30;
    msg('📿 เจ้าถือ «' + player.vow.name + '» ครบถ้วนตามสัจจะ! ปุญบารมีเพิ่มขึ้น +๓๐ อย่างยิ่งใหญ่!', 'good');
    sfx.level(); flash = 0.6;
    unlockAch('vow_master');
    player.vow = null;
  }
  unlockAch('first_step');
  if(floor+1 >= 25) unlockAch('abyss_conqueror');
  if(floor+1 >= 30) unlockAch('abyss_deep');
  hide($('stairsOv'));sfx.stairs();
  if(floor>=FINAL && !endless){victory();return;}
  genFloor(floor+1);updateHud();saveGame();
}

/* ── ตาย / ชนะ / คะแนน ── */
function score(){const base=floor*50+player.gold+player.lvl*30+player.punya*2+player.killsTotal*5;return Math.floor(base * getHeatMultiplier());}
function hallGet(){try{return JSON.parse(localStorage.getItem(HALL_KEY))||[]}catch(e){return[]}}
function hallAdd(sc, win=false){
  const h=hallGet();
  const modeTag = (endless || floor > 20) ? ' [อเวจี]' : (win ? ' [โมกษะ]' : '');
  h.push({n:CLASSES[player.cls].name + modeTag, f:floor, s:sc});
  h.sort((a,b)=>b.s-a.s);localStorage.setItem(HALL_KEY,JSON.stringify(h.slice(0,5)));
}
function hallInto(el){
  const h=hallGet();
  el.innerHTML=h.length?h.map(r=>'<li>'+r.n+' · ชั้น '+thaiNum(r.f)+' · กิตติยศ '+r.s+'</li>').join('')
    :'<li>ยังไม่มีผู้ใดจารึกนาม…</li>';
}
function die(){
  state='dead';sfx.dead();localStorage.removeItem(SAVE_KEY);
  const sc=score();
  // แปลงแต้มปุญและคะแนนเป็นแต้มบารมีสะสมข้ามชาติ
  const k = getKarma();
  const earnedKarma = Math.floor(sc / 8) + (player.punya || 0);
  k.pts += earnedKarma;
  if(floor >= 10) k.unlockedBibhek = true;
  saveKarma(k);

  // บันทึกกองอัฐิชาติก่อน (Skeleton)
  try {
    const skel = {
      floor: floor,
      x: player.x,
      y: player.y,
      gold: Math.max(15, Math.floor(player.gold * 0.5)),
      wpn: (player.wpn && player.wpn.tier > 0) ? { ...player.wpn } : null
    };
    localStorage.setItem(SKEL_KEY, JSON.stringify(skel));
  } catch(e){}

  hallAdd(sc);
  $('deadStats').innerHTML = buildRunSummaryCard(false, sc, earnedKarma);
  hallInto($('deadHall'));show($('deadOv'));
}
function enterEndless(){
  hideAll();
  endless=true;
  msg('เจ้าปฏิเสธโมกษะ… ก้าวลงสู่ห้วงอเวจีอันไร้ที่สิ้นสุด!','warn');
  sfx.boss();
  state='play';
  player.hp=player.mhp; player.mp=player.mmp; // ฟื้นพลังก่อนลงอเวจี
  genFloor(21);
  updateHud();
  saveGame();
}

function victory(){
  state='win';sfx.level();localStorage.removeItem(SAVE_KEY);
  const sc=score()+500;
  const k = getKarma();
  const earnedKarma = Math.floor(sc / 6) + (player.punya || 0) + 150;
  k.pts += earnedKarma;
  k.unlockedBibhek = true;
  saveKarma(k);

  hallAdd(sc,true);
    const isGoodEnd = player.punya >= 80 && !player.usedCursedAltar;
  if(isGoodEnd){
    $('winStats').innerHTML='<span class="teal" style="font-weight:700">✦ ฉากจบ: โมกษะธรรมะ (หลุดพ้นบริสุทธิ์)</span><br>'+
      'ทศกัณฐ์ล่มสลาย แสงธรรมสาดส่องทั่วเกาะลงกา<br>ดวงจิตของเจ้าหลุดพ้นจากวัฏสงสารอย่างแท้จริง!<br>กิตติยศ <b class="gold">'+sc+'</b>';
  } else {
    $('winStats').innerHTML='<span class="red" style="font-weight:700">☠ ฉากจบ: กลียุคจ้าวมาร (ผู้สืบทอดบัลลังก์อสูร)</span><br>'+
      'เจ้าสังหารทศกัณฐ์แต่ใจถูกครอบงำด้วยไออสูร… กลืนกินดวงใจทศกัณฐ์<br>และสวมมงกุฎ ๑๐ หน้า กลายเป็นจ้าวมารตนใหม่ผู้ครองลงกา!<br>กิตติยศ <b class="gold">'+sc+'</b>';
  }

  // เล่นคัตซีนภาพฉากจบเต็มจอก่อนเปิดหน้าสถิติ
  playEndingCinematic(isGoodEnd ? 'good' : 'evil', () => {
    $('winStats').innerHTML += '<br>' + buildRunSummaryCard(true, sc, earnedKarma);
  });
  hallInto($('winHall'));

  // เพิ่มปุ่มทางเลือกดำดิ่งสู่อเวจี
  let btnBox=$('winActs');
  if(!btnBox){
    btnBox=document.createElement('div');
    btnBox.id='winActs';
    btnBox.style.display='flex';btnBox.style.flexDirection='column';btnBox.style.gap='8px';btnBox.style.marginTop='10px';
    const rBtn=$('btnRebirth2');
    rBtn.parentNode.insertBefore(btnBox, rBtn);
  }
  btnBox.innerHTML='<button class="btn" id="btnEndless" style="background:#8f2438;color:#fff;border-color:#d43d2a;box-shadow:0 5px 0 #5c1422">☠ ดำดิ่งสู่อเวจี (ลงต่อไม่สิ้นสุด)</button>';
  $('btnEndless').onclick=enterEndless;

  show($('winOv'));
}

/* ── เซฟ / โหลด (จำหมอกแผนที่ seen ด้วย) ── */
function saveGame(){
  if(state!=='play')return;
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({
      seed,floor,stairs,endless,
      map:Array.from(map).join(''),
      seen:Array.from(seen).join(''), // บันทึกช่องที่เคยเดิน
      player:{...player},
      enemies:enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,awake:e.awake})),
      npcs,items,kills,traps,fireTiles,
    }));
  }catch(e){}
}
function loadGame(){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!s||!s.player)return false;
    seed=s.seed;floor=s.floor;stairs=s.stairs;endless=!!s.endless;kills=s.kills||{};
    map=new Uint8Array(W*H);seen=new Uint8Array(W*H);vis=new Uint8Array(W*H);
    for(let i=0;i<W*H;i++)map[i]=+s.map[i];
    if(s.seen){for(let i=0;i<W*H;i++)seen[i]=+s.seen[i];}
    player=s.player;items=s.items||[];npcs=s.npcs||[];traps=s.traps||[];fireTiles=s.fireTiles||[];
    enemies=s.enemies.map(sav=>{
      const base=sav.id.startsWith('boss_')?getBoss(+sav.id.split('_')[1])
        :FOES.find(f=>f.id===sav.id);
      return{...base,id:sav.id,x:sav.x,y:sav.y,hp:sav.hp,maxhp:base.hp+floor,awake:sav.awake,flash:0,bumpX:0,bumpY:0};
    }).filter(e=>e.id);
    state='play';computeFov();updateHud();setControlsHint();
    msg('จิตของเจ้ากลับสู่ร่างเดิม… เดินทางต่อ!');
    return true;
  }catch(e){return false;}
}


let currentTalentOptions = [];

function triggerTalentChoice(){
  showHint('talents', 'เลเวล ๕ ปลดล็อกวิชาพรสวรรค์! หากไม่ถูกใจ สามารถกดปุ่ม "สุ่มใหม่" ฟรี ๒ ครั้ง');
  const pool = CLASS_TALENTS[player.cls] || [];
  const available = pool.filter(t => !player.talents.some(pt => pt.id === t.id));
  if(!available.length) return; // ได้ครบหมดแล้ว

  // สุ่มหยิบมา 2 ตัวเลือก
  const shuffled = [...available].sort(() => rng() - 0.5);
  currentTalentOptions = shuffled.slice(0, 2);

  // รีเซ็ตการสุ่มฟรีสำหรับรอบนี้
  player.freeRerolls = 2;
  player.rerollCost = 10;

  renderTalentModal();
}

function rerollTalents(){
  if(player.freeRerolls > 0){
    player.freeRerolls--;
    msg('🎲 สุ่มวิชาใหม่ (ฟรี เหลือ ' + player.freeRerolls + ' ครั้ง)');
  } else {
    if(player.gold < player.rerollCost){
      msg('เหรียญไม่พอสุ่มใหม่ (ต้องการ ◉' + player.rerollCost + ')', 'warn');
      return;
    }
    player.gold -= player.rerollCost;
    msg('🎲 สุ่มวิชาใหม่ เสียเหรียญ ◉' + player.rerollCost);
    player.rerollCost *= 2; // เพิ่มทีละ 2 เท่า
  }
  sfx.pick();
  updateHud();

  const pool = CLASS_TALENTS[player.cls] || [];
  const available = pool.filter(t => !player.talents.some(pt => pt.id === t.id));
  const shuffled = [...available].sort(() => rng() - 0.5);
  currentTalentOptions = shuffled.slice(0, 2);
  renderTalentModal();
}

function selectTalent(t){
  player.talents.push(t);
  if(player.talentPoints > 0) player.talentPoints--;
  if(player.talentPoints > 0) setTimeout(triggerTalentChoice, 400);
  sfx.level(); flash = 0.6;
  floats.push({x:player.x, y:player.y, t:'วิชา: ' + t.name, c:'#f5c542', life:2});
  msg('✦ สำเร็จวิชาพรสวรรค์ «' + t.name + '»! ' + t.desc, 'good');

  // ผลลัพธ์ถาวรบางสกิล
  if(t.id === 'k_fort') player.def += 3;
  if(t.id === 'k_heart'){ player.mhp += 20; player.hp += 20; player.atk += 4; }
  if(t.id === 'v_stealth') player.dodge += 15;
  if(t.id === 'b_pure'){ player.mmp += 20; player.mp += 20; }
  if(t.id === 'r_immune'){ player.poison = 0; player.burn = 0; }

  updateHud();
  hide($('talentOv'));
}

function renderTalentModal(){
  let ov = $('talentOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'talentOv';
    ov.className = 'ov';
    ov.style.zIndex = '300';
    document.body.appendChild(ov);
  }

  let html = '<div class="panel" style="max-width:420px;text-align:center;border-color:var(--gold);box-shadow:0 0 24px rgba(245,197,66,.35)">';
  html += '<div class="deva">विद्या</div>';
  html += '<h2 style="font-family:Chakra Petch;color:var(--gold);margin:2px 0 4px;font-size:22px">✦ บรรลุวิชาพรสวรรค์ (ระดับ ' + thaiNum(player.lvl) + ')</h2>';
  html += '<p class="dim" style="font-size:13px;margin:0 0 12px">เลือก ๑ ใน ๒ วิชา เพื่อหล่อหลอมจิตวิญญาณแห่ง ' + CLASSES[player.cls].name + '</p>';

  html += '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">';
  currentTalentOptions.forEach((t, idx) => {
    html += '<div style="background:#1e0c19;border:2px solid var(--line);padding:10px 12px;border-radius:4px;text-align:left;cursor:pointer;transition:border-color .2s" onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'var(--line)\'" onclick="selectTalent(currentTalentOptions[' + idx + '])">';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<span style="font-size:20px">' + t.icon + '</span>';
    html += '<b style="color:var(--gold);font-size:16px;font-family:Chakra Petch">' + t.name + '</b>';
    html += '</div>';
    html += '<p style="color:var(--ink);font-size:13px;margin:6px 0 0;line-height:1.4">' + t.desc + '</p>';
    html += '</div>';
  });
  html += '</div>';

  const rerollTxt = player.freeRerolls > 0 
    ? '🎲 สุ่มใหม่ (ฟรี เหลือ ' + player.freeRerolls + ' ครั้ง)' 
    : '🎲 สุ่มใหม่ (◉ ' + player.rerollCost + ')';

  html += '<div style="display:flex;gap:8px;justify-content:center">';
  html += '<button class="btn ghost" id="btnRerollTalent" style="font-size:14px;padding:8px 16px">' + rerollTxt + '</button>';
  html += '</div>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  $('btnRerollTalent').onclick = rerollTalents;
}

/* ── สร้างตัวละคร / เริ่มเกม ── */
function startRun(cls, forcedSeed = 0){
  seed = forcedSeed ? forcedSeed : ((Date.now()^(Math.random()*1e9))>>>0);
  currentSeed = seed;
  rng=mulberry32(seed);
  const C=CLASSES[cls];
  player={x:0,y:0,cls,sprite:C.sprite,hp:C.hp,mhp:C.hp,mp:C.mp,mmp:C.mp,
    atk:C.atk,def:C.def,dodge:C.dodge,lvl:1,xp:0,gold:30,punya:0,killsTotal:0,
    wpn:{name:'มีดฝึกซ้อม',baseName:'มีดฝึกซ้อม',type:'dagger',v:1,tier:0,r:'common',lore:'มีดสั้นทำจากไม้เนื้อแข็งสำหรับฝึกเพลงดาบ'},
    arm:{name:'ผ้าฝ้าย',baseName:'ผ้าฝ้าย',v:0,tier:0,r:'common',lore:'ผ้าฝ้ายธรรมดาป้องกันอะไรแทบไม่ได้'},
    relic:null,
    head:null,
    hunger:100,maxHunger:100,buffHaste:0,
    awakenGauge:0,maxAwaken:100,isAwakened:0,title:'«ผู้กล้าแห่งลงกา»',
    buffIronskin:0,buffInvis:0,buffCoating:0,summons:0,
    inv:[{t:'pot',name:'อมฤต',heal:14,r:'common',lore:'น้ำอมฤตฟื้นฟูเลือด'}, genScrollUpg()],
    talents:[],
    freeRerolls:2,
    rerollCost:10,
    pendingTalents:[],
    mantras:[],floor:1,poison:0,burn:0,
    facing:1,prevX:0,prevY:0,pet:null,usedCursedAltar:false,hasDeliveryScroll:false,deliveryDone:false,
    sparedAsura:false,asuraHelped:false,sin:0,vow:null};
  for(const s of C.mantras){if(!s.includes('@'))player.mantras.push(s);}
  rng=Math.random;time=0;endless=false;floats=[];logs=[];slashes=[];sparks=[];
  
  const karma = getKarma();
  player.gold += (karma.goldLvl || 0) * 20;
  player.bagMax = 10 + (karma.bagLvl || 0);
  player.mhp += (karma.hpLvl || 0) * 5; player.hp = player.mhp;
  player.mmp += (karma.mpLvl || 0) * 4; player.mp = player.mmp;

  genFloor(1);state='play';
  hideAll();updateHud();setControlsHint();saveGame();
}

/* ── การแสดงผล ── */
function msg(t,cls){
  logs.unshift({t,cls});if(logs.length>4)logs.pop();
  logEl.innerHTML=logs.map(l=>'<p'+(l.cls?' class="'+l.cls+'"':'')+'>'+l.t+'</p>').join('');
}
function updateHud(){
  if(!player)return;
  $('hpFill').style.width=(100*player.hp/player.mhp)+'%';
  $('hpTxt').textContent=player.hp+'/'+player.mhp;
  $('mpFill').style.width=(100*player.mp/player.mmp)+'%';
  $('mpTxt').textContent=player.mp+'/'+player.mmp;
  $('lvChip').textContent='LV.'+player.lvl;
  $('floorChip').textContent='ชั้น '+thaiNum(floor);
  if(isNaN(player.gold)) player.gold = 0; $('goldChip').textContent='◉ '+player.gold;
  if(player.gold >= 100) unlockAch('gold_pocket');
  if(player.gold >= 500) unlockAch('rich_man');
  $('punyaChip').textContent='✦ '+player.punya;
  let statusStr = '';
  if(player.poison > 0) statusStr += ' <span style="color:#43b05c">☠พิษ(' + player.poison + ')</span>';
  if(player.burn > 0) statusStr += ' <span style="color:#ff8b1f">✹ไฟ(' + player.burn + ')</span>';
  let stEl = $('statusChip');
  if(!stEl){
    stEl = document.createElement('div');
    stEl.id = 'statusChip';
    stEl.className = 'chip';
    stEl.style.display = 'none';
    $('hudR').appendChild(stEl);
  }
    let hgEl = $('hungerChip');
  if(!hgEl){
    hgEl = document.createElement('div');
    hgEl.id = 'hungerChip';
    hgEl.className = 'chip';
    hgEl.style.display = 'none';
    $('hudL').appendChild(hgEl);
  }
    const awkB = $('btnAwaken');
  if(awkB){
    if(player.isAwakened > 0){
      awkB.style.background = '#f5c542'; awkB.style.color = '#14080f';
      awkB.innerHTML = '✦ ร่างอวตาร (' + player.isAwakened + ')';
    } else {
      awkB.style.background = player.awakenGauge >= 100 ? '#2ec4a6' : '#8f2438';
      awkB.style.color = '#fff';
      awkB.innerHTML = '✦ อวตาร (' + player.awakenGauge + '%)';
    }
  }
  if(player.hunger <= 25){
    hgEl.style.display = 'block';
    hgEl.style.color = '#ff8b1f';
    hgEl.innerHTML = '🍖 ' + player.hunger + '% (หิวโซ)';
  } else {
    hgEl.style.display = 'none';
  }
  if(statusStr){
    stEl.style.display = 'block';
    stEl.innerHTML = statusStr;
  } else {
    stEl.style.display = 'none';
  }
}

function drawTile(mx, my, sx, sy){
  const t = map[my * W + mx];
  const px = sx * T, py = sy * T;
  const bio = getBiome(floor);

  if(t === 0){
    const v = ((mx * 7 + my * 13) & 1);
    ctx.drawImage(TILEC[0][v], px, py);
    ctx.fillStyle = bio.tint; ctx.fillRect(px, py, T, T);
  }
  else if(t === 1){
    const v = ((mx * 5 + my * 11) & 1);
    ctx.drawImage(TILEC[1][v], px, py);
    ctx.fillStyle = bio.tint; ctx.fillRect(px, py, T, T);

    // 🧱 2.5D Drop Shadows: เงาทึบจากขอบกำแพงทอดยาวลงมาที่พื้น ๕ พิกเซล
    if(my > 0 && map[(my - 1) * W + mx] === 0){
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(px, py, T, 5);
    }
  }
  else if(t === 2){
    ctx.drawImage(TILEC[1][0], px, py);
    ctx.drawImage(TILEC[2][0], px, py);
    if(!stairs.locked){
      ctx.fillStyle = 'rgba(46,196,166,' + (0.15 + 0.15 * Math.sin(time * 0.15 + mx)).toFixed(2) + ')';
      ctx.fillRect(px, py, T, T);
    } else {
      ctx.fillStyle = 'rgba(120,10,20,.45)';
      ctx.fillRect(px, py, T, T);
    }
  }
  else if(t === 3){
    ctx.drawImage(TILEC[3][0], px, py);
    const fl = Math.sin(time * 0.3 + mx * 3) > 0;
    ctx.fillStyle = '#ff8b1f'; ctx.fillRect(px + 7, py + (fl ? 0 : 1), 2, 2);
    ctx.fillStyle = '#ffe9a3'; ctx.fillRect(px + 7, py + 1, 1, 1);
  }
  else if(t === 4){
    ctx.drawImage(TILEC[4][0], px, py);
  }
  else if(t === 5){ // สระน้ำอมฤต
    ctx.drawImage(TILEC[5][0], px, py);
    const rip = 0.25 + 0.15 * Math.sin(time * 0.2 + mx);
    ctx.fillStyle = 'rgba(111,224,205,' + rip.toFixed(2) + ')';
    ctx.fillRect(px+4, py+4, 8, 8);
  }
  else if(t === 6){ // กับดักที่เผยแล้ว
    ctx.drawImage(TILEC[6][0], px, py);
  }
  else if(t === 7){ // แท่นบูชาบาปสีดำ
    ctx.drawImage(TILEC[7][0], px, py);
    const flm = 0.4 + 0.3 * Math.sin(time * 0.3 + mx);
    ctx.fillStyle = 'rgba(212,61,42,' + flm.toFixed(2) + ')';
    ctx.fillRect(px + 6, py + 2, 4, 6);
  }
  else if(t === 8){ // กอเถาวัลย์/หญ้า
    ctx.drawImage(TILEC[8][0], px, py);
  }
  else if(t === 9){ // แอ่งน้ำธรรมชาติ
    ctx.drawImage(TILEC[9][0], px, py);
    const rip = 0.20 + 0.12 * Math.sin(time * 0.25 + mx);
    ctx.fillStyle = 'rgba(138,226,245,' + rip.toFixed(2) + ')';
    ctx.fillRect(px + 4, py + 4, 8, 8);
  }
  else if(t === 10){ // ศิลาถวายคำสัตย์แห่งพระอินทร์
    ctx.drawImage(TILEC[10][0], px, py);
    const gl = 0.35 + 0.35 * Math.sin(time * 0.25 + mx);
    ctx.fillStyle = 'rgba(245, 197, 66, ' + gl.toFixed(2) + ')';
    ctx.fillRect(px + 4, py + 4, 8, 8);
  }
  else if(t === 11){ // เตาหลอมโอสถทิพย์
    ctx.drawImage(TILEC[11][0], px, py);
    const flk = Math.sin(time * 0.3 + mx) * 1.5;
    ctx.fillStyle = 'rgba(46,196,166,0.35)';
    ctx.fillRect(px + 4, py + 5 + flk, 8, 4);
  }
  else if(t === 12){ // ศิลาจารึกวิญญาณ
    ctx.drawImage(TILEC[12][0], px, py);
    const gl = 0.25 + 0.25 * Math.sin(time * 0.2 + mx);
    ctx.fillStyle = 'rgba(111,224,205,' + gl.toFixed(2) + ')';
    ctx.fillRect(px + 5, py + 4, 6, 8);
  }
  else if(t === 13){ // ตลาดมืดอสูร
    ctx.drawImage(TILEC[13][0], px, py);
    const flk = 0.35 + 0.3 * Math.sin(time * 0.28 + mx);
    ctx.fillStyle = 'rgba(212,61,42,' + flk.toFixed(2) + ')';
    ctx.fillRect(px + 6, py + 6, 4, 4);
  }
  else if(t === 14){ // บ่อนสกา
    ctx.drawImage(TILEC[14][0], px, py);
    const flk = 0.25 + 0.25 * Math.sin(time * 0.2 + mx);
    ctx.fillStyle = 'rgba(245,197,66,' + flk.toFixed(2) + ')';
    ctx.fillRect(px + 4, py + 4, 8, 8);
  }
}

function render(){
  if(state==='title'||state==='classSel'){drawMandala();return;}
  if(!player)return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#0a030c';ctx.fillRect(0,0,cv.width,cv.height);
  let ox=0,oy=0;
  if(shake>0){shake*=.85;if(shake<.4)shake=0;ox=(Math.random()-.5)*shake;oy=(Math.random()-.5)*shake;}
  ctx.translate(ox|0,oy|0);

  const camX = clamp(player.x - (VW >> 1), 0, W - VW), camY = clamp(player.y - (VH >> 1), 0, H - VH);
  for(let vy = 0; vy < VH; vy++) for(let vx = 0; vx < VW; vx++){
    const x = camX + vx, y = camY + vy;
    if(!seen[y * W + x]) continue;
    drawTile(x, y, vx, vy);
  }

  for(const it of items){ // ของบนพื้นและในกำแพง
    if(!seen[it.y*W+it.x])continue;
    const sx=(it.x-camX)*T,sy=(it.y-camY)*T;
    if(sx<-T||sy<-T||sx>cv.width||sy>cv.height)continue;

    // ถ้าเป็นสมบัติในซอกกำแพง: แสดงประกายแสงทองวิบวับเรียกความสนใจ
    if(map[it.y*W+it.x] === 0){
      const glim = 0.35 + 0.35 * Math.sin(time * 0.25 + it.x * 2);
      ctx.fillStyle = 'rgba(245, 197, 66, ' + glim.toFixed(2) + ')';
      ctx.fillRect(sx, sy, T, T);
    }

    const ic={pot:'pot',mana:'mana',gold:'gold',wpn:'wpn',arm:'arm',scr:'scr',throw:'wpn',relic:'arm',upg:'scr',hook:'wpn',skel:'skeleton',head:'arm',scroll_tac:'scr',elixir:'pot',egg:'pot'}[it.t] || 'wpn';
    drawSpr(ic,sx,sy+1);
  }

  for(const n of npcs){
    if(!vis[n.y*W+n.x])continue;
    drawSpr(n.sprite,(n.x-camX)*T,(n.y-camY)*T);
  }

  for(const e of enemies){
    if(!vis[e.y*W+e.x])continue;
    let ex=(e.x-camX)*T,ey=(e.y-camY)*T;
    if(e.bumpX){ex+=e.bumpX;e.bumpX*=0.5;if(Math.abs(e.bumpX)<0.5)e.bumpX=0;}
    if(e.bumpY){ey+=e.bumpY;e.bumpY*=0.5;if(Math.abs(e.bumpY)<0.5)e.bumpY=0;}

    if(e.boss){
      ctx.fillStyle='rgba(212,61,42,'+(0.18+0.12*Math.sin(time*0.2)).toFixed(2)+')';
      ctx.fillRect(ex-2,ey-2,T+4,T+4);
    }

    // ออร่ามอนสเตอร์ระดับหัวหน้า (Elite)
    if(e.elite){
      ctx.strokeStyle = 'rgba(245, 197, 66, ' + (0.35 + 0.35 * Math.sin(time * 0.3 + e.x)).toFixed(2) + ')';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex - 1, ey - 1, T + 2, T + 2);
    }

    const eSquash = e.squash || 0;
    if(e.squash > 0) e.squash--;

    if(e.flash>0){
      e.flash--;
      ctx.fillStyle='#ffffff';
      ctx.fillRect(ex+1,ey+1,T-2,T-2);
    } else {
      const eBob = (((time + e.x * 4) & 8) ? 0 : -1);
      const flipE = e.x > player.x;
      drawSpr(e.sprite, ex, ey + eBob, 16, 16, flipE, eSquash);
    }

    if(e.hp < e.maxhp){
      // หลอดเลือดบอสแบบมีแถบ Lag Bar สีเหลืองไหลตาม
      if(e.boss){
        if(!e.lagHp || e.lagHp < e.hp) e.lagHp = e.hp;
        if(e.lagHp > e.hp) e.lagHp -= Math.max(0.6, (e.lagHp - e.hp) * 0.08);
        ctx.fillStyle='#000'; ctx.fillRect(ex - 2, ey - 4, T + 4, 3);
        ctx.fillStyle='#f5c542'; ctx.fillRect(ex - 2, ey - 4, (T + 4) * Math.max(0, e.lagHp/e.maxhp), 3);
        ctx.fillStyle='#e5482e'; ctx.fillRect(ex - 2, ey - 4, (T + 4) * Math.max(0, e.hp/e.maxhp), 3);
      } else {
        ctx.fillStyle='#000'; ctx.fillRect(ex, ey-3, T, 2);
        ctx.fillStyle='#e5482e'; ctx.fillRect(ex, ey-3, T * Math.max(0, e.hp/e.maxhp), 2);
      }
    }
  }

  if(player.hp>0){
    let px=(player.x-camX)*T,py=(player.y-camY)*T+(Math.sin(time*0.12)>0?-1:0);
    if(playerBump.time>0){
      playerBump.time--;
      px+=playerBump.x; py+=playerBump.y;
      playerBump.x*=0.6; playerBump.y*=0.6;
    }
    const pBob = ((time & 8) ? 0 : -1);
    const flipP = player.facing === -1;
    drawSpr(player.sprite, px, py + pBob, 16, 16, flipP, 0);

    // วาดสัตว์เลี้ยงเดินตามหลัง
    if(player.pet){
      const petSpr = player.pet.s || 'vanara';
      const petX = (player.prevX - camX) * T, petY = (player.prevY - camY) * T;
      drawSpr(petSpr, petX + 2, petY + 2, 12, 12, flipP, 0);
    }
  }

  for(let vy=0;vy<VH;vy++)for(let vx=0;vx<VW;vx++){ // หมอกสงคราม
    const x=camX+vx,y=camY+vy;
    if(!seen[y*W+x]){continue;}
    if(!vis[y*W+x]){
      ctx.fillStyle='rgba(8,3,11,.68)';
      ctx.fillRect(vx*T,vy*T,T,T);
    }
  }

  // 🪔 ระบบแสงคบเพลิงไล่เฉดสีส้มทอง (Dynamic Torchlight with Flame Flicker)
  if(player.hp > 0){
    const pScreenX = (player.x - camX) * T + 8;
    const pScreenY = (player.y - camY) * T + 8;
    const flicker = Math.sin(time * 0.16) * 3 + Math.cos(time * 0.35) * 2;
    const radDist = heatSettings.darkTorches ? 42 : 88;
    torchGrad = ctx.createRadialGradient(pScreenX, pScreenY, 8, pScreenX, pScreenY, radDist + flicker);
    torchGrad.addColorStop(0, 'rgba(245, 197, 66, 0.12)'); // สีทองอบอุ่นรอบตัว
    torchGrad.addColorStop(0.35, 'rgba(255, 139, 31, 0.05)'); // สีส้มเรือง
    torchGrad.addColorStop(0.85, 'rgba(18, 5, 13, 0.08)');
    torchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = torchGrad;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  // วาดเอฟเฟกต์ฟันดาบ (Slash Arc)
  for(const s of slashes){
    s.life-=.15;
    ctx.strokeStyle=s.color;
    ctx.lineWidth=2.5;
    ctx.beginPath();
    const sx=(s.x-camX)*T+8,sy=(s.y-camY)*T+8;
    ctx.arc(sx,sy,9+((1-s.life)*6),Math.PI*0.8,Math.PI*2.1);
    ctx.stroke();
  }
  slashes=slashes.filter(s=>s.life>0);

  // วาดสะเก็ดไฟ (Sparks)
  for(const sp of sparks){
    sp.x+=sp.vx; sp.y+=sp.vy; sp.life-=.08;
    ctx.fillStyle=sp.c;
    ctx.fillRect(sp.x-camX*T,sp.y-camY*T,2,2);
  }
  sparks=sparks.filter(s=>s.life>0);

  // ตัวเลขลอย
  for(const f of floats){
    f.life-=.025;
    ctx.font='bold 7px monospace';ctx.textAlign='center';
    ctx.fillStyle=f.c;ctx.globalAlpha=Math.max(0,Math.min(1,f.life));
    ctx.fillText(f.t,(f.x-camX)*T+8,(f.y-camY)*T-6+(1-f.life)*-10);
    ctx.globalAlpha=1;
  }
  floats=floats.filter(f=>f.life>0);

  if(flash>0){ctx.fillStyle='rgba(212,42,32,'+(flash*.5).toFixed(2)+')';
    ctx.fillRect(0,0,cv.width,cv.height);flash-=.05;}
  ctx.setTransform(1,0,0,1,0,0);
  
  // 🍂 ละอองบรรยากาศลอยในอากาศตามธีมฉาก (Atmospheric Floating Particles)
  const curBio = getBiome(floor);
  if(dustParticles.length < 16){
    dustParticles.push({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      vx: (Math.random() - 0.5) * 0.35, vy: -0.25 - Math.random() * 0.35,
      alpha: 0.2 + Math.random() * 0.5, c: curBio.particle
    });
  }
  for(const dp of dustParticles){
    dp.x += dp.vx; dp.y += dp.vy;
    if(dp.y < 0) dp.y = cv.height;
    if(dp.x < 0) dp.x = cv.width;
    ctx.fillStyle = dp.c;
    ctx.globalAlpha = dp.alpha * 0.45;
    ctx.fillRect(dp.x, dp.y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // ☠ แบนเนอร์เปิดตัวบอส (Boss Intro Splash Banner)
  if(bossSplash && bossSplash.time > 0){
    bossSplash.time--;
    ctx.fillStyle = 'rgba(12, 3, 14, 0.82)';
    ctx.fillRect(0, 70, cv.width, 85);
    ctx.strokeStyle = '#f5c542';
    ctx.strokeRect(12, 74, cv.width - 24, 77);
    ctx.font = 'bold 8.5px monospace';
    ctx.fillStyle = '#ff8b1f';
    ctx.textAlign = 'center';
    ctx.fillText('☠ ' + bossSplash.title + ' ☠', cv.width / 2, 98);
    ctx.font = 'bold 13px Chakra Petch, sans-serif';
    ctx.fillStyle = '#f5c542';
    ctx.fillText(bossSplash.name, cv.width / 2, 124);
  }

  
  // วาดเปลวเพลิงที่กำลังลุกไหม้บนพื้น (Fire Surfaces)
  for(const ft of fireTiles){
    if(!seen[ft.y * W + ft.x]) continue;
    const fsx = (ft.x - camX) * T, fsy = (ft.y - camY) * T;
    const flk = Math.sin(time * 0.4 + ft.x) * 2;
    ctx.fillStyle = 'rgba(255, 139, 31, 0.45)';
    ctx.fillRect(fsx, fsy, T, T);
    ctx.fillStyle = '#ff8b1f';
    ctx.fillRect(fsx + 4, fsy + 3 + flk, 8, 8);
    ctx.fillStyle = '#ffe9a3';
    ctx.fillRect(fsx + 6, fsy + 5 + flk, 4, 4);
  }

  drawMinimap(camX,camY);
}

function drawMinimap(){
  if(state!=='play'){mcv.style.display='none';return;}
  mcv.style.display='block';
  mctx.fillStyle='#0d0412';mctx.fillRect(0,0,84,64);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(!seen[y*W+x])continue;
    const t=map[y*W+x];
    mctx.fillStyle=t===0?'#42252e':t===2?'#f5c542':t===3?'#ff8b1f':'#2a1626';
    mctx.fillRect(x*2,y*2,2,2);
  }
  for(const e of enemies){if(vis[e.y*W+e.x]){mctx.fillStyle='#ff3b2e';mctx.fillRect(e.x*2,e.y*2,2,2);}}
  mctx.fillStyle=(time&8)?'#ffffff':'#2ec4a6';
  mctx.fillRect(player.x*2-1,player.y*2-1,3,3);
}

function drawMandala(){ // ฉากหน้าเมนู
  ctx.fillStyle='#0d0412';ctx.fillRect(0,0,cv.width,cv.height);
  const cx=cv.width/2,cy=cv.height/2+8;
  for(let ring=0;ring<4;ring++){
    const rad=34+ring*32,pet=8+ring*4,rot=time*.002*(ring%2?1:-1);
    ctx.strokeStyle=['#f5c542','#2ec4a6','#ff8b1f','#8f2438'][ring];
    ctx.globalAlpha=.3+.08*Math.sin(time*.05+ring);
    ctx.beginPath();ctx.arc(cx,cy,rad,0,7);ctx.stroke();
    for(let i=0;i<pet;i++){
      const a=rot+i*2*Math.PI/pet;
      const px=cx+Math.cos(a)*rad,py=cy+Math.sin(a)*rad;
      ctx.beginPath();ctx.arc(px,py,3+ring,0,7);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  const fh=6+2*Math.sin(time*.35)+Math.sin(time*.9); // ประทีปกลางมณฑล
  ctx.fillStyle='#7a4a22';ctx.fillRect(cx-6,cy+3,12,4);
  ctx.fillStyle='#ff8b1f';ctx.fillRect(cx-2,cy-fh,4,fh);
  ctx.fillStyle='#ffe9a3';ctx.fillRect(cx-1,cy-fh+2,2,fh-3);
}
let lastT=0;
function loop(t){time=Math.floor(t/50);render();requestAnimationFrame(loop)}



function copySeedToClipboard(){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(String(currentSeed)).then(() => {
      msg('📋 คัดลอกรหัส Seed #' + currentSeed + ' แล้ว! ส่งให้เพื่อนเล่นแมพเดียวกันได้เลย', 'good');
    }).catch(() => {
      prompt('คัดลอกรหัส Seed ดันเจี้ยนนี้:', String(currentSeed));
    });
  } else {
    prompt('คัดลอกรหัส Seed ดันเจี้ยนนี้:', String(currentSeed));
  }
}

function openStatusModal(){
  let ov = $('statusOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'statusOv';
    ov.className = 'ov';
    ov.style.zIndex = '280';
    document.body.appendChild(ov);
  }

  const C = CLASSES[player.cls];
  let totalAtk = player.atk + (player.wpn ? player.wpn.v : 0);
  if(player.head && player.head.atk) totalAtk += player.head.atk;
  let totalDef = player.def + (player.arm ? player.arm.v : 0);
  if(player.head && player.head.def) totalDef += player.head.def;
  if(player.buffIronskin > 0) totalDef += 10; // บัฟยาผิวเหล็กไหล
  let totalDodge = player.dodge;
  if(player.arm && player.arm.affix === 'dodge') totalDodge += 15;
  if(player.relic && player.relic.id === 'vanara_bangle') totalDodge += 25;

  let totalCrit = 15;
  if(player.wpn && player.wpn.type === 'dagger') totalCrit += 20;
  if(player.wpn && player.wpn.affix === 'sharp') totalCrit += 15;
  if(player.relic && player.relic.id === 'diamond_ring') totalCrit += 15;
  if(player.talents.some(t => t.id === 'v_crit')) totalCrit += 20;

  // โบนัสปุญฤทธิ์ของฤๅษี
  if(player.talents.some(t => t.id === 'r_punya')){
    const bonus = Math.floor(player.punya / 50);
    // แจ้งในสเตตัส
  }

  let html = '<div class="panel" style="max-width:420px;border-color:var(--gold);box-shadow:0 0 20px rgba(245,197,66,.35)">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--line);padding-bottom:8px;margin-bottom:10px">';
  html += '<div style="display:flex;align-items:center;gap:10px">';
  html += '<canvas id="statusSprite" width="40" height="40" style="image-rendering:pixelated;background:#150914;border:2px solid var(--gold)"></canvas>';
  html += '<div><h2 style="font-family:Chakra Petch;color:var(--gold);margin:0;font-size:20px">' + C.name + ' <span style="font-size:13px;color:var(--teal)">' + (player.title||'') + '</span></h2>';
  html += '<small class="teal" style="font-size:12px">ระดับ ' + thaiNum(player.lvl) + ' · ประสบการณ์ ' + player.xp + '/' + xpNeed(player.lvl) + '</small></div>';
  html += '</div>';
  html += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">';
  html += '<div class="chip gold" style="font-size:11px">◉ ' + player.gold + '</div>';
  html += '<div style="font-size:10px;color:var(--teal);cursor:pointer" onclick="copySeedToClipboard()">🌱 Seed #' + currentSeed + ' 📋</div>';
  html += '</div>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:12px">';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">🩸 เลือด: <b style="color:#ff7a5c">' + player.hp + '/' + player.mhp + '</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">💧 มนตร์: <b style="color:#6fe0cd">' + player.mp + '/' + player.mmp + '</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">⚔ โจมตีรวม: <b class="gold">' + totalAtk + '</b> <small class="dim">(' + player.atk + '+' + (player.wpn?player.wpn.v:0) + ')</small></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">🛡 ป้องกันรวม: <b class="teal">' + totalDef + '</b> <small class="dim">(' + player.def + '+' + (player.arm?player.arm.v:0) + ')</small></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">💨 หลบหลีก: <b style="color:#ffe9a3">' + totalDodge + '%</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">🎯 คริติคอล: <b style="color:#f5c542">' + totalCrit + '%</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">🍖 กาย: <b style="color:#f5c542">' + player.hunger + '%</b> · ⚡ เทวฤทธิ์: <b style="color:#2ec4a6">' + player.awakenGauge + '%</b> · ✦ ปุญ: <b class="teal">' + player.punya + '</b> · ☠ บาป: <b class="red">' + (player.sin||0) + '</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">☠ สังหาร: <b class="red">' + player.killsTotal + ' ตน</b></div>';
  html += '</div>';

  // อุปกรณ์สวมใส่ 3 ช่อง
  html += '<h4 style="margin:8px 0 4px;color:var(--gold);font-size:13px">🛡️ อุปกรณ์คู่กาย</h4>';
  html += '<div style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;margin-bottom:10px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#150914;padding:4px 8px;border:1px solid var(--line)">';
  if(player.head){
    html += '<span>👑 ชฎา/มงกุฎ: <b style="color:' + (RARITY_COLORS[player.head.r]||'#fff') + '">' + player.head.name + '</b></span>';
    html += '<button class="mini-btn" onclick="inspectItem(player.head)">ส่อง</button>';
  } else {
    html += '<span class="dim">👑 ชฎา/มงกุฎ: ยังไม่ได้สวมใส่</span><span></span>';
  }
  html += '</div>';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#150914;padding:4px 8px;border:1px solid var(--line)">';
  html += '<span>⚔ อาวุธ: <b style="color:' + (RARITY_COLORS[player.wpn.r]||'#fff') + '">' + player.wpn.name + '</b> (โจมตี +' + player.wpn.v + ')</span>';
  html += '<button class="mini-btn" onclick="inspectItem(player.wpn)">ส่อง</button>';
  html += '</div>';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#150914;padding:4px 8px;border:1px solid var(--line)">';
  html += '<span>🛡 เกราะ: <b style="color:' + (RARITY_COLORS[player.arm.r]||'#fff') + '">' + player.arm.name + '</b> (ป้องกัน +' + player.arm.v + ')</span>';
  html += '<button class="mini-btn" onclick="inspectItem(player.arm)">ส่อง</button>';
  html += '</div>';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#150914;padding:4px 8px;border:1px solid var(--line)">';
  if(player.relic){
    html += '<span>' + (player.relic.icon||'📿') + ' เครื่องราง: <b style="color:' + (RARITY_COLORS[player.relic.r]||'#fff') + '">' + player.relic.name + '</b></span>';
    html += '<button class="mini-btn" onclick="inspectItem(player.relic)">ส่อง</button>';
  } else {
    html += '<span class="dim">📿 เครื่องราง: ยังไม่ได้สวมใส่</span>';
    html += '<span></span>';
  }
  html += '</div>';
  html += '</div>';

  // วิชาพรสวรรค์ที่เลือกไว้
  html += '<h4 style="margin:8px 0 4px;color:var(--teal);font-size:13px">✦ วิชาพรสวรรค์ประจำตัว</h4>';
  if(!player.talents.length){
    html += '<p class="dim" style="font-size:12px;margin:4px 0 10px">ยังไม่มีวิชาพรสวรรค์ (จะปลดล็อกทุกๆ ๕ เลเวล)</p>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">';
    player.talents.forEach(t => {
      html += '<div style="background:#152623;padding:4px 8px;border-left:3px solid var(--teal);font-size:12px">';
      html += '<b class="teal">' + t.icon + ' ' + t.name + ':</b> ' + t.desc;
      html += '</div>';
    });
    html += '</div>';
  }

  html += '<div style="text-align:center;margin-top:12px"><button class="btn" id="btnCloseStatus" style="width:100%">ปิด</button></div>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  // วาดสไปรต์ตัวละครในแคนวาสสเตตัส
  const scv = $('statusSprite');
  if(scv){
    const sg = scv.getContext('2d');
    sg.imageSmoothingEnabled = false;
    const img = SPR[player.sprite];
    if(img) sg.drawImage(img, 0, 0, img.width, img.height, 4, 4, 32, 32);
  }

  $('btnCloseStatus').onclick = () => hide(ov);
}


/* ── เสาหลักที่ ๔: คัตซีนพิกเซลอาร์ตเปิด-ปิดเรื่อง (Cinematic Pixel Storytelling) ── */
let cineTimer = null;

function openCinematicModal(){
  let ov = $('cineOv');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'cineOv';
    ov.className = 'ov';
    ov.style.zIndex = '600';
    document.body.appendChild(ov);
  }
  return ov;
}

function playCinematicPrologue(onComplete = null){
  const ov = openCinematicModal();
  let slide = 0;

  const slides = [
    {
      title: 'บทที่ ๑ : มหาสมุทรเกาะลงกา',
      text: '“กองทัพธรรมยกพลข้ามมหาสมุทร… ก้อนศิลาทอดข้ามมหานทีสู่เกาะลงกา แดนแห่งพญามาร”',
      draw: (g, w, h) => {
        // ท้องฟ้าราตรี & ทะเล
        g.fillStyle = '#06020c'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#0f1830'; g.fillRect(0, h * 0.5, w, h * 0.5);
        // ดวงจันทร์เต็มดวง
        g.fillStyle = '#ffe9a3'; g.beginPath(); g.arc(w * 0.8, h * 0.25, 20, 0, 7); g.fill();
        // ดาวประกาย
        g.fillStyle = '#ffffff';
        for(let i=0; i<25; i++) g.fillRect((i*47)%w, (i*29)%(h*0.45), 1.5, 1.5);
        // ถนนหินข้ามสมุทร
        g.fillStyle = '#4a2d18'; g.fillRect(0, h * 0.65, w, 18);
        g.fillStyle = '#6b4634'; g.fillRect(0, h * 0.65, w, 4);
        // เงาร่างกองทัพวานร
        g.fillStyle = '#f5c542';
        for(let x=20; x<w-20; x+=35){
          g.fillRect(x, h * 0.58, 8, 12); // ตัว
          g.fillRect(x+2, h * 0.54, 4, 4);  // หัว
          g.fillRect(x-2, h * 0.60, 2, 8);  // หาง
        }
      }
    },
    {
      title: 'บทที่ ๒ : ทวาราวิหารอสูร',
      text: '“เบื้องล่างมหานครอันเรืองรอง คือวิหารใต้พิภพ ๒๐ ชั้น สถานที่สถิตแห่งจิตมารและสังสารวัฏ”',
      draw: (g, w, h) => {
        // ประตูวิหารหินยักษ์
        g.fillStyle = '#0d040a'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2c1524'; g.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.85);
        g.strokeStyle = '#f5c542'; g.lineWidth = 3; g.strokeRect(w * 0.2, h * 0.15, w * 0.6, h * 0.85);
        // หน้ากากยักษ์สลักบนประตู
        g.fillStyle = '#e5482e';
        g.fillRect(w * 0.38, h * 0.35, 10, 6); g.fillRect(w * 0.58, h * 0.35, 10, 6); // ตาแดง
        g.fillStyle = '#f4ecdc';
        g.fillRect(w * 0.42, h * 0.48, 6, 12); g.fillRect(w * 0.54, h * 0.48, 6, 12); // เขี้ยวขาว
        // คบเพลิงซ้ายขวา
        g.fillStyle = '#ff8b1f';
        g.fillRect(w * 0.12, h * 0.45, 6, 10); g.fillRect(w * 0.82, h * 0.45, 6, 10);
        g.fillStyle = '#ffe9a3';
        g.fillRect(w * 0.13, h * 0.47, 4, 6); g.fillRect(w * 0.83, h * 0.47, 4, 6);
      }
    },
    {
      title: 'บทที่ ๓ : ก้าวลงสู่เงามืด',
      text: '“เจ้าก้าวลงสู่เงามืด… เพื่อสยบทศกัณฐ์ ตัดกิเลสมาร และบรรลุโมกษะธรรม”',
      draw: (g, w, h) => {
        // บันไดเวียนลึกสู่ความมืด
        g.fillStyle = '#060208'; g.fillRect(0, 0, w, h);
        for(let step=0; step<8; step++){
          const sy = h * 0.4 + step * 14;
          const sx = w * 0.3 - step * 10;
          g.fillStyle = '#3d2418'; g.fillRect(sx, sy, w * 0.6, 10);
          g.fillStyle = '#54372a'; g.fillRect(sx, sy, w * 0.6, 3);
        }
        // เงาร่างผู้กล้าถืออาวุธเรืองแสงสีทอง
        g.fillStyle = '#f5c542';
        g.fillRect(w * 0.45, h * 0.28, 12, 18);
        g.fillRect(w * 0.47, h * 0.20, 8, 8); // หัว
        // คมดาบเปล่งประกาย
        g.strokeStyle = '#2ec4a6'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(w * 0.55, h * 0.35); g.lineTo(w * 0.65, h * 0.18); g.stroke();
      }
    }
  ];

  function renderSlide(){
    const s = slides[slide];
    let html = '<div class="panel" style="max-width:460px;padding:12px;border-color:var(--gold);box-shadow:0 0 30px rgba(0,0,0,.9);text-align:center">';
    html += '<canvas id="cineCanvas" width="320" height="180" style="image-rendering:pixelated;width:100%;border:2px solid var(--line);background:#000"></canvas>';
    html += '<h3 style="font-family:Chakra Petch;color:var(--gold);margin:8px 0 4px;font-size:16px">' + s.title + '</h3>';
    html += '<p style="color:var(--ink);font-size:13px;line-height:1.5;margin:4px 0 12px;font-style:italic;min-height:40px">' + s.text + '</p>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<button class="btn ghost" id="btnSkipCine" style="font-size:12px;padding:6px 14px">ข้าม</button>';
    html += '<button class="btn" id="btnNextCine" style="font-size:13px;padding:8px 20px">' + (slide === slides.length - 1 ? 'เริ่มผจญภัย ▶' : 'ถัดไป ▶') + '</button>';
    html += '</div></div>';

    ov.innerHTML = html;
    show(ov);

    const c = $('cineCanvas');
    if(c){
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      s.draw(g, 320, 180);
    }

    $('btnSkipCine').onclick = () => { hide(ov); if(onComplete) onComplete(); };
    $('btnNextCine').onclick = () => {
      if(slide < slides.length - 1){
        slide++;
        renderSlide();
      } else {
        hide(ov);
        if(onComplete) onComplete();
      }
    };
  }

  renderSlide();
}

function playEndingCinematic(type, onFinish){
  const ov = openCinematicModal();

  let html = '<div class="panel" style="max-width:480px;padding:14px;border-color:' + (type==='good'?'var(--teal)':'var(--red)') + ';box-shadow:0 0 34px rgba(0,0,0,.95);text-align:center">';
  html += '<canvas id="cineEndCanvas" width="320" height="200" style="image-rendering:pixelated;width:100%;border:2px solid var(--line);background:#000"></canvas>';

  if(type === 'good'){
    html += '<h2 style="font-family:Chakra Petch;color:var(--teal);margin:8px 0 4px;font-size:20px">✦ มหาโมกษะ — แดนทิพย์นิรันดร์</h2>';
    html += '<p style="color:var(--ink);font-size:13px;line-height:1.55;margin:4px 0 14px;font-style:italic">“ทศกัณฐ์ล่มสลาย เปลวเพลิงมารมอดดับ… แสงธรรมสาดส่องทั่วเกาะลงกา ดวงจิตของเจ้าหลุดพ้นจากสังสารวัฏ เข้าสู่โมกษะอันเป็นบรมสุข”</p>';
  } else {
    html += '<h2 style="font-family:Chakra Petch;color:var(--red);margin:8px 0 4px;font-size:20px">☠ กลียุคจ้าวมาร — ผู้สืบทอดบัลลังก์ลงกา</h2>';
    html += '<p style="color:var(--ink);font-size:13px;line-height:1.55;margin:4px 0 14px;font-style:italic">“ผู้ปราบมัจจุราช บัดนี้กลายเป็นมัจจุราชเสียเอง… เจ้ากลืนกินดวงใจทศกัณฐ์ สวมมงกุฎ ๑๐ หน้า สถาปนาตนเป็นจ้าวมารตนใหม่ผู้ครองเกาะลงกา!”</p>';
  }

  html += '<button class="btn" id="btnEndComplete" style="width:100%">สู่ทำเนียบวีรชน ▶</button>';
  html += '</div>';

  ov.innerHTML = html;
  show(ov);

  const c = $('cineEndCanvas');
  if(c){
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const w = 320, h = 200;

    if(type === 'good'){
      // ภาพฉากจบโมกษะ: แสงธรรมสีทองสาดส่องลงมาจากฟ้า ดอกบัวทิพย์ ดวงจิตสีขาวลอยขึ้น
      g.fillStyle = '#0a1a24'; g.fillRect(0, 0, w, h);
      // ลำแสงสุวรรณ
      for(let i=0; i<7; i++){
        g.fillStyle = 'rgba(245, 197, 66, 0.15)';
        g.beginPath(); g.moveTo(w*0.5, 0); g.lineTo(w*0.1 + i*45, h); g.lineTo(w*0.2 + i*45, h); g.fill();
      }
      // ดอกบัวทองคำ
      g.fillStyle = '#2ec4a6'; g.beginPath(); g.arc(w*0.5, h*0.75, 24, 0, 7); g.fill();
      g.fillStyle = '#f5c542'; g.beginPath(); g.arc(w*0.5, h*0.75, 14, 0, 7); g.fill();
      // เงาร่างบริสุทธิ์สีขาวเปล่งรัศมี
      g.fillStyle = '#ffffff';
      g.fillRect(w*0.48, h*0.42, 12, 22);
      g.fillRect(w*0.49, h*0.32, 10, 10);
      g.fillStyle = '#f5c542'; g.fillRect(w*0.47, h*0.30, 14, 3); // รัศมี
    } else {
      // ภาพฉากจบจ้าวมาร: บัลลังก์อสูรสีดำเพลิง มงกุฎ ๑๐ หน้า ตาแดงก่ำ
      g.fillStyle = '#1c050a'; g.fillRect(0, 0, w, h);
      // เปลวเพลิงมารลุกท่วม
      for(let f=0; f<10; f++){
        g.fillStyle = 'rgba(212, 61, 42, 0.25)';
        g.beginPath(); g.moveTo(f*35, h); g.lineTo(f*35+18, h*0.35); g.lineTo(f*35+35, h); g.fill();
      }
      // บัลลังก์ทองทมิฬ
      g.fillStyle = '#7a4a22'; g.fillRect(w*0.3, h*0.45, w*0.4, h*0.55);
      g.fillStyle = '#4a1523'; g.fillRect(w*0.35, h*0.35, w*0.3, h*0.65);
      // พญายักษ์ ๑๐ หน้าสวมมงกุฎ
      g.fillStyle = '#14080f'; g.fillRect(w*0.44, h*0.42, 38, 48); // ตัว
      g.fillStyle = '#f5c542';
      for(let hd=0; hd<5; hd++) g.fillRect(w*0.40 + hd*9, h*0.30, 7, 12); // หน้าเรียง
      // ดวงตาสีแดงเพลิง
      g.fillStyle = '#ff2200';
      for(let hd=0; hd<5; hd++) { g.fillRect(w*0.41 + hd*9, h*0.35, 2, 2); g.fillRect(w*0.44 + hd*9, h*0.35, 2, 2); }
    }
  }

  $('btnEndComplete').onclick = () => {
    hide(ov);
    if(onFinish) onFinish();
  };
}


/* ── ระบบใบสรุปผลการเดินทาง & ปุ่มแชร์ (Post-Run Summary Card & Share) ── */
function buildRunSummaryCard(isWin, sc, earnedKarma){
  const C = CLASSES[player.cls];
  const wpnName = player.wpn ? player.wpn.name : 'หมัดเปล่า';
  const armName = player.arm ? player.arm.name : 'ผ้าฝ้าย';
  const headName = player.head ? player.head.name : 'ไม่มี';
  const relicName = player.relic ? player.relic.name : 'ไม่มี';
  const statusTitle = player.title || '«ผู้กล้าแห่งลงกา»';

  let html = '<div style="background:#170918;border:2px solid var(--gold);padding:10px;margin-bottom:12px;border-radius:4px;text-align:left;box-shadow:0 0 16px rgba(245,197,66,.25)">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed var(--line);padding-bottom:6px;margin-bottom:8px">';
  html += '<div><b style="color:var(--gold);font-size:16px;font-family:Chakra Petch">' + C.name + ' ' + statusTitle + '</b><br><small class="teal">ระดับ ' + thaiNum(player.lvl) + ' · ถึงชั้น ' + thaiNum(floor) + (floor>20?' (อเวจี)':'') + '</small></div>';
  html += '<div style="text-align:right"><span class="chip gold" style="font-size:12px">กิตติยศ ' + sc + '</span><br><small class="teal">+✦ ' + earnedKarma + ' บารมี</small></div>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;margin-bottom:8px">';
  html += '<div>⚔ <b>อาวุธ:</b> ' + wpnName + '</div>';
  html += '<div>🛡 <b>เกราะ:</b> ' + armName + '</div>';
  html += '<div>👑 <b>ชฎา:</b> ' + headName + '</div>';
  html += '<div>📿 <b>เครื่องราง:</b> ' + relicName + '</div>';
  html += '<div>✦ <b>ปุญ:</b> ' + player.punya + ' · ☠ <b>บาป:</b> ' + (player.sin||0) + '</div>';
  html += '<div>☠ <b>สังหาร:</b> ' + player.killsTotal + ' ตน</div>';
  html += '</div>';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#0d040e;padding:6px 10px;border:1px solid var(--line);border-radius:3px">';
  html += '<span style="color:var(--dim);font-size:11px">🌱 รหัส Seed: #' + currentSeed + '</span>';
  html += '<button class="mini-btn" onclick="copyRunSummaryShare(' + isWin + ',' + sc + ')">📋 คัดลอกผลการเล่นเพื่อแชร์</button>';
  html += '</div>';
  html += '</div>';

  return html;
}

function copyRunSummaryShare(isWin, sc){
  const C = CLASSES[player.cls];
  const wpnName = player.wpn ? player.wpn.name : 'หมัดเปล่า';
  const armName = player.arm ? player.arm.name : 'ผ้าฝ้าย';
  const statusTitle = player.title || '«ผู้กล้าแห่งลงกา»';
  const resultHeader = isWin ? '✦ บรรลุโมกษะธรรมสำเร็จ! 🪷' : '☠ สิ้นชีพในเงามืดวิหารลงกา';

  const shareText = 'ลงกา · วิถีแห่งกรรม 🪔\n' +
    resultHeader + '\n' +
    '👑 ' + C.name + ' ' + statusTitle + ' | จบที่ชั้น ' + thaiNum(floor) + ' (ระดับ ' + thaiNum(player.lvl) + ')\n' +
    '⚔ อาวุธ: ' + wpnName + '\n' +
    '🛡 เกราะ: ' + armName + '\n' +
    '✦ กิตติยศ: ' + sc + ' | ปุญบารมี: ' + player.punya + ' | ยอดสังหาร: ' + player.killsTotal + ' ตน\n' +
    '🌱 ลองเล่นแมพเดียวกัน: Seed #' + currentSeed + '\n' +
    'https://solakung.github.io/Longka/';

  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(shareText).then(() => {
      msg('📋 คัดลอกสรุปผลการเล่นแล้ว! นำไปโพสต์อวดเพื่อนได้เลย', 'good');
      sfx.gold();
    }).catch(() => {
      prompt('คัดลอกข้อความสรุปผลการเล่น:', shareText);
    });
  } else {
    prompt('คัดลอกข้อความสรุปผลการเล่น:', shareText);
  }
}

/* ── UI helpers ── */
function show(el){el.classList.remove('hidden')}
function hide(el){el.classList.add('hidden')}
function hideAll(){document.querySelectorAll('.ov').forEach(o=>o.classList.add('hidden'))}
let hintTimer=null;
function setControlsHint(){
  const h=$('controlsHint');if(!h)return;
  h.style.opacity=1;clearTimeout(hintTimer);
  hintTimer=setTimeout(()=>{h.style.opacity=0;},6000);
}
function dropItem(i){
  const it=player.inv.splice(i,1)[0];
  if(!it)return;
  items.push({x:player.x,y:player.y,...it});
  msg('เจ้าทิ้ง «'+it.name+'» ลงบนพื้น');
  sfx.pick();
  updateHud();
}


function inspectItem(it){
  let box = $('inspectBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'inspectBox';
    box.className = 'ov';
    box.style.zIndex = '250';
    document.body.appendChild(box);
  }

  const rCol = RARITY_COLORS[it.r || 'common'] || '#f4ecdc';
  const rName = RARITY_NAMES[it.r || 'common'] || 'ทั่วไป';

  let typeTag = '';
  if(it.t === 'wpn'){
    const wt = WEAPON_TYPES[it.type || 'dagger'] || {};
    typeTag = wt.icon + ' ' + (wt.name || 'อาวุธ') + ' · โจมตี +' + it.v;
  } else if(it.t === 'arm'){
    typeTag = '🛡 ชุดเกราะ · ป้องกัน +' + it.v;
  } else if(it.t === 'relic'){
    typeTag = (it.icon || '📿') + ' เครื่องรางเทวะ';
  } else if(it.t === 'throw'){
    typeTag = '🏹 อาวุธขว้าง · ระยะ ' + thaiNum(it.range||4) + ' ช่อง';
  } else if(it.t === 'pot'){
    typeTag = '🧪 ยาฟื้นฟูเลือด';
  } else if(it.t === 'mana'){
    typeTag = '🧪 ยาฟื้นฟูมนตร์';
  } else if(it.t === 'upg'){
    typeTag = '📜 คัมภีร์มนตราตีบวก';
  } else {
    typeTag = '📜 มนตรา/คัมภีร์';
  }

  let html = '<div class="panel" style="max-width:380px;border-color:' + rCol + ';box-shadow:0 0 16px ' + rCol + '44">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += '<span style="font-size:11px;padding:3px 8px;border-radius:3px;background:' + rCol + '22;color:' + rCol + ';font-weight:700">✦ ' + rName + '</span>';
  html += '<span class="dim" style="font-size:12px">' + (it.price ? '◉ ' + it.price : '') + '</span>';
  html += '</div>';

  html += '<h2 style="font-family:Chakra Petch;color:' + rCol + ';margin:4px 0 6px;font-size:20px">' + it.name + '</h2>';
  html += '<div style="color:var(--gold);font-size:13px;font-weight:600;margin-bottom:8px">' + typeTag + '</div>';

  if(it.cursed){
    html += '<div style="background:#26050b;border:2px solid var(--red);padding:6px 8px;border-radius:4px;margin:6px 0;text-align:left">';
    html += '<div style="color:var(--red);font-weight:700;font-size:13px">☠ อุปกรณ์ต้องสาป (Cursed Drawback)</div>';
    html += '<div style="color:#ff8b8b;font-size:12px;margin-top:2px"><b>ข้อแลกเปลี่ยน:</b> ' + it.curseDesc + '</div>';
    html += '</div>';
  }

  if(it.t === 'wpn' && it.type && WEAPON_TYPES[it.type]){
    html += '<p style="color:var(--teal);font-size:13px;background:#152623;padding:6px 8px;border-left:3px solid var(--teal);margin:6px 0"><b>กลไกอาวุธ:</b> ' + WEAPON_TYPES[it.type].desc + '</p>';
  }

  if(it.afDesc){
    html += '<p style="color:' + (it.afColor || '#ff8b1f') + ';font-size:13px;background:#24151b;padding:6px 8px;border-left:3px solid ' + (it.afColor||'#ff8b1f') + ';margin:6px 0"><b>พลังแฝงพิเศษ:</b> ' + it.afDesc + '</p>';
  }

  if(it.desc){
    html += '<p style="color:var(--teal);font-size:13px;margin:6px 0">' + it.desc + '</p>';
  }

  html += '<hr style="border:none;border-top:1px dashed var(--line);margin:10px 0">';
  html += '<p class="dim" style="font-size:12.5px;font-style:italic;line-height:1.5;margin:6px 0">“' + (it.lore || 'ของโบราณแห่งเกาะลงกาที่ตกทอดมานานหลายชั่วอายุคน…') + '”</p>';

  html += '<div style="text-align:center;margin-top:14px"><button class="btn" id="btnCloseInspect" style="width:100%">ปิด</button></div>';
  html += '</div>';

  box.innerHTML = html;
  show(box);
  $('btnCloseInspect').onclick = () => hide(box);
}

function renderInv(){
  let totalAtk = player.atk + (player.wpn ? player.wpn.v : 0);
  if(player.head && player.head.atk) totalAtk += player.head.atk;
  let totalDef = player.def + (player.arm ? player.arm.v : 0);
  if(player.head && player.head.def) totalDef += player.head.def;
  if(player.buffIronskin > 0) totalDef += 10; // บัฟยาผิวเหล็กไหล
  let totalDodge = player.dodge;
  if(player.arm && player.arm.affix === 'dodge') totalDodge += 15;

  let equipHtml = '<div style="background:#1b0b18;padding:8px;border:2px solid var(--line);margin-bottom:8px;font-size:13px">';
  equipHtml += '<div style="color:var(--gold);font-weight:700;margin-bottom:4px">📊 สเตตัสรวม (นับบัฟแล้ว)</div>';
  equipHtml += '<div>⚔ <b>โจมตีรวม: ' + totalAtk + '</b> <small class="dim">(ตัวเปล่า ' + player.atk + ' + ' + player.wpn.name + ' +' + player.wpn.v + ')</small></div>';
  equipHtml += '<div>🛡 <b>ป้องกันรวม: ' + totalDef + '</b> <small class="dim">(ตัวเปล่า ' + player.def + ' + ' + player.arm.name + ' +' + player.arm.v + ')</small></div>';
  equipHtml += '<div>💨 <b>หลบหลีก: ' + totalDodge + '%</b> &nbsp;·&nbsp; ✦ <b>ปุญ: ' + player.punya + '</b> &nbsp;·&nbsp; ☠ <b>สังหาร: ' + player.killsTotal + ' ตน</b></div>';
  if(player.wpn && player.wpn.afDesc) equipHtml += '<div style="color:' + (player.wpn.afColor||'#ff8b1f') + '">✦ อาวุธ: ' + player.wpn.afDesc + '</div>';
  if(player.arm && player.arm.afDesc) equipHtml += '<div style="color:' + (player.arm.afColor||'#2ec4a6') + '">✦ เกราะ: ' + player.arm.afDesc + '</div>';
  if(player.head) equipHtml += '<div style="color:#ffe9a3">👑 <b>ชฎา/มงกุฎ: ' + player.head.name + '</b> — ' + player.head.desc + '</div>';
  if(player.relic) equipHtml += '<div style="color:#f5c542">' + (player.relic.icon||'📿') + ' <b>เครื่องราง: ' + player.relic.name + '</b> — ' + player.relic.desc + '</div>';
  if(player.vow) equipHtml += '<div style="color:#ffe9a3;background:#24190c;padding:4px 6px;margin-top:4px;border:1px dashed var(--gold)">📿 <b>ถือสัจจะ: ' + player.vow.name + '</b> (ถึงชั้น ' + thaiNum(player.vow.endFloor) + ')</div>';
  else equipHtml += '<div class="dim" style="font-size:12px">📿 เครื่องราง: ยังไม่ได้สวมใส่</div>';
  equipHtml += '</div>';

  $('equip').innerHTML = equipHtml;
  const list=$('invList');list.innerHTML='';
  if(!player.inv.length){list.innerHTML='<div class="row dim">ถุงผ้าว่างเปล่า…</div>';return;}
  player.inv.forEach((it,i)=>{
    const r=document.createElement('div');r.className='row';
    r.innerHTML='<span>'+it.name+statTxt(it)+'</span>';
    const btnBox=document.createElement('div');
    btnBox.style.display='flex';btnBox.style.gap='6px';

    const bUse=document.createElement('button');bUse.className='mini-btn';bUse.textContent='ใช้';
    bUse.onclick=()=>{useItem(i);renderInv();};

    const bDrop=document.createElement('button');bDrop.className='mini-btn';bDrop.textContent='ทิ้ง';
    bDrop.style.background='#5c2a3a';bDrop.style.color='#f4ecdc';bDrop.style.borderColor='#8a3d52';
    bDrop.style.boxShadow='0 3px 0 #2a0d16';
    bDrop.onclick=()=>{dropItem(i);renderInv();};

    btnBox.appendChild(bUse);btnBox.appendChild(bDrop);
    r.appendChild(btnBox);list.appendChild(r);
  });
}
function renderMantras(){
  $('mpHint').textContent='พลังมนตร์ '+player.mp+'/'+player.mmp;
  const list=$('mantraList');list.innerHTML='';
  if(!player.mantras.length){list.innerHTML='<div class="row dim">ยังไม่รู้แจ้งอาคมใด ๆ</div>';return;}
  player.mantras.forEach(k=>{
    const m=MANTRAS[k];
    const r=document.createElement('div');r.className='row';
    r.innerHTML='<span>'+m.ic+' <b>'+m.n+'</b> <span class="teal">'+m.mp+' มนตร์</span><br>'+
      '<small class="dim">'+m.d+'</small></span>';
    const b=document.createElement('button');b.className='mini-btn';b.textContent='ร่าย';
    b.disabled=player.mp<m.mp;b.onclick=()=>castMantra(k);
    r.appendChild(b);list.appendChild(r);
  });
}
function renderRecords(){$('recordsList').innerHTML=hallGet().map(r=>
  '<li>'+r.n+' · ชั้น '+thaiNum(r.f)+' · กิตติยศ '+r.s+'</li>').join('')||'<li>ยังว่าง…</li>';}
function buildClassCards(){
  const box=$('classList');box.innerHTML='';
  const karma = getKarma();
  for(const key in CLASSES){
    const C=CLASSES[key];
    const isLocked = (key === 'bibhek' && !karma.unlockedBibhek) || (key === 'garuda' && !karma.unlockedGaruda);

    const card=document.createElement('div');card.className='card';
    if(isLocked){
      card.style.opacity = '0.55';
      card.style.filter = 'grayscale(0.85)';
      card.innerHTML='<canvas class="mini" width="32" height="32"></canvas><h3 style="color:var(--dim)">🔒 ' + C.name + '</h3>'+
        '<small class="red" style="font-size:10.5px">เงื่อนไข: ' + (C.req||'ปลดล็อกในภายหลัง') + '</small>'+
        '<p style="font-size:11px">' + C.desc + '</p>';
    } else {
      card.innerHTML='<canvas class="mini" width="32" height="32"></canvas><h3>'+C.name+'</h3>'+
        '<small>เลือด '+C.hp+' · มนตร์ '+C.mp+' · โจมตี '+C.atk+' · ป้อง '+C.def+'</small>'+
        '<p>'+C.desc+'</p>';
      card.onclick=()=>{initAudio();startRun(key);};
    }
    const g=card.querySelector('canvas').getContext('2d');
    g.imageSmoothingEnabled=false;
    const img=SPR[C.sprite];
    if(img)g.drawImage(img,0,0,img.width,img.height,0,0,32,32);
    box.appendChild(card);
  }
}

/* ── อินพุต ── */
function bindHold(btn,fn){
  if(!btn)return;
  let timer=null, holdTimer=null;
  const step=()=>{
    initAudio();
    fn();
  };
  const start=e=>{
    if(e)e.preventDefault();
    step(); // ก้าวแรกทันที
    clearTimeout(holdTimer);
    clearInterval(timer);
    // ต้องกดค้างเกิน 400ms จึงจะเริ่มเดินต่อเนื่อง (ป้องกันเดินเบิ้ล 2 ก้าว)
    holdTimer=setTimeout(()=>{
      timer=setInterval(step,180);
    },400);
  };
  const end=e=>{
    if(e)e.preventDefault();
    clearTimeout(holdTimer);
    clearInterval(timer);
    timer=null;
    holdTimer=null;
  };
  btn.addEventListener('pointerdown',start);
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,end));
}
function setupInput(){
  bindHold($('btnU'),()=>tryMove(0,-1));
  bindHold($('btnD'),()=>tryMove(0,1));
  bindHold($('btnL'),()=>tryMove(-1,0));
  bindHold($('btnR'),()=>tryMove(1,0));
  $('btnWait').addEventListener('pointerdown',e=>{e.preventDefault();initAudio();waitTurn();});
  $('btnMantra').onclick=()=>{if(state==='play'){renderMantras();show($('mantraOv'));}};
  let btnAwk = $('btnAwaken');
  if(!btnAwk){
    btnAwk = document.createElement('button');
    btnAwk.id = 'btnAwaken';
    btnAwk.className = 'btn';
    btnAwk.style.background = '#8f2438';
    btnAwk.style.borderColor = 'var(--gold)';
    btnAwk.style.fontSize = '12px';
    btnAwk.style.padding = '6px 10px';
    btnAwk.innerHTML = '✦ อวตาร';
    const ctlBox = $('controls') || document.body;
    ctlBox.appendChild(btnAwk);
  }
  btnAwk.onclick = triggerAwaken;
  $('btnInv').onclick=()=>{if(state==='play'){renderInv();show($('invOv'));}};
  $('hudL').onclick=()=>{if(state==='play'){openStatusModal();}};
  $('hudR').onclick=()=>{if(state==='play'){openStatusModal();}};
  $('hudL').style.cursor='pointer';
  $('hudR').style.cursor='pointer';
  $('btnHelp').onclick=()=>show($('helpOv'));
  $('btnSnd').oncontextmenu=(e)=>{e.preventDefault();openSettingsModal();};
  $('btnHelpT').onclick=()=>show($('helpOv'));
  $('btnHelpClose').onclick=()=>hide($('helpOv'));
  $('btnSnd').onclick=()=>{initAudio();toggleSound();};
  $('controls').addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{
    if(e.repeat)return;
    initAudio();
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
    const k=e.key.toLowerCase();
    if(e.key==='ArrowUp'||k==='w'||e.key==='ไ')tryMove(0,-1);
    else if(e.key==='ArrowDown'||k==='s'||e.key==='ห')tryMove(0,1);
    else if(e.key==='ArrowLeft'||k==='a'||e.key==='ฟ')tryMove(-1,0);
    else if(e.key==='ArrowRight'||k==='d'||e.key==='ก')tryMove(1,0);
    else if(e.key===' '||e.key==='Enter')waitTurn();
    else if(k==='m'||e.key==='ม'){if(state==='play'){renderMantras();show($('mantraOv'));}}
    else if(k==='u'||e.key==='ป'){if(state==='play')triggerAwaken();}
    else if(k==='i'||e.key==='ร'){if(state==='play'){renderInv();show($('invOv'));}}
    else if(e.key==='h')show($('helpOv'));
    else if(e.key==='Escape')hideAll();
  });
  /* ปุ่มเมนู / โอเวอร์เลย์ */
  $('btnNew').onclick=()=>{
    initAudio();
    hide($('title'));
    show($('classSel'));
  };
  $('btnContinue').onclick=()=>{
    initAudio();
    if(loadGame()){
      hideAll(); // ปิดหน้าต่างไตเติลทันทีเมื่อโหลดเซฟสำเร็จ
    } else {
      msg('เซฟเสียหาย เริ่มใหม่แทน');
      hideAll();
      show($('classSel'));
    }
  };
  
  // จัดระเบียบเมนูหน้าแรกให้เป็น Grid กะทัดรัด ไม่ล้นจอ และเห็นปุ่มครบ 100%
  const tm = $('titleMenu');
  if(tm){
    tm.style.display = 'flex';
    tm.style.flexDirection = 'column';
    tm.style.gap = '6px';
    tm.style.maxHeight = '85vh';
    tm.style.overflowY = 'auto';
    tm.style.padding = '4px';

    // สร้าง Grid สำหรับรวมปุ่มฟังก์ชันเป็น 2 คอลัมน์
    let grid = $('titleGrid');
    if(!grid){
      grid = document.createElement('div');
      grid.id = 'titleGrid';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = '1fr 1fr';
      grid.style.gap = '6px';
      grid.style.margin = '4px 0';
      tm.insertBefore(grid, $('btnRecords'));
    }

    const makeGridBtn = (id, text, col, border, onClick) => {
      let b = $(id);
      if(!b){
        b = document.createElement('button');
        b.id = id;
        b.className = 'btn ghost';
        b.style.fontSize = '12px';
        b.style.padding = '6px 4px';
        b.style.margin = '0';
        b.style.whiteSpace = 'nowrap';
        b.style.overflow = 'hidden';
        b.style.textOverflow = 'ellipsis';
        if(col) b.style.color = col;
        if(border) b.style.borderColor = border;
        b.innerHTML = text;
        grid.appendChild(b);
      }
      b.onclick = onClick;
      return b;
    };

    makeGridBtn('btnDaily', '📅 ประจำวัน', '#ff8b1f', '#ff8b1f', () => {
      isDailyRun = true; currentSeed = getDailySeed(); initAudio(); hide($('title')); show($('classSel'));
    });
    makeGridBtn('btnHeat', '🔥 เพลิงกรรม', '#ff8b1f', null, openHeatModal);
    makeGridBtn('btnCustomSeed', '🌱 รหัส Seed', 'var(--teal)', null, openCustomSeedPrompt);
    makeGridBtn('btnIntro', '🎬 ชมบทนำ', 'var(--gold)', null, () => playCinematicPrologue());
    makeGridBtn('btnKarma', '🪷 หอบารมี', 'var(--teal)', 'var(--teal)', openKarmaModal);
    makeGridBtn('btnAch', '🏆 เกียรติยศ', 'var(--gold)', 'var(--gold)', openAchModal);
    makeGridBtn('btnCodex', '📖 สารานุกรม', 'var(--teal)', null, openCodexModal);
    makeGridBtn('btnSet', '⚙️ ตั้งค่า', null, null, openSettingsModal);

    // ย้ายปุ่มทำเนียบและวิธีเล่นมาเป็นคู่ล่าง
    let botGrid = $('titleBotGrid');
    if(!botGrid){
      botGrid = document.createElement('div');
      botGrid.id = 'titleBotGrid';
      botGrid.style.display = 'grid';
      botGrid.style.gridTemplateColumns = '1fr 1fr';
      botGrid.style.gap = '6px';
      tm.appendChild(botGrid);
      const bRec = $('btnRecords'), bHelp = $('btnHelpT');
      if(bRec) botGrid.appendChild(bRec);
      if(bHelp) botGrid.appendChild(bHelp);
    }
  }

  $('btnRecords').onclick=()=>{renderRecords();hide($('titleMenu'));show($('recordsBox'));};
  $('btnRecordsBack').onclick=()=>{hide($('recordsBox'));show($('titleMenu'));};
  $('btnBackTitle').onclick=()=>{hide($('classSel'));show($('title'));};
  $('btnInvClose').onclick=()=>hide($('invOv'));
  $('btnMantraClose').onclick=()=>hide($('mantraOv'));
  $('btnShopClose').onclick=()=>{hide($('shopOv'));endTurn();};
  $('altarPray').onclick=()=>pray(true);
  $('altarOffer').onclick=()=>pray(false);
  $('altarGo').onclick=()=>hide($('altarOv'));
  $('btnDescend').onclick=descend;
  $('btnStay').onclick=()=>hide($('stairsOv'));
  $('btnRebirth').onclick=()=>{hideAll();show($('title'));state='title';refreshTitle();};
  $('btnRebirth2').onclick=()=>{hideAll();show($('title'));state='title';refreshTitle();};
}
function refreshTitle(){
  if(localStorage.getItem(SAVE_KEY))show($('btnContinue'));else hide($('btnContinue'));
}
function fitCanvas(){
  const r=stage.getBoundingClientRect();
  const s=Math.max(1,Math.floor(Math.min((r.width-12)/320,(r.height-12)/240)));
  cv.style.width=320*s+'px';cv.style.height=240*s+'px';
}
window.addEventListener('resize',fitCanvas);

  // ระบบแตะกระเบื้องบนจอเพื่อเดินอัตโนมัติ (Tap-to-Move)
  cv.addEventListener('pointerdown', e => {
    if(state !== 'play' || !player) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const camX = clamp(player.x - (VW >> 1), 0, W - VW);
    const camY = clamp(player.y - (VH >> 1), 0, H - VH);
    const targetTileX = camX + Math.floor(clickX / T);
    const targetTileY = camY + Math.floor(clickY / T);

    const diffX = targetTileX - player.x;
    const diffY = targetTileY - player.y;
    if(diffX === 0 && diffY === 0){
      waitTurn(); // จิ้มที่ตัวเรา = รอเทิร์น
      return;
    }
    // เดิน 1 ก้าวไปยังทิศทางที่จิ้ม
    const stepX = Math.abs(diffX) >= Math.abs(diffY) ? Math.sign(diffX) : 0;
    const stepY = stepX === 0 ? Math.sign(diffY) : 0;
    tryMove(stepX, stepY);
  });


/* ── เริ่มระบบ ── */
buildClassCards();setupInput();refreshTitle();fitCanvas();
requestAnimationFrame(loop);
