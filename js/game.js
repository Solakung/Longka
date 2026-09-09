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
})();

/* ── ตารางข้อมูล ── */

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
  cleave: { name: 'อาวุธกวาด', icon: '🪓', desc: 'ฟันกวาดศัตรูทุกตัวรอบตัวพร้อมกัน' }
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
  { n: 'จักรสุทรรศน์', type: 'cleave', a: 16, r: 'mythic', lore: 'กงจักรประกายรังสีของพระนารายณ์ กวาดล้างอสูรสิ้น' }
];

const ARMOR_BASE = [
  { n: 'ผ้ามัสลิน', d: 1, r: 'common', lore: 'ผ้าฝ้ายทอเนื้อบาง สวมสบายคล่องตัว' },
  { n: 'เกราะหนังจามรี', d: 3, r: 'common', lore: 'เกราะหนังหนาเย็บสองชั้น ป้องกันคมดาบเบื้องต้น' },
  { n: 'เกราะโซ่ถัก', d: 5, r: 'rare', lore: 'เกราะห่วงเหล็กกล้าถักเหนียวแน่น ป้องกันการแทง' },
  { n: 'เกราะเกล็ดนาค', d: 8, r: 'legendary', lore: 'เกราะเกล็ดนาคเขียวมรกต แข็งแกร่งและเบาสบาย' },
  { n: 'เกราะวัชรัง', d: 11, r: 'legendary', lore: 'เกราะเพชรห่อหุ้มกาย ดาบมารแทงไม่ระคาย' },
  { n: 'เกราะสุริยะเทวะ', d: 15, r: 'mythic', lore: 'เกราะทองคำเปล่งรังสีสุริยเทพ ป้องกันสูงสุดในสามโลก' }
];

const RELICS = [
  { id: 'naga_sash', name: 'สังวาลย์นาคราช', icon: '📿', r: 'rare', desc: 'ต้านทานพิษ ๑๐๐% และโจมตีศัตรูติดพิษ', lore: 'สายสังวาลย์ถักจากเกล็ดพญานาค หลั่งน้ำทิพย์ดับพิษร้าย' },
  { id: 'beads', name: 'ประคำร้อยแปด', icon: '📿', r: 'rare', desc: 'ลดการใช้พลังมนตร์คาถาลง ๕๐%', lore: 'ประคำไม้กฤษณานักพรต จิตบริสุทธิ์ใช้พลังมนตร์น้อยลง' },
  { id: 'ankh', name: 'มณีโมกษะ', icon: '💎', r: 'mythic', desc: 'ชุบชีวิตฟื้นคืนชีพ ๑ ครั้งเมื่อเลือดหมด!', lore: 'มณีศักดิ์สิทธิ์จากแดนสรวง ฉุดดวงวิญญาณกลับจากยมโลก' },
  { id: 'vanara_bangle', name: 'กำไลพญาวานร', icon: '💍', r: 'rare', desc: 'เพิ่มอัตราการหลบหลีก +๒๕%', lore: 'กำไลทองคำที่หนุมานประทานพร ร่างกายพลิ้วไหวดุจสายลม' },
  { id: 'diamond_ring', name: 'ธำมรงค์เพชร', icon: '💍', r: 'legendary', desc: 'เงินดรอป +๕๐% และคริติคอล +๑๕%', lore: 'แหวนเพชรเม็ดงาม ดึงดูดทรัพย์และโชคลาภการรบ' }
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
    // แท่นบูชาบาปอสูรสีดำ (สุ่มเกิดสำหรับสายเสี่ยงดวง)
    if(floorR()<.09 && fl > 2){map[(r.y+2)*W+r.x+1]=7;}
    // กับดักซ่อนเร้น
    if(floorR()<.35){
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
    const stock=[
      {t:'pot',name:'อมฤต',heal:14+fl*2,r:'common',lore:'น้ำอมฤตฟื้นฟูเลือด',price:18+fl},
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
  if(fl===1)msg('เจ้าก้าวเข้าสู่เงามืดของลงกา…');
  else {
    const tList = fl > 20 ? ABYSS_TITLES : FLOOR_TITLES;
    msg('ชั้น '+thaiNum(fl)+' — '+tList[(fl-1)%tList.length]+(fl>20?' (อเวจี)':''));
  }
  if(boss){
    msg('☠ นายทัพ '+boss.name+' ครองชั้นนี้!','warn');sfx.boss();
    bossSplash = { name: boss.name, title: boss.title || 'พญามารแห่งวิหารลงกา', time: 90 };
  }
  computeFov();
}
function spawnFoe(base,x,y){
  const hpBonus = Math.floor(floor * 1.3);
  const atkBonus = Math.floor(floor * 0.4);
  const gBase = (base.g && !isNaN(base.g)) ? base.g : 8;
  return {...base,x,y,awake:false,maxhp:base.hp+hpBonus,hp:base.hp+hpBonus,
    atk:base.atk+atkBonus,g:gBase+(floor>>1),flash:0,bumpX:0,bumpY:0};
}
function genW(tier){
  const t = clamp(tier || 1, 1, 4);
  const pool = WEAPON_BASE.filter((_, idx) => Math.floor(idx / 4) + 1 === t);
  const base = pick(pool.length ? pool : WEAPON_BASE);
  const plus = floor > 20 ? Math.floor((floor - 20) / 4) + 1 : 0;
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
    lore: base.lore,
    price: (t * 40) + (plus * 25)
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
  const t = clamp(tier || 1, 1, ARMOR_BASE.length);
  const base = ARMOR_BASE[t - 1] || ARMOR_BASE[0];
  const plus = floor > 20 ? Math.floor((floor - 20) / 4) + 1 : 0;
  const pName = plus ? ' +' + thaiNum(plus) : '';

  const it = {
    t: 'arm',
    name: base.n + pName,
    baseName: base.n,
    v: base.d + plus * 2,
    tier: t,
    plus: plus,
    r: base.r,
    lore: base.lore,
    price: (t * 35) + (plus * 20)
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
  if(r<.12) return {t:'pot', name:'อมฤต', heal:12+floor*2, r:'common', lore:'น้ำอมฤตบริสุทธิ์ ฟื้นฟูพลังชีวิต'};
  if(r<.24) return {t:'mana', name:'น้ำโสม', mana:10+floor*2, r:'common', lore:'น้ำสกัดจากโสมพันปี ฟื้นฟูพลังมนตร์'};
  if(r<.48) return {t:'gold', amt:8+Math.floor(floorR()*(10+floor*3))};
  if(r<.62){
    const th = pick(THROWABLES);
    return {t:'throw', name: th.name, dmg: th.dmg + Math.floor(floor * 0.8), range: th.range, c: th.c, burn: th.burn||0, r:'common', lore:'อาวุธขว้างโจมตีระยะไกล ' + thaiNum(th.range) + ' ช่อง', price: 20 + floor*2};
  }
  if(r<.70) return genScrollUpg(); // คัมภีร์ตีบวก
  if(r<.75) return genRelic();
  if(r<.78) return {...TOOL_HOOK};
  if(r<.82) return genPetEgg(); // ไข่สัตว์เลี้ยง
  if(r<.89){ const t = clamp(1 + Math.floor((floor-1)/5), 1, 4); return genW(t); }
  if(r<.96){ const t = clamp(1 + Math.floor((floor-1)/4), 1, 6); return genA(t); }
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

  // ระบบหอกยาว/ตรีศูล: แทงทะลวงระยะ ๒ ช่อง! (Reach Attack)
  if(player.wpn && player.wpn.type === 'spear'){
    const tx2 = player.x + dx * 2, ty2 = player.y + dy * 2;
    const e2 = enemyAt(tx2, ty2);
    if(e2 && canWalk(nx, ny)){
      playerBump={x:dx*12, y:dy*12, time:4};
      triggerSlash(tx2, ty2, '#2ec4a6');
      msg('🔱 «' + player.wpn.name + '» แทงทะลวงระยะ ๒ ช่องเข้าใส่ ' + e2.name + '!', 'good');
      attackFoe(e2, dx, dy);
      endTurn();
      return;
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
  const wpn = player.wpn || {};
  let critRate = 0.15;
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
    e.burn = (e.burn || 0) + 3;
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
    if(rng() < 0.25){
      e.stun = 1;
      slashColor = '#f5c542';
      floats.push({x:e.x, y:e.y-0.4, t:'มึนงง!', c:'#f5c542', life:1.2});
    }
  }

  triggerSlash(e.x, e.y, slashColor);
  floats.push({x:e.x, y:e.y, t:'-'+d, c:crit?'#f5c542':'#ffffff', life:1});
  shake = crit ? 8 : 4; sfx.hit();
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
 triggerHaptic(crit ? 'crit' : 'crit');

  // กลไกมีดสั้น: มีโอกาส 45% ฟันเบิ้ล ๒ ครั้งติด (Double Strike)
  if(wpn.type === 'dagger' && e.hp > 0 && rng() < 0.45){
    const d2 = Math.max(1, Math.floor(d * 0.75));
    e.hp -= d2; e.flash = 4;
    floats.push({x:e.x, y:e.y-0.3, t:'ฟันเบิ้ล -' + d2, c:'#2ec4a6', life:1.2});
    msg('🗡️ «' + wpn.name + '» ตวัดฟันเบิ้ลติดกัน ๒ ครั้ง! -' + d2, 'good');
    triggerSlash(e.x, e.y, '#2ec4a6');
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
  if(e.hp <= 0) killFoe(e); else msg((crit?'✦ คมขรรค์ฟันจุดตาย! ':'')+'เจ้าฟัน'+e.name+' -'+d);
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
  unlockAch('first_blood');
  if(player.killsTotal >= 50) unlockAch('slayer_50');
  if(player.killsTotal >= 100) unlockAch('slayer_100');
  discoverFoe(e.id);kills[e.id]=(kills[e.id]||0)+1;
  const g = (e.g && !isNaN(e.g)) ? e.g + R(Math.max(1, e.g)) : 8;
  if(player.relic && player.relic.id === 'diamond_ring') g = Math.floor(g * 1.5);
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
        player.mantras.push(k);msg('แจ้งแจ้งอาคม «'+MANTRAS[k].n+'» แล้ว!','good');
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
  player.hp -= d; flash = .4; shake = 6; sfx.hurt(); triggerHaptic('hurt');
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
      let d=Math.max(1,e.atk+R(3)-((player.def+playerArmDef)>>1));
      if(rng()<.08){d<<=1;msg(e.name+'จู่โจมเข้าจุดตาย!','warn');}
      hurtPlayer(d,e.name,e);
      continue;
    }
    if(e.ranged&&dist<=5&&dist>1&&los(e.x,e.y,player.x,player.y)){
      // พ่นพิษคิดเกราะป้องกันด้วย
      const d=Math.max(1,e.atk+R(2)-((player.def+playerArmDef)>>1));
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
    player.hp -= 1;
    floats.push({x:player.x, y:player.y, t:'-๑ พิษ', c:'#43b05c', life:0.9});
    if(player.hp <= 0){ die(); return; }
  }
  if(player.burn > 0){
    player.burn--;
    player.hp -= 2;
    floats.push({x:player.x, y:player.y, t:'-๒ ไฟ', c:'#ff8b1f', life:0.9});
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
  if(player.inv.length>=10){msg('ถุงผ้าเต็ม! ของถูกทิ้งไว้…','warn');items.push(it);return;}
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
  if(it.t==='pot'){player.hp=Math.min(player.mhp,player.hp+it.heal);
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
    if(player.mantras.includes(it.key)){player.punya+=5;msg('แจ้งแจ้งอยู่แล้ว — กรานเป็นปุญ +๕','good');}
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
    triggerSlash(t.x,t.y,key==='agni'?'#ff8b1f':'#f5c542');
    floats.push({x:t.x,y:t.y,t:'-'+d,c:key==='agni'?'#ff8b1f':'#f5c542',life:1});
    msg((key==='agni'?'✹ เปลวเพลิง':'⌁ สายฟ้าพระอินทร์')+'สังหาร'+t.name+' -'+d);
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
  }
  if(used){player.mp-=reqMp;sfx.cast();hide($('mantraOv'));endTurn();}
}
function interact(n){
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
      else if(player.inv.length>=10){msg('ถุงผ้าเต็ม!','warn');player.gold+=it.price;return;}
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
  unlockAch('first_step');
  if(floor+1 >= 25) unlockAch('abyss_conqueror');
  if(floor+1 >= 30) unlockAch('abyss_deep');
  hide($('stairsOv'));sfx.stairs();
  if(floor>=FINAL && !endless){victory();return;}
  genFloor(floor+1);updateHud();saveGame();
}

/* ── ตาย / ชนะ / คะแนน ── */
function score(){return floor*50+player.gold+player.lvl*30+player.punya*2+player.killsTotal*5}
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
  $('deadStats').innerHTML='เจ้าเดินทางถึง <b>ชั้น '+thaiNum(floor)+'</b> · ระดับ '+thaiNum(player.lvl)+
    ' · สังหาร '+player.killsTotal+' ตน<br>กิตติยศ <b class="gold">'+sc+'</b>';
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
  if(player.punya >= 80 && !player.usedCursedAltar){
    // ฉากจบที่ ๑: โมกษะธรรมะ (Good Ending)
    $('winStats').innerHTML='<span class="teal" style="font-weight:700">✦ ฉากจบ: โมกษะธรรมะ (หลุดพ้นบริสุทธิ์)</span><br>'+
      'ทศกัณฐ์ล่มสลาย แสงธรรมสาดส่องทั่วเกาะลงกา<br>ดวงจิตของเจ้าหลุดพ้นจากวัฏสงสารอย่างแท้จริง!<br>กิตติยศ <b class="gold">'+sc+'</b>';
  } else {
    // ฉากจบที่ ๒: กลียุคจ้าวมาร (Cursed Asura Ending)
    $('winStats').innerHTML='<span class="red" style="font-weight:700">☠ ฉากจบ: กลียุคจ้าวมาร (ผู้สืบทอดบัลลังก์อสูร)</span><br>'+
      'เจ้าสังหารทศกัณฐ์แต่ใจถูกครอบงำด้วยไออสูร… กลืนกินดวงใจทศกัณฐ์<br>และสวมมงกุฎ ๑๐ หน้า กลายเป็นจ้าวมารตนใหม่ครองลงกา!<br>กิตติยศ <b class="gold">'+sc+'</b>';
  }
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
      npcs,items,kills,
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
    player=s.player;items=s.items||[];npcs=s.npcs||[];
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
function startRun(cls){
  seed=(Date.now()^(Math.random()*1e9))>>>0;
  rng=mulberry32(seed);
  const C=CLASSES[cls];
  player={x:0,y:0,cls,sprite:C.sprite,hp:C.hp,mhp:C.hp,mp:C.mp,mmp:C.mp,
    atk:C.atk,def:C.def,dodge:C.dodge,lvl:1,xp:0,gold:30,punya:0,killsTotal:0,
    wpn:{name:'มีดฝึกซ้อม',baseName:'มีดฝึกซ้อม',type:'dagger',v:1,tier:0,r:'common',lore:'มีดสั้นทำจากไม้เนื้อแข็งสำหรับฝึกเพลงดาบ'},
    arm:{name:'ผ้าฝ้าย',baseName:'ผ้าฝ้าย',v:0,tier:0,r:'common',lore:'ผ้าฝ้ายธรรมดาป้องกันอะไรแทบไม่ได้'},
    relic:null,
    inv:[{t:'pot',name:'อมฤต',heal:14,r:'common',lore:'น้ำอมฤตฟื้นฟูเลือด'}, genScrollUpg()],
    talents:[],
    freeRerolls:2,
    rerollCost:10,
    pendingTalents:[],
    mantras:[],floor:1,poison:0,burn:0,
    facing:1,prevX:0,prevY:0,pet:null,usedCursedAltar:false,hasDeliveryScroll:false,deliveryDone:false};
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

    const ic={pot:'pot',mana:'mana',gold:'gold',wpn:'wpn',arm:'arm',scr:'scr',throw:'wpn',relic:'arm',upg:'scr',hook:'wpn',skel:'skeleton'}[it.t] || 'wpn';
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

    if(e.elite){
    msg('👑 ล้มจอม' + e.name + 'สำเร็จ! หีบสมบัติล้ำค่าหล่นลงพื้น!', 'good');
    items.push({ x: e.x, y: e.y, ...genW(clamp(Math.floor(floor/4)+1, 1, 4)) });
  }
  if(e.boss){
    if(floor === 5) unlockAch('boss_khara');
    if(floor === 10) unlockAch('boss_maricha');
    if(floor === 15) unlockAch('boss_kumbha');
    if(floor === 20) unlockAch('victory_moksha'); // รัศมีบอส
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
    const torchGrad = ctx.createRadialGradient(pScreenX, pScreenY, 8, pScreenX, pScreenY, 88 + flicker);
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
  const totalAtk = player.atk + (player.wpn ? player.wpn.v : 0);
  const totalDef = player.def + (player.arm ? player.arm.v : 0);
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
  html += '<div><h2 style="font-family:Chakra Petch;color:var(--gold);margin:0;font-size:20px">' + C.name + '</h2>';
  html += '<small class="teal" style="font-size:12px">ระดับ ' + thaiNum(player.lvl) + ' · ประสบการณ์ ' + player.xp + '/' + xpNeed(player.lvl) + '</small></div>';
  html += '</div>';
  html += '<div class="chip gold" style="font-size:11px">◉ ' + player.gold + '</div>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:12px">';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">🩸 เลือด: <b style="color:#ff7a5c">' + player.hp + '/' + player.mhp + '</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">💧 มนตร์: <b style="color:#6fe0cd">' + player.mp + '/' + player.mmp + '</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">⚔ โจมตีรวม: <b class="gold">' + totalAtk + '</b> <small class="dim">(' + player.atk + '+' + (player.wpn?player.wpn.v:0) + ')</small></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">🛡 ป้องกันรวม: <b class="teal">' + totalDef + '</b> <small class="dim">(' + player.def + '+' + (player.arm?player.arm.v:0) + ')</small></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">💨 หลบหลีก: <b style="color:#ffe9a3">' + totalDodge + '%</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">🎯 คริติคอล: <b style="color:#f5c542">' + totalCrit + '%</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">✦ ปุญบารมี: <b class="teal">' + player.punya + '</b></div>';
  html += '<div style="background:#1c0a18;padding:6px 8px;border:1px solid var(--line)">☠ สังหาร: <b class="red">' + player.killsTotal + ' ตน</b></div>';
  html += '</div>';

  // อุปกรณ์สวมใส่ 3 ช่อง
  html += '<h4 style="margin:8px 0 4px;color:var(--gold);font-size:13px">🛡️ อุปกรณ์คู่กาย</h4>';
  html += '<div style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;margin-bottom:10px">';
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
  const totalAtk = player.atk + (player.wpn ? player.wpn.v : 0);
  const totalDef = player.def + (player.arm ? player.arm.v : 0);
  let totalDodge = player.dodge;
  if(player.arm && player.arm.affix === 'dodge') totalDodge += 15;

  let equipHtml = '<div style="background:#1b0b18;padding:8px;border:2px solid var(--line);margin-bottom:8px;font-size:13px">';
  equipHtml += '<div style="color:var(--gold);font-weight:700;margin-bottom:4px">📊 สเตตัสรวม (นับบัฟแล้ว)</div>';
  equipHtml += '<div>⚔ <b>โจมตีรวม: ' + totalAtk + '</b> <small class="dim">(ตัวเปล่า ' + player.atk + ' + ' + player.wpn.name + ' +' + player.wpn.v + ')</small></div>';
  equipHtml += '<div>🛡 <b>ป้องกันรวม: ' + totalDef + '</b> <small class="dim">(ตัวเปล่า ' + player.def + ' + ' + player.arm.name + ' +' + player.arm.v + ')</small></div>';
  equipHtml += '<div>💨 <b>หลบหลีก: ' + totalDodge + '%</b> &nbsp;·&nbsp; ✦ <b>ปุญ: ' + player.punya + '</b> &nbsp;·&nbsp; ☠ <b>สังหาร: ' + player.killsTotal + ' ตน</b></div>';
  if(player.wpn && player.wpn.afDesc) equipHtml += '<div style="color:' + (player.wpn.afColor||'#ff8b1f') + '">✦ อาวุธ: ' + player.wpn.afDesc + '</div>';
  if(player.arm && player.arm.afDesc) equipHtml += '<div style="color:' + (player.arm.afColor||'#2ec4a6') + '">✦ เกราะ: ' + player.arm.afDesc + '</div>';
  if(player.relic) equipHtml += '<div style="color:#f5c542">' + (player.relic.icon||'📿') + ' <b>เครื่องราง: ' + player.relic.name + '</b> — ' + player.relic.desc + '</div>';
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
    else if(k==='i'||e.key==='ร'){if(state==='play'){renderInv();show($('invOv'));}}
    else if(e.key==='h')show($('helpOv'));
    else if(e.key==='Escape')hideAll();
  });
  /* ปุ่มเมนู / โอเวอร์เลย์ */
  $('btnNew').onclick=()=>{initAudio();hide($('title'));show($('classSel'));};
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
  
  // เพิ่มปุ่มหอพระบารมีที่หน้าแรก
  let btnKarma = $('btnKarma');
  if(!btnKarma){
    btnKarma = document.createElement('button');
    btnKarma.id = 'btnKarma';
    btnKarma.className = 'btn ghost';
    btnKarma.style.color = 'var(--teal)';
    btnKarma.style.borderColor = 'var(--teal)';
    btnKarma.innerHTML = '🪷 หอพระบารมี (อัปเกรดถาวร)';
    $('titleMenu').insertBefore(btnKarma, $('btnRecords'));
  }
  btnKarma.onclick = openKarmaModal;

  
  // เพิ่มปุ่ม เกียรติยศ, สารานุกรม และตั้งค่า ที่หน้าแรก
  let btnAch = $('btnAch');
  if(!btnAch){
    btnAch = document.createElement('button');
    btnAch.id = 'btnAch';
    btnAch.className = 'btn ghost';
    btnAch.style.color = 'var(--gold)';
    btnAch.innerHTML = '🏆 ทำเนียบเกียรติยศ (Achievements)';
    $('titleMenu').insertBefore(btnAch, $('btnRecords'));
  }
  btnAch.onclick = openAchModal;

  let btnCodex = $('btnCodex');
  if(!btnCodex){
    btnCodex = document.createElement('button');
    btnCodex.id = 'btnCodex';
    btnCodex.className = 'btn ghost';
    btnCodex.style.color = 'var(--teal)';
    btnCodex.innerHTML = '📖 สารานุกรมลงกา (Codex)';
    $('titleMenu').insertBefore(btnCodex, $('btnRecords'));
  }
  btnCodex.onclick = openCodexModal;

  let btnSet = $('btnSet');
  if(!btnSet){
    btnSet = document.createElement('button');
    btnSet.id = 'btnSet';
    btnSet.className = 'btn ghost';
    btnSet.innerHTML = '⚙️ ตั้งค่าเกม (Settings)';
    $('titleMenu').appendChild(btnSet);
  }
  btnSet.onclick = openSettingsModal;

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
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
buildClassCards();setupInput();refreshTitle();fitCanvas();
requestAnimationFrame(loop);
